import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEntrance } from "@/hooks/use-entrance";

describe("useEntrance", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("is true right after mount and false once the entrance window ends", () => {
		vi.useFakeTimers();
		const { result, unmount } = renderHook(() => useEntrance(500));
		expect(result.current).toBe(true);
		act(() => {
			vi.advanceTimersByTime(499);
		});
		expect(result.current).toBe(true);
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(result.current).toBe(false);
		unmount();
	});

	it("clears its timer on unmount", () => {
		vi.useFakeTimers();
		const clear = vi.spyOn(window, "clearTimeout");
		const { unmount } = renderHook(() => useEntrance());
		unmount();
		expect(clear).toHaveBeenCalled();
		clear.mockRestore();
	});
});
