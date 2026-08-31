import { bootstrapRuleset6App } from "./app/v6-bootstrap";
import "./styles/main.css";

export const app = bootstrapRuleset6App(document);
if (import.meta.env.DEV) Reflect.set(globalThis, "__PULP_WARS_APP__", app);
