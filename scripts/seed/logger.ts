/**
 * Seed Logger
 * Structured logging utility for the seed system
 */

import { SeedConfig, SeedResult } from "./types";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
};

export class SeedLogger {
  constructor(private config: SeedConfig) {}

  private shouldLog(level: "silent" | "minimal" | "verbose"): boolean {
    const levels = { silent: 0, minimal: 1, verbose: 2 };
    return levels[this.config.logLevel] >= levels[level];
  }

  private log(message: string, color = colors.reset): void {
    console.log(`${color}${message}${colors.reset}`);
  }

  info(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog("verbose")) return;
    this.log(`ℹ  ${message}`, colors.cyan);
    if (meta) {
      console.log(meta);
    }
  }

  success(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog("minimal")) return;
    this.log(`✅ ${message}`, colors.green);
    if (meta) {
      console.log(meta);
    }
  }

  warn(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog("minimal")) return;
    this.log(`⚠️  ${message}`, colors.yellow);
    if (meta) {
      console.log(meta);
    }
  }

  error(message: string, meta?: Record<string, any>): void {
    this.log(`❌ ${message}`, colors.red);
    if (meta) {
      console.error(meta);
    }
  }

  section(title: string): void {
    if (!this.shouldLog("minimal")) return;
    console.log("");
    this.log("=".repeat(60), colors.blue);
    this.log(`  ${title}`, colors.cyan);
    this.log("=".repeat(60), colors.blue);
    console.log("");
  }

  subsection(title: string): void {
    if (!this.shouldLog("verbose")) return;
    console.log("");
    this.log(`▶ ${title}`, colors.yellow);
    console.log("");
  }

  summary(results: SeedResult[]): void {
    if (!this.shouldLog("minimal")) return;

    this.section("Seed Summary");

    const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const failedSeeders = results.filter((r) => !r.success);

    this.log(`Total Created: ${totalCreated}`, colors.green);
    this.log(`Total Skipped: ${totalSkipped}`, colors.yellow);
    this.log(`Total Updated: ${totalUpdated}`, colors.cyan);
    this.log(`Total Duration: ${totalDuration}ms`, colors.blue);

    if (failedSeeders.length > 0) {
      this.log(`\nFailed Seeders (${failedSeeders.length}):`, colors.red);
      failedSeeders.forEach((r) => {
        this.log(`  - ${r.seeder}: ${r.error}`, colors.red);
      });
    }

    console.log("");
  }
}
