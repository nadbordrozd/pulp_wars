import { bootstrapRuleset6App } from "./app/v6-bootstrap";
import "./styles/main.css";

export const app = bootstrapRuleset6App(document);
if (
  import.meta.env.DEV ||
  new URL(globalThis.location.href).searchParams.get("browser-smoke") === "1"
) {
  Reflect.set(globalThis, "__PULP_WARS_APP__", app);
}
