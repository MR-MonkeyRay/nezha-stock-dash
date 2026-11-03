import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useServerPreferences } from "@/features/servers/use-server-preferences";
import type { NezhaWebsocketResponse } from "@/types/nezha-api";

const data = { now: 1, servers: [] };
beforeEach(() => {
	vi.stubGlobal("innerWidth", 1024);
});

describe("server preferences", () => {
	it("keeps in-session controls usable when browser persistence is blocked", () => {
		const fail = () => {
			throw new Error("Storage blocked");
		};
		const local = vi
			.spyOn(window, "localStorage", "get")
			.mockImplementation(fail);
		const session = vi
			.spyOn(window, "sessionStorage", "get")
			.mockImplementation(fail);
		try {
			const { result } = renderHook(() => useServerPreferences(true, data));
			act(() => {
				result.current.toggleMap();
				result.current.toggleServices();
				result.current.setView("grid");
				result.current.handleTagChange("Asia");
			});
			expect(result.current).toMatchObject({
				showMap: true,
				showServices: true,
				view: "grid",
				currentGroup: "Asia",
			});
		} finally {
			local.mockRestore();
			session.mockRestore();
		}
	});
	it("keeps an unsaved view choice across rerenders without overriding forced defaults", () => {
		localStorage.setItem("serverView", "grid");
		const write = vi
			.spyOn(Storage.prototype, "setItem")
			.mockImplementation(() => {
				throw new DOMException("Quota exceeded", "QuotaExceededError");
			});
		try {
			const { result, rerender } = renderHook(() =>
				useServerPreferences(true, data),
			);
			expect(result.current.view).toBe("grid");
			act(() => result.current.setView("list"));
			expect(result.current.view).toBe("list");
			rerender();
			expect(result.current.view).toBe("list");
			expect(localStorage.getItem("serverView")).toBe("grid");
			act(() => result.current.setView("grid"));
			act(() => {
				window.ForceCardInline = true;
			});
			expect(result.current.view).toBe("list");
		} finally {
			write.mockRestore();
		}
	});
	it("round trips preferences through local storage", () => {
		const { result } = renderHook(() => useServerPreferences(true, null));
		for (const [key, toggle] of [
			["showMap", "toggleMap"],
			["showServices", "toggleServices"],
		] as const) {
			expect(result.current[key]).toBe(false);
			act(() => result.current[toggle]());
			expect(result.current[key]).toBe(true);
			expect(localStorage.getItem(key)).toBe("true");
			act(() => result.current[toggle]());
			expect(localStorage.getItem(key)).toBe("false");
		}
		// The watchlist is the default view.
		expect(result.current.view).toBe("list");
		act(() => result.current.setView("grid"));
		expect(result.current.view).toBe("grid");
		expect(localStorage.getItem("serverView")).toBe("grid");
		act(() => result.current.setView("list"));
		expect(localStorage.getItem("serverView")).toBe("list");
	});
	it("restores stored preferences and group selection", () => {
		localStorage.setItem("showMap", "true");
		localStorage.setItem("showServices", "true");
		localStorage.setItem("serverView", "grid");
		sessionStorage.setItem("selectedGroup", "Europe");
		const { result } = renderHook(() => useServerPreferences(true, null));
		expect(result.current).toMatchObject({
			showMap: true,
			showServices: true,
			view: "grid",
			currentGroup: "Europe",
		});
		vi.stubGlobal("scrollY", 123);
		act(() => result.current.handleTagChange("Asia"));
		expect(result.current.currentGroup).toBe("Asia");
		expect(sessionStorage.getItem("selectedGroup")).toBe("Asia");
		expect(sessionStorage.getItem("scrollPosition")).toBe("123");
	});
	it("lets forced defaults override stored flags", () => {
		window.ForceShowServices = true;
		window.ForceShowMap = true;
		window.ForceCardInline = true;
		localStorage.setItem("showMap", "false");
		localStorage.setItem("showServices", "false");
		localStorage.setItem("serverView", "grid");
		const { result } = renderHook(() => useServerPreferences(true, null));
		expect(result.current).toMatchObject({
			showMap: true,
			showServices: true,
			view: "list",
		});
	});
	it("observes delayed custom-code preferences without overwriting saved flags", () => {
		localStorage.setItem("showMap", "false");
		localStorage.setItem("showServices", "false");
		localStorage.setItem("serverView", "grid");
		const { result } = renderHook(() => useServerPreferences(true, null));
		act(() => {
			window.ForceShowServices = true;
			window.ForceShowMap = true;
			window.ForceCardInline = true;
		});
		expect(result.current).toMatchObject({
			showMap: true,
			showServices: true,
			view: "list",
		});
		expect(localStorage.getItem("showMap")).toBe("false");
		expect(localStorage.getItem("showServices")).toBe("false");
		expect(localStorage.getItem("serverView")).toBe("grid");
	});
	it("hides unavailable services without overwriting the saved preference", () => {
		localStorage.setItem("showServices", "true");
		const { result, rerender } = renderHook(
			({ hasServices }) => useServerPreferences(hasServices, null),
			{ initialProps: { hasServices: true } },
		);
		expect(result.current.showServices).toBe(true);
		rerender({ hasServices: false });
		expect(result.current.showServices).toBe(false);
		expect(localStorage.getItem("showServices")).toBe("true");
	});
	it.each([
		false,
		true,
	])("restores desired services after cold loading (forced=%s)", (forced) => {
		window.ForceShowServices = forced;
		localStorage.setItem("showServices", String(!forced));
		const { result, rerender } = renderHook(
			({ available }) => useServerPreferences(available, null),
			{ initialProps: { available: false } },
		);
		expect(result.current.showServices).toBe(false);
		rerender({ available: true });
		expect(result.current.showServices).toBe(true);
		rerender({ available: false });
		rerender({ available: true });
		expect(result.current.showServices).toBe(true);
		expect(localStorage.getItem("showServices")).toBe(String(!forced));
	});
	it("honors the saved view on narrow screens and ignores invalid values", () => {
		vi.stubGlobal("innerWidth", 390);
		localStorage.setItem("serverView", "grid");
		const { result, unmount } = renderHook(() =>
			useServerPreferences(true, null),
		);
		expect(result.current.view).toBe("grid");
		unmount();
		localStorage.setItem("serverView", "garbage");
		const { result: fresh } = renderHook(() =>
			useServerPreferences(true, null),
		);
		expect(fresh.current.view).toBe("list");
	});
	it("waits for data and two frames, then restores scroll only once", () => {
		sessionStorage.setItem("fromMainPage", "true");
		sessionStorage.setItem("scrollPosition", "123");
		const frames: FrameRequestCallback[] = [];
		vi.stubGlobal(
			"requestAnimationFrame",
			vi.fn((fn: FrameRequestCallback) => {
				frames.push(fn);
				return frames.length;
			}),
		);
		const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
		const { rerender } = renderHook(
			({ value }: { value: NezhaWebsocketResponse | null }) =>
				useServerPreferences(true, value),
			{
				initialProps: { value: null } as {
					value: NezhaWebsocketResponse | null;
				},
			},
		);
		expect(frames).toHaveLength(0);
		rerender({ value: data });
		expect(frames).toHaveLength(1);
		act(() => frames.shift()?.(0));
		expect(scroll).not.toHaveBeenCalled();
		act(() => frames.shift()?.(0));
		expect(scroll).toHaveBeenCalledExactlyOnceWith({
			top: 123,
			left: 0,
			behavior: "auto",
		});
		rerender({ value: { ...data, now: 2 } });
		expect(frames).toHaveLength(0);
	});
	it.each([
		"",
		"NaN",
		"Infinity",
		"invalid",
	])("ignores non-finite saved position %s", (position) => {
		sessionStorage.setItem("fromMainPage", "true");
		sessionStorage.setItem("scrollPosition", position);
		const frame = vi.fn();
		vi.stubGlobal("requestAnimationFrame", frame);
		renderHook(() => useServerPreferences(true, data));
		expect(frame).not.toHaveBeenCalled();
	});
});
