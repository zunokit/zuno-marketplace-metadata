/**
 * NFT metadata standards validator (ERC-721 + ERC-1155 + OpenSea).
 *
 * This is separate from the request-body validation in `metadata.schemas.ts`
 * which guards our own POST/PUT API. This module instead validates a
 * fully-formed NFT metadata JSON object against the OpenSea metadata
 * standard (which is itself a superset of EIP-721 §4.2 and EIP-1155
 * §3.3). It's used at the IPFS upload boundary, in the admin tools,
 * and as a sanity check on user-supplied URI imports.
 *
 * https://docs.opensea.io/docs/metadata-standards
 * https://eips.ethereum.org/EIPS/eip-721
 * https://eips.ethereum.org/EIPS/eip-1155
 *
 * The validator never throws. It returns a structured result with
 * `errors` (must-fix) and `warnings` (recommended-fix) so callers can
 * decide policy.
 */

export type MetadataStandard = "erc721" | "erc1155";

export interface MetadataIssue {
  /** Dot-path into the metadata object where the problem lives. */
  path: string;
  message: string;
  /** True if this issue should block the upload (errors), false for warnings. */
  blocking: boolean;
}

export interface MetadataValidationResult {
  valid: boolean;
  standard: MetadataStandard;
  errors: MetadataIssue[];
  warnings: MetadataIssue[];
}

const URI_REGEX = /^(https?:\/\/|ipfs:\/\/|ar:\/\/|data:)/i;
const HEX_COLOR_REGEX = /^[0-9A-Fa-f]{6}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pushIssue(
  bucket: MetadataIssue[],
  path: string,
  message: string,
  blocking: boolean,
): void {
  bucket.push({ path, message, blocking });
}

function validateAttribute(
  attr: unknown,
  path: string,
  errors: MetadataIssue[],
  warnings: MetadataIssue[],
): void {
  if (!isRecord(attr)) {
    pushIssue(errors, path, "attribute must be an object", true);
    return;
  }
  const traitType = attr["trait_type"];
  const value = attr["value"];

  if (traitType !== undefined && typeof traitType !== "string") {
    pushIssue(errors, `${path}.trait_type`, "trait_type must be a string", true);
  }
  if (traitType === "") {
    pushIssue(warnings, `${path}.trait_type`, "trait_type is empty", false);
  }
  if (value === undefined || value === null) {
    pushIssue(errors, `${path}.value`, "attribute.value is required", true);
  } else if (
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "boolean"
  ) {
    pushIssue(
      errors,
      `${path}.value`,
      "value must be a string, number, or boolean",
      true,
    );
  }

  const displayType = attr["display_type"];
  if (displayType !== undefined) {
    if (typeof displayType !== "string") {
      pushIssue(
        errors,
        `${path}.display_type`,
        "display_type must be a string",
        true,
      );
    } else {
      const allowed = [
        "number",
        "boost_number",
        "boost_percentage",
        "date",
      ] as const;
      if (!(allowed as readonly string[]).includes(displayType)) {
        pushIssue(
          warnings,
          `${path}.display_type`,
          `unknown display_type "${displayType}" (OpenSea supports ${allowed.join(", ")})`,
          false,
        );
      }
      if (
        ["number", "boost_number", "boost_percentage", "date"].includes(
          displayType,
        ) &&
        typeof value !== "number"
      ) {
        pushIssue(
          errors,
          `${path}.value`,
          `value must be a number when display_type=${displayType}`,
          true,
        );
      }
    }
  }
}

/**
 * Validates a parsed NFT metadata JSON object against the standard.
 * Pass `standard: 'erc1155'` to enable the additional ERC-1155 §3.3
 * checks (decimals, properties, locale-aware fields).
 */
export function validateNftMetadata(
  raw: unknown,
  options: { standard?: MetadataStandard } = {},
): MetadataValidationResult {
  const standard: MetadataStandard = options.standard ?? "erc721";
  const errors: MetadataIssue[] = [];
  const warnings: MetadataIssue[] = [];

  if (!isRecord(raw)) {
    return {
      valid: false,
      standard,
      errors: [
        {
          path: "",
          message: "metadata must be a JSON object",
          blocking: true,
        },
      ],
      warnings: [],
    };
  }

  // -- core required fields --------------------------------------------
  if (typeof raw["name"] !== "string" || (raw["name"] as string).length === 0) {
    pushIssue(errors, "name", "name is required and must be a non-empty string", true);
  }
  if (typeof raw["description"] !== "string") {
    pushIssue(warnings, "description", "description is recommended", false);
  }

  // image is required by EIP-721; URI must be http(s) | ipfs | ar | data
  const image = raw["image"];
  if (typeof image !== "string" || image.length === 0) {
    pushIssue(errors, "image", "image is required and must be a non-empty URI string", true);
  } else if (!URI_REGEX.test(image)) {
    pushIssue(
      errors,
      "image",
      "image must be an http(s), ipfs, ar, or data URI",
      true,
    );
  }

  // -- optional URI fields --------------------------------------------
  const stringUriFields = [
    "external_url",
    "animation_url",
    "image_data",
    "youtube_url",
    "background_image",
  ];
  for (const f of stringUriFields) {
    const v = raw[f];
    if (v === undefined) continue;
    if (typeof v !== "string") {
      pushIssue(errors, f, `${f} must be a string when present`, true);
      continue;
    }
    if (
      ["external_url", "animation_url", "youtube_url"].includes(f) &&
      v.length > 0 &&
      !URI_REGEX.test(v)
    ) {
      pushIssue(
        warnings,
        f,
        `${f} should be an http(s), ipfs, ar, or data URI`,
        false,
      );
    }
  }

  // background_color: OpenSea expects 6-hex, no leading #
  const bg = raw["background_color"];
  if (bg !== undefined) {
    if (typeof bg !== "string") {
      pushIssue(errors, "background_color", "must be a string", true);
    } else if (!HEX_COLOR_REGEX.test(bg)) {
      pushIssue(
        errors,
        "background_color",
        "must be a 6-character hex color without leading #",
        true,
      );
    }
  }

  // -- attributes ------------------------------------------------------
  const attributes = raw["attributes"];
  if (attributes !== undefined) {
    if (!Array.isArray(attributes)) {
      pushIssue(errors, "attributes", "must be an array", true);
    } else {
      attributes.forEach((a, i) => {
        validateAttribute(a, `attributes[${i}]`, errors, warnings);
      });
      const seenTraits = new Set<string>();
      attributes.forEach((a, i) => {
        if (isRecord(a) && typeof a["trait_type"] === "string") {
          const t = a["trait_type"];
          if (seenTraits.has(t)) {
            pushIssue(
              warnings,
              `attributes[${i}].trait_type`,
              `duplicate trait_type "${t}" — most marketplaces will dedupe`,
              false,
            );
          }
          seenTraits.add(t);
        }
      });
    }
  }

  // -- ERC-1155 specific ---------------------------------------------
  if (standard === "erc1155") {
    const decimals = raw["decimals"];
    if (decimals !== undefined) {
      if (
        typeof decimals !== "number" ||
        !Number.isInteger(decimals) ||
        decimals < 0 ||
        decimals > 18
      ) {
        pushIssue(
          errors,
          "decimals",
          "decimals must be an integer in [0, 18] for ERC-1155",
          true,
        );
      }
    }
    const properties = raw["properties"];
    if (properties !== undefined && !isRecord(properties)) {
      pushIssue(errors, "properties", "properties must be an object", true);
    }
    const localization = raw["localization"];
    if (localization !== undefined) {
      if (!isRecord(localization)) {
        pushIssue(errors, "localization", "localization must be an object", true);
      } else {
        if (typeof localization["uri"] !== "string") {
          pushIssue(errors, "localization.uri", "localization.uri is required", true);
        }
        if (typeof localization["default"] !== "string") {
          pushIssue(errors, "localization.default", "localization.default is required", true);
        }
        const locales = localization["locales"];
        if (!Array.isArray(locales) || locales.some((l) => typeof l !== "string")) {
          pushIssue(
            errors,
            "localization.locales",
            "localization.locales must be a string array",
            true,
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    standard,
    errors,
    warnings,
  };
}
