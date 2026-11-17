import { describe, expect, it } from "vitest";
import { contrastRatio, mixColours, toneAlongGradient, toneOn } from "@/lib/ui/readableText";

describe("readableText", () => {
  it("picks white on dark and ink on light", () => {
    expect(toneOn([9, 8, 54])).toBe("light");
    expect(toneOn([250, 250, 250])).toBe("dark");
  });

  it("mixes between two colours and clamps", () => {
    expect(mixColours("#000000", "#ffffff", 0.5)).toEqual([128, 128, 128]);
    expect(mixColours("#000000", "#ffffff", 9)).toEqual([255, 255, 255]);
  });

  it("Commercial's light-purple to navy gradient needs white text across the title and the controls", () => {
    expect(toneAlongGradient("#a68cda", "#090836", 0.3)).toBe("light");
    expect(toneAlongGradient("#a68cda", "#090836", 0.85)).toBe("light");
  });

  it("a pale-to-pale gradient needs dark text", () => {
    expect(toneAlongGradient("#f5f5dc", "#e0e0f0", 0.3)).toBe("dark");
  });

  it("whichever tone it picks beats 3:1 on the colour it was picked for", () => {
    for (const [a, b] of [["#a68cda", "#090836"], ["#ffd700", "#222222"], ["#00a99d", "#003b46"], ["#ffffff", "#000000"]]) {
      for (const at of [0.3, 0.85]) {
        const bg = mixColours(a, b, at);
        const fg: [number, number, number] = toneOn(bg) === "light" ? [255, 255, 255] : [17, 24, 39];
        expect(contrastRatio(fg, bg)).toBeGreaterThan(3);
      }
    }
  });
});
