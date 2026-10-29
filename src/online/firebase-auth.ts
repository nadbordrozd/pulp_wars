import type { StorageAdapter } from "../persistence/index";

/**
 * Firebase Anonymous Auth over REST (`pulp_wars-eqc6.1`,
 * docs/MULTIPLAYER.md section 5): no Firebase SDK. The first use signs up
 * an anonymous account with the Identity Toolkit (`accounts:signUp`),
 * which gives the browser a stable uid; the refresh token is kept in
 * `localStorage`, and the short-lived ID token is refreshed through the
 * Secure Token service before it expires. Needs "Anonymous" enabled under
 * Firebase Authentication > Sign-in method (the user's one console step).
 */

export const IDENTITY_TOOLKIT_SIGN_UP_URL_V7 =
  "https://identitytoolkit.googleapis.com/v1/accounts:signUp";
export const SECURE_TOKEN_URL_V7 =
  "https://securetoken.googleapis.com/v1/token";
export const ONLINE_AUTH_STORAGE_KEY_V7 = "pulpWars.online.auth.v1";
/** An ID token is refreshed this long before it expires. */
export const ID_TOKEN_MARGIN_MS_V7 = 5 * 60 * 1000;
export const AUTH_TIMEOUT_MS_V7 = 10_000;

export type FetchV7 = (
  input: string,
  init?: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: string;
    readonly signal?: AbortSignal;
  },
) => Promise<{
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}>;

export interface FirebaseSessionV7 {
  readonly uid: string;
  readonly idToken: string;
}

export type FirebaseAuthResultV7 =
  | { readonly ok: true; readonly session: FirebaseSessionV7 }
  | {
      readonly ok: false;
      /** `NETWORK`: try again later; `REFUSED`: the service said no. */
      readonly reason: "NETWORK" | "REFUSED";
      readonly message: string;
    };

export interface FirebaseAnonymousAuthOptionsV7 {
  readonly apiKey: string;
  readonly fetch: FetchV7;
  /** `window.localStorage`; absent: a new account every page load. */
  readonly storage?: StorageAdapter | null;
  /** Milliseconds since the epoch. */
  readonly now?: () => number;
  readonly timeoutMs?: number;
}

interface StoredAuthV7 {
  readonly uid: string;
  readonly refreshToken: string;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export class FirebaseAnonymousAuthV7 {
  readonly #options: FirebaseAnonymousAuthOptionsV7;
  #stored: StoredAuthV7 | null;
  #idToken: string | null = null;
  #expiresAt = 0;
  #pending: Promise<FirebaseAuthResultV7> | null = null;

  constructor(options: FirebaseAnonymousAuthOptionsV7) {
    this.#options = options;
    this.#stored = this.#load();
  }

  /** The uid once known (stored or signed in), else null. */
  get uid(): string | null {
    return this.#stored?.uid ?? null;
  }

  /**
   * A fresh session: the cached ID token while it has more than
   * {@link ID_TOKEN_MARGIN_MS_V7} left, else a refresh, else a new sign-up.
   * Concurrent calls share one request.
   */
  session(): Promise<FirebaseAuthResultV7> {
    const now = this.#now();
    if (
      this.#stored !== null &&
      this.#idToken !== null &&
      now < this.#expiresAt - ID_TOKEN_MARGIN_MS_V7
    )
      return Promise.resolve({
        ok: true,
        session: { uid: this.#stored.uid, idToken: this.#idToken },
      });
    this.#pending ??= this.#renew().finally(() => {
      this.#pending = null;
    });
    return this.#pending;
  }

  /** Forgets the ID token (after a 401), so the next session refreshes. */
  invalidate(): void {
    this.#idToken = null;
    this.#expiresAt = 0;
  }

  async #renew(): Promise<FirebaseAuthResultV7> {
    if (this.#stored !== null) {
      const refreshed = await this.#refresh(this.#stored);
      // A refresh token the service no longer honours (the account was
      // deleted, or the token revoked) falls back to a new account.
      if (refreshed.ok || refreshed.reason === "NETWORK") return refreshed;
    }
    return this.#signUp();
  }

  async #signUp(): Promise<FirebaseAuthResultV7> {
    const response = await this.#post(
      `${IDENTITY_TOOLKIT_SIGN_UP_URL_V7}?key=${encodeURIComponent(this.#options.apiKey)}`,
      { "Content-Type": "application/json" },
      JSON.stringify({ returnSecureToken: true }),
    );
    if (!response.ok) return response;
    const body = record(response.body);
    const uid = body?.localId;
    const idToken = body?.idToken;
    const refreshToken = body?.refreshToken;
    if (
      typeof uid !== "string" ||
      typeof idToken !== "string" ||
      typeof refreshToken !== "string"
    )
      return { ok: false, reason: "REFUSED", message: "Malformed sign-up." };
    this.#accept(uid, idToken, refreshToken, body?.expiresIn);
    return { ok: true, session: { uid, idToken } };
  }

  async #refresh(stored: StoredAuthV7): Promise<FirebaseAuthResultV7> {
    const response = await this.#post(
      `${SECURE_TOKEN_URL_V7}?key=${encodeURIComponent(this.#options.apiKey)}`,
      { "Content-Type": "application/x-www-form-urlencoded" },
      `grant_type=refresh_token&refresh_token=${encodeURIComponent(stored.refreshToken)}`,
    );
    if (!response.ok) return response;
    const body = record(response.body);
    const idToken = body?.id_token;
    const refreshToken = body?.refresh_token;
    const uid = body?.user_id;
    if (
      typeof idToken !== "string" ||
      typeof refreshToken !== "string" ||
      (uid !== undefined && uid !== stored.uid)
    )
      return { ok: false, reason: "REFUSED", message: "Malformed refresh." };
    this.#accept(stored.uid, idToken, refreshToken, body?.expires_in);
    return { ok: true, session: { uid: stored.uid, idToken } };
  }

  #accept(
    uid: string,
    idToken: string,
    refreshToken: string,
    expiresIn: unknown,
  ): void {
    const seconds = Number(expiresIn);
    this.#idToken = idToken;
    this.#expiresAt =
      this.#now() +
      (Number.isFinite(seconds) && seconds > 0 ? seconds : 3600) * 1000;
    this.#stored = { uid, refreshToken };
    try {
      this.#options.storage?.setItem(
        ONLINE_AUTH_STORAGE_KEY_V7,
        JSON.stringify(this.#stored),
      );
    } catch {
      // Without storage the account lasts for this page only.
    }
  }

  async #post(
    url: string,
    headers: Record<string, string>,
    body: string,
  ): Promise<
    | { readonly ok: true; readonly body: unknown }
    | {
        readonly ok: false;
        readonly reason: "NETWORK" | "REFUSED";
        readonly message: string;
      }
  > {
    const controller =
      typeof AbortController === "function" ? new AbortController() : null;
    const timer =
      controller === null
        ? null
        : setTimeout(
            () => controller.abort(),
            this.#options.timeoutMs ?? AUTH_TIMEOUT_MS_V7,
          );
    try {
      const response = await this.#options.fetch(url, {
        method: "POST",
        headers,
        body,
        ...(controller === null ? {} : { signal: controller.signal }),
      });
      const parsed: unknown = await response.json().catch(() => null);
      if (response.ok) return { ok: true, body: parsed };
      return {
        ok: false,
        reason: response.status >= 500 ? "NETWORK" : "REFUSED",
        message: `Sign-in refused (${response.status}).`,
      };
    } catch {
      return { ok: false, reason: "NETWORK", message: "Sign-in failed." };
    } finally {
      if (timer !== null) clearTimeout(timer);
    }
  }

  #load(): StoredAuthV7 | null {
    try {
      const text = this.#options.storage?.getItem(ONLINE_AUTH_STORAGE_KEY_V7);
      if (text === null || text === undefined) return null;
      const value = record(JSON.parse(text));
      return typeof value?.uid === "string" &&
        typeof value.refreshToken === "string"
        ? { uid: value.uid, refreshToken: value.refreshToken }
        : null;
    } catch {
      return null;
    }
  }

  #now(): number {
    return this.#options.now?.() ?? Date.now();
  }
}
