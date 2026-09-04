export interface ObjectUrlPort {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
}

export interface BrowserDownloadOptions {
  readonly objectUrls?: ObjectUrlPort;
  readonly scheduleRevocation?: (task: () => void) => void;
}

/** Owns the short-lived browser object URL while keeping download IO testable. */
export function downloadJsonFile(
  documentRoot: Document,
  source: string,
  filename: string,
  options: BrowserDownloadOptions = {},
): void {
  const objectUrls = options.objectUrls ?? defaultObjectUrls();
  const scheduleRevocation = options.scheduleRevocation ?? queueMicrotask;
  const blob = new Blob([source], { type: "application/json;charset=utf-8" });
  const url = objectUrls.createObjectURL(blob);
  const anchor = documentRoot.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  documentRoot.body.append(anchor);
  try {
    // HTMLAnchorElement.click() synchronously initiates the browser download.
    anchor.click();
  } finally {
    anchor.remove();
    // Defer revocation until after the synchronous click dispatch completes.
    scheduleRevocation(() => objectUrls.revokeObjectURL(url));
  }
}

function defaultObjectUrls(): ObjectUrlPort {
  return {
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
  };
}
