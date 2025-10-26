import { db } from "@/infrastructure/database/client";
import { apiVersions } from "@/infrastructure/database/drizzle/schema";
import { eq } from "drizzle-orm";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";

/**
 * Delete API Version Use Case
 */
export class DeleteApiVersionUseCase {
  async execute(id: string): Promise<void> {
    // Check if this is the current version
    const [version] = await db
      .select()
      .from(apiVersions)
      .where(eq(apiVersions.id, id))
      .limit(1);

    if (!version) {
      throw new ApiError(
        "API version not found",
        ErrorCode.NOT_FOUND,
        404
      );
    }

    if (version.isCurrent) {
      throw new ApiError(
        "Cannot delete the current API version",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    await db.delete(apiVersions).where(eq(apiVersions.id, id));
  }
}
