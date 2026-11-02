import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isPlainClick, useServerLinkClick } from "@/hooks/use-open-server";
import {
	centerOf,
	SERVER_NAME_VT,
	supportsViewTransition,
	waitUntil,
	withViewTransition,
} from "@/lib/view-transition";

function mockStart() {
	let resolveFinished: () => void = () => undefined;
	const finished = new Promise<void>((resolve) => {
		resolveFinished = resolve;
	});
	const start = vi.fn((update: () => void) => {
		update();
		return { finished };
	});
	Object.assign(document, { startViewTransition: start });
	return { start, finish: () => resolveFinished() };
}

afterEach(() => {
	Reflect.deleteProperty(document, "startViewTransition");
	delete document.documentElement.dataset.vt;
	document.documentElement.removeAttribute("style");
	vi.restoreAllMocks();
});

describe("withViewTransition", () => {
	it("runs the update directly when the API is missing", () => {
		const update = vi.fn();
		expect(supportsViewTransition()).toBe(false);
		withViewTransition(update, "fade");
		expect(update).toHaveBeenCalledOnce();
		expect(document.documentElement.dataset.vt).toBeUndefined();
	});

	it("skips the transition for reduced-motion users", () => {
		const { start } = mockStart();
		// matchMedia is a shared vi.fn from setup; override a single call only.
		vi.mocked(window.matchMedia).mockReturnValueOnce({
			matches: true,
		} as MediaQueryList);
		const update = vi.fn();
		withViewTransition(update, "theme");
		expect(start).not.toHaveBeenCalled();
		expect(update).toHaveBeenCalledOnce();
	});

	it("tags the root, hands the shared name to the new page and cleans up", async () => {
		const { start, finish } = mockStart();
		const shared = document.createElement("span");
		let nameDuringOldSnapshot = "";
		start.mockImplementationOnce((update: () => void) => {
			nameDuringOldSnapshot = shared.style.viewTransitionName;
			update();
			return { finished: Promise.resolve() };
		});
		const update = vi.fn();
		withViewTransition(update, "nav", { shared });
		expect(nameDuringOldSnapshot).toBe(SERVER_NAME_VT);
		expect(shared.style.viewTransitionName).toBe("");
		expect(update).toHaveBeenCalledOnce();
		await Promise.resolve();
		await Promise.resolve();
		expect(document.documentElement.dataset.vt).toBeUndefined();
		finish();
	});

	it("records the reveal origin and a radius that covers the viewport", () => {
		mockStart();
		withViewTransition(() => undefined, "theme", { origin: { x: 0, y: 0 } });
		const style = document.documentElement.style;
		expect(document.documentElement.dataset.vt).toBe("theme");
		expect(style.getPropertyValue("--vt-x")).toBe("0px");
		const radius = Number.parseFloat(style.getPropertyValue("--vt-r"));
		expect(radius).toBeGreaterThanOrEqual(
			Math.hypot(window.innerWidth, window.innerHeight) - 1,
		);
	});

	it("holds the new snapshot until the page is ready, bounded by maxWait", async () => {
		vi.useFakeTimers();
		try {
			let ready = false;
			const done = vi.fn();
			waitUntil(() => ready, 400).then(done);
			await vi.advanceTimersByTimeAsync(50);
			expect(done).not.toHaveBeenCalled();
			ready = true;
			await vi.advanceTimersByTimeAsync(20);
			expect(done).toHaveBeenCalledOnce();

			const timedOut = vi.fn();
			waitUntil(() => false, 100).then(timedOut);
			await vi.advanceTimersByTimeAsync(130);
			expect(timedOut).toHaveBeenCalledOnce();
		} finally {
			vi.useRealTimers();
		}
	});

	it("awaits waitFor inside the transition callback", async () => {
		let callback: (() => Promise<void> | void) | undefined;
		Object.assign(document, {
			startViewTransition: vi.fn((update: () => Promise<void> | void) => {
				callback = update;
				return { finished: new Promise<void>(() => undefined) };
			}),
		});
		const update = vi.fn();
		withViewTransition(update, "nav", { waitFor: () => true });
		await expect(callback?.()).resolves.toBeUndefined();
		expect(update).toHaveBeenCalledOnce();
	});

	it("measures element centers", () => {
		const element = document.createElement("div");
		element.getBoundingClientRect = () =>
			({ left: 10, top: 20, width: 40, height: 10 }) as DOMRect;
		expect(centerOf(element)).toEqual({ x: 30, y: 25 });
		expect(centerOf(null)).toBeUndefined();
	});
});

function LinkHarness() {
	const click = useServerLinkClick();
	const location = useLocation();
	return (
		<>
			<a href="/server/7" onClick={(event) => click(7, event)}>
				<span data-vt-name>alpha</span>
			</a>
			<p data-testid="path">{location.pathname}</p>
		</>
	);
}

describe("useServerLinkClick", () => {
	it("navigates in-app on plain clicks and leaves modified clicks native", () => {
		render(
			<MemoryRouter initialEntries={["/"]}>
				<Routes>
					<Route path="*" element={<LinkHarness />} />
				</Routes>
			</MemoryRouter>,
		);
		const link = screen.getByRole("link");
		const modified = fireEvent.click(link, { ctrlKey: true });
		expect(modified).toBe(true);
		expect(screen.getByTestId("path")).toHaveTextContent("/");
		expect(sessionStorage.getItem("fromMainPage")).toBe("true");

		const plain = fireEvent.click(link);
		expect(plain).toBe(false);
		expect(screen.getByTestId("path")).toHaveTextContent("/server/7");
	});

	it("only treats unmodified primary clicks as plain", () => {
		const base = { button: 0, defaultPrevented: false } as React.MouseEvent;
		expect(isPlainClick(base)).toBe(true);
		expect(isPlainClick({ ...base, button: 1 } as React.MouseEvent)).toBe(
			false,
		);
		expect(isPlainClick({ ...base, metaKey: true } as React.MouseEvent)).toBe(
			false,
		);
	});
});
