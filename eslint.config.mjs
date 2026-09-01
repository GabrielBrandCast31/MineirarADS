import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

/**
 * `eslint-config-next` 16 já publica flat config nativo
 * (`eslint-config-next/core-web-vitals` e `/typescript` exportam
 * `Linter.Config[]`). Passar por `FlatCompat`/`@eslint/eslintrc` além de
 * desnecessário quebrava o lint: o config traduzido falhava na validação de
 * schema e o formatador de erros do eslintrc estourava em
 * "Converting circular structure to JSON", escondendo a causa real.
 */
const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "tsconfig.tsbuildinfo"],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },
];

export default eslintConfig;
