import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

interface Reference {
  readonly id: string;
  readonly sha256?: string;
}

interface RecoveryRequest {
  readonly styleReference?: Reference;
  readonly groundReference?: Reference;
}

export interface JobSnapshot<T extends RecoveryRequest> {
  readonly id: string;
  readonly jobId?: string;
  readonly request?: T;
}

function receiptPath(directory: string, jobId: string): string {
  const key = createHash("sha256").update(jobId).digest("hex");
  return path.join(directory, `${key}.json`);
}

/** Store only the resolved request snapshot, never the authenticated API payload. */
export async function saveSubmissionReceipt<T extends RecoveryRequest>(
  directory: string,
  id: string,
  jobId: string,
  request: T,
): Promise<void> {
  await mkdir(directory, { recursive: true });
  await writeFile(
    receiptPath(directory, jobId),
    `${JSON.stringify({ id, jobId, request }, null, 2)}\n`,
    { flag: "wx", flush: true },
  );
}

export async function loadSubmissionReceipt<T extends RecoveryRequest>(
  directory: string,
  jobId: string,
): Promise<JobSnapshot<T> | undefined> {
  let text: string;
  try {
    text = await readFile(receiptPath(directory, jobId), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  try {
    return JSON.parse(text) as JobSnapshot<T>;
  } catch {
    throw new Error("Invalid PixelLab submission receipt; recovery refused");
  }
}

function withoutReferenceHashes<T extends RecoveryRequest>(request: T): T {
  const result = structuredClone(request);
  for (const name of ["styleReference", "groundReference"] as const) {
    const reference = result[name];
    if (reference !== undefined) Reflect.deleteProperty(reference, "sha256");
  }
  return result;
}

/** Current manifests can check compatibility, but cannot supply historical facts. */
export function resolveRecoveryRequest<T extends RecoveryRequest>(
  id: string,
  jobId: string,
  current: T,
  previous?: JobSnapshot<T>,
  submission?: JobSnapshot<T>,
): T {
  if (
    submission !== undefined &&
    (submission?.id !== id || submission?.jobId !== jobId)
  )
    throw new Error(
      `${id}: submission receipt does not match the requested job`,
    );
  const recorded =
    previous?.id === id && previous.jobId === jobId
      ? previous.request
      : undefined;
  const request = submission?.request ?? recorded;
  if (request === undefined || request === null)
    throw new Error(
      `${id}: unknown historical request for this job; recovery requires a matching submission receipt or generation record`,
    );
  if (
    recorded !== undefined &&
    submission?.request !== undefined &&
    !isDeepStrictEqual(recorded, submission.request)
  )
    throw new Error(`${id}: conflicting request provenance for this job`);
  for (const name of ["styleReference", "groundReference"] as const) {
    const reference = request[name];
    if (
      reference !== undefined &&
      (reference === null ||
        typeof reference.sha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(reference.sha256))
    )
      throw new Error(
        `${id}: unknown historical ${name} hash; recovery refused`,
      );
  }
  if (
    !isDeepStrictEqual(
      withoutReferenceHashes(request),
      withoutReferenceHashes(current),
    )
  )
    throw new Error(
      `${id}: current recipe differs from this job's stored request`,
    );
  return request;
}

/** References reused by local processing must still have their recorded bytes. */
export function assertRecoveryReference(
  id: string,
  name: "styleReference" | "groundReference",
  reference: Reference,
  currentBytes: Uint8Array,
): void {
  const currentSha256 = createHash("sha256").update(currentBytes).digest("hex");
  if (reference.sha256 !== currentSha256)
    throw new Error(
      `${id}: ${name} bytes changed; restore the recorded reference before recovery`,
    );
}
