/**
 * Styled pickers (bead `pulp_wars-2yc.65`, docs/ui/STYLE.md "Picker"): the
 * menus' replacement for the browser's native dropdown. Each picker is a
 * `<label>` holding the name, the visible control and a hidden `<select>`
 * that stays the form's one value (as the tribe grid's hidden "Your faction"
 * select does), so form code reads and sets `select.value` as before and a
 * change still fires `change` on the select.
 *
 * - `list`: a button in the Control recipe that opens a styled list under it
 *   (the select-only combobox pattern: focus stays on the button, the active
 *   option is its `aria-activedescendant`). Arrow keys, Home, End and a
 *   first letter move; Enter or Space picks; Escape or Tab closes; a click
 *   outside closes.
 * - `segmented`: one button per option in a row (short lists), the chosen
 *   one pressed, like the game-mode toggle.
 *
 * The handlers find their picker from the event, never from a closure, so a
 * picker survives the match's DOM reconciliation (which keeps the old nodes
 * and copies `onclick`/`onkeydown` from the new ones). Which list is open is
 * kept per document, so a redraw draws it open again.
 */

export type PickerStyleV7 = "list" | "segmented";

interface OpenPickerV7 {
  readonly id: string;
  active: number;
}

const OPEN_PICKERS = new WeakMap<Document, OpenPickerV7>();
const OUTSIDE_CLOSERS = new WeakSet<Document>();

/** A picker field: the name, the control and the hidden select `id`. */
export function pickerFieldV7(
  documentRoot: Document,
  labelText: string,
  id: string,
  values: readonly string[],
  selected: string,
  labels: Readonly<Record<string, string>> = {},
  style: PickerStyleV7 = "list",
): HTMLLabelElement {
  watchOutsideV7(documentRoot);
  const label = documentRoot.createElement("label");
  label.className = "v7-picker-field";
  label.dataset.picker = style;
  const name = documentRoot.createElement("span");
  name.className = "v7-picker-name";
  name.id = `${id}-name`;
  name.textContent = labelText;
  const field = documentRoot.createElement("select");
  field.id = id;
  field.className = "v7-picker-store";
  field.hidden = true;
  field.tabIndex = -1;
  field.setAttribute("aria-hidden", "true");
  fillPickerOptionsV7(documentRoot, field, values, selected, labels);
  field.addEventListener("change", onStoreChange);
  const control = documentRoot.createElement("div");
  control.className = "v7-picker";
  control.dataset.pickerFor = id;
  if (style === "list") {
    // The name opens the list (a click on the name clicks the button).
    label.htmlFor = `${id}-control`;
    const button = documentRoot.createElement("button");
    button.type = "button";
    button.id = `${id}-control`;
    button.className = "v7-picker-button";
    button.setAttribute("role", "combobox");
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", `${id}-list`);
    button.setAttribute("aria-labelledby", name.id);
    button.onclick = onButtonClick;
    button.onkeydown = onButtonKey;
    const value = documentRoot.createElement("span");
    value.className = "v7-picker-value";
    const caret = documentRoot.createElement("span");
    caret.className = "v7-picker-caret";
    caret.setAttribute("aria-hidden", "true");
    button.append(value, caret);
    const list = documentRoot.createElement("ul");
    list.id = `${id}-list`;
    list.className = "v7-picker-list";
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-labelledby", name.id);
    list.tabIndex = -1;
    list.hidden = true;
    // Pressing an option keeps focus on the button.
    list.onmousedown = (event) => event.preventDefault();
    control.append(button, list);
  } else {
    // The hidden select is the label's control: a click on the name does
    // not press the first option.
    label.htmlFor = id;
    control.setAttribute("role", "group");
    control.setAttribute("aria-labelledby", name.id);
  }
  label.append(name, control, field);
  syncPickerV7(label);
  return label;
}

/** Replaces the options of a picker's hidden select (then sync the picker). */
export function fillPickerOptionsV7(
  documentRoot: Document,
  field: HTMLSelectElement,
  values: readonly string[],
  selected: string,
  labels: Readonly<Record<string, string>> = {},
): void {
  field.replaceChildren(
    ...values.map((entry) => {
      const option = documentRoot.createElement("option");
      option.value = entry;
      option.textContent = labels[entry] ?? entry;
      option.selected = entry === selected;
      return option;
    }),
  );
}

/** Brings every picker under `root` in line with its hidden select. */
export function syncPickersV7(root: ParentNode): void {
  for (const label of root.querySelectorAll<HTMLElement>(".v7-picker-field"))
    syncPickerV7(label);
}

/**
 * Brings one picker in line with its select: the shown value, the options,
 * what is disabled, and the select's tooltip, description and "moved" mark.
 */
export function syncPickerV7(label: HTMLElement): void {
  const field = label.querySelector<HTMLSelectElement>(
    "select.v7-picker-store",
  );
  const control = label.querySelector<HTMLElement>(".v7-picker");
  if (field === null || control === null) return;
  const documentRoot = label.ownerDocument;
  const options = Array.from(field.options);
  if (label.dataset.picker === "segmented") {
    const buttons = Array.from(
      control.querySelectorAll<HTMLButtonElement>(".v7-picker-segment"),
    );
    const same =
      buttons.length === options.length &&
      buttons.every((node, index) => node.value === options[index]?.value);
    if (!same)
      control.replaceChildren(
        ...options.map((option) => {
          const node = documentRoot.createElement("button");
          node.type = "button";
          node.className = "v7-picker-segment";
          node.value = option.value;
          node.dataset.action = `${field.id.replace(/^v7-/, "")}-${option.value.toLowerCase()}`;
          node.onclick = onSegmentClick;
          return node;
        }),
      );
    for (const [index, node] of Array.from(
      control.querySelectorAll<HTMLButtonElement>(".v7-picker-segment"),
    ).entries()) {
      const option = options[index];
      if (option === undefined) continue;
      if (node.textContent !== option.textContent)
        node.textContent = option.textContent;
      node.setAttribute("aria-pressed", String(option.value === field.value));
      node.disabled = field.disabled || option.disabled;
    }
    copyHints(field, control);
    return;
  }
  const button = control.querySelector<HTMLButtonElement>(".v7-picker-button");
  const list = control.querySelector<HTMLElement>(".v7-picker-list");
  if (button === null || list === null) return;
  const shown = field.selectedOptions[0]?.textContent ?? "";
  const value = button.querySelector(".v7-picker-value");
  if (value !== null && value.textContent !== shown) value.textContent = shown;
  button.disabled = field.disabled;
  copyHints(field, button);
  if (field.dataset.moved === undefined) delete button.dataset.moved;
  else button.dataset.moved = field.dataset.moved;
  const open = OPEN_PICKERS.get(documentRoot);
  if (open?.id === field.id && !field.disabled) {
    renderList(field, button, list, open.active);
  } else {
    if (open?.id === field.id) OPEN_PICKERS.delete(documentRoot);
    closeList(button, list);
  }
}

/** Closes any open picker list in the document. */
export function closePickersV7(documentRoot: Document): void {
  const open = OPEN_PICKERS.get(documentRoot);
  if (open === undefined) return;
  OPEN_PICKERS.delete(documentRoot);
  const label = documentRoot
    .getElementById(open.id)
    ?.closest<HTMLElement>(".v7-picker-field");
  if (label != null) syncPickerV7(label);
}

function copyHints(field: HTMLSelectElement, target: HTMLElement): void {
  if (field.title === "") target.removeAttribute("title");
  else target.title = field.title;
  const description = field.getAttribute("aria-description");
  if (description === null) target.removeAttribute("aria-description");
  else target.setAttribute("aria-description", description);
}

function renderList(
  field: HTMLSelectElement,
  button: HTMLButtonElement,
  list: HTMLElement,
  active: number,
): void {
  const documentRoot = field.ownerDocument;
  const options = Array.from(field.options);
  const opening = list.hidden;
  // The items are made once per opening and then updated in place, so the
  // list keeps its scroll while the active option moves.
  const items = Array.from(list.querySelectorAll<HTMLElement>("li"));
  if (
    items.length !== options.length ||
    items.some((item, index) => item.dataset.value !== options[index]?.value)
  )
    list.replaceChildren(
      ...options.map((option, index) => {
        const item = documentRoot.createElement("li");
        item.id = `${field.id}-option-${index}`;
        item.className = "v7-picker-option";
        item.setAttribute("role", "option");
        item.dataset.value = option.value;
        item.dataset.index = String(index);
        item.onclick = onOptionClick;
        item.onpointermove = onOptionHover;
        return item;
      }),
    );
  for (const [index, item] of Array.from(
    list.querySelectorAll<HTMLElement>("li"),
  ).entries()) {
    const option = options[index];
    if (option === undefined) continue;
    if (item.textContent !== option.textContent)
      item.textContent = option.textContent;
    item.setAttribute("aria-selected", String(option.value === field.value));
    if (option.disabled) item.setAttribute("aria-disabled", "true");
    else item.removeAttribute("aria-disabled");
    if (index === active) item.dataset.active = "true";
    else delete item.dataset.active;
  }
  list.hidden = false;
  button.setAttribute("aria-expanded", "true");
  if (opening) placeList(button, list);
  const current = list.querySelector<HTMLElement>('[data-active="true"]');
  if (current === null) button.removeAttribute("aria-activedescendant");
  else {
    button.setAttribute("aria-activedescendant", current.id);
    // The active option scrolls into the list's own view (never the page).
    const top = current.offsetTop;
    const bottom = top + current.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight)
      list.scrollTop = bottom - list.clientHeight;
  }
}

/**
 * Opens the list upward when it would leave the window below and there is
 * more room above, and keeps it inside the window on that side.
 */
function placeList(button: HTMLButtonElement, list: HTMLElement): void {
  const room = button.ownerDocument.defaultView?.innerHeight ?? 0;
  list.style.removeProperty("max-height");
  const box = button.getBoundingClientRect();
  const height = list.getBoundingClientRect().height + 12;
  const above =
    height > 12 && box.bottom + height > room && box.top > room - box.bottom;
  list.dataset.placement = above ? "above" : "below";
  if (room <= 0 || height <= 12) return;
  const space = Math.floor((above ? box.top : room - box.bottom) - 12);
  list.style.maxHeight = `min(20rem, 60vh, ${Math.max(132, space)}px)`;
}

function closeList(button: HTMLButtonElement, list: HTMLElement): void {
  list.hidden = true;
  list.replaceChildren();
  button.setAttribute("aria-expanded", "false");
  button.removeAttribute("aria-activedescendant");
}

function parts(node: Element | null): {
  readonly label: HTMLElement;
  readonly field: HTMLSelectElement;
  readonly button: HTMLButtonElement | null;
} | null {
  const label = node?.closest<HTMLElement>(".v7-picker-field") ?? null;
  const field =
    label?.querySelector<HTMLSelectElement>("select.v7-picker-store") ?? null;
  if (label === null || field === null) return null;
  return {
    label,
    field,
    button: label.querySelector<HTMLButtonElement>(".v7-picker-button"),
  };
}

/** The next enabled option from `from` in `step` direction, or `from`. */
function stepActive(
  field: HTMLSelectElement,
  from: number,
  step: number,
): number {
  const options = Array.from(field.options);
  for (
    let index = from + step;
    index >= 0 && index < options.length;
    index += step
  )
    if (options[index]?.disabled !== true) return index;
  return from;
}

function firstEnabled(field: HTMLSelectElement, fromEnd: boolean): number {
  const options = Array.from(field.options);
  const order = options.map((_, index) => index);
  if (fromEnd) order.reverse();
  return order.find((index) => options[index]?.disabled !== true) ?? -1;
}

function openPicker(
  label: HTMLElement,
  field: HTMLSelectElement,
  active: number,
): void {
  const documentRoot = label.ownerDocument;
  if (field.disabled) return;
  const previous = OPEN_PICKERS.get(documentRoot);
  OPEN_PICKERS.set(documentRoot, { id: field.id, active });
  if (previous !== undefined && previous.id !== field.id) {
    const other = documentRoot
      .getElementById(previous.id)
      ?.closest<HTMLElement>(".v7-picker-field");
    if (other != null) syncPickerV7(other);
  }
  syncPickerV7(label);
}

function setActive(label: HTMLElement, active: number): void {
  const open = OPEN_PICKERS.get(label.ownerDocument);
  if (open === undefined) return;
  open.active = active;
  syncPickerV7(label);
}

function choose(
  label: HTMLElement,
  field: HTMLSelectElement,
  index: number,
): void {
  const option = field.options[index];
  OPEN_PICKERS.delete(label.ownerDocument);
  syncPickerV7(label);
  if (option === undefined || option.disabled) return;
  if (field.value !== option.value) {
    field.value = option.value;
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function isOpen(field: HTMLSelectElement): boolean {
  return OPEN_PICKERS.get(field.ownerDocument)?.id === field.id;
}

function onStoreChange(event: Event): void {
  const found = parts(event.currentTarget as Element);
  if (found !== null) syncPickerV7(found.label);
}

function onButtonClick(event: MouseEvent): void {
  const found = parts(event.currentTarget as Element);
  if (found === null) return;
  if (isOpen(found.field)) {
    OPEN_PICKERS.delete(found.label.ownerDocument);
    syncPickerV7(found.label);
  } else
    openPicker(
      found.label,
      found.field,
      found.field.options[found.field.selectedIndex]?.disabled === false
        ? found.field.selectedIndex
        : firstEnabled(found.field, false),
    );
}

function onButtonKey(event: KeyboardEvent): void {
  if (event.altKey && event.key !== "ArrowDown" && event.key !== "ArrowUp")
    return;
  if (event.ctrlKey || event.metaKey) return;
  const found = parts(event.currentTarget as Element);
  if (found === null) return;
  const { label, field } = found;
  const open = OPEN_PICKERS.get(label.ownerDocument);
  const current =
    open?.id === field.id ? open.active : Math.max(field.selectedIndex, 0);
  const handled = (): void => {
    event.preventDefault();
    event.stopPropagation();
  };
  if (open?.id !== field.id) {
    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowUp" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      handled();
      openPicker(label, field, current);
    } else if (event.key === "Home" || event.key === "End") {
      handled();
      openPicker(label, field, firstEnabled(field, event.key === "End"));
    }
    return;
  }
  switch (event.key) {
    case "ArrowDown":
      handled();
      if (event.altKey) choose(label, field, current);
      else setActive(label, stepActive(field, current, 1));
      return;
    case "ArrowUp":
      handled();
      if (event.altKey) choose(label, field, current);
      else setActive(label, stepActive(field, current, -1));
      return;
    case "Home":
    case "End":
      handled();
      setActive(label, firstEnabled(field, event.key === "End"));
      return;
    case "PageDown":
    case "PageUp": {
      handled();
      let next = current;
      for (let step = 0; step < 5; step += 1)
        next = stepActive(field, next, event.key === "PageDown" ? 1 : -1);
      setActive(label, next);
      return;
    }
    case "Enter":
    case " ":
      handled();
      choose(label, field, current);
      return;
    case "Escape":
      handled();
      OPEN_PICKERS.delete(label.ownerDocument);
      syncPickerV7(label);
      return;
    case "Tab":
      // Tab moves on as usual; the list closes behind it.
      OPEN_PICKERS.delete(label.ownerDocument);
      syncPickerV7(label);
      return;
    default:
      if (event.key.length === 1 && /\S/.test(event.key)) {
        // A first letter jumps to the next option starting with it.
        handled();
        const letter = event.key.toLowerCase();
        const options = Array.from(field.options);
        for (let step = 1; step <= options.length; step += 1) {
          const index = (current + step) % options.length;
          const option = options[index];
          if (
            option !== undefined &&
            !option.disabled &&
            (option.textContent ?? "").trim().toLowerCase().startsWith(letter)
          ) {
            setActive(label, index);
            return;
          }
        }
      }
  }
}

function onOptionClick(event: MouseEvent): void {
  // The option sits inside the label: cancelling the click keeps the label
  // from passing it on to the button.
  event.preventDefault();
  const item = event.currentTarget as HTMLElement;
  const found = parts(item);
  if (found === null) return;
  const index = Number(item.dataset.index);
  if (item.getAttribute("aria-disabled") === "true") return;
  choose(found.label, found.field, index);
  found.button?.focus();
}

function onOptionHover(event: PointerEvent): void {
  const item = event.currentTarget as HTMLElement;
  if (item.dataset.active === "true") return;
  if (item.getAttribute("aria-disabled") === "true") return;
  const found = parts(item);
  if (found !== null) setActive(found.label, Number(item.dataset.index));
}

function onSegmentClick(event: MouseEvent): void {
  const node = event.currentTarget as HTMLButtonElement;
  const found = parts(node);
  if (found === null || node.disabled) return;
  const { field } = found;
  if (field.value === node.value) return;
  field.value = node.value;
  field.dispatchEvent(new Event("change", { bubbles: true }));
  syncPickerV7(found.label);
}

/** One listener per document closes an open list on a press outside it. */
function watchOutsideV7(documentRoot: Document): void {
  if (OUTSIDE_CLOSERS.has(documentRoot)) return;
  OUTSIDE_CLOSERS.add(documentRoot);
  documentRoot.addEventListener(
    "pointerdown",
    (event) => {
      const open = OPEN_PICKERS.get(documentRoot);
      if (open === undefined) return;
      // A press on the picker itself (its name, button or list) is its own.
      const field = documentRoot
        .getElementById(open.id)
        ?.closest<HTMLElement>(".v7-picker-field");
      const target = event.target;
      if (field != null && target instanceof Node && field.contains(target))
        return;
      closePickersV7(documentRoot);
    },
    true,
  );
}
