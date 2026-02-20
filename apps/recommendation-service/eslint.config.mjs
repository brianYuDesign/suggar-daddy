import baseConfig from "../../eslint.config.mjs";

export default [
  ...baseConfig,
  {
    files: ["**/*.ts"],
    rules: {
      // Add any service-specific rules here
    },
  },
];
