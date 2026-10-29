import type { GeneratedMapTypeV7 } from "../../engine/v7/map-scale";
import { GENERATED_MAP_TYPES_V7 } from "../../engine/v7/map-scale";
import {
  DIFFICULTIES_V7,
  OFFERED_FACTION_IDS_V7,
  type FactionIdV7,
} from "../../engine/v7/types";
import {
  ONLINE_AI_SEATS_MAX_V7,
  onlineMaxAiSeatsV7,
  onlineSizesV7,
  normalizeRoomCodeV7,
  GUEST_SEAT_V7,
  HOST_SEAT_V7,
  type FactionPickV7,
  type OnlineLobbySessionV7,
  type OnlineLobbyStateV7,
  type OnlineMatchHandoffV7,
  type OnlineMatchOptionsV7,
} from "../../online/index";
import { factionColourV7 } from "../canvas/faction-colours-v7";
import { QUICK_DIFFICULTY_LABELS_V7 } from "../quick-start-v7";
import { ALLIANCE_LABELS_V7 } from "../score-presentation-v7";
import { GAME_MODE_LABELS_V7 } from "../tribe-stars-presentation-v7";
import { factionNameV7 } from "../undead-presentation-v7";
import { pickerFieldV7, syncPickersV7, syncPickerV7 } from "./picker-v7";
import { uiIconV7, type UiIconIdV7 } from "./ui-icons-v7";

/**
 * The Play online screen (`pulp_wars-eqc6.2`, docs/MULTIPLAYER.md
 * section 10): the home screen (Host a game, Join with code), the lobby
 * seen through a share link (one Join tap), and the lobby itself (the room
 * code, the link with Copy and Share, the seats, your faction, the host's
 * Settings and Start). It draws an {@link OnlineLobbySessionV7} and calls
 * its actions; the app view puts {@link OnlineLobbyViewV7.root} in its
 * front panel.
 *
 * The root is kept for the session's life and redrawn in place on every
 * change, so the app view's own redraws only move it. The two text fields
 * (name and code) are kept across redraws, so typing and focus survive the
 * other player's changes arriving.
 */

export const ONLINE_MAP_LABELS_V7: Readonly<
  Record<GeneratedMapTypeV7, string>
> = {
  DRY_LAND: "Dry land",
  PANGEA: "Pangea",
  CONTINENTS: "Continents",
  ARCHIPELAGO: "Archipelago",
  LAKES: "Lakes",
};

export interface OnlineShareDataV7 {
  readonly title: string;
  readonly text: string;
  readonly url: string;
}

export interface OnlineLobbyViewOptionsV7 {
  /** A faction's emblem (the app view's portrait in the faction's ring). */
  readonly factionEmblem: (faction: FactionIdV7) => HTMLElement;
  /** Whether this player may not lead `faction` yet (the faction locks). */
  readonly factionLocked?: (faction: FactionIdV7) => boolean;
  /** Copies text; resolves false when the browser refused. */
  readonly copy?: (text: string) => Promise<boolean>;
  /** The Web Share API, where the browser has it (phones); else null. */
  readonly share?: ((data: OnlineShareDataV7) => Promise<void>) | null;
  /** Reloads the page (an outdated build). */
  readonly reload?: () => void;
  /** Called once when the host's Start reached this browser. */
  readonly onStarted?: (handoff: OnlineMatchHandoffV7) => void;
}

/** A typed or pasted room code, cleaned as the player types it. */
export function formatRoomCodeInputV7(raw: string): string {
  const code = normalizeRoomCodeV7(raw);
  if (code !== null) return code;
  const fromLink = /[?&]join=([^&#\s]*)/i.exec(raw)?.[1];
  return (fromLink ?? raw)
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 5);
}

/** The settings in one line ("Continents · 14 × 14 · No AI · Domination"). */
export function onlineOptionsSummaryV7(options: OnlineMatchOptionsV7): string {
  const parts = [
    ONLINE_MAP_LABELS_V7[options.mapType],
    `${options.width} × ${options.width}`,
    options.aiSeats === 0
      ? "No AI"
      : `${options.aiSeats} AI · ${QUICK_DIFFICULTY_LABELS_V7[options.difficulty]}${options.aiSeats > 1 && options.aiMode === "COOPERATIVE" ? " · allied" : ""}`,
    GAME_MODE_LABELS_V7[options.gameMode],
  ];
  if (!options.curiosities) parts.push("No curiosities");
  return parts.join(" · ");
}

/** A pick in words: the faction's name, or Random. */
export function factionPickLabelV7(pick: FactionPickV7): string {
  return pick === "RANDOM" ? "Random" : factionNameV7(pick);
}

export class OnlineLobbyViewV7 {
  readonly root: HTMLElement;
  readonly #document: Document;
  readonly #session: OnlineLobbySessionV7;
  readonly #options: OnlineLobbyViewOptionsV7;
  readonly #unsubscribe: () => void;
  readonly #nameField: HTMLInputElement;
  readonly #codeField: HTMLInputElement;
  #settingsOpen = false;
  #editingName = false;
  #nameProblem = "";
  #copied: "COPIED" | "FAILED" | null = null;
  #copiedTimer: ReturnType<typeof setTimeout> | null = null;
  #signature = "";
  #handedOff: OnlineMatchHandoffV7 | null = null;

  constructor(
    documentRoot: Document,
    session: OnlineLobbySessionV7,
    options: OnlineLobbyViewOptionsV7,
  ) {
    this.#document = documentRoot;
    this.#session = session;
    this.#options = options;
    this.root = documentRoot.createElement("div");
    this.root.className = "v7-online";
    this.root.dataset.v7Region = "online";
    this.#nameField = documentRoot.createElement("input");
    this.#nameField.id = "v7-online-name";
    this.#nameField.type = "text";
    this.#nameField.setAttribute("autocomplete", "nickname");
    this.#nameField.maxLength = 16;
    this.#nameField.spellcheck = false;
    this.#nameField.placeholder = "Your name";
    this.#nameField.value = session.state.name;
    this.#nameField.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      this.#saveName();
      if (this.#nameProblem === "") this.#primary();
    });
    this.#codeField = documentRoot.createElement("input");
    this.#codeField.id = "v7-online-code";
    this.#codeField.type = "text";
    this.#codeField.autocomplete = "off";
    this.#codeField.autocapitalize = "characters";
    this.#codeField.spellcheck = false;
    this.#codeField.inputMode = "text";
    this.#codeField.placeholder = "ABCDE";
    this.#codeField.setAttribute("aria-describedby", "v7-online-code-hint");
    this.#codeField.addEventListener("input", () => {
      const cleaned = formatRoomCodeInputV7(this.#codeField.value);
      if (cleaned !== this.#codeField.value) this.#codeField.value = cleaned;
      this.#syncJoinButton();
    });
    this.#codeField.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      this.#joinWithCode();
    });
    this.root.addEventListener("change", this.#onChange);
    this.#unsubscribe = session.subscribe(() => this.render());
    this.render();
  }

  destroy(): void {
    this.#unsubscribe();
    this.root.removeEventListener("change", this.#onChange);
    if (this.#copiedTimer !== null) clearTimeout(this.#copiedTimer);
  }

  /** Draws the session's state (skipped when nothing shown has changed). */
  render(force = false): void {
    const state = this.#session.state;
    if (state.handoff !== null && this.#handedOff !== state.handoff) {
      this.#handedOff = state.handoff;
      this.#options.onStarted?.(state.handoff);
    }
    const signature = JSON.stringify([
      state.screen,
      state.busy,
      state.code,
      state.message,
      state.name,
      state.pick,
      state.options,
      state.match?.record ?? null,
      state.mySeat,
      state.offline,
      state.shareLink,
      this.#settingsOpen,
      this.#editingName,
      this.#nameProblem,
      this.#copied,
    ]);
    if (!force && signature === this.#signature) return;
    this.#signature = signature;
    const active = this.#document.activeElement;
    const focus =
      active instanceof HTMLElement && this.root.contains(active)
        ? active === this.#nameField || active === this.#codeField
          ? null
          : active.id !== ""
            ? `#${active.id}`
            : active.dataset.action === undefined
              ? null
              : `[data-action="${active.dataset.action}"]`
        : null;
    this.root.dataset.screen = state.screen.toLowerCase();
    this.root.setAttribute("aria-busy", String(state.busy !== null));
    const content: HTMLElement[] =
      state.screen === "HOME"
        ? this.#home(state)
        : state.screen === "PREVIEW"
          ? this.#preview(state)
          : state.screen === "LOBBY"
            ? this.#lobby(state)
            : this.#started(state);
    this.root.replaceChildren(...content);
    syncPickersV7(this.root);
    this.#syncJoinButton();
    if (focus !== null)
      this.root.querySelector<HTMLElement>(focus)?.focus({
        preventScroll: true,
      });
  }

  // -------------------------------------------------------------------
  // Screens

  #home(state: OnlineLobbyStateV7): HTMLElement[] {
    const nodes: HTMLElement[] = [
      this.#text(
        "p",
        "Play a friend online. Add AI players if you like.",
        "v7-online-lede",
      ),
      this.#nameBlock(state),
    ];
    const host = this.#button(
      state.busy === "HOST" ? "Hosting…" : "Host a game",
      "online-host",
      "primary-action v7-online-host",
    );
    host.disabled = state.busy !== null;
    host.onclick = () => void this.#host();
    nodes.push(host);
    const join = this.#element("div", "v7-online-join");
    join.dataset.v7Region = "online-join";
    const label = this.#document.createElement("label");
    label.className = "v7-online-field";
    label.htmlFor = this.#codeField.id;
    label.append(this.#text("span", "Join with code", "v7-online-field-name"));
    const row = this.#element("div", "v7-online-join-row");
    const go = this.#button(
      state.busy === "JOIN" || state.busy === "OPEN" ? "Joining…" : "Join",
      "online-join",
      "v7-online-join-button",
    );
    go.onclick = () => this.#joinWithCode();
    row.append(this.#codeField, go);
    const hint = this.#text(
      "p",
      "5 letters, or paste the link.",
      "v7-online-hint",
    );
    hint.id = "v7-online-code-hint";
    join.append(label, row, hint);
    nodes.push(this.#divider(), join);
    nodes.push(this.#message(state));
    return nodes;
  }

  #preview(state: OnlineLobbyStateV7): HTMLElement[] {
    const match = state.match;
    const nodes: HTMLElement[] = [];
    nodes.push(
      this.#text(
        "p",
        `${match?.seats[0].name ?? "A friend"} invited you to a game.`,
        "v7-online-lede",
      ),
    );
    nodes.push(this.#room(state, false));
    nodes.push(this.#seats(state));
    if (match?.options !== null && match?.options !== undefined)
      nodes.push(this.#summary(match.options));
    nodes.push(this.#nameBlock(state));
    const actions = this.#element("div", "v7-online-actions");
    const join = this.#button(
      state.busy === "JOIN" ? "Joining…" : "Join",
      "online-join-lobby",
      "primary-action v7-online-join-lobby",
    );
    join.disabled = state.busy !== null;
    join.onclick = () => void this.#joinPreview();
    const cancel = this.#button(
      "Not now",
      "online-cancel",
      "v7-online-secondary",
    );
    cancel.onclick = () => this.#session.cancel();
    actions.append(join, cancel);
    nodes.push(actions, this.#message(state));
    return nodes;
  }

  #lobby(state: OnlineLobbyStateV7): HTMLElement[] {
    const host = state.mySeat === HOST_SEAT_V7;
    const nodes: HTMLElement[] = [this.#room(state, true), this.#seats(state)];
    nodes.push(this.#pickField(state));
    if (host) nodes.push(...this.#settings(state));
    else if (
      state.match?.options !== null &&
      state.match?.options !== undefined
    )
      nodes.push(this.#summary(state.match.options));
    const actions = this.#element("div", "v7-online-actions");
    const blocker = this.#session.startBlocker();
    if (host) {
      const start = this.#button(
        state.busy === "START" ? "Starting…" : "Start",
        "online-start",
        "primary-action v7-online-start",
      );
      start.disabled = blocker !== null || state.busy !== null;
      if (blocker !== null)
        start.setAttribute("aria-describedby", "v7-online-wait");
      start.onclick = () => void this.#session.start();
      actions.append(start);
    }
    const leave = this.#button(
      state.busy === "LEAVE" ? "Leaving…" : "Leave",
      "online-leave",
      "v7-online-secondary",
    );
    leave.disabled = state.busy === "LEAVE" || state.busy === "START";
    leave.onclick = () => void this.#session.leave();
    actions.append(leave);
    const wait = this.#text(
      "p",
      state.busy === "START"
        ? "Starting the game…"
        : host
          ? (blocker ?? "Everyone's here. Start when you're ready.")
          : this.#guestWaitLine(state),
      "v7-online-wait",
    );
    wait.id = "v7-online-wait";
    wait.setAttribute("role", "status");
    nodes.push(wait, actions, this.#message(state));
    if (state.offline)
      nodes.push(this.#text("p", "Reconnecting…", "v7-online-offline"));
    return nodes;
  }

  #started(state: OnlineLobbyStateV7): HTMLElement[] {
    const match = state.handoff?.match ?? state.match;
    const seat = state.handoff?.mySeat ?? state.mySeat ?? 0;
    const faction = match?.setup?.factions[seat];
    const block = this.#element("div", "v7-online-started");
    block.dataset.v7Region = "online-started";
    block.append(
      this.#text("p", "Game on!", "v7-online-started-title"),
      this.#text(
        "p",
        faction === undefined
          ? `Room ${state.code ?? ""}`
          : `Room ${state.code ?? ""} · You lead the ${factionNameV7(faction)}.`,
        "v7-online-lede",
      ),
      // The placeholder until the in-match screen (pulp_wars-eqc6.3).
      this.#text(
        "p",
        "The online match screen opens here in the next update.",
        "v7-online-hint",
      ),
    );
    if (faction !== undefined)
      block.prepend(this.#options.factionEmblem(faction));
    return [block];
  }

  // -------------------------------------------------------------------
  // Parts

  #nameBlock(state: OnlineLobbyStateV7): HTMLElement {
    const block = this.#element("div", "v7-online-name");
    block.dataset.v7Region = "online-name";
    if (state.name !== "" && !this.#editingName) {
      const line = this.#element("p", "v7-online-playing-as");
      line.append("Playing as ", this.#text("strong", state.name));
      const change = this.#button(
        "Change",
        "online-name-change",
        "v7-online-link-button",
      );
      change.onclick = () => {
        this.#editingName = true;
        this.#nameField.value = state.name;
        this.render(true);
        this.#nameField.focus();
      };
      line.append(" ", change);
      block.append(line);
      return block;
    }
    const label = this.#document.createElement("label");
    label.className = "v7-online-field";
    label.htmlFor = this.#nameField.id;
    label.append(this.#text("span", "Your name", "v7-online-field-name"));
    const row = this.#element("div", "v7-online-join-row");
    row.append(this.#nameField);
    if (state.name !== "") {
      const save = this.#button(
        "Save",
        "online-name-save",
        "v7-online-join-button",
      );
      save.onclick = () => this.#saveName();
      row.append(save);
    }
    block.append(label, row);
    if (this.#nameProblem !== "") {
      const problem = this.#text("p", this.#nameProblem, "v7-online-problem");
      problem.setAttribute("role", "alert");
      block.append(problem);
    }
    return block;
  }

  /** The room code, big, and (in the lobby) the link with Copy and Share. */
  #room(state: OnlineLobbyStateV7, sharing: boolean): HTMLElement {
    const room = this.#element("section", "v7-online-room");
    room.dataset.v7Region = "online-room";
    room.setAttribute("aria-label", "Room code");
    const code = state.code ?? "";
    const codeLine = this.#element("div", "v7-online-code-line");
    codeLine.append(this.#text("span", "Room code", "v7-online-room-label"));
    const big = this.#text("strong", code, "v7-online-code");
    big.dataset.code = code;
    big.setAttribute("aria-label", code.split("").join(" "));
    codeLine.append(big);
    room.append(codeLine);
    if (!sharing || state.shareLink === null) return room;
    const link = state.shareLink;
    const share = this.#element("div", "v7-online-share");
    const shown = this.#text(
      "p",
      link.replace(/^https?:\/\//, ""),
      "v7-online-link",
    );
    shown.title = link;
    shown.dataset.link = link;
    const copy = this.#iconButton(
      "chain",
      this.#copied === "COPIED" ? "Copied!" : "Copy link",
      "online-copy-link",
    );
    copy.onclick = () => void this.#copy(link);
    share.append(shown, copy);
    if (this.#options.share !== null && this.#options.share !== undefined) {
      const send = this.#iconButton("share", "Share", "online-share");
      send.onclick = () => void this.#share(code, link);
      share.append(send);
    }
    room.append(share);
    const status = this.#text(
      "p",
      this.#copied === "FAILED"
        ? "Couldn't copy. Select the link and copy it."
        : this.#copied === "COPIED"
          ? "Link copied. Send it to your friend."
          : "Send your friend the link or the code.",
      "v7-online-hint",
    );
    status.setAttribute("aria-live", "polite");
    room.append(status);
    return room;
  }

  #seats(state: OnlineLobbyStateV7): HTMLElement {
    const list = this.#element("ul", "v7-online-seats");
    list.setAttribute("aria-label", "Players");
    const match = state.match;
    if (match === null) return list;
    const options =
      state.mySeat === HOST_SEAT_V7
        ? state.options
        : (match.options ?? state.options);
    for (const seat of match.seats) {
      const mine = state.mySeat === seat.seat;
      const pick = mine ? state.pick : seat.pick;
      const row = this.#element("li", "v7-online-seat");
      row.dataset.seat = String(seat.seat);
      row.dataset.pick = pick;
      if (mine) row.dataset.mine = "true";
      if (seat.uid === "") {
        row.dataset.open = "true";
        row.append(
          this.#randomEmblem("open"),
          this.#seatText(
            state.screen === "PREVIEW" ? "Your seat" : "Waiting for a friend…",
            state.screen === "PREVIEW" ? "Tap Join to sit here" : "Open seat",
          ),
        );
        list.append(row);
        continue;
      }
      if (pick !== "RANDOM")
        row.style.setProperty("--player", factionColourV7(pick));
      row.append(
        pick === "RANDOM"
          ? this.#randomEmblem("random")
          : this.#options.factionEmblem(pick),
        this.#seatText(
          mine ? `${seat.name} (you)` : seat.name,
          factionPickLabelV7(pick),
        ),
      );
      const chip = this.#text(
        "span",
        seat.seat === HOST_SEAT_V7 ? "Host" : seat.ready ? "Ready" : "Joining",
        "v7-chip v7-online-seat-chip",
      );
      chip.dataset.state =
        seat.seat === HOST_SEAT_V7 ? "host" : seat.ready ? "ready" : "joining";
      row.append(chip);
      list.append(row);
    }
    for (let index = 0; index < options.aiSeats; index += 1) {
      const row = this.#element("li", "v7-online-seat");
      row.dataset.seat = String(GUEST_SEAT_V7 + 1 + index);
      row.dataset.ai = "true";
      row.append(
        this.#randomEmblem("random"),
        this.#seatText(`AI ${index + 1}`, "AI · random"),
      );
      list.append(row);
    }
    return list;
  }

  #seatText(nameText: string, detail: string): HTMLElement {
    const block = this.#element("span", "v7-online-seat-text");
    block.append(
      this.#text("span", nameText, "v7-online-seat-name"),
      this.#text("span", detail, "v7-online-seat-pick"),
    );
    return block;
  }

  #randomEmblem(kind: "random" | "open"): HTMLElement {
    const node = this.#element("span", "v7-faction-emblem v7-online-random");
    node.dataset.kind = kind;
    node.setAttribute("aria-hidden", "true");
    node.textContent = kind === "open" ? "+" : "?";
    return node;
  }

  /** Your faction: Random or any faction you may lead, not the other's. */
  #pickField(state: OnlineLobbyStateV7): HTMLElement {
    const match = state.match;
    const other =
      match === null || state.mySeat === null
        ? "RANDOM"
        : match.seats[state.mySeat === HOST_SEAT_V7 ? 1 : 0].pick;
    const values = ["RANDOM", ...OFFERED_FACTION_IDS_V7];
    const labels: Record<string, string> = { RANDOM: "Random" };
    for (const faction of OFFERED_FACTION_IDS_V7)
      labels[faction] = factionNameV7(faction);
    const field = pickerFieldV7(
      this.#document,
      "Your faction",
      "v7-online-pick",
      values,
      state.pick,
      labels,
    );
    field.classList.add("v7-online-pick");
    field.dataset.v7Region = "online-pick";
    const select = field.querySelector<HTMLSelectElement>("select");
    if (select !== null) {
      for (const option of Array.from(select.options)) {
        const faction = option.value as FactionIdV7;
        if (option.value === "RANDOM" || option.value === state.pick) continue;
        if (option.value === other) {
          option.disabled = true;
          option.textContent = `${labels[faction] ?? faction} (taken)`;
        } else if (this.#options.factionLocked?.(faction) === true) {
          option.disabled = true;
          option.textContent = `${labels[faction] ?? faction} (locked)`;
        }
      }
      select.disabled = state.busy === "START";
      syncPickerV7(field);
    }
    return field;
  }

  #summary(options: OnlineMatchOptionsV7): HTMLElement {
    const line = this.#element("p", "v7-online-summary");
    line.dataset.v7Region = "online-summary";
    line.append(
      uiIconV7(this.#document, "sight"),
      this.#text("span", onlineOptionsSummaryV7(options)),
    );
    return line;
  }

  /** The host's settings: one toggle, its summary, and the choices. */
  #settings(state: OnlineLobbyStateV7): HTMLElement[] {
    const options = state.options;
    const bar = this.#element("div", "v7-online-settings-bar");
    const toggle = this.#button(
      "Settings",
      "online-settings",
      "v7-advanced-toggle",
    );
    toggle.setAttribute("aria-expanded", String(this.#settingsOpen));
    toggle.setAttribute("aria-controls", "v7-online-settings");
    toggle.onclick = () => {
      this.#settingsOpen = !this.#settingsOpen;
      this.render();
    };
    bar.append(toggle, this.#summary(options));
    const body = this.#element("div", "v7-online-settings");
    body.id = "v7-online-settings";
    body.dataset.v7Region = "online-settings";
    body.hidden = !this.#settingsOpen;
    if (!this.#settingsOpen) return [bar, body];
    const disabled = state.busy === "START";
    const most = onlineMaxAiSeatsV7(options.mapType);
    const ai = pickerFieldV7(
      this.#document,
      "AI players",
      "v7-online-ai",
      Array.from({ length: ONLINE_AI_SEATS_MAX_V7 + 1 }, (_, index) =>
        String(index),
      ),
      String(options.aiSeats),
      {},
      "segmented",
    );
    this.#disableOptions(ai, (value) => Number(value) > most);
    const map = pickerFieldV7(
      this.#document,
      "Map",
      "v7-online-map",
      GENERATED_MAP_TYPES_V7,
      options.mapType,
      ONLINE_MAP_LABELS_V7,
    );
    this.#disableOptions(
      map,
      (value) =>
        onlineSizesV7(value as GeneratedMapTypeV7, options.aiSeats).length ===
        0,
    );
    const sizes = onlineSizesV7(options.mapType, options.aiSeats).map(String);
    const size = pickerFieldV7(
      this.#document,
      "Size",
      "v7-online-size",
      sizes,
      String(options.width),
      Object.fromEntries(sizes.map((value) => [value, `${value} × ${value}`])),
    );
    const mode = pickerFieldV7(
      this.#document,
      "Game mode",
      "v7-online-mode",
      ["DOMINATION", "PERFECTION"],
      options.gameMode,
      GAME_MODE_LABELS_V7,
      "segmented",
    );
    const curiosities = pickerFieldV7(
      this.#document,
      "Curiosities",
      "v7-online-curiosities",
      ["ON", "OFF"],
      options.curiosities ? "ON" : "OFF",
      { ON: "On", OFF: "Off" },
      "segmented",
    );
    body.append(ai);
    if (options.aiSeats > 0)
      body.append(
        pickerFieldV7(
          this.#document,
          "AI difficulty",
          "v7-online-difficulty",
          DIFFICULTIES_V7,
          options.difficulty,
          QUICK_DIFFICULTY_LABELS_V7,
        ),
      );
    if (options.aiSeats > 1)
      body.append(
        pickerFieldV7(
          this.#document,
          "Alliances",
          "v7-online-alliances",
          ["RIVAL", "COOPERATIVE"],
          options.aiMode,
          ALLIANCE_LABELS_V7,
          "segmented",
        ),
      );
    body.append(map, size, mode, curiosities);
    if (disabled)
      for (const select of body.querySelectorAll("select"))
        select.disabled = true;
    return [bar, body];
  }

  #disableOptions(
    field: HTMLElement,
    disabled: (value: string) => boolean,
  ): void {
    const select = field.querySelector<HTMLSelectElement>("select");
    if (select === null) return;
    for (const option of Array.from(select.options))
      option.disabled = option.value !== select.value && disabled(option.value);
    syncPickerV7(field);
  }

  #message(state: OnlineLobbyStateV7): HTMLElement {
    const block = this.#element("div", "v7-online-message");
    block.dataset.v7Region = "online-message";
    const message = state.message;
    if (message === null) {
      block.hidden = true;
      return block;
    }
    block.dataset.kind = message.kind;
    block.dataset.code = message.code;
    block.setAttribute("role", message.kind === "error" ? "alert" : "status");
    block.append(this.#text("p", message.text));
    if (
      message.code === "RULESET_MISMATCH" &&
      this.#options.reload !== undefined
    ) {
      const reload = this.#button(
        "Reload",
        "online-reload",
        "v7-online-secondary",
      );
      reload.onclick = () => this.#options.reload?.();
      block.append(reload);
    }
    return block;
  }

  #guestWaitLine(state: OnlineLobbyStateV7): string {
    const host = state.match?.seats[0].name ?? "the host";
    const [hostSeat, guestSeat] = state.match?.seats ?? [];
    if (
      hostSeat !== undefined &&
      guestSeat !== undefined &&
      hostSeat.pick !== "RANDOM" &&
      hostSeat.pick === state.pick
    )
      return `${host} plays the ${factionNameV7(hostSeat.pick)} too. Pick another.`;
    void guestSeat;
    return `Waiting for ${host} to start…`;
  }

  #divider(): HTMLElement {
    const node = this.#element("p", "v7-online-divider");
    node.setAttribute("aria-hidden", "true");
    node.append(this.#text("span", "or"));
    return node;
  }

  // -------------------------------------------------------------------
  // Actions

  readonly #onChange = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const value = target.value;
    switch (target.id) {
      case "v7-online-pick":
        this.#session.setPick(value as FactionPickV7);
        return;
      case "v7-online-ai":
        this.#session.setOptions({ aiSeats: Number(value) });
        return;
      case "v7-online-map":
        this.#session.setOptions({ mapType: value as GeneratedMapTypeV7 });
        return;
      case "v7-online-size":
        this.#session.setOptions({
          width: Number(value) as OnlineMatchOptionsV7["width"],
        });
        return;
      case "v7-online-mode":
        this.#session.setOptions({
          gameMode: value as OnlineMatchOptionsV7["gameMode"],
        });
        return;
      case "v7-online-curiosities":
        this.#session.setOptions({ curiosities: value === "ON" });
        return;
      case "v7-online-difficulty":
        this.#session.setOptions({
          difficulty: value as OnlineMatchOptionsV7["difficulty"],
        });
        return;
      case "v7-online-alliances":
        this.#session.setOptions({
          aiMode: value as OnlineMatchOptionsV7["aiMode"],
        });
        return;
    }
  };

  /** Enter in the name field: the screen's main action. */
  #primary(): void {
    const screen = this.#session.state.screen;
    if (screen === "PREVIEW") void this.#joinPreview();
    else if (screen === "HOME") {
      if (normalizeRoomCodeV7(this.#codeField.value) !== null)
        this.#joinWithCode();
      else void this.#host();
    }
  }

  /** Saves the typed name when the field is shown; false on a problem. */
  #saveName(): boolean {
    const state = this.#session.state;
    if (state.name !== "" && !this.#editingName) return true;
    const problem = this.#session.setName(this.#nameField.value);
    this.#nameProblem = problem ?? "";
    if (problem === null) this.#editingName = false;
    this.render(true);
    if (problem !== null) this.#nameField.focus();
    return problem === null;
  }

  async #host(): Promise<void> {
    if (!this.#saveName()) return;
    await this.#session.host();
  }

  #joinWithCode(): void {
    if (!this.#saveName()) return;
    void this.#session.join(this.#codeField.value);
  }

  async #joinPreview(): Promise<void> {
    if (!this.#saveName()) return;
    await this.#session.join();
  }

  #syncJoinButton(): void {
    const join = this.root.querySelector<HTMLButtonElement>(
      '[data-action="online-join"]',
    );
    if (join === null) return;
    join.disabled =
      this.#session.state.busy !== null ||
      normalizeRoomCodeV7(this.#codeField.value) === null;
  }

  async #copy(link: string): Promise<void> {
    let copied: boolean;
    try {
      copied = (await this.#options.copy?.(link)) ?? false;
    } catch {
      copied = false;
    }
    this.#copied = copied ? "COPIED" : "FAILED";
    if (this.#copiedTimer !== null) clearTimeout(this.#copiedTimer);
    this.#copiedTimer = setTimeout(() => {
      this.#copiedTimer = null;
      this.#copied = null;
      this.render();
    }, 2500);
    this.render();
  }

  async #share(code: string, link: string): Promise<void> {
    try {
      await this.#options.share?.({
        title: "Pulp Wars",
        text: `Join my Pulp Wars game! Room code ${code}.`,
        url: link,
      });
    } catch {
      // Cancelled, or the browser refused: the link and Copy stay.
    }
  }

  // -------------------------------------------------------------------
  // Elements

  #element(tag: string, className: string): HTMLElement {
    const node = this.#document.createElement(tag);
    node.className = className;
    return node;
  }

  #text(tag: string, value: string, className = ""): HTMLElement {
    const node = this.#element(tag, className);
    node.textContent = value;
    return node;
  }

  #button(label: string, action: string, className = ""): HTMLButtonElement {
    const node = this.#document.createElement("button");
    node.type = "button";
    node.textContent = label;
    node.dataset.action = action;
    node.className = className;
    return node;
  }

  #iconButton(
    icon: UiIconIdV7,
    label: string,
    action: string,
  ): HTMLButtonElement {
    const node = this.#button("", action, "v7-online-icon-button");
    node.append(uiIconV7(this.#document, icon), this.#text("span", label));
    return node;
  }
}

/** The browser's clipboard, with the old selection copy as a fallback. */
export function browserCopyTextV7(
  documentRoot: Document,
): (text: string) => Promise<boolean> {
  return async (value) => {
    const clipboard = documentRoot.defaultView?.navigator.clipboard;
    if (clipboard?.writeText !== undefined) {
      try {
        await clipboard.writeText(value);
        return true;
      } catch {
        // Fall through to the selection copy.
      }
    }
    try {
      const field = documentRoot.createElement("textarea");
      field.value = value;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      documentRoot.body.append(field);
      field.select();
      const done = documentRoot.execCommand("copy");
      field.remove();
      return done;
    } catch {
      return false;
    }
  };
}

/** The Web Share API of the browser, or null where it has none. */
export function browserShareV7(
  documentRoot: Document,
): ((data: OnlineShareDataV7) => Promise<void>) | null {
  const navigator = documentRoot.defaultView?.navigator;
  if (navigator === undefined || typeof navigator.share !== "function")
    return null;
  return (data) => navigator.share(data);
}
