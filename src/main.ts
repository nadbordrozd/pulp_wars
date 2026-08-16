import { bootstrapApp } from "./app/bootstrap";
import "./styles/main.css";

export const app = bootstrapApp(document);
if (import.meta.env.DEV) Reflect.set(globalThis, "__PULP_WARS_APP__", app);
