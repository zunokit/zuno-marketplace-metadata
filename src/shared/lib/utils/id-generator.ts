import { customAlphabet } from "nanoid";

/**
 * Production-grade ID Generator with Dynamic Versioning
 *
 * Format: {prefix}_{apiVersion}_{random}
 *
 * Examples:
 * - User:     usr_v1_2fK9mP3xQ1wZ
 * - API Key:  key_v1_7nR4sV8cD2pY
 * - Metadata: mtd_v1_1a2b3c4d5e6f
 * - Media:    med_v1_9hG8fE7dC6bA
 */

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  12 // 12 chars = ~2.8 trillion combinations
);

/**
 * Supported entity prefixes
 */
export enum EntityPrefix {
  USER = "usr",
  API_KEY = "key",
  METADATA = "mtd",
  MEDIA = "med",
  SESSION = "ses",
  VERIFICATION = "ver",
  ACCOUNT = "acc",
  RATE_LIMIT = "rlm",
}

/**
 * Options for ID generation
 */
export interface IdGeneratorOptions {
  /** Entity type prefix */
  prefix: EntityPrefix;

  /**
   * API version - REQUIRED
   * Example: "v1", "v2"
   */
  apiVersion: string;

  /** Include base36 timestamp for sortability (optional) */
  includeTimestamp?: boolean;
}

/**
 * Parsed ID components
 */
export interface ParsedId {
  prefix: EntityPrefix;
  apiVersion: string;
  randomPart: string;
  timestamp?: number;
  isValid: boolean;
}

/**
 * ID Generator Service
 */
export class IdGenerator {
  /**
   * Generate a new ID with versioning support
   *
   * @example
   * const userId = IdGenerator.generate({
   *   prefix: EntityPrefix.USER,
   *   apiVersion: 'v1'
   * });
   * // → 'usr_v1_2fK9mP3xQ1wZ'
   */
  static generate(options: IdGeneratorOptions): string {
    const { prefix, apiVersion, includeTimestamp = false } = options;

    // Validate required apiVersion
    if (!apiVersion) {
      throw new Error("apiVersion is required");
    }

    const parts: string[] = [prefix, apiVersion];

    // Add timestamp if requested (base36 for compactness)
    if (includeTimestamp) {
      const timestamp = Date.now().toString(36);
      parts.push(timestamp);
    }

    // Add random nanoid
    parts.push(nanoid());

    return parts.join("_");
  }

  /**
   * Parse an ID into its components
   */
  static parse(id: string): ParsedId {
    const parts = id.split("_");

    if (parts.length < 3) {
      return {
        prefix: "" as EntityPrefix,
        apiVersion: "",
        randomPart: id,
        isValid: false,
      };
    }

    const [prefix, apiVersion, ...rest] = parts;

    // Check if valid prefix
    const isValidPrefix = Object.values(EntityPrefix).includes(
      prefix as EntityPrefix
    );
    const isValidApiVersion = /^v\d+$/.test(apiVersion);

    if (!isValidPrefix || !isValidApiVersion) {
      return {
        prefix: prefix as EntityPrefix,
        apiVersion: apiVersion,
        randomPart: rest.join("_"),
        isValid: false,
      };
    }

    let randomPart: string;
    let timestamp: number | undefined;

    if (rest.length === 1) {
      randomPart = rest[0];
    } else {
      // Last part is random, second-to-last might be timestamp
      randomPart = rest[rest.length - 1];
      const potentialTimestamp = rest[rest.length - 2];

      if (/^[0-9a-z]+$/.test(potentialTimestamp)) {
        timestamp = parseInt(potentialTimestamp, 36);
      }
    }

    return {
      prefix: prefix as EntityPrefix,
      apiVersion: apiVersion,
      randomPart,
      timestamp,
      isValid: true,
    };
  }

  /**
   * Extract prefix from an ID
   */
  static extractPrefix(id: string): EntityPrefix | null {
    const match = id.match(/^([a-z]{3})_/);
    return match ? (match[1] as EntityPrefix) : null;
  }

  /**
   * Validate ID format and optionally check prefix match
   */
  static validate(id: string, expectedPrefix?: EntityPrefix): boolean {
    const parsed = this.parse(id);

    if (!parsed.isValid) {
      return false;
    }

    if (expectedPrefix && parsed.prefix !== expectedPrefix) {
      return false;
    }

    return true;
  }

  /**
   * Check if an ID belongs to a specific entity type
   */
  static isType(id: string, prefix: EntityPrefix): boolean {
    return this.extractPrefix(id) === prefix;
  }

  /**
   * Extract API version from ID
   */
  static extractApiVersion(id: string): string | null {
    const parsed = this.parse(id);
    return parsed.isValid ? parsed.apiVersion : null;
  }
}
