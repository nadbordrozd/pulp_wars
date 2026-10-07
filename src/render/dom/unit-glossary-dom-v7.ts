import { GLOSSARY_TERM_IDS_V7, glossaryEntryV7 } from "../unit-glossary-v7";

/**
 * The unit glossary in the DOM (bead pulp_wars-2yc.39): the list of a
 * unit's abilities and the folded-away list of the terms its card shows.
 * The unit "?" dialog, the recruit "?" dialog and the Gallery share them.
 */
export interface GlossaryLineV7 {
  readonly id: string;
  readonly name: string;
  readonly text: string;
}

function line(
  documentRoot: Document,
  className: string,
  entry: GlossaryLineV7,
): HTMLElement {
  const item = documentRoot.createElement("p");
  item.className = className;
  item.dataset.glossary = entry.id;
  const name = documentRoot.createElement("strong");
  name.textContent = entry.name;
  const sentence = documentRoot.createElement("span");
  sentence.textContent = entry.text;
  item.append(name, sentence);
  return item;
}

/**
 * One line per entry: its name in bold and its sentence. `decorate` may
 * give a line the icon the game already has for it (Charge!, Bow Ram).
 */
export function glossaryListV7(
  documentRoot: Document,
  lines: readonly GlossaryLineV7[],
  decorate?: (entry: GlossaryLineV7, element: HTMLElement) => void,
): HTMLElement {
  const list = documentRoot.createElement("div");
  list.className = "v7-abilities";
  for (const entry of lines) {
    const element = line(documentRoot, "v7-unit-ability", entry);
    decorate?.(entry, element);
    list.append(element);
  }
  return list;
}

/**
 * "What the numbers mean": the terms of a unit card, closed until asked
 * for, so the dialog stays short.
 */
export function glossaryTermsV7(documentRoot: Document): HTMLDetailsElement {
  const details = documentRoot.createElement("details");
  details.className = "v7-glossary-terms";
  const summary = documentRoot.createElement("summary");
  summary.textContent = "What the numbers mean";
  const list = documentRoot.createElement("div");
  list.className = "v7-glossary-term-list";
  for (const id of GLOSSARY_TERM_IDS_V7)
    list.append(line(documentRoot, "v7-glossary-term", glossaryEntryV7(id)));
  details.append(summary, list);
  return details;
}
