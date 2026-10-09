import { describe, expect, it } from "vitest";
import { headless } from "../../src/headless/index";
import { setupBuilder } from "../fixtures/builders";

describe("headless match foundations", () => {
  it("creates, views, and advances the same DOM-free match model", async () => {
    const created = await headless.create(setupBuilder());
    if (!created.ok) throw new Error(created.error.code);
    const viewerId = created.state.players[0]?.id;
    if (viewerId === undefined) throw new Error("Missing headless viewer");
    const view = await headless.viewFor(created.state, viewerId);
    expect(view.board.tiles.some((tile) => !tile.explored)).toBe(true);
    const applied = await headless.apply(created.state, { kind: "END_TURN" });
    if (!applied.ok) throw new Error(applied.error.code);
    expect(applied.state.commandIndex).toBe(1);
    expect(applied.events.map((event) => event.kind)).toEqual([
      "INCOME_PREVIEWED",
      "TURN_ENDED",
      "TURN_STARTED",
      "INCOME_AWARDED",
    ]);
  });
});
