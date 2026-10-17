/**
 * The compact unit card (bead `pulp_wars-2yc.86`) in DOM tests: the dock's
 * main view is the portrait, name, HP, status chips and actions; the role,
 * faction, owner, the six stats and a giant's signature are in the details
 * dialog its "?" opens (a city's and a tile's details likewise). These
 * helpers open that dialog for the selected dock and return it.
 */

/** Opens the selected unit's details dialog and returns it. */
export function openUnitDetailsV7(root: ParentNode = document): HTMLElement {
  return openDetails(
    root,
    '.v7-selection-dock [data-action="unit-help"]',
    ".v7-unit-help-dialog",
  );
}

/** Opens the selected city's or tile's details dialog and returns it. */
export function openDockDetailsV7(root: ParentNode = document): HTMLElement {
  return openDetails(
    root,
    '.v7-selection-dock [data-action="dock-details"]',
    ".v7-dock-details-dialog",
  );
}

function openDetails(
  root: ParentNode,
  buttonSelector: string,
  dialogSelector: string,
): HTMLElement {
  const open = root.querySelector<HTMLElement>(dialogSelector);
  if (open !== null) return open;
  const button = root.querySelector<HTMLButtonElement>(buttonSelector);
  if (button === null) throw new Error(`${buttonSelector} missing`);
  button.click();
  const dialog = root.querySelector<HTMLElement>(dialogSelector);
  if (dialog === null) throw new Error(`${dialogSelector} missing`);
  return dialog;
}

/** Closes an open unit, city or tile details dialog. */
export function closeDetailsV7(root: ParentNode = document): void {
  root
    .querySelector<HTMLButtonElement>(
      '[data-action="close-unit-help"], [data-action="close-dock-details"]',
    )
    ?.click();
}
