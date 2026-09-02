import { bootstrapRuleset6App } from "./app/v6-bootstrap";
import "./styles/main.css";

const location = new URL(globalThis.location.href);
const legacyV5Smoke =
  import.meta.env.DEV && location.searchParams.get("legacy-v5") === "1";
const app = legacyV5Smoke
  ? (await import("./app/bootstrap")).bootstrapApp(document)
  : bootstrapRuleset6App(document);
export { app };
if (import.meta.env.DEV || location.searchParams.get("browser-smoke") === "1") {
  Reflect.set(globalThis, "__PULP_WARS_APP__", app);
}
