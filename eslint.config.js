import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // `.claude/**` holds agent git worktrees (other checkouts of this repo).
  { ignores: ["dist", "node_modules", ".claude/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
