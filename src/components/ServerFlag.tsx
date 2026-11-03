import { useRuntimeConfig } from "@/features/runtime-config/runtime-config";
import { cn } from "@/lib/utils";

// One URL per 4:3 flag. `no-inline` keeps each SVG a separate cacheable file
// that the browser fetches only when that flag is shown, instead of inlining
// ~2 MB of data URIs into a render-blocking stylesheet.
const FLAG_URLS = Object.fromEntries(
	Object.entries(
		import.meta.glob<string>("/node_modules/flag-icons/flags/4x3/*.svg", {
			eager: true,
			query: "?no-inline",
			import: "default",
		}),
	).map(([path, url]) => [
		path.slice(path.lastIndexOf("/") + 1, -4).toUpperCase(),
		url,
	]),
);

const REGIONAL_INDICATOR_A = 0x1f1e6;
const toEmojiFlag = (code: string) =>
	String.fromCodePoint(
		...[...code].map((c) => REGIONAL_INDICATOR_A + c.charCodeAt(0) - 65),
	);

// Windows and some Linux builds have no flag glyphs and render two letters
// instead. Probe once per page; every flag shares the answer.
let emojiFlagSupport: boolean | undefined;
function detectEmojiFlags(): boolean {
	if (emojiFlagSupport !== undefined) return emojiFlagSupport;
	try {
		const ctx = document.createElement("canvas").getContext("2d");
		emojiFlagSupport = false;
		if (ctx) {
			ctx.textBaseline = "top";
			ctx.font = "32px Arial";
			ctx.fillText(toEmojiFlag("US"), 0, 0);
			emojiFlagSupport = ctx.getImageData(16, 16, 1, 1).data[3] !== 0;
		}
	} catch {
		emojiFlagSupport = false;
	}
	return emojiFlagSupport;
}

export default function ServerFlag({
	country_code,
	className,
}: {
	country_code: string;
	className?: string;
}) {
	const { forceUseSvgFlag } = useRuntimeConfig();
	const emoji = !forceUseSvgFlag && detectEmojiFlags();

	const code = (country_code || "").trim().replace(/_/g, "-").toUpperCase();
	const url = FLAG_URLS[code];
	if (!url) return null;

	return (
		<span className={cn("text-[12px] text-muted-foreground", className)}>
			{emoji && /^[A-Z]{2}$/.test(code) ? (
				toEmojiFlag(code)
			) : (
				<img
					src={url}
					alt=""
					aria-hidden="true"
					loading="lazy"
					decoding="async"
					className="inline-block h-[1em] w-[1.333em] align-[-0.125em]"
				/>
			)}
		</span>
	);
}
