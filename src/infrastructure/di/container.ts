import { db } from "@/infrastructure/database/client";
import { MetadataRepositoryImpl } from "@/infrastructure/repositories/metadata.repository.impl";
import { MediaRepositoryImpl } from "@/infrastructure/repositories/media.repository.impl";
import { ImageKitService } from "@/infrastructure/services/imagekit.service";
import type { MetadataRepository } from "@/core/domain/metadata/metadata.repository";
import type { MediaRepository } from "@/core/domain/media/media.repository";
import { AuditLogRepositoryImpl } from "@/infrastructure/repositories/audit-log.repository.impl";
import type { AuditLogRepository } from "@/core/domain/audit-log/audit-log.repository";
import { CacheService } from "@/infrastructure/cache/cache.service";
import type { ICacheService } from "@/core/domain/cache/cache.interface";



// ============= SINGLETON INSTANCES =============
let metadataRepositoryInstance: MetadataRepository | null = null;
let mediaRepositoryInstance: MediaRepository | null = null;
let imageKitServiceInstance: ImageKitService | null = null;
let auditLogRepository: AuditLogRepository | null = null;
let cacheServiceInstance: ICacheService | null = null;


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

export function getCacheService(): ICacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService();
  }
  return cacheServiceInstance;
}


// ============= CLEANUP =============

export function clearContainer(): void {
  metadataRepositoryInstance = null;
  mediaRepositoryInstance = null;
  imageKitServiceInstance = null;
  auditLogRepository = null;
  cacheServiceInstance = null;
}