import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveWhenVisible } from "@/components/LiveWhenVisible";

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

let report: Callback | undefined;
const original = globalThis.IntersectionObserver;

function setVisibility(state: DocumentVisibilityState) {
	Object.defineProperty(document, "visibilityState", {
		configurable: true,
		get: () => state,
	});
	act(() => {
		document.dispatchEvent(new Event("visibilitychange"));
	});
}

describe("LiveWhenVisible", () => {
	beforeEach(() => {
		globalThis.IntersectionObserver = class {
			constructor(callback: Callback) {
				report = callback;
			}
			observe = vi.fn();
			disconnect = vi.fn();
		} as unknown as typeof IntersectionObserver;
	});

	afterEach(() => {
		globalThis.IntersectionObserver = original;
		report = undefined;
		setVisibility("visible");
	});

	it("freezes off-screen content and catches up when it scrolls back", () => {
		const { rerender } = render(
			<LiveWhenVisible>
				<p>tick 1</p>
			</LiveWhenVisible>,
		);
		rerender(
			<LiveWhenVisible>
				<p>tick 2</p>
			</LiveWhenVisible>,
		);
		expect(screen.getByText("tick 2")).toBeInTheDocument();

		act(() => report?.([{ isIntersecting: false }]));
		rerender(
			<LiveWhenVisible>
				<p>tick 3</p>
			</LiveWhenVisible>,
		);
		expect(screen.getByText("tick 2")).toBeInTheDocument();

		act(() => report?.([{ isIntersecting: true }]));
		expect(screen.getByText("tick 3")).toBeInTheDocument();
	});

	it("freezes while the page is in a background tab", () => {
		const { rerender } = render(
			<LiveWhenVisible>
				<p>tick 1</p>
			</LiveWhenVisible>,
		);
		setVisibility("hidden");
		rerender(
			<LiveWhenVisible>
				<p>tick 2</p>
			</LiveWhenVisible>,
		);
		expect(screen.getByText("tick 1")).toBeInTheDocument();

		setVisibility("visible");
		expect(screen.getByText("tick 2")).toBeInTheDocument();
	});
});
