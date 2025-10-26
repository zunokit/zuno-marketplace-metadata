import { z } from "zod";
import { commonSchemas } from "@/shared/lib/api/api-handler";

// ============= MEDIA TYPE ENUM =============
export const MediaTypeEnum = z.enum(["IMAGE", "VIDEO", "GIF", "MODEL_3D"]);

// ============= UPLOAD MEDIA SCHEMA =============
export const UploadMediaSchema = z.object({
  body: z.instanceof(FormData).refine((formData) => {
    const file = formData.get("file") as File;
    return file && file.size > 0;
  }, "File is required and cannot be empty"),
});

export type UploadMediaInput = z.infer<typeof UploadMediaSchema>;

// ============= LIST MEDIA SCHEMA =============
export const ListMediaSchema = z.object({
  query: commonSchemas.pagination.merge(
    z.object({
      mediaType: MediaTypeEnum.optional(),
      search: z.string().min(1).optional(),
      sortBy: z
        .enum(["fileName", "createdAt", "fileSize"])
        .optional()
        .default("createdAt"),
      sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
      isPinned: z
        .enum(["true", "false"])
        .optional()
        .transform((val) => val === "true"),
    })
  ),
});

export type ListMediaInput = z.infer<typeof ListMediaSchema>;

// ============= GET MEDIA BY ID SCHEMA =============
export const GetMediaByIdSchema = z.object({
  params: commonSchemas.id,
});

export type GetMediaByIdInput = z.infer<typeof GetMediaByIdSchema>;

// ============= UPDATE MEDIA SCHEMA =============
export const UpdateMediaSchema = z.object({
  params: commonSchemas.id,
  body: z.object({
    ipfsHash: z.string().optional(),
    ipfsUrl: z.string().url().optional(),
    thumbnailUrl: z.string().url().optional(),
    optimizedUrl: z.string().url().optional(),
    isPinned: z.boolean().optional(),
  }),
});

export type UpdateMediaInput = z.infer<typeof UpdateMediaSchema>;

// ============= DELETE MEDIA SCHEMA =============
export const DeleteMediaSchema = z.object({
  params: commonSchemas.id,
});

export type DeleteMediaInput = z.infer<typeof DeleteMediaSchema>;

// ============= BULK DELETE MEDIA SCHEMA =============
export const BulkDeleteMediaSchema = z.object({
  body: z.object({
    ids: z.array(z.string().min(1, "ID is required")).min(1).max(100),
  }),
});

export type BulkDeleteMediaInput = z.infer<typeof BulkDeleteMediaSchema>;

// ============= BATCH UPLOAD MEDIA SCHEMA =============
export const BatchUploadMediaSchema = z.object({
  body: z.instanceof(FormData).refine(
    (formData) => {
      const files = formData.getAll("files");
      return files.length > 0 && files.length <= 20;
    },
    "Between 1 and 20 files required"
  ),
});

export type BatchUploadMediaInput = z.infer<typeof BatchUploadMediaSchema>;
