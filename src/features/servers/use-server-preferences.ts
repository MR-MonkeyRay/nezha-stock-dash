import { useCallback, useEffect, useRef, useState } from "react";
import { useRuntimeConfig } from "@/features/runtime-config/runtime-config";
import { safeLocalStorage, safeSessionStorage } from "@/lib/storage";
import type { NezhaWebsocketResponse } from "@/types/nezha-api";

/** `list` is the 行情列表 watchlist (default); `grid` is the quote-tile grid. */
export type ServerView = "list" | "grid";

export const SERVER_VIEW_KEY = "serverView";
export const SHOW_MAP_KEY = "showMap";
export const SHOW_SERVICES_KEY = "showServices";

const readFlag = (key: string) => safeLocalStorage.getItem(key) === "true";

function readView(): ServerView {
	return safeLocalStorage.getItem(SERVER_VIEW_KEY) === "grid" ? "grid" : "list";
}

export function useServerPreferences(
	hasServices: boolean,
	data: NezhaWebsocketResponse | null | undefined,
	canRestoreScroll = true,
) {
	const { forceShowServices, forceShowMap, forceCardInline } =
		useRuntimeConfig();
	const [desiredShowServices, setShowServices] = useState(false);
	const [showMap, setShowMap] = useState(false);
	const [view, setViewState] = useState<ServerView>("list");
	const unsavedView = useRef<ServerView | null>(null);
	const hasRestoredScroll = useRef(false);
	const [currentGroup, setCurrentGroup] = useState<string>("All");
	const restoreScrollPosition = useCallback(() => {
		const isFromMainPage =
			safeSessionStorage.getItem("fromMainPage") === "true";
		const savedPosition = safeSessionStorage.getItem("scrollPosition");
		const scrollTop = savedPosition ? Number(savedPosition) : Number.NaN;

		if (
			hasRestoredScroll.current ||
			!isFromMainPage ||
			!Number.isFinite(scrollTop)
		) {
			return;
		}

		hasRestoredScroll.current = true;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				window.scrollTo({ top: scrollTop, left: 0, behavior: "auto" });
			});
		});
	}, []);

	const handleTagChange = (newGroup: string) => {
		setCurrentGroup(newGroup);
		safeSessionStorage.setItem("selectedGroup", newGroup);
		safeSessionStorage.setItem("scrollPosition", String(window.scrollY || 0));
	};

	useEffect(() => {
		setShowServices(forceShowServices || readFlag(SHOW_SERVICES_KEY));
	}, [forceShowServices]);

	const showServices = hasServices && desiredShowServices;

	useEffect(() => {
		// Both views are responsive, so the saved choice applies on every width.
		if (forceCardInline) setViewState("list");
		// A failed write must not let an older stored value undo this session.
		else setViewState(unsavedView.current ?? readView());
	}, [forceCardInline]);

	useEffect(() => {
		setShowMap(forceShowMap || readFlag(SHOW_MAP_KEY));
	}, [forceShowMap]);

	useEffect(() => {
		const savedGroup = safeSessionStorage.getItem("selectedGroup") || "All";
		setCurrentGroup(savedGroup);
	}, []);

	useEffect(() => {
		if (data && canRestoreScroll) {
			restoreScrollPosition();
		}
	}, [data, canRestoreScroll, restoreScrollPosition]);

	const toggleMap = () => {
		const value = !showMap;
		setShowMap(value);
		safeLocalStorage.setItem(SHOW_MAP_KEY, String(value));
	};
	const toggleServices = () => {
		const value = !desiredShowServices;
		setShowServices(value);
		safeLocalStorage.setItem(SHOW_SERVICES_KEY, String(value));
	};
	const setView = (value: ServerView) => {
		setViewState(value);
		unsavedView.current = safeLocalStorage.setItem(SERVER_VIEW_KEY, value)
			? null
			: value;
	};
	return {
		showServices,
		showMap,
		view,
		currentGroup,
		handleTagChange,
		toggleMap,
		toggleServices,
		setView,
	};
}
