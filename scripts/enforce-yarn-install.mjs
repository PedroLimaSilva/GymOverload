/**
 * Fail installs that are not driven by Yarn (npm/pnpm/etc.).
 * Yarn sets npm_config_user_agent to include "yarn".
 */
const ua = process.env.npm_config_user_agent ?? "";
if (!ua.toLowerCase().includes("yarn")) {
  console.error('This repository uses Yarn only (see package.json "packageManager").');
  console.error("Run: corepack enable && yarn install");
  process.exit(1);
}
