import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import-x";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.gen.ts",
      "**/coverage/**",
      "apps/docs/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "import-x": importPlugin,
    },
    settings: {
      "import-x/resolver": {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      // Disable TS rules we already handle with oxlint
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",

      // Prevent circular dependencies
      "import-x/no-cycle": ["error", { maxDepth: 4 }],

      // Enforce consistent import ordering
      "import-x/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],

      // No duplicate imports from same module
      "import-x/no-duplicates": "error",

      // No self-import
      "import-x/no-self-import": "error",

      // No useless path segments
      "import-x/no-useless-path-segments": "warn",
    },
  },
);
