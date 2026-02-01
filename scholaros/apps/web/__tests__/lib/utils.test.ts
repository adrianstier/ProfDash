/**
 * Utils Tests
 *
 * Tests for the cn() classname merge utility.
 */

import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn() - className utility", () => {
  it("should merge simple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes via clsx", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
    expect(cn("base", true && "active")).toBe("base active");
  });

  it("should handle undefined and null values", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("should handle empty string inputs", () => {
    expect(cn("", "base", "")).toBe("base");
  });

  it("should handle no arguments", () => {
    expect(cn()).toBe("");
  });

  it("should merge conflicting Tailwind classes (last wins)", () => {
    // twMerge should resolve conflicting classes
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("bg-white", "bg-black")).toBe("bg-black");
  });

  it("should handle array inputs", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("should handle object inputs (clsx style)", () => {
    expect(cn({ active: true, disabled: false })).toBe("active");
  });

  it("should handle mixed inputs", () => {
    const result = cn("base", ["arr1", "arr2"], { conditional: true });
    expect(result).toBe("base arr1 arr2 conditional");
  });

  it("should properly merge Tailwind responsive variants", () => {
    expect(cn("p-2", "md:p-4", "p-6")).toBe("md:p-4 p-6");
  });

  it("should handle Tailwind arbitrary values", () => {
    expect(cn("w-[100px]", "w-[200px]")).toBe("w-[200px]");
  });
});
