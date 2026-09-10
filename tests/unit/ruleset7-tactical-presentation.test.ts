import { describe, expect, it } from "vitest";
import { cityId, type PlayerViewV7 } from "../../src/engine/index";
import {
  blackoutStatusTextV7,
  blackoutTargetsV7,
  tacticalAttachmentsV7,
} from "../../src/render/tactical-presentation-v7";
import { blackoutPublicFixtureV7 } from "../fixtures/ruleset7-tactical-ui";

describe("Ruleset 7 tactical presentation", () => {
  it("keeps Blackout redacted arms and overlapping attachment reasons distinct", () => {
    const fixture = blackoutPublicFixtureV7();
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
});

function required<T>(value: T | undefined): T {
  if (value === undefined)
    throw new Error("Required tactical test value missing");
  return value;
}
