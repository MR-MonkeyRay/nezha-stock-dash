import { describe, expect, it } from "vitest";
import worldMap from "@/components/map/world-map.json";

describe("precomputed world map", () => {
	it("ships outlines with centroids inside the viewBox", () => {
		expect(worldMap.countries.length).toBeGreaterThan(150);
		for (const [code, d, cx, cy] of worldMap.countries as [
			string,
			string,
			number,
			number,
		][]) {
			expect(code).toMatch(/^([A-Z]{2}|-99)$/);
			expect(d).toMatch(/^M/);
			expect(cx).toBeGreaterThanOrEqual(0);
			expect(cx).toBeLessThanOrEqual(worldMap.width);
			expect(cy).toBeGreaterThanOrEqual(0);
			expect(cy).toBeLessThanOrEqual(worldMap.height);
		}
	});

	it("draws small countries as markers only when they have no outline", () => {
		const outlined = new Set(worldMap.countries.map(([code]) => code));
		expect(Object.keys(worldMap.markers)).toContain("SG");
		for (const code of Object.keys(worldMap.markers))
			expect(outlined.has(code)).toBe(false);
	});
});
