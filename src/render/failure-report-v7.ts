import packageMetadata from "../../package.json";
import type { PresentationFailureRecordV7 } from "./presentation-guard-v7";

/**
 * The player's error report (bead pulp_wars-2yc.96): when the presentation
 * guard survives a failure, the player can copy a compact plain-text report
 * of it to send to the developer. A phone has no console, so this is the
 * only way the failure's trigger leaves the device.
 *
 * The report holds the failures (error name, message, trimmed stack, where
 * it failed, the playback step and the last few commands and events), the
 * ruleset, the build, the screen and the browser. Nothing else: no save, no
 * map, no personal data beyond the browser's user agent.
 */

export const FAILURE_NOTICE_TEXT_V7 =
  "Something went wrong showing that move. The game recovered.";
export const COPY_DETAILS_LABEL_V7 = "Copy details";
export const COPIED_LABEL_V7 = "Copied";
export const COPY_FAILED_LABEL_V7 = "Select and copy";
export const COPY_ERROR_REPORT_LABEL_V7 = "Copy error report";
export const ERROR_REPORT_COPIED_V7 = "Error report copied.";

export interface FailureReportEnvironmentV7 {
  readonly rulesetId: string | null;
  readonly build: string;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly devicePixelRatio: number;
  readonly userAgent: string;
  readonly now: string;
}

/** The plain-text report: newest failure first. */
export function formatFailureReportV7(
  failures: readonly PresentationFailureRecordV7[],
  environment: FailureReportEnvironmentV7,
  totalFailures: number,
): string {
  const lines = [
    "Pulp Wars error report",
    `Time: ${environment.now}`,
    `Build: ${environment.build}`,
    `Ruleset: ${environment.rulesetId ?? "none"}`,
    `Screen: ${environment.viewport.width}x${environment.viewport.height} @${roundRatio(environment.devicePixelRatio)}x`,
    `Browser: ${environment.userAgent}`,
    `Failures this session: ${totalFailures}`,
  ];
  const newestFirst = [...failures].reverse();
  newestFirst.forEach((failure, index) => {
    lines.push(
      "",
      `#${index + 1} ${failure.at} in ${failure.where}${failure.count > 1 ? ` (x${failure.count})` : ""}`,
    );
    if (failure.step !== null) lines.push(`Step: ${failure.step}`);
    lines.push(`${failure.name}: ${failure.message}`);
    if (failure.stack !== null)
      for (const line of failure.stack.split("\n")) lines.push(`  ${line}`);
    if (failure.recent.length > 0)
      lines.push(`Recent: ${failure.recent.join(" > ")}`);
  });
  return lines.join("\n");
}

function roundRatio(ratio: number): string {
  return Number.isFinite(ratio) ? String(Math.round(ratio * 100) / 100) : "?";
}

/**
 * The build: the package version and the file name of the bundle this
 * module ships in, whose content hash names the exact build ("0.1.0
 * app-view-v7-Ab12Cd34.js"); on the development server, just the file.
 */
export function failureReportBuildV7(
  packageVersion: string,
  moduleUrl: string,
): string {
  const file = moduleUrl.split(/[?#]/)[0]?.split("/").pop() ?? "";
  return file === "" ? packageVersion : `${packageVersion} ${file}`;
}

/** This app's build: the package version and this bundle's file. */
export function failureReportBuildForThisAppV7(): string {
  try {
    return failureReportBuildV7(packageMetadata.version, import.meta.url);
  } catch {
    return packageMetadata.version;
  }
}

/**
 * The environment of the page `document` shows, read defensively: a field
 * the browser does not give reads as zero or "unknown".
 */
export function failureReportEnvironmentV7(
  document: Document,
  rulesetId: string | null,
  build: string,
): FailureReportEnvironmentV7 {
  const window = document.defaultView;
  let now: string;
  try {
    now = new Date().toISOString();
  } catch {
    now = "unknown";
  }
  return {
    rulesetId,
    build,
    viewport: {
      width: Math.round(window?.innerWidth ?? 0),
      height: Math.round(window?.innerHeight ?? 0),
    },
    devicePixelRatio: window?.devicePixelRatio ?? 1,
    userAgent: window?.navigator?.userAgent ?? "unknown",
    now,
  };
}

/**
 * Copies `text` to the clipboard: the Clipboard API first, then a selected
 * off-screen text area and the copy command. Resolves whether either
 * worked; never throws.
 */
export async function copyTextV7(
  document: Document,
  text: string,
): Promise<boolean> {
  try {
    const clipboard = document.defaultView?.navigator?.clipboard;
    if (clipboard !== undefined && typeof clipboard.writeText === "function") {
      await clipboard.writeText(text);
      return true;
    }
  } catch {
    // Refused (no permission, not a secure page): try the fallback.
  }
  return copyBySelectionV7(document, text);
}

function copyBySelectionV7(document: Document, text: string): boolean {
  let area: HTMLTextAreaElement | null = null;
  try {
    area = document.createElement("textarea");
    area.value = text;
    area.readOnly = true;
    area.setAttribute("aria-hidden", "true");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "-9999px";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const execCommand = (
      document as Document & {
        execCommand?: (command: string) => boolean;
      }
    ).execCommand;
    return typeof execCommand === "function"
      ? execCommand.call(document, "copy") === true
      : false;
  } catch {
    return false;
  } finally {
    area?.remove();
  }
}
