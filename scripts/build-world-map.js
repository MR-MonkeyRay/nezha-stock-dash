// Precomputes the home-page world map so the browser never parses GeoJSON or
// runs a projection. Usage:
//   node scripts/build-world-map.js <ne_110m_admin_0_countries.geojson>
// The input is Natural Earth's 1:110m Admin-0 countries GeoJSON. Output:
// src/components/map/world-map.json.
import { readFileSync, writeFileSync } from "node:fs";
import { geoEquirectangular, geoPath } from "d3-geo";

const WIDTH = 900;
const HEIGHT = 500;
// One decimal is a tenth of a viewBox unit: below a pixel at any map width.
const DIGITS = 1;

const [input] = process.argv.slice(2);
if (!input) {
	console.error("usage: node scripts/build-world-map.js <countries.geojson>");
	process.exit(1);
}

const projection = geoEquirectangular()
	.scale(140)
	.translate([WIDTH / 2, HEIGHT / 2])
	.rotate([-12, 0, 0]);
const path = geoPath(projection).digits(DIGITS);
const round = (value) => Number(value.toFixed(DIGITS));

const geo = JSON.parse(readFileSync(input, "utf8"));
const countries = geo.features
	.filter((feature) => feature.properties.iso_a3_eh !== "")
	.map((feature) => {
		const [cx, cy] = path.centroid(feature).map(round);
		return [feature.properties.iso_a2_eh, path(feature), cx, cy];
	});

// Small countries the 1:110m outlines omit are drawn as dots instead.
const outlined = new Set(countries.map(([code]) => code));
const points = JSON.parse(
	readFileSync(new URL("./data/country-points.json", import.meta.url), "utf8"),
);
const markers = Object.fromEntries(
	Object.entries(points)
		.filter(([code]) => !outlined.has(code))
		.map(([code, lngLat]) => [code, projection(lngLat).map(round)]),
);

const output = new URL("../src/components/map/world-map.json", import.meta.url);
writeFileSync(
	output,
	`${JSON.stringify({ width: WIDTH, height: HEIGHT, countries, markers })}\n`,
);
console.log(
	`${countries.length} outlines, ${Object.keys(markers).length} markers -> ${output.pathname}`,
);
