import {
  FILE_SIZE,
  formatFileSize,
  getMaxFileSize,
  isValidFileSize,
  validateFileSize,
} from "@/shared/config/file-size.config";

const MB = 1024 * 1024;

describe("getMaxFileSize", () => {
  it.each<[Parameters<typeof getMaxFileSize>[0], number]>([
    ["IMAGE", FILE_SIZE.MAX_IMAGE_SIZE],
    ["VIDEO", FILE_SIZE.MAX_VIDEO_SIZE],
    ["GIF", FILE_SIZE.MAX_GIF_SIZE],
    ["MODEL_3D", FILE_SIZE.MAX_MODEL_3D_SIZE],
  ])("returns the configured max for %s", (type, expected) => {
    expect(getMaxFileSize(type)).toBe(expected);
  });
});

describe("validateFileSize", () => {
  it("rejects an empty file with a generic message", () => {
    expect(() => validateFileSize(0, "IMAGE")).toThrow(
      "File is empty or invalid",
    );
  });

  it("rejects an empty file with the file name embedded", () => {
    expect(() => validateFileSize(0, "IMAGE", "logo.png")).toThrow(
      'File "logo.png" is empty or invalid',
    );
  });

  it("rejects files larger than the limit and reports both sizes in MB", () => {
    const over = FILE_SIZE.MAX_GIF_SIZE + 1;
    expect(() => validateFileSize(over, "GIF", "huge.gif")).toThrow(
      /File "huge\.gif" exceeds maximum size for GIF/,
    );
    expect(() => validateFileSize(over, "GIF", "huge.gif")).toThrow(
      /Max: 25\.00MB/,
    );
  });

  it("rejects files larger than the limit without filename uses generic message", () => {
    expect(() =>
      validateFileSize(FILE_SIZE.MAX_VIDEO_SIZE + 1, "VIDEO"),
    ).toThrow(/File exceeds maximum size for VIDEO/);
  });

  it("accepts files exactly at the limit", () => {
    expect(() =>
      validateFileSize(FILE_SIZE.MAX_IMAGE_SIZE, "IMAGE"),
    ).not.toThrow();
  });

  it("accepts a 1-byte file (minimum)", () => {
    expect(() => validateFileSize(1, "IMAGE")).not.toThrow();
  });
});

describe("isValidFileSize", () => {
  it("returns false for empty files", () => {
    expect(isValidFileSize(0, "IMAGE")).toBe(false);
  });

  it("returns false for files over the limit", () => {
    expect(isValidFileSize(FILE_SIZE.MAX_VIDEO_SIZE + 1, "VIDEO")).toBe(false);
  });

  it("returns true for files within the limit", () => {
    expect(isValidFileSize(1024, "IMAGE")).toBe(true);
    expect(isValidFileSize(FILE_SIZE.MAX_VIDEO_SIZE, "VIDEO")).toBe(true);
  });
});

describe("formatFileSize", () => {
  it.each<[number, string]>([
    [0, "0 Bytes"],
    [1, "1 Bytes"],
    [1024, "1 KB"],
    [1024 * 1024, "1 MB"],
    [1024 * 1024 * 1024, "1 GB"],
    [1.5 * MB, "1.5 MB"],
  ])("formats %i bytes as %s", (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});
