/**
 * API Version Seeder
 * Seeds default API versions
 */

import { Seeder, SeedContext, SeedResult } from "../types";
import { db } from "@/infrastructure/database/client";
import { apiVersions } from "@/infrastructure/database/drizzle/schema";

export class ApiVersionSeeder implements Seeder {
  name = "api-versions";
  dependencies: string[] = [];
  parallel = false;

  async execute(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let created = 0;
    let skipped = 0;
    const updated = 0;

    try {
      // Check if API versions already exist
      const existingVersions = await (context.db as typeof db)
        .select()
        .from(apiVersions);

      if (existingVersions.length > 0) {
        context.logger?.info(
          `API versions already exist (${existingVersions.length}), skipping`
        );
        skipped = existingVersions.length;
      } else {
        context.logger?.info("Initializing default API versions");

        await (context.db as typeof db).insert(apiVersions).values([
          {
            id: "v1",
            label: "Version 1.0",
            isCurrent: true,
            deprecated: false,
            releasedAt: new Date(),
            sunsetAt: null,
          },
          {
            id: "v1.0.0",
            label: "Version 1.0.0",
            isCurrent: false,
            deprecated: false,
            releasedAt: new Date(),
            sunsetAt: null,
          },
        ]);

        created = 2;
        context.logger?.info("Default API versions created");
      }

      const duration = Date.now() - startTime;

      context.logger?.success(
        `API version seeding completed: ${created} created, ${skipped} skipped`,
        { duration }
      );

      return {
        seeder: this.name,
        created,
        skipped,
        updated,
        duration,
        success: true,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      context.logger?.error(`API version seeding failed: ${errorMessage}`, {
        error: errorMessage,
      });

      return {
        seeder: this.name,
        created,
        skipped,
        updated,
        duration,
        success: false,
        error: errorMessage,
      };
    }
  }
}
