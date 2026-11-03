# Frontend architecture

The application uses React, TanStack Query and a single WebSocket provider. Feature folders contain behavior with a stable owner; shared formatting, transport and cache adapters stay in `lib`. Modules are imported from their owner directly; there are no re-export facades.

## Server overview

`features/servers/selectors.ts` owns group membership, stable sorting, status filtering and group-level statistics. It is independent of storage and React. `use-server-preferences.ts` owns saved flags, group selection and scroll restoration. Controls, lists and empty/error states are separate components. `pages/Server.tsx` composes these boundaries with API and WebSocket data.

Saved preferences live in `localStorage`: `serverView` (`list`, the default watchlist, or `grid`, the quote-tile grid) and the `showMap` / `showServices` flags (`true`/`false`). Both views are responsive, so the saved view applies at every width. `sessionStorage` holds `selectedGroup`, `fromMainPage` and `scrollPosition` for returning from a detail page.

## Market view

`features/market/quote-series.ts` treats CPU usage as a price. It orders websocket frames (current frame wins duplicate timestamps, newest 30 kept, oldest-first) and builds per-server series from online samples only. A quote's baseline is the oldest sample in that window (about one minute). Changes below 0.05 points are flat, percentages are hidden when the base is below 0.05 and capped at 999%, and offline servers are `suspended` (停牌), never colored up or down. The market index is the average CPU of online servers in the selected group; breadth counts rising, flat, falling and suspended servers.

## Price color convention

`lib/price-color.ts` stores `priceColor` (`red-up` default, or `green-up`) and sets `html[data-price-color]`; CSS maps `--up`/`--down` onto `--red`/`--green`. The `index.html` pre-paint script applies it before first paint. `window.ForceColorConvention` overrides and persists the choice and disables the toggles. Status colors (`--status-ok/warn/bad`, `--suspended`) never use red or green, so the convention only affects real direction.

## Detail charts

`features/server-detail/realtime-series.ts` projects one server from the provider's history, once per render dependency change. Current data wins duplicate timestamps, output is oldest-first and capped at 30 frames. Missing servers/cards do not create fabricated samples. Zero and consecutive equal readings are valid. Charts synchronize by timestamp value, since GPU histories can be sparse.

Metric-specific components own presentation, units and tooltips. Network history bytes/second becomes MiB/second; memory/swap/disk history bytes becomes percentage using host capacity. GPU realtime samples are indexed by card; the historical backend has one `gpu` metric and no per-card index parameter, so historical queries are shared rather than inventing an API.

`hooks/use-metric-history.ts` uses TanStack Query keys containing server ID, metric and period. Aborts are forwarded to the transport. Results expose status, error and actual data period; incomplete or failed paired requests do not display stale series. Each member of a pair is cached independently and timestamps are joined using the primary series order.

K-line (`features/server-detail/KLineChart.tsx`) is lazy-loaded with `lightweight-charts`. `candles.ts` picks a bucket size per period (at least three samples per candle; daily candles align to local midnight), builds OHLC, MA5/10/20 and a volume series from mean network speed. Colors are read from CSS variables and re-applied when the theme or price convention changes.

## Pure metrics and transport

`lib/server-metrics.ts` (`selectServerMetrics`) is a pure, storage-free projection. `lib/public-note-cache.ts` restores omitted public notes from `server_${id}_public_note` in `sessionStorage` once per received snapshot, before React consumes it.

`lib/http.ts` handles HTTP and business failures without unwrapping payloads. `lib/nezha-api.ts` holds the fetch functions, each with optional cancellation. Profile refresh sends a CSRF header and is throttled to once an hour.

## Runtime configuration

`features/runtime-config` owns trusted custom-code injection (`inject.ts`) and typed access to the `window.*` customization globals documented in the README (`runtime-config.ts`).

Initialization awaits ordered external scripts and styles, exposes loading/ready/error, and aborts stale work. Each injection owns its DOM nodes and cleanup. Removing script nodes cannot undo arbitrary JavaScript side effects already executed.

Writable configurable data properties are observed while consumers are mounted, so delayed assignments apply without any event. Custom accessors, readonly and nonconfigurable globals are never replaced; scripts that define them dispatch `runtimeConfigChange` (or call `refreshRuntimeConfig()`) after changing a value. The header's background toggle keeps the hidden image in `sessionStorage` as `savedBackgroundImage`.

## Internationalization

`lib/language.ts` owns the supported locale list, tag resolution and persistence; `i18n.ts` loads every `locales/<code>/translation.json` for those codes, where each code is a BCP 47 tag. Startup language is the switcher choice saved as `preferredLanguage`, then the first supported entry of `navigator.languages`, then `en-US`. The backend's configured language (gettext form such as `zh_CN` is accepted) applies only when neither exists. Detection results are never persisted, and `<html lang>` follows the active language.

`en-US` is the source of truth for keys. `zh-CN` and `zh-TW` are kept complete; other locales may lag and fall back to English, with `zh-TW` falling back to `zh-CN` first. Locale files carry no keys absent from `en-US`. The language menu lists endonyms, and country names come from `Intl.DisplayNames`.

## Verification

Run `pnpm verify` for formatting/lint, coverage, TypeScript and production build. Regression suites cover values/timestamps, empty monitors, failed and out-of-order history switches, server identity changes, sparse GPUs, selector ordering, saved preferences, delayed configuration and aborted injection. Coverage thresholds are enforced in `vite.config.ts`. Recharts unit doubles verify data and synchronization contracts; browser checks are complementary and must be reported separately.
