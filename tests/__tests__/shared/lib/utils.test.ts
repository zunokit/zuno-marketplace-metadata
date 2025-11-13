import { cn } from "@/shared/lib/utils";

describe("Utility Functions", () => {
  describe("cn (className utility)", () => {
    it("should merge class names", () => {
      const result = cn("text-red-500", "bg-blue-500");
      expect(result).toContain("text-red-500");
      expect(result).toContain("bg-blue-500");
    });

    it("should handle conditional class names", () => {
      const isActive = true;
      const result = cn("base-class", isActive && "active-class");
      expect(result).toContain("base-class");
      expect(result).toContain("active-class");
    });

    it("should handle falsy values", () => {
      const result = cn("base-class", false && "should-not-appear", undefined, null);
      expect(result).toContain("base-class");
      expect(result).not.toContain("should-not-appear");
    });

    it("should merge conflicting Tailwind classes correctly", () => {
      const result = cn("text-red-500", "text-blue-500");
      // tailwind-merge should keep only the last conflicting class
      expect(result).toContain("text-blue-500");
    });

    it("should handle arrays of class names", () => {
      const result = cn(["text-red-500", "bg-blue-500"]);
      expect(result).toContain("text-red-500");
      expect(result).toContain("bg-blue-500");
    });

    it("should handle empty input", () => {
      const result = cn();
      expect(result).toBe("");
    });
  });
});
