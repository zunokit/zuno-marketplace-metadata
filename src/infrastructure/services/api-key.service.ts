/**
 * API Key Service
 *
 * Handles API key creation, validation, and management
 * Uses crypto for hashing (similar to Better Auth but without the dependency)
 */

import { db, schema } from "@/infrastructure/database/client";
import { eq, and } from "drizzle-orm";
import { logger } from "@/shared/lib/utils/logger";
import { ApiKeyMetadata } from "@/shared/types";
import crypto from "crypto";
import { tryCatch, unwrapOrThrow } from "@/shared/lib/utils";

export interface CreateApiKeyParams {
  name: string;
  userId: string;
  expiresAt?: Date;
  permissions?: string;
  metadata?: ApiKeyMetadata;
  rateLimitEnabled?: boolean;
  rateLimitMax?: number;
  rateLimitTimeWindow?: number;
}

export interface ApiKeyDto {
  id: string;
  name: string;
  userId: string;
  start: string;
  enabled: boolean;
  expiresAt: Date | null;
  permissions: string | null;
  metadata: ApiKeyMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ApiKeyService {
  /**
   * Type guard to validate metadata from database
   */
  private static parseMetadata(metadata: unknown): ApiKeyMetadata | null {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }
    // Runtime validation would go here
    // For now, we trust the database schema
    return metadata as ApiKeyMetadata;
  }

  /**
   * Generate a secure random API key
   * Format: sk_live_<random_32_chars>
   */
  private static generateKey(): string {
    const randomBytes = crypto.randomBytes(32);
    const key = randomBytes.toString("base64url"); // URL-safe base64
    return `sk_live_${key}`;
  }

  /**
   * Hash API key for storage
   */
  private static hashKey(key: string): string {
    return crypto.createHash("sha256").update(key).digest("hex");
  }

  /**
   * Get first 8 characters for display (like "sk_live_...")
   */
  private static getKeyStart(key: string): string {
    return key.substring(0, 12);
  }

  /**
   * Create a new API key
   */
  static async create(params: CreateApiKeyParams): Promise<{
    id: string;
    key: string; // Only returned once!
    name: string;
    userId: string;
    start: string;
    expiresAt: Date | null;
    permissions: string | null;
    metadata: ApiKeyMetadata | null;
    createdAt: Date;
  }> {
    const result = await tryCatch(
      async () => {
        // Generate raw key
        const rawKey = this.generateKey();
        const hashedKey = this.hashKey(rawKey);
        const keyStart = this.getKeyStart(rawKey);

        logger.info("Creating new API key", {
          name: params.name,
          userId: params.userId,
          start: keyStart,
        });

        // Insert into database
        const [apiKey] = await db
          .insert(schema.apiKeys)
          .values({
            id: crypto.randomUUID(),
            name: params.name,
            userId: params.userId,
            key: hashedKey,
            start: keyStart,
            prefix: "sk_live_",
            enabled: true,
            expiresAt: params.expiresAt || null,
            permissions: params.permissions || null,
            metadata: params.metadata || null,
            rateLimitEnabled: params.rateLimitEnabled || false,
            rateLimitMax: params.rateLimitMax || null,
            rateLimitTimeWindow: params.rateLimitTimeWindow || null,
          })
          .returning();

        logger.info("API key created successfully", {
          id: apiKey.id,
          userId: apiKey.userId,
          name: apiKey.name,
        });

        return {
          id: apiKey.id,
          key: rawKey, // Return raw key ONLY ONCE
          name: apiKey.name,
          userId: apiKey.userId,
          start: apiKey.start!,
          expiresAt: apiKey.expiresAt,
          permissions: apiKey.permissions,
          metadata: this.parseMetadata(apiKey.metadata),
          createdAt: apiKey.createdAt,
        };
      },
      {
        errorMessage: "Failed to create API key",
        context: { userId: params.userId },
      }
    );

    return unwrapOrThrow(result);
  }

  /**
   * Verify and retrieve API key details
   * Returns null if key is invalid, expired, or disabled
   */
  static async verify(rawKey: string): Promise<typeof schema.apiKeys.$inferSelect | null> {
    const result = await tryCatch(
      async () => {
        if (!rawKey || !rawKey.startsWith("sk_")) {
          return null;
        }

        const hashedKey = this.hashKey(rawKey);

        // Find key in database
        const [apiKey] = await db
          .select()
          .from(schema.apiKeys)
          .where(eq(schema.apiKeys.key, hashedKey))
          .limit(1);

        if (!apiKey) {
          logger.warn("API key not found", { keyStart: rawKey.substring(0, 12) });
          return null;
        }

        // Check if disabled
        if (!apiKey.enabled) {
          logger.warn("API key is disabled", { id: apiKey.id, userId: apiKey.userId });
          return null;
        }

        // Check if expired
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
          logger.warn("API key has expired", { id: apiKey.id, expiresAt: apiKey.expiresAt });
          return null;
        }

        // Update last request timestamp
        await db
          .update(schema.apiKeys)
          .set({ lastRequest: new Date() })
          .where(eq(schema.apiKeys.id, apiKey.id));

        return apiKey;
      },
      {
        errorMessage: "API key verification failed",
        shouldLog: true,
      }
    );

    return result.success ? result.data : null;
  }

  /**
   * List API keys for a user (without revealing the actual keys)
   */
  static async listByUser(userId: string, params: {
    limit?: number;
    offset?: number;
    enabled?: boolean;
  } = {}): Promise<{
    keys: ApiKeyDto[];
    total: number;
  }> {
    const result = await tryCatch(
      async () => {
        const { limit = 20, offset = 0, enabled } = params;

        // Build conditions
        const conditions = [eq(schema.apiKeys.userId, userId)];
        if (enabled !== undefined) {
          conditions.push(eq(schema.apiKeys.enabled, enabled));
        }

        const whereClause = and(...conditions);

        // Execute query with all conditions
        const keys = await db
          .select({
            id: schema.apiKeys.id,
            name: schema.apiKeys.name,
            userId: schema.apiKeys.userId,
            start: schema.apiKeys.start,
            enabled: schema.apiKeys.enabled,
            expiresAt: schema.apiKeys.expiresAt,
            permissions: schema.apiKeys.permissions,
            metadata: schema.apiKeys.metadata,
            createdAt: schema.apiKeys.createdAt,
            updatedAt: schema.apiKeys.updatedAt,
          })
          .from(schema.apiKeys)
          .where(whereClause)
          .limit(limit)
          .offset(offset);

        return {
          keys: keys.map(k => ({
            ...k,
            start: k.start || "",
            metadata: this.parseMetadata(k.metadata),
          })),
          total: keys.length,
        };
      },
      {
        errorMessage: "Failed to list API keys",
        context: { userId },
      }
    );

    return unwrapOrThrow(result);
  }

  /**
   * Get API key by ID (without revealing the actual key)
   */
  static async getById(id: string): Promise<ApiKeyDto | null> {
    const result = await tryCatch(
      async () => {
        const [apiKey] = await db
          .select({
            id: schema.apiKeys.id,
            name: schema.apiKeys.name,
            userId: schema.apiKeys.userId,
            start: schema.apiKeys.start,
            enabled: schema.apiKeys.enabled,
            expiresAt: schema.apiKeys.expiresAt,
            permissions: schema.apiKeys.permissions,
            metadata: schema.apiKeys.metadata,
            createdAt: schema.apiKeys.createdAt,
            updatedAt: schema.apiKeys.updatedAt,
          })
          .from(schema.apiKeys)
          .where(eq(schema.apiKeys.id, id))
          .limit(1);

        if (!apiKey) return null;

        return {
          ...apiKey,
          start: apiKey.start || "",
          metadata: this.parseMetadata(apiKey.metadata),
        };
      },
      {
        errorMessage: "Failed to get API key by ID",
        context: { id },
        shouldLog: true,
      }
    );

    return result.success ? result.data : null;
  }

  /**
   * Revoke/disable an API key
   */
  static async revoke(id: string, userId: string): Promise<boolean> {
    const result = await tryCatch(
      async () => {
        const res = await db
          .update(schema.apiKeys)
          .set({ enabled: false, updatedAt: new Date() })
          .where(and(
            eq(schema.apiKeys.id, id),
            eq(schema.apiKeys.userId, userId)
          ))
          .returning();

        if (res.length === 0) {
          logger.warn("API key not found for revocation", { id, userId });
          return false;
        }

        logger.info("API key revoked", { id, userId });
        return true;
      },
      {
        errorMessage: "Failed to revoke API key",
        context: { id, userId },
        shouldLog: true,
      }
    );

    return result.success ? result.data : false;
  }

  /**
   * Delete an API key permanently
   */
  static async delete(id: string, userId: string): Promise<boolean> {
    const result = await tryCatch(
      async () => {
        const res = await db
          .delete(schema.apiKeys)
          .where(and(
            eq(schema.apiKeys.id, id),
            eq(schema.apiKeys.userId, userId)
          ))
          .returning();

        if (res.length === 0) {
          logger.warn("API key not found for deletion", { id, userId });
          return false;
        }

        logger.info("API key deleted", { id, userId });
        return true;
      },
      {
        errorMessage: "Failed to delete API key",
        context: { id, userId },
        shouldLog: true,
      }
    );

    return result.success ? result.data : false;
  }

  /**
   * Update API key metadata
   */
  static async update(id: string, userId: string, updates: {
    name?: string;
    enabled?: boolean;
    expiresAt?: Date | null;
    permissions?: string | null;
    metadata?: ApiKeyMetadata | null;
  }): Promise<ApiKeyDto | null> {
    const result = await tryCatch(
      async () => {
        const [apiKey] = await db
          .update(schema.apiKeys)
          .set({
            ...updates,
            updatedAt: new Date(),
          })
          .where(and(
            eq(schema.apiKeys.id, id),
            eq(schema.apiKeys.userId, userId)
          ))
          .returning({
            id: schema.apiKeys.id,
            name: schema.apiKeys.name,
            userId: schema.apiKeys.userId,
            start: schema.apiKeys.start,
            enabled: schema.apiKeys.enabled,
            expiresAt: schema.apiKeys.expiresAt,
            permissions: schema.apiKeys.permissions,
            metadata: schema.apiKeys.metadata,
            createdAt: schema.apiKeys.createdAt,
            updatedAt: schema.apiKeys.updatedAt,
          });

        if (!apiKey) {
          logger.warn("API key not found for update", { id, userId });
          return null;
        }

        logger.info("API key updated", { id, userId });
        return {
          ...apiKey,
          start: apiKey.start || "",
          metadata: this.parseMetadata(apiKey.metadata),
        };
      },
      {
        errorMessage: "Failed to update API key",
        context: { id, userId },
        shouldLog: true,
      }
    );

    return result.success ? result.data : null;
  }
}
