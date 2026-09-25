# Ruleset 7 revision 10: Playtest corrections

**Status:** authoritative current runtime overlay.

**Ruleset ID:** `pulp-wars-poc-7r10`

**Scope:** this document is a narrow overlay over the implemented
[revision-9 Human technology contract](RULESET_7_REVISION_9_HUMAN_TECHNOLOGY.md).
It changes Road movement, city-center unit spawning, Fortify eligibility, and
the current runtime identity. Every unmentioned revision-9 rule remains in
force. Rulesets 5 and 6 and historical Ruleset-7 fixtures remain frozen.

## Identity and compatibility

| Boundary                                   | Revision-10 value                   |
| ------------------------------------------ | ----------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7r10`                |
| Game-state schema                          | `7`                                 |
| Command/event/save/replay numeric versions | `7`                                 |
| Browser autosave                           | `pulpWars.save.v7r10.current`       |
| Map revision                               | `REGIONAL_BIOMES_NAVAL_V2`          |
| Faction/tree                               | `ORIGINAL` / `ORIGINAL_BASELINE_V5` |

The revision-10 reader rejects older Ruleset-7 identities rather than
reinterpreting them. Current-route startup deletes only the known obsolete
Ruleset-7 current-save keys through `pulpWars.save.v7r9.current`. It preserves
the Ruleset-6 save, settings, historical fixtures, and unrelated storage.

## Road movement

With Roads researched, each adjacent land step costs half a movement point when
both endpoints are usable Road nodes. A usable node is an own or neutral Road
tile, or the center of a city owned by the moving player. A Move 1 unit can
therefore cross two consecutive usable Road edges. The edges do not need to
connect to the capital or any trade network. A valid Road edge also bypasses
the ordinary Forest and Mountain terrain stop after paying the half-point cost.

Road movement does not change terrain access, fog, occupancy, zone-of-control,
alliance, or form rules. Entering a Mountain still requires Engineering. Road
movement and the trade-income network are separate graphs.

## City-center unit spawning

Training and the Militia and Juggernaut city rewards create their unit on the
city center. Militia continues to create a Fighter. Normal training retains its
existing cost, technology, capacity, and besieged-city checks.

If a living unit occupies the center, move that unit to the first legal free
adjacent land cell in canonical `y`, then `x`, order. The destination must be
terrain-accessible to the displaced unit, must not contain another unit or a
treasure, and must respect allied-territory restrictions. This displacement
does not chain, embark the unit, reset its activation, change its home city, or
place it remotely. It clears immediate capture eligibility. If no adjacent
destination exists, remove the old occupant without a refund or combat kill
credit; the requested trained or reward unit still appears on the center.

The displacement has its own strict event. Public projection reveals that
event only to the spawning player or to an observer who can see the relevant
coordinates and units. It is not a combat or death event. Headless loss
accounting records an occupant removed for lack of a destination, while combat
kill accounting remains unchanged.

After spawning and displacement, each surviving unit reveals its normal sight
from its resulting cell, including terrain sight modifiers. Achievement
evaluation uses the resulting explored state. Treasure locations remain
reserved and are never used as forced displacement destinations.

## Fortify eligibility

A Fighter or Guard may build Field Defense only if it has remained unmoved and
unused for the full current turn. A unit that moved earlier in the turn cannot
Fortify even if it has another action available. Fortifying consumes the unit's
full turn, so that unit cannot subsequently Move or Attack in the same turn.
