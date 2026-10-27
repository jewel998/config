import type { LinguiConfig } from "@lingui/conf";
import { formatter } from "@lingui/format-po";

const config: LinguiConfig = {
  locales: ["en", "es", "fr", "ar", "zh", "hi", "ja"],
  sourceLocale: "en",
  // Omit `#: file:line` reference comments from catalogs. They churn on every
  // code change (line numbers shift), producing large noisy diffs with no
  // translation value.
  format: formatter({ origins: false }),
  catalogs: [
    {
      path: "src/locales/{locale}",
      include: ["src"],
    },
  ],
};

export default config;
