/**
 * Revision 13 development flag (Undead spec section 10.2). `?undead=1` with
 * exactly one `undead` value, equal to `1`, shows per-seat faction choice in
 * Ruleset 7 setup. It is honoured in every build, never persisted, and gates
 * only the setup UI: saves and replays with Undead seats load without it.
 */
export function undeadSetupFlagFromSearchV7(search: string): boolean {
  const values = new URLSearchParams(search).getAll("undead");
  return values.length === 1 && values[0] === "1";
}
