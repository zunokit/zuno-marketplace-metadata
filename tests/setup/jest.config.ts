import type { Config } from "jest";
import nextJest from "next/jest.js";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory of this config file (ES module compatible)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get the project root directory (2 levels up from this file)
const projectRoot = path.resolve(__dirname, "../../");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: projectRoot,
});

// Add any custom config to be passed to Jest
const config: Config = {
  rootDir: projectRoot,
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: [
    "**/__tests__/**/*.test.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{js,jsx,ts,tsx}",
    "!**/.next/**",
    "!**/node_modules/**",
    "!**/dist/**",
  ],
  moduleDirectories: ["node_modules", "<rootDir>/"],
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  transformIgnorePatterns: [
    "/node_modules/",
    "^.+\\.module\\.(css|sass|scss)$",
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
