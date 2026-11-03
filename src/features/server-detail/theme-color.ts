/**
 * Canvas charts cannot read CSS variables, so resolve tokens like `--up`
 * (HSL triplets, optionally with "/ alpha") into rgba() strings.
 */
export function hslTripletToRgba(triplet: string, fallback = "rgba(0,0,0,1)") {
	const match = triplet
		.trim()
		.match(
			/^(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:\s*\/\s*([\d.]+%?))?$/,
		);
	if (!match) return fallback;
	const h = (((Number(match[1]) % 360) + 360) % 360) / 360;
	const s = Number(match[2]) / 100;
	const l = Number(match[3]) / 100;
	const alphaText = match[4];
	const a =
		alphaText === undefined
			? 1
			: alphaText.endsWith("%")
				? Number(alphaText.slice(0, -1)) / 100
				: Number(alphaText);
	const hue = (p: number, q: number, t: number) => {
		let x = t;
		if (x < 0) x += 1;
		if (x > 1) x -= 1;
		if (x < 1 / 6) return p + (q - p) * 6 * x;
		if (x < 1 / 2) return q;
		if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
		return p;
	};
	let r = l;
	let g = l;
	let b = l;
	if (s !== 0) {
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue(p, q, h + 1 / 3);
		g = hue(p, q, h);
		b = hue(p, q, h - 1 / 3);
	}
	const to255 = (value: number) => Math.round(value * 255);
	return `rgba(${to255(r)},${to255(g)},${to255(b)},${a})`;
}

export type ChartPalette = {
	background: string;
	text: string;
	grid: string;
	border: string;
	crosshair: string;
	up: string;
	down: string;
	flat: string;
	ma: [string, string, string];
};

/** Reads the active theme (dark/light + 涨跌颜色) from <html>. */
export function readChartPalette(
	root: HTMLElement = document.documentElement,
): ChartPalette {
	const style = getComputedStyle(root);
	const token = (name: string, fallback: string) =>
		hslTripletToRgba(style.getPropertyValue(name), fallback);
	return {
		background: token("--card", "rgba(17,20,24,1)"),
		text: token("--chart-axis", "rgba(179,179,179,1)"),
		grid: token("--chart-grid", "rgba(236,236,236,0.13)"),
		border: token("--border", "rgba(47,51,62,1)"),
		crosshair: token("--muted-foreground", "rgba(140,140,140,1)"),
		up: token("--up", "rgba(242,54,69,1)"),
		down: token("--down", "rgba(29,191,96,1)"),
		flat: token("--flat", "rgba(190,190,190,1)"),
		ma: [
			token("--ma-1", "rgba(255,189,9,1)"),
			token("--ma-2", "rgba(22,198,255,1)"),
			token("--ma-3", "rgba(174,35,161,1)"),
		],
	};
}
