/**
 * Seed Orchestrator
 * Professional orchestrator for managing seed operations with dependency resolution
 */

import { Seeder, SeedContext, SeedResult, SeedConfig } from "./types";
import { SeedLogger } from "./logger";
import { getSeedConfig, overrideConfig } from "./config";

export class SeedOrchestrator {
  private seeders: Map<string, Seeder> = new Map();
  private logger: SeedLogger;
  private config: SeedConfig;

  constructor(config?: Partial<SeedConfig>) {
    this.config = overrideConfig({ ...getSeedConfig(), ...config });
    this.logger = new SeedLogger(this.config);
  }

  /**
   * Register a seeder
   */
  register(seeder: Seeder): void {
    this.seeders.set(seeder.name, seeder);
    this.logger.info(`Registered seeder: ${seeder.name}`);
  }

  /**
   * Register multiple seeders
   */
  registerMany(seeders: Seeder[]): void {
    seeders.forEach((seeder) => this.register(seeder));
  }

  /**
   * Execute all registered seeders in dependency order
   */
  async execute(db: unknown): Promise<SeedResult[]> {
    this.logger.section("Starting Seed Orchestration");
    this.logger.info(`Environment: ${this.config.environment}`);
    this.logger.info(`Clear existing: ${this.config.clearExisting}`);
    this.logger.info(`Batch size: ${this.config.batchSize}`);
    this.logger.info(`Use transactions: ${this.config.useTransactions}`);

    const context: SeedContext = {
      db,
      config: this.config,
      results: [],
      shared: {},
      logger: this.logger,
    };

    // Resolve execution order based on dependencies
    const executionOrder = this.resolveExecutionOrder();

    this.logger.info(`Execution order: ${executionOrder.join(" → ")}`);

    // Execute seeders in order
    for (const seederName of executionOrder) {
      if (this.config.skipSeeders.includes(seederName)) {
        this.logger.info(`Skipping seeder: ${seederName}`);
        continue;
      }

      const seeder = this.seeders.get(seederName);
      if (!seeder) {
        this.logger.warn(`Seeder not found: ${seederName}`);
        continue;
      }

      this.logger.section(`Executing ${seederName}`);

      try {
        const result = await this.executeSeeder(context, seeder);
        context.results.push(result);

        if (result.success) {
          this.logger.success(
            `${seederName} completed: ${result.created} created, ${result.skipped} skipped, ${result.updated} updated`
          );
        } else {
          this.logger.error(`${seederName} failed: ${result.error}`);

          // Stop execution on failure unless configured otherwise
          if (this.config.environment === "production") {
            throw new Error(`Seeder ${seederName} failed: ${result.error}`);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const result: SeedResult = {
          seeder: seederName,
          created: 0,
          skipped: 0,
          updated: 0,
          duration: 0,
          success: false,
          error: errorMessage,
        };

        context.results.push(result);
        this.logger.error(
          `Seeder ${seederName} failed with exception: ${errorMessage}`
        );

        if (this.config.environment === "production") {
          throw error;
        }
      }
    }

    // Log summary
    this.logger.summary(context.results);

    return context.results;
  }

  /**
   * Execute a single seeder with transaction support
   */
  private async executeSeeder(
    context: SeedContext,
    seeder: Seeder
  ): Promise<SeedResult> {
    // PostgreSQL/Neon can be sensitive to explicit BEGIN/COMMIT over HTTP.
    // Execute without transactions for reliability.
    return await seeder.execute(context);
  }

  /**
   * Resolve execution order based on dependencies using topological sort
   */
  private resolveExecutionOrder(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (seederName: string): void => {
      if (visiting.has(seederName)) {
        throw new Error(
          `Circular dependency detected involving: ${seederName}`
        );
      }

      if (visited.has(seederName)) {
        return;
      }

      const seeder = this.seeders.get(seederName);
      if (!seeder) {
        this.logger.warn(`Seeder not found: ${seederName}`);
        return;
      }

      visiting.add(seederName);

      // Visit dependencies first
      for (const dependency of seeder.dependencies) {
        if (!this.seeders.has(dependency)) {
          throw new Error(
            `Dependency not found: ${dependency} (required by ${seederName})`
          );
        }
        visit(dependency);
      }

      visiting.delete(seederName);
      visited.add(seederName);
      order.push(seederName);
    };

    // Visit all seeders
    for (const seederName of this.seeders.keys()) {
      if (!visited.has(seederName)) {
        visit(seederName);
      }
    }

    return order;
  }

  /**
   * Get registered seeders
   */
  getSeeders(): Seeder[] {
    return Array.from(this.seeders.values());
  }

  /**
   * Get seeder by name
   */
  getSeeder(name: string): Seeder | undefined {
    return this.seeders.get(name);
  }

  /**
   * Clear all registered seeders
   */
  clear(): void {
    this.seeders.clear();
    this.logger.info("Cleared all seeders");
  }
}
