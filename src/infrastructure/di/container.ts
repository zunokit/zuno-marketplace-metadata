import { db } from "@/infrastructure/database/client";
import { MetadataRepositoryImpl } from "@/infrastructure/repositories/metadata.repository.impl";
import { MediaRepositoryImpl } from "@/infrastructure/repositories/media.repository.impl";
import { ImageKitService } from "@/infrastructure/services/imagekit.service";
import type { MetadataRepository } from "@/core/domain/metadata/metadata.repository";
import type { MediaRepository } from "@/core/domain/media/media.repository";

// ============= SINGLETON INSTANCES =============
let metadataRepositoryInstance: MetadataRepository | null = null;
let mediaRepositoryInstance: MediaRepository | null = null;
let imageKitServiceInstance: ImageKitService | null = null;

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

// ============= CLEANUP =============

export function clearContainer(): void {
  metadataRepositoryInstance = null;
  mediaRepositoryInstance = null;
  imageKitServiceInstance = null;
}