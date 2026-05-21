import { toISOString, toISOStringOrNow } from "@/shared/lib/utils/date";

describe("toISOString", () => {
  it("returns the ISO string for a Date object", () => {
    const date = new Date("2025-10-26T10:00:00.000Z");
    expect(toISOString(date)).toBe("2025-10-26T10:00:00.000Z");
  });

  it("returns an ISO string as-is", () => {
    expect(toISOString("2025-10-26T10:00:00.000Z")).toBe(
      "2025-10-26T10:00:00.000Z",
    );
  });

  it("returns null for null and undefined", () => {
    expect(toISOString(null)).toBeNull();
    expect(toISOString(undefined)).toBeNull();
  });

  it("returns null for a string that cannot become a Date", () => {
    // Empty string is falsy, so it returns null via the early `if (!date)` branch.
    expect(toISOString("")).toBeNull();
  });

  it("returns null when the underlying Date conversion throws", () => {
    // Passing an object without toISOString triggers the fallback `new Date(date as any).toISOString()` branch.
    // An invalid Date throws on toISOString → caught → null.
    expect(toISOString({} as unknown as Date)).toBeNull();
  });
});

describe("toISOStringOrNow", () => {
  it("returns the ISO string when input is valid", () => {
    const date = new Date("2025-10-26T10:00:00.000Z");
    expect(toISOStringOrNow(date)).toBe("2025-10-26T10:00:00.000Z");
  });

  it("falls back to the current date when input is null", () => {
    const before = Date.now();
    const out = toISOStringOrNow(null);
    const after = Date.now();
    const parsed = Date.parse(out);
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after);
  });

  it("falls back to the current date when input is undefined", () => {
    expect(typeof toISOStringOrNow(undefined)).toBe("string");
    expect(toISOStringOrNow(undefined)).not.toBe("");
  });
});
