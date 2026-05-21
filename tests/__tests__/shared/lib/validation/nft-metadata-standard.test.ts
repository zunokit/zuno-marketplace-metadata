import {
  validateNftMetadata,
} from "@/shared/lib/validation/nft-metadata-standard";

const validErc721 = {
  name: "Zuno Genesis #1",
  description: "First Zuno mint",
  image: "ipfs://bafy.../1.png",
  external_url: "https://zuno.xyz/1",
  attributes: [
    { trait_type: "Color", value: "Cyan" },
    { trait_type: "Level", value: 5, display_type: "number" },
  ],
};

describe("validateNftMetadata — happy path (ERC-721)", () => {
  it("accepts a complete, well-formed metadata object", () => {
    const r = validateNftMetadata(validErc721);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
  });

  it("accepts ipfs:// and ar:// URIs", () => {
    expect(
      validateNftMetadata({ ...validErc721, image: "ar://abc/1.png" }).valid,
    ).toBe(true);
  });

  it("accepts http(s) URIs", () => {
    expect(
      validateNftMetadata({
        ...validErc721,
        image: "https://example.com/1.png",
      }).valid,
    ).toBe(true);
  });
});

describe("validateNftMetadata — error paths", () => {
  it("rejects non-object input", () => {
    expect(validateNftMetadata(null).valid).toBe(false);
    expect(validateNftMetadata("not metadata").valid).toBe(false);
    expect(validateNftMetadata([]).valid).toBe(false);
  });

  it("requires a non-empty name", () => {
    const r = validateNftMetadata({ ...validErc721, name: "" });
    expect(r.valid).toBe(false);
    expect(r.errors.map((e) => e.path)).toContain("name");
  });

  it("requires a valid image URI", () => {
    const r = validateNftMetadata({ ...validErc721, image: "not a uri" });
    expect(r.valid).toBe(false);
    expect(r.errors.map((e) => e.path)).toContain("image");
  });

  it("requires image to be present", () => {
    const { image: _img, ...without } = validErc721;
    void _img;
    const r = validateNftMetadata(without);
    expect(r.valid).toBe(false);
    expect(r.errors.map((e) => e.path)).toContain("image");
  });

  it("rejects background_color with a leading #", () => {
    const r = validateNftMetadata({ ...validErc721, background_color: "#abc123" });
    expect(r.valid).toBe(false);
    expect(r.errors.map((e) => e.path)).toContain("background_color");
  });

  it("accepts a valid 6-hex background_color", () => {
    const r = validateNftMetadata({ ...validErc721, background_color: "abc123" });
    expect(r.valid).toBe(true);
  });
});

describe("validateNftMetadata — attribute validation", () => {
  it("rejects attributes that aren't an array", () => {
    const r = validateNftMetadata({
      ...validErc721,
      attributes: { foo: "bar" } as unknown as unknown[],
    });
    expect(r.valid).toBe(false);
  });

  it("rejects attribute entries without a value", () => {
    const r = validateNftMetadata({
      ...validErc721,
      attributes: [{ trait_type: "Color" } as unknown as object],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.path.endsWith(".value"))).toBe(true);
  });

  it("warns on duplicate trait_type", () => {
    const r = validateNftMetadata({
      ...validErc721,
      attributes: [
        { trait_type: "Color", value: "Red" },
        { trait_type: "Color", value: "Blue" },
      ],
    });
    expect(r.valid).toBe(true); // errors-only blocks
    expect(r.warnings.some((w) => w.message.includes("duplicate"))).toBe(true);
  });

  it("requires numeric value when display_type=number", () => {
    const r = validateNftMetadata({
      ...validErc721,
      attributes: [
        { trait_type: "Level", value: "five", display_type: "number" },
      ],
    });
    expect(r.valid).toBe(false);
  });

  it("warns on unknown display_type", () => {
    const r = validateNftMetadata({
      ...validErc721,
      attributes: [
        { trait_type: "Mood", value: 1, display_type: "monkey" },
      ],
    });
    expect(r.warnings.some((w) => w.message.includes("unknown display_type"))).toBe(true);
  });
});

describe("validateNftMetadata — ERC-1155 specific", () => {
  it("accepts a valid decimals + localization block", () => {
    const r = validateNftMetadata(
      {
        ...validErc721,
        decimals: 0,
        localization: {
          uri: "ipfs://bafy.../{locale}.json",
          default: "en",
          locales: ["en", "vi", "ja"],
        },
      },
      { standard: "erc1155" },
    );
    expect(r.valid).toBe(true);
  });

  it("rejects out-of-range decimals", () => {
    const r = validateNftMetadata(
      { ...validErc721, decimals: 19 },
      { standard: "erc1155" },
    );
    expect(r.valid).toBe(false);
    expect(r.errors.map((e) => e.path)).toContain("decimals");
  });

  it("rejects malformed localization blocks", () => {
    const r = validateNftMetadata(
      {
        ...validErc721,
        localization: {
          uri: 123 as unknown as string,
          default: "en",
          locales: ["en"],
        },
      },
      { standard: "erc1155" },
    );
    expect(r.valid).toBe(false);
    expect(r.errors.map((e) => e.path)).toContain("localization.uri");
  });
});

describe("validateNftMetadata — result shape", () => {
  it("includes errors + warnings + valid + standard fields", () => {
    const r = validateNftMetadata(validErc721);
    expect(typeof r.valid).toBe("boolean");
    expect(Array.isArray(r.errors)).toBe(true);
    expect(Array.isArray(r.warnings)).toBe(true);
    expect(["erc721", "erc1155"]).toContain(r.standard);
  });
});
