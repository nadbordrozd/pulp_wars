import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  cityId,
  queryPlayerCommandsV7,
  viewForV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  blackoutStatusTextV7,
  blackoutTargetsV7,
  defectionEscapeGeometryV7,
  defectionLinksV7,
  defectionTargetsV7,
  defectionTimelineV7,
  pursuitPresentationV7,
  tacticalAttachmentsV7,
} from "../../src/render/tactical-presentation-v7";
import {
  blackoutPublicFixtureV7,
  defectionPublicFixtureV7,
  pursuitPublicFixtureV7,
} from "../fixtures/ruleset7-tactical-ui";

describe("Ruleset 7 tactical presentation", () => {
  it("uses offered Pursuit attacks as truth and reports the global bounded sequence", () => {
    const fixture = pursuitPublicFixtureV7();
    const pursuit = pursuitPresentationV7(
      fixture.view,
      fixture.offeredCommands,
    );
    expect(fixture.label).toBe("ENGINE_APPLIED_SYNTHETIC_FIXTURE");
    expect(pursuit).toMatchObject({
      phase: "PURSUIT_READY",
      attacksUsed: 1,
      attacksRemaining: 2,
      endCommand: { kind: "END_PURSUIT" },
    });
    expect(pursuit?.directAttackCommands.length).toBeGreaterThan(0);
    expect(
      pursuit?.pursueCommands.every((command) => command.path.length <= 2),
    ).toBe(true);

    const redacted: PlayerViewV7 = {
      ...fixture.view,
      unitStats: fixture.view.unitStats.map((stats) => ({
        ...stats,
        stats: stats.stats.map((stat) => ({
          ...stat,
          visibility: "BASE_ONLY" as const,
          modifiers: [],
        })),
      })),
    };
    expect(
      pursuitPresentationV7(redacted, fixture.offeredCommands)
        ?.directAttackCommands,
    ).toEqual(pursuit?.directAttackCommands);
  });

  it("uses the accepted Pursue boundary to switch to MOVED attack-or-end options", () => {
    const fixture = pursuitPublicFixtureV7();
    const pursue = fixture.offeredCommands.find(
      (command) => command.kind === "PURSUE",
    );
    if (pursue?.kind !== "PURSUE") throw new Error("Pursue fixture missing");
    const moved = applyCommandV7(
      fixture.state,
      fixture.state.humanPlayerId,
      pursue,
    );
    if (!moved.accepted) throw new Error(moved.error.code);
    const view = viewForV7(moved.state, moved.state.humanPlayerId);
    const commands = queryPlayerCommandsV7(view);
    expect(pursuitPresentationV7(view, commands)).toMatchObject({
      phase: "PURSUIT_MOVED",
      attacksUsed: 1,
      attacksRemaining: 2,
      pursueCommands: [],
      endCommand: { kind: "END_PURSUIT" },
    });
    expect(
      commands.every(
        (command) =>
          command.kind === "ATTACK" || command.kind === "END_PURSUIT",
      ),
    ).toBe(true);
  });

  it("deduplicates Defection targets while preserving ordered exact city choices", () => {
    const fixture = defectionPublicFixtureV7(true);
    const envoy = fixture.view.units.find(
      (unit) => unit.ownerId === fixture.view.viewer.id,
    );
    if (envoy === undefined) throw new Error("Envoy fixture missing");
    const targets = defectionTargetsV7(
      fixture.view,
      fixture.offeredCommands,
      envoy.id,
    );
    expect(targets).toHaveLength(1);
    const choices = targets[0]?.choices ?? [];
    expect(choices.length).toBeGreaterThan(1);
    expect(choices.map((choice) => choice.preview.reservedCity.cityId)).toEqual(
      [...choices]
        .map((choice) => choice.preview.reservedCity.cityId)
        .sort((left, right) => left - right),
    );
    expect(
      choices.every(
        ({ preview }) =>
          preview.reservedCity.reservedAfterOffer ===
          preview.reservedCity.reservedBeforeOffer + 1,
      ),
    ).toBe(true);
    const first = choices[0];
    if (first === undefined) throw new Error("Defection preview missing");
    const timeline = defectionTimelineV7(fixture.view, first.preview).join(" ");
    const replySeat = fixture.view.players.find(
      (player) => player.id === first.preview.replyBoundary.playerId,
    )?.seat;
    expect(timeline).toContain(`Player ${(replySeat ?? -1) + 1}`);
  });

  it("does not infer Defection links or reply escape from unavailable public state", () => {
    const fixture = defectionPublicFixtureV7(false);
    const source = fixture.view.units.find(
      (unit) => unit.ownerId === fixture.view.viewer.id,
    );
    const target = fixture.view.units.find(
      (unit) => unit.ownerId !== fixture.view.viewer.id,
    );
    if (source === undefined || target === undefined)
      throw new Error("Defection endpoints missing");
    const full = {
      visibility: "FULL" as const,
      markId: 77,
      sourceUnitId: source.id,
      targetUnitId: target.id,
      initiatingPlayerId: source.ownerId,
      targetOwnerId: target.ownerId,
      reservedHomeCityId: required(fixture.view.cities[0]).id,
      phase: "WAITING_FOR_REPLY" as const,
    };
    const marked = { ...fixture.view, defectionStatuses: [full] };
    expect(defectionLinksV7(marked)).toHaveLength(1);
    expect(
      defectionLinksV7({
        ...marked,
        units: marked.units.filter((unit) => unit.id !== target.id),
      }),
    ).toEqual([]);
    expect(
      defectionEscapeGeometryV7(marked, fixture.offeredCommands, full),
    ).toMatchObject({
      kind: "NOT_CURRENTLY_ACTIONABLE",
      reason: "NOT_TARGET_OWNER",
    });
  });

  it("keeps Blackout redacted arms and overlapping attachment reasons distinct", () => {
    const fixture = defectionPublicFixtureV7(false);
    const unit = fixture.view.units[0];
    const city = fixture.view.cities[0];
    if (unit === undefined || city === undefined)
      throw new Error("Status fixture missing");
    const view: PlayerViewV7 = {
      ...fixture.view,
      units: [
        {
          ...unit,
          visibility: {
            concealment: "OWNER_CAPABILITY",
            detection: {
              kind: "DETECTED",
              breakCondition: "OUTSIDE_ALL_LEGAL_DETECTOR_RANGE",
            },
            exposures: [
              {
                reason: "BLACKOUT",
                boundary: {
                  kind: "ANCHOR_NEXT_ACCEPTED_END_TURN",
                  anchorPlayerId: unit.ownerId,
                  round: { known: true, value: fixture.view.round + 1 },
                },
              },
            ],
          },
        },
      ],
      blackoutStatuses: [
        {
          visibility: "CITY_ONLY",
          cityId: city.id,
          phase: "ACTIVE",
        },
      ],
    };
    const attachments = tacticalAttachmentsV7(view);
    expect(attachments.map((attachment) => attachment.symbolId)).toEqual(
      expect.arrayContaining([
        "ui-status-concealed",
        "ui-status-detected",
        "ui-status-exposed",
        "ui-status-blackout-active",
      ]),
    );
    expect(blackoutStatusTextV7(required(view.blackoutStatuses[0]))).toBe(
      "Active · income suppression capped at 3 Coins; exact amount unavailable",
    );
  });

  it("supports a labeled hand-crafted public multi-city Blackout observation", () => {
    const fixture = blackoutPublicFixtureV7();
    const source = required(
      fixture.view.units.find(
        (unit) =>
          unit.ownerId === fixture.view.viewer.id && unit.role === "SABOTEUR",
      ),
    );
    const firstCity = required(
      fixture.view.cities.find(
        (city) => city.ownerId !== fixture.view.viewer.id,
      ),
    );
    const secondAt = [
      { x: source.at.x, y: source.at.y - 1 },
      { x: source.at.x, y: source.at.y + 1 },
      { x: source.at.x - 1, y: source.at.y },
    ].find(
      (at) =>
        at.x >= 0 &&
        at.y >= 0 &&
        at.x < fixture.view.board.width &&
        at.y < fixture.view.board.height &&
        !fixture.view.cities.some(
          (city) => city.at.x === at.x && city.at.y === at.y,
        ),
    );
    if (secondAt === undefined)
      throw new Error("Second public city coordinate missing");
    const secondCity = {
      ...firstCity,
      id: cityId(Math.max(...fixture.view.cities.map((city) => city.id)) + 100),
      at: secondAt,
    };
    const publicVariant: PlayerViewV7 = {
      ...fixture.view,
      cities: [...fixture.view.cities, secondCity].sort((a, b) => a.id - b.id),
    };
    const offered = [firstCity, secondCity].map(
      (city) =>
        ({
          kind: "BLACKOUT_CITY",
          unitId: source.id,
          cityId: city.id,
        }) as const,
    );
    expect(blackoutTargetsV7(publicVariant, offered, source.id)).toHaveLength(
      2,
    );
  });

  it("labels every public seat and uses only currently offered Guard road endpoints", () => {
    const fixture = defectionPublicFixtureV7(true);
    const source = required(
      fixture.view.units.find(
        (unit) => unit.ownerId !== fixture.view.viewer.id,
      ),
    );
    const target = required(
      fixture.view.units.find(
        (unit) => unit.ownerId === fixture.view.viewer.id,
      ),
    );
    const firstPreview = required(
      defectionTargetsV7(fixture.view, fixture.offeredCommands, target.id)[0]
        ?.choices[0]?.preview,
    );
    for (const player of fixture.view.players) {
      const timeline = defectionTimelineV7(fixture.view, {
        ...firstPreview,
        replyBoundary: { ...firstPreview.replyBoundary, playerId: player.id },
        earliestResolutionBoundary: {
          ...firstPreview.earliestResolutionBoundary,
          playerId: player.id,
        },
      }).join(" ");
      expect(timeline).toContain(`Player ${player.seat + 1}`);
    }

    const marked: PlayerViewV7 = {
      ...fixture.view,
      units: fixture.view.units.map((unit) =>
        unit.id === target.id
          ? { ...unit, role: "GUARD" as const, at: { x: 5, y: 4 } }
          : unit.id === source.id
            ? { ...unit, role: "ENVOY" as const, at: { x: 4, y: 4 } }
            : unit,
      ),
      board: {
        ...fixture.view.board,
        tiles: fixture.view.board.tiles.map((tile) =>
          tile.at.y === 4 && tile.at.x >= 5 && tile.at.x <= 7
            ? { ...tile, road: true }
            : tile,
        ),
      },
      defectionStatuses: [
        {
          visibility: "FULL",
          markId: 808,
          sourceUnitId: source.id,
          targetUnitId: target.id,
          initiatingPlayerId: source.ownerId,
          targetOwnerId: target.ownerId,
          reservedHomeCityId: required(fixture.view.cities[0]).id,
          phase: "WAITING_FOR_REPLY",
        },
      ],
    };
    const status = required(marked.defectionStatuses[0]);
    expect(
      defectionEscapeGeometryV7(
        marked,
        [{ kind: "MOVE", unitId: target.id, path: [{ x: 6, y: 4 }] }],
        status,
      ),
    ).toEqual({ kind: "EXACT", endpoints: [] });
    expect(
      defectionEscapeGeometryV7(
        marked,
        [
          {
            kind: "MOVE",
            unitId: target.id,
            path: [
              { x: 6, y: 4 },
              { x: 7, y: 4 },
            ],
          },
        ],
        status,
      ),
    ).toEqual({ kind: "EXACT", endpoints: [{ x: 7, y: 4 }] });
  });
});

function required<T>(value: T | undefined): T {
  if (value === undefined)
    throw new Error("Required tactical test value missing");
  return value;
}
