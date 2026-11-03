import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.useRealTimers();
	vi.resetModules();
});

describe("preloadServerDetailWhenIdle", () => {
	it("schedules the preload for idle time and can cancel it", async () => {
		const requestIdleCallback = vi.fn(() => 7);
		const cancelIdleCallback = vi.fn();
		vi.stubGlobal("requestIdleCallback", requestIdleCallback);
		vi.stubGlobal("cancelIdleCallback", cancelIdleCallback);
		const { preloadServerDetailWhenIdle, preloadServerDetail } = await import(
			"@/lib/server-detail-preload"
		);

		const cancel = preloadServerDetailWhenIdle();
		expect(requestIdleCallback).toHaveBeenCalledWith(preloadServerDetail, {
			timeout: 4000,
		});
		cancel();
		expect(cancelIdleCallback).toHaveBeenCalledWith(7);
	});

	it("falls back to a timer where requestIdleCallback is missing", async () => {
		vi.useFakeTimers();
		vi.stubGlobal("requestIdleCallback", undefined);
		const { preloadServerDetailWhenIdle } = await import(
			"@/lib/server-detail-preload"
		);
		const setTimeout = vi.spyOn(window, "setTimeout");

		const cancel = preloadServerDetailWhenIdle();
		expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000);
		cancel();
		expect(vi.getTimerCount()).toBe(0);
	});
});
