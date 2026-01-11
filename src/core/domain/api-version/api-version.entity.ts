// ============= API VERSION ENTITY =============
export interface ApiVersionEntity {
  id: string; // e.g., 'v1', '1.0.0', 'v1.0.0'
  label: string; // Human-friendly label
  isCurrent: boolean;
  deprecated: boolean;
  releasedAt: Date;
  sunsetAt?: Date;
}

// ============= API VERSION CREATION =============
export interface CreateApiVersionParams {
  id: string;
  label: string;
  isCurrent?: boolean;
  deprecated?: boolean;
  releasedAt: Date;
  sunsetAt?: Date;
}

// ============= API VERSION UPDATE =============
export interface UpdateApiVersionParams {
  label?: string;
  isCurrent?: boolean;
  deprecated?: boolean;
  releasedAt?: Date;
  sunsetAt?: Date | null;
}
