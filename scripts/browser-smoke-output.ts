import { execFileSync } from "node:child_process";
import { constants } from "node:fs";
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  realpath,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

interface SmokeOutputOptions {
  readonly args: readonly string[];
  readonly name: string;
  readonly archiveDirectory: string;
  readonly repositoryRoot?: string;
  /** Exceptional historical archive locations, keyed by generated filename. */
  readonly archiveFiles?: Readonly<Record<string, string>>;
}

/** Capture in isolation; publish only after the caller's acceptance checks pass. */
export async function prepareSmokeOutput(options: SmokeOutputOptions) {
  const repositoryRoot = await realpath(
    options.repositoryRoot ?? process.cwd(),
  );
  const archival = options.args.includes("--archive-evidence");
  const outputArgs = options.args.filter((arg) =>
    arg.startsWith("--output-dir"),
  );
  if (
    outputArgs.length > 1 ||
    outputArgs.some(
      (arg) => !arg.startsWith("--output-dir=") || arg === "--output-dir=",
    ) ||
    (archival && outputArgs.length > 0)
  ) {
    throw new Error(
      "Use either --archive-evidence or one --output-dir=<new-directory>",
    );
  }
  const archiveDirectory = archivePath(options.archiveDirectory);
  const archiveFiles = Object.fromEntries(
    Object.entries(options.archiveFiles ?? {}).map(([name, target]) => [
      name,
      archivePath(target),
    ]),
  );
  const archiveTargets = [archiveDirectory, ...Object.values(archiveFiles)];
  if (archival) await assertArchivesClean();

  const explicitDirectory = outputArgs[0]?.slice("--output-dir=".length);
  const directory =
    explicitDirectory === undefined
      ? await mkdtemp(
          path.join(tmpdir(), `pulp-wars-${options.name}-smoke-evidence-`),
        )
      : path.resolve(repositoryRoot, explicitDirectory);
  if (explicitDirectory !== undefined) {
    // Exclusive creation rejects existing directories, files, and symlinks.
    await mkdir(directory);
  }
  console.log(
    `Browser smoke evidence: ${directory} (${archival ? `staging for explicit archive: ${archiveDirectory}` : explicitDirectory === undefined ? "temporary, untracked" : "explicit new output directory"})`,
  );

  return {
    directory,
    async publish(): Promise<void> {
      if (!archival) return;
      const files = await generatedFiles(directory);
      // Recheck after the browser run: local edits made during capture also win.
      await assertArchivesClean();
      for (const file of files) {
        const destination =
          archiveFiles[file] ?? path.join(archiveDirectory, file);
        await assertNoSymlinks(destination);
        await assertClean(destination);
        const existing = await statIfPresent(destination);
        if (existing !== null && !existing.isFile()) {
          throw new Error(
            `Evidence archive destination is not a regular file: ${destination}`,
          );
        }
        await mkdir(path.dirname(destination), { recursive: true });
        await copyFile(
          path.join(directory, file),
          destination,
          existing === null ? constants.COPYFILE_EXCL : 0,
        );
      }
      console.log(
        `Browser smoke evidence archived: ${archiveDirectory}; captured originals retained: ${directory}`,
      );
    },
  };

  function archivePath(relative: string): string {
    const resolved = path.resolve(repositoryRoot, relative);
    const within = path.relative(repositoryRoot, resolved);
    if (
      within === "" ||
      within === ".." ||
      within.startsWith(`..${path.sep}`) ||
      path.isAbsolute(within)
    ) {
      throw new Error(
        `Evidence archive must be inside the repository: ${relative}`,
      );
    }
    return resolved;
  }

  async function assertArchivesClean(): Promise<void> {
    for (const target of archiveTargets) {
      await assertNoSymlinks(target);
      await assertClean(target);
    }
  }

  async function assertClean(target: string): Promise<void> {
    const status = execFileSync(
      "git",
      [
        "--literal-pathspecs",
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
        "--ignored",
        "--",
        path.relative(repositoryRoot, target),
      ],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
      },
    );
    if (status.length > 0) {
      throw new Error(
        `Refusing to overwrite dirty or untracked evidence at ${target}. Preserve existing work, or run without --archive-evidence for isolated output.\n${status}`,
      );
    }
  }
}

async function statIfPresent(target: string) {
  try {
    return await lstat(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function assertNoSymlinks(target: string): Promise<void> {
  const parent = path.dirname(target);
  if (parent !== target) await assertNoSymlinks(parent);
  const stat = await statIfPresent(target);
  if (stat?.isSymbolicLink()) {
    throw new Error(`Evidence destination contains a symlink: ${target}`);
  }
}

async function generatedFiles(root: string, relative = ""): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(path.join(root, relative), {
    withFileTypes: true,
  })) {
    const name = path.join(relative, entry.name);
    if (entry.isDirectory()) result.push(...(await generatedFiles(root, name)));
    else if (entry.isFile()) result.push(name);
    else throw new Error(`Generated evidence is not a regular file: ${name}`);
  }
  return result.sort();
}
