// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";
import {
  installFakeAudioContext,
  uninstallFakeAudioContext,
} from "../fixtures/fake-audio-context";
import { RecordingBoardHost } from "../fixtures/v7-dom-rig";
import { DEV_MODE_STORAGE_KEY_V7 } from "../../src/campaign/dev-mode-v7";

/**
 * One vertical scroller in the Gallery (bead pulp_wars-2yc.73). The user
 * found the whole page scrolling while the units table scrolled too. The
 * Gallery is now exactly one screen tall: the header, the tabs and the
 * filters stay put and the table (the Sounds tab's cards on that tab) fills
 * the rest and is the only thing that scrolls. jsdom has no layout, so the
 * DOM half checks that every tab ends in exactly one scroll region and the
 * stylesheet half checks the height chain that keeps the page from
 * overflowing. The measured page and table heights at 1440x900, 390x844 and
 * 320x720 are the bead's browser evidence.
 */

const CSS = readFileSync("src/styles/v7.css", "utf8");

/** The scroll region of a tab: the table frame, or the sound cards. */
const SCROLLER = ".v7-gallery-scroll, .v7-gallery-sounds-panel";

let app: ReturnType<typeof bootstrapRuleset7App> | null = null;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
  // The Gallery is listed in developer mode only (pulp_wars-5xki).
  window.localStorage.setItem(DEV_MODE_STORAGE_KEY_V7, "1");
  installFakeAudioContext(window);
});

afterEach(() => {
  app?.destroy();
  app = null;
  uninstallFakeAudioContext(window);
});

function required<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

/** The body of the first top-level rule with exactly this selector. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`\\n${escaped} \\{([\\s\\S]*?)\\n\\}`).exec(CSS);
  if (match?.[1] === undefined) throw new Error(`${selector} rule missing`);
  return match[1];
}

/** Every rule body (top level or nested in a media query) for a selector. */
function rulesFor(selector: string): string[] {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [
    ...CSS.matchAll(
      new RegExp(`(?:^|[\\n,])\\s*${escaped}\\s*(?:,[^{]*)?\\{([^}]*)\\}`, "g"),
    ),
  ].map((match) => match[1] ?? "");
}

describe("Gallery scrolling", () => {
  it("ends every tab in exactly one scroll region under fixed header, tabs and filters", () => {
    app = bootstrapRuleset7App(document, {
      storage: null,
      settingsStorage: window.localStorage,
      galleryDemoHost: () => new RecordingBoardHost(),
    });
    required<HTMLButtonElement>('[data-action="gallery"]').click();
    const gallery = required("[data-v7-gallery]");
    const tabs = [
      ...gallery.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    ].map((tab) => tab.dataset.action ?? "");
    expect(tabs).toEqual([
      "gallery-tab-units",
      "gallery-tab-buildings",
      "gallery-tab-terrain",
      "gallery-tab-curiosities",
      "gallery-tab-sounds",
    ]);
    for (const tab of tabs) {
      required<HTMLButtonElement>(`[data-action="${tab}"]`).click();
      const content = required(".v7-gallery-content");
      // Header, tabs, then the panel: nothing else shares the column.
      expect([...content.children].map((node) => node.className)).toEqual([
        "v7-gallery-header",
        "v7-gallery-tabs",
        "v7-gallery-panel",
      ]);
      const panel = required(".v7-gallery-panel");
      const scrollers = panel.querySelectorAll(SCROLLER);
      expect(scrollers, tab).toHaveLength(1);
      // The scroll region is the panel's last child; only the filters
      // (Units, Buildings, Terrain) sit above it.
      expect(panel.lastElementChild, tab).toBe(scrollers[0]);
      expect(
        [...panel.children].slice(0, -1).map((node) => node.className),
        tab,
      ).toEqual(
        tab === "gallery-tab-curiosities" || tab === "gallery-tab-sounds"
          ? []
          : ["v7-gallery-filters"],
      );
    }
  });

  it("keeps the Gallery one dynamic screen tall with the table as the scroller", () => {
    // The page: exactly the dynamic viewport (no URL-bar overflow), a
    // column whose fixed parts do not grow and whose rest may shrink.
    const root = rule(".v7-gallery");
    expect(root).toMatch(/\bheight: 100dvh;/);
    expect(root).not.toMatch(/min-height/);
    expect(root).toMatch(/flex-direction: column;/);
    expect(rule("body:has(> #app [data-v7-gallery])")).toMatch(
      /min-height: 100dvh;/,
    );
    for (const selector of [".v7-gallery-content", ".v7-gallery-panel"]) {
      const body = rule(selector);
      expect(body, selector).toMatch(/display: flex;/);
      expect(body, selector).toMatch(/flex-direction: column;/);
      expect(body, selector).toMatch(/flex: 1 1 auto;/);
      expect(body, selector).toMatch(/min-height: 0;/);
    }
    for (const selector of [
      ".v7-gallery-header",
      ".v7-gallery-tabs",
      ".v7-gallery-filters",
    ])
      expect(rule(selector), selector).toMatch(/flex: none;/);

    // The scroll regions shrink to the room left and scroll inside. The
    // old frame was capped at a whole screen below the header and tabs,
    // which made the page scroll as well.
    const table = rule(".v7-gallery-scroll");
    expect(table).toMatch(/overflow: auto;/);
    expect(table).toMatch(/flex: 0 1 auto;/);
    expect(table).toMatch(/min-height: 0;/);
    expect(table).not.toMatch(/max-height/);
    const sounds = rule(".v7-gallery-sounds-panel");
    expect(sounds).toMatch(/overflow-y: auto;/);
    expect(sounds).toMatch(/flex: 0 1 auto;/);
    expect(sounds).toMatch(/min-height: 0;/);

    // Nothing around the scroll region scrolls or sets its own height.
    for (const selector of [
      ".v7-gallery",
      ".v7-gallery-content",
      ".v7-gallery-panel",
    ])
      for (const body of rulesFor(selector)) {
        expect(body, selector).not.toMatch(/overflow(-y)?: (auto|scroll)/);
        expect(body, selector).not.toMatch(/max-height/);
      }
  });

  it("keeps the sticky column headers and row heads inside the table frame", () => {
    expect(rule(".v7-gallery-table thead th")).toMatch(/position: sticky;/);
    expect(rule(".v7-gallery-table thead th")).toMatch(/top: 0;/);
    expect(rule(".v7-gallery-table .v7-gallery-row-head")).toMatch(
      /position: sticky;/,
    );
    // The table frame scrolls both ways, so a phone's wide table scrolls
    // sideways inside it and the page never does.
    expect(rule(".v7-gallery-scroll")).toMatch(/max-width: 100%;/);
  });
});
