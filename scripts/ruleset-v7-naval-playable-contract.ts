import type { CommandV7 } from "../src/engine/index";

export interface NavalPlayableCommandRecordV7 {
  readonly command: CommandV7;
  readonly events: readonly { readonly kind: string }[];
}

export interface CoastOscillationV7 {
  readonly unitId: number;
  readonly landingAt: string;
}

export interface NavalPlayableMatrixSelectionV7 {
  readonly skipMatrix: boolean;
  readonly matrixStart: number;
  readonly partialMatrix: boolean;
}

export function parseNavalPlayableMatrixSelectionV7(
  args: readonly string[],
): NavalPlayableMatrixSelectionV7 {
  const skipMatrix = args.includes("--skip-matrix");
  const startArguments = args.filter((argument) =>
    argument.startsWith("--matrix-start="),
  );
  if (startArguments.length > 1)
    throw new RangeError("--matrix-start may be provided once");
  if (skipMatrix && startArguments.length > 0)
    throw new RangeError("--matrix-start is incompatible with --skip-matrix");
  const text = startArguments[0]?.slice("--matrix-start=".length);
  const matrixStart = text === undefined ? 0 : Number(text);
  if (
    text === "" ||
    !Number.isSafeInteger(matrixStart) ||
    matrixStart < 0 ||
    matrixStart > 39
  )
    throw new RangeError("--matrix-start must be a safe integer from 0 to 39");
  return {
    skipMatrix,
    matrixStart,
    partialMatrix: !skipMatrix && matrixStart > 0,
  };
}

/** Finds a landing followed by reembarkation without combat, capture, or reveal progress. */
export function findCoastOscillationV7(
  log: readonly NavalPlayableCommandRecordV7[],
): CoastOscillationV7 | null {
  const landed = new Map<number, { meaningful: boolean; at: string }>();
  for (const { command, events } of log) {
    if (command.kind === "DISEMBARK")
      landed.set(command.unitId, {
        meaningful: events.some((event) => event.kind === "TILES_REVEALED"),
        at: `${command.at.x},${command.at.y}`,
      });
    else if (
      "unitId" in command &&
      (command.kind === "ATTACK" ||
        command.kind === "CAPTURE" ||
        events.some((event) => event.kind === "TILES_REVEALED")) &&
      landed.has(command.unitId)
    )
      landed.set(command.unitId, {
        ...(landed.get(command.unitId) as {
          meaningful: boolean;
          at: string;
        }),
        meaningful: true,
      });
    else if (
      command.kind === "MOVE" &&
      events.some((event) => event.kind === "UNIT_EMBARKED")
    ) {
      const previous = landed.get(command.unitId);
      if (previous !== undefined && !previous.meaningful)
        return { unitId: command.unitId, landingAt: previous.at };
      landed.delete(command.unitId);
    }
  }
  return null;
}
