/**
 * Server Actions for API Keys Management
 *
 * Admin-only operations for API key management.
 * Handles creation, updating, deletion, and listing of API keys.
 */

"use server";

import { headers } from "next/headers";
import { auth } from "@/infrastructure/auth/better-auth.config";
import { ApiKeyService } from "@/infrastructure/services/api-key.service";
import { unwrapOrThrow } from "@/shared/lib/utils/server";
import { ApiKeyDtoMapper } from "@/shared/dto/api-key.dto";
import {
  createApiKeySchema,
  updateApiKeySchema,
  listApiKeysSchema,
  type CreateApiKeyInput,
  type UpdateApiKeyInput,
  type ListApiKeysInput,
} from "@/shared/lib/validation/api-key.schemas";

// ============ Actions ============

/**
 * Create new API key (admin only)
 */
export async function createApiKey(input: CreateApiKeyInput["body"]) {
  // Check admin auth
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }

  // Validate input
  const validatedInput = createApiKeySchema.shape.body.parse(input);

  // Create API key through service layer
  const result = await ApiKeyService.create(
    {
      userId: session.user.id,
      name: validatedInput.name,
      permissions: validatedInput.permissions,
      expiresIn: validatedInput.expiresIn,
      metadata: validatedInput.metadata,
    },
    auth.api
  );

  const apiKey = unwrapOrThrow(result);

  // Map to response DTO
  return ApiKeyDtoMapper.toCreatedResponseDto(apiKey);
}

/**
 * Update API key by ID (admin only)
 */
export async function updateApiKey(
  id: string,
  input: UpdateApiKeyInput["body"]
) {
  // Check admin auth
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }

  // Validate input
  const validatedInput = updateApiKeySchema.shape.body.parse(input);

  // Update API key through service layer
  const result = await ApiKeyService.update(
    id,
    validatedInput,
    auth.api,
    await headers()
  );

  const apiKey = unwrapOrThrow(result);

  // Convert service DTO to Better Auth format using utility
  const betterAuthKey = ApiKeyDtoMapper.fromServiceResult(apiKey);

  // Map to response DTO
  return ApiKeyDtoMapper.toResponseDto(betterAuthKey);
}

/**
 * Delete API key by ID (admin only)
 */
export async function deleteApiKey(id: string) {
  // Check admin auth
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }

  // Get API key before deletion for response
  const getResult = await ApiKeyService.getById(id);
  const existingKey = unwrapOrThrow(getResult);

  if (!existingKey) {
    throw new Error("API key not found");
  }

  // Delete through service layer
  const result = await ApiKeyService.delete(id, auth.api, await headers());
  unwrapOrThrow(result);

  // Convert service DTO to Better Auth format using utility
  const betterAuthKey = ApiKeyDtoMapper.fromServiceResult(existingKey);

  // Map to deleted response DTO
  return ApiKeyDtoMapper.toDeletedResponseDto(betterAuthKey);
}

/**
 * Get API key by ID (admin only)
 */
export async function getApiKeyById(id: string) {
  // Check admin auth
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }

  // Get API key through service layer
  const result = await ApiKeyService.getById(id);
  const apiKey = unwrapOrThrow(result);

  if (!apiKey) {
    throw new Error("API key not found");
  }

  // Map to response DTO
  return ApiKeyDtoMapper.toResponseDto(apiKey);
}

/**
 * List API keys with pagination and filters (admin only)
 */
export async function listApiKeys(input?: ListApiKeysInput["query"]) {
  // Check admin auth
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }

  // Validate input
  const validatedInput = listApiKeysSchema.shape.query.parse(input || {});

  // Build params using service
  const params = ApiKeyService.buildListParams(
    {
      ...validatedInput,
      userId: session.user.id, // List only current admin's keys
    },
    { user: session.user }
  );

  // Execute query through service layer
  const result = await ApiKeyService.list(params);
  const listResult = unwrapOrThrow(result);

  // Map service DTOs to Better Auth format using utility
  const betterAuthKeys = listResult.keys.map((key) =>
    ApiKeyDtoMapper.fromServiceResult({
      ...key,
      metadata: (key.metadata as Record<string, unknown>) ?? null,
      rateLimitEnabled: null,
      rateLimitMax: null,
      rateLimitTimeWindow: null,
      remaining: null,
    })
  );

  // Map to paginated DTO response
  return ApiKeyDtoMapper.toPaginatedResponseDto(
    betterAuthKeys,
    validatedInput?.page || 1,
    params.limit
  );
}
