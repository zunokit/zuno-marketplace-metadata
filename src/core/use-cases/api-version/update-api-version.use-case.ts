import type { ApiVersion } from "@/infrastructure/database/drizzle/schema";
import { db } from "@/infrastructure/database/client";
import { apiVersions } from "@/infrastructure/database/drizzle/schema";
import { eq } from "drizzle-orm";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";

export interface UpdateApiVersionInput {
  id: string;
  label?: string;
  isCurrent?: boolean;
  deprecated?: boolean;
  sunsetAt?: Date | null;
}

/**
 * Update API Version Use Case
 */
export class UpdateApiVersionUseCase {
  async execute(input: UpdateApiVersionInput): Promise<ApiVersion> {
    // If setting as current, unset other current versions
    if (input.isCurrent) {
      await db
        .update(apiVersions)
        .set({ isCurrent: false })
        .where(eq(apiVersions.isCurrent, true));
    }

    const [version] = await db
      .update(apiVersions)
      .set({
        ...(input.label !== undefined && { label: input.label }),
        ...(input.isCurrent !== undefined && { isCurrent: input.isCurrent }),
        ...(input.deprecated !== undefined && { deprecated: input.deprecated }),
        ...(input.sunsetAt !== undefined && { sunsetAt: input.sunsetAt }),
      })
      .where(eq(apiVersions.id, input.id))
      .returning();

    if (!version) {
      throw new ApiError(
        "API version not found",
        ErrorCode.NOT_FOUND,
        404
      );
    }

    return version;
  }
}
