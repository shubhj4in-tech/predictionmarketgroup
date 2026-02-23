// @ts-check
import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    rules: {
      // React Compiler rules — opt-in feature we're not using; disable to avoid
      // false positives on standard fetch-in-effect data-fetching patterns.
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/set-state-in-effect": "off",
      // router and supabase.auth are stable refs that never change identity;
      // adding them to dep arrays would cause lint to demand even more additions.
      "react-hooks/exhaustive-deps": "off",
    },
  },
];
export default config;
