import { db } from "@/infrastructure/database/client";
import { MetadataRepositoryImpl } from "@/infrastructure/repositories/metadata.repository.impl";
import { MediaRepositoryImpl } from "@/infrastructure/repositories/media.repository.impl";
import { ApiVersionRepositoryImpl } from "@/infrastructure/repositories/api-version.repository.impl";
import { ApiKeyRepositoryImpl } from "@/infrastructure/repositories/api-key.repository.impl";
import { ImageKitService } from "@/infrastructure/services/imagekit.service";
import type { MetadataRepository } from "@/core/domain/metadata/metadata.repository";
import type { MediaRepository } from "@/core/domain/media/media.repository";
import type { ApiVersionRepository } from "@/core/domain/api-version/api-version.repository";
import type { ApiKeyRepository } from "@/core/domain/api-key/api-key.repository";
import { AuditLogRepositoryImpl } from "@/infrastructure/repositories/audit-log.repository.impl";
import type { AuditLogRepository } from "@/core/domain/audit-log/audit-log.repository";



// ============= SINGLETON INSTANCES =============
let metadataRepositoryInstance: MetadataRepository | null = null;
let mediaRepositoryInstance: MediaRepository | null = null;
let apiVersionRepositoryInstance: ApiVersionRepository | null = null;
let apiKeyRepositoryInstance: ApiKeyRepository | null = null;
let imageKitServiceInstance: ImageKitService | null = null;
let auditLogRepository: AuditLogRepository | null = null;


// ============= REPOSITORY FACTORIES =============

export function getMetadataRepository(): MetadataRepository {
  if (!metadataRepositoryInstance) {
    metadataRepositoryInstance = new MetadataRepositoryImpl(db);
  }
  return metadataRepositoryInstance;
}

export function getMediaRepository(): MediaRepository {
  if (!mediaRepositoryInstance) {
    mediaRepositoryInstance = new MediaRepositoryImpl(db);
  }
  return mediaRepositoryInstance;
}

export function getApiVersionRepository(): ApiVersionRepository {
  if (!apiVersionRepositoryInstance) {
    apiVersionRepositoryInstance = new ApiVersionRepositoryImpl(db);
  }
  return apiVersionRepositoryInstance;
}

export function getApiKeyRepository(): ApiKeyRepository {
  if (!apiKeyRepositoryInstance) {
    apiKeyRepositoryInstance = new ApiKeyRepositoryImpl(db);
  }
  return apiKeyRepositoryInstance;
}

// ============= SERVICE FACTORIES =============

export function getImageKitService(): ImageKitService {
  if (!imageKitServiceInstance) {
    imageKitServiceInstance = new ImageKitService();
  }
  return imageKitServiceInstance;
}

export function getAuditLogRepository(): AuditLogRepository {
  if (!auditLogRepository) {
    auditLogRepository = new AuditLogRepositoryImpl();
  }
  return auditLogRepository;
}


// ============= CLEANUP =============

export function clearContainer(): void {
  metadataRepositoryInstance = null;
  mediaRepositoryInstance = null;
  apiVersionRepositoryInstance = null;
  apiKeyRepositoryInstance = null;
  imageKitServiceInstance = null;
  auditLogRepository = null;
}
