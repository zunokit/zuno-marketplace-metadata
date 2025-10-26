import type { ApiVersion } from "@/infrastructure/database/drizzle/schema";
import { db } from "@/infrastructure/database/client";
import { apiVersions } from "@/infrastructure/database/drizzle/schema";
import { desc } from "drizzle-orm";

/**
 * List API Versions Use Case
 */
export class ListApiVersionsUseCase {
  async execute(): Promise<ApiVersion[]> {
    return await db
      .select()
      .from(apiVersions)
      .orderBy(desc(apiVersions.releasedAt));
  }
}
