import globals from "globals";
import { config } from "@repo/eslint-config/base";

export default [...config, { languageOptions: { globals: globals.node } }, { ignores: ["out/**", "dist/**"] }];
