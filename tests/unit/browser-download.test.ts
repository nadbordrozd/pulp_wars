// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { downloadJsonFile, type ObjectUrlPort } from "../../src/app/index";

describe("browser download boundary", () => {
  it("clicks one hidden download and revokes its URL after synchronous dispatch", () => {
    const clicked: Array<{ href: string; download: string }> = [];
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push({ href: this.href, download: this.download });
      });
    const objectUrls: ObjectUrlPort = {
      createObjectURL: vi.fn(() => "blob:ruleset6-debug"),
      revokeObjectURL: vi.fn(),
    };
    let revokeTask: (() => void) | undefined;

    downloadJsonFile(document, '{"version":1}', "pulp-debug.json", {
      objectUrls,
      scheduleRevocation: (task) => {
        revokeTask = task;
      },
    });

    expect(objectUrls.createObjectURL).toHaveBeenCalledTimes(1);
    expect(clicked).toEqual([
      { href: "blob:ruleset6-debug", download: "pulp-debug.json" },
    ]);
    expect(document.querySelector('a[download="pulp-debug.json"]')).toBeNull();
    expect(objectUrls.revokeObjectURL).not.toHaveBeenCalled();
    revokeTask?.();
    expect(objectUrls.revokeObjectURL).toHaveBeenCalledOnce();
    expect(objectUrls.revokeObjectURL).toHaveBeenCalledWith(
      "blob:ruleset6-debug",
    );
    click.mockRestore();
  });
});
