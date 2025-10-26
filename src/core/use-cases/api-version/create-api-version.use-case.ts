import type { ApiVersion } from "@/infrastructure/database/drizzle/schema";
import { db } from "@/infrastructure/database/client";
import { apiVersions } from "@/infrastructure/database/drizzle/schema";
import { eq } from "drizzle-orm";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";

export interface CreateApiVersionInput {
  id: string;
  label: string;
  isCurrent?: boolean;
  releasedAt: Date;
  sunsetAt?: Date;
}

/**
 * Create API Version Use Case
 */
export class CreateApiVersionUseCase {
  async execute(input: CreateApiVersionInput): Promise<ApiVersion> {
    // If setting as current, unset other current versions
    if (input.isCurrent) {
      await db
        .update(apiVersions)
        .set({ isCurrent: false })
        .where(eq(apiVersions.isCurrent, true));
    }

    const [version] = await db
      .insert(apiVersions)
      .values({
        id: input.id,
        label: input.label,
        isCurrent: input.isCurrent || false,
        deprecated: false,
        releasedAt: input.releasedAt,
        sunsetAt: input.sunsetAt || null,
      })
      .returning();

    if (!version) {
      throw new ApiError(
        "Failed to create API version",
        ErrorCode.INTERNAL_ERROR,
        500
      );
    }

    return version;
  }
}
