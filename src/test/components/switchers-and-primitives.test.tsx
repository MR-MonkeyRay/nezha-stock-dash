import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PriceColorProvider } from "@/components/PriceColorProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ModeToggle } from "@/components/ThemeSwitcher";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

describe("language and theme switchers", () => {
	it("opens the language menu and marks the active locale", async () => {
		const user = userEvent.setup();

		render(<LanguageSwitcher />);

		await user.click(
			screen.getByRole("button", { name: "a11y.changeLanguage" }),
		);

		expect(screen.getByText("简体中文")).toBeInTheDocument();
		expect(screen.getByText("English")).toHaveClass("font-semibold");
	});

	it("persists an explicit language choice", async () => {
		const user = userEvent.setup();
		localStorage.removeItem("preferredLanguage");

		render(<LanguageSwitcher />);

		await user.click(
			screen.getByRole("button", { name: "a11y.changeLanguage" }),
		);
		await user.click(screen.getByText("繁體中文"));

		expect(localStorage.getItem("preferredLanguage")).toBe("zh-TW");
		localStorage.removeItem("preferredLanguage");
	});

	it("updates the theme through the mode menu", async () => {
		const user = userEvent.setup();

		render(
			<ThemeProvider storageKey="theme-switcher-test">
				<ModeToggle />
			</ThemeProvider>,
		);

		await user.click(screen.getByRole("button", { name: "a11y.toggleTheme" }));
		await user.click(await screen.findByText("theme.light"));

		expect(document.documentElement).toHaveClass("light");
		expect(localStorage.getItem("theme-switcher-test")).toBe("light");
	});

	it("switches the up/down color convention through the mode menu", async () => {
		const user = userEvent.setup();

		render(
			<ThemeProvider storageKey="theme-switcher-test">
				<PriceColorProvider>
					<ModeToggle />
				</PriceColorProvider>
			</ThemeProvider>,
		);

		expect(document.documentElement).toHaveAttribute(
			"data-price-color",
			"red-up",
		);
		await user.click(screen.getByRole("button", { name: "a11y.toggleTheme" }));
		expect(await screen.findByText("priceColor.title")).toBeInTheDocument();
		await user.click(screen.getByText("priceColor.greenUp"));

		expect(document.documentElement).toHaveAttribute(
			"data-price-color",
			"green-up",
		);
		expect(localStorage.getItem("priceColor")).toBe("green-up");
	});

	it("disables convention items while custom code forces one", async () => {
		const user = userEvent.setup();
		window.ForceColorConvention = "green-up";

		render(
			<PriceColorProvider>
				<ModeToggle />
			</PriceColorProvider>,
		);

		await user.click(screen.getByRole("button", { name: "a11y.toggleTheme" }));
		expect(await screen.findByText("priceColor.forced")).toBeInTheDocument();
		const redUp = screen.getByRole("menuitem", { name: /priceColor.redUp/ });
		expect(redUp).toHaveAttribute("data-disabled");
		expect(document.documentElement).toHaveAttribute(
			"data-price-color",
			"green-up",
		);
	});
});

describe("Radix UI wrappers", () => {
	it("opens accordion, tooltip, and dialog content", async () => {
		const user = userEvent.setup();

		render(
			<>
				<Accordion type="single" collapsible>
					<AccordionItem value="status">
						<AccordionTrigger>Toggle status</AccordionTrigger>
						<AccordionContent>Status body</AccordionContent>
					</AccordionItem>
				</Accordion>
				<TooltipProvider delayDuration={0}>
					<Tooltip>
						<TooltipTrigger>Hover status</TooltipTrigger>
						<TooltipContent>Tooltip body</TooltipContent>
					</Tooltip>
				</TooltipProvider>
				<Dialog>
					<DialogTrigger>Open dialog</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Confirm action</DialogTitle>
							<DialogDescription>Dialog body</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<DialogClose>Done</DialogClose>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</>,
		);

		await user.click(screen.getByRole("button", { name: "Toggle status" }));
		expect(screen.getByText("Status body")).toBeInTheDocument();

		await user.hover(screen.getByText("Hover status"));
		expect(await screen.findByRole("tooltip")).toHaveTextContent(
			"Tooltip body",
		);

		await user.click(screen.getByRole("button", { name: "Open dialog" }));
		expect(screen.getByText("Confirm action")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Done" }));
		await waitFor(() => {
			expect(screen.queryByText("Confirm action")).not.toBeInTheDocument();
		});
	});

	it("toggles a switch through its label", async () => {
		const user = userEvent.setup();
		const onSwitchChange = vi.fn();

		render(
			<>
				<Label htmlFor="compact">Compact mode</Label>
				<Switch id="compact" onCheckedChange={onSwitchChange} />
			</>,
		);

		await user.click(screen.getByText("Compact mode"));

		expect(onSwitchChange).toHaveBeenCalledWith(true);
		expect(
			screen.getByRole("switch", { name: "Compact mode" }),
		).toHaveAttribute("data-state", "checked");
	});

	it("renders dropdown labels, indicators, shortcuts, and submenus", async () => {
		render(
			<DropdownMenu open={true}>
				<DropdownMenuTrigger>Open actions</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuLabel inset={true}>Actions</DropdownMenuLabel>
					<DropdownMenuGroup>
						<DropdownMenuItem inset={true}>
							Copy
							<DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuCheckboxItem checked={true}>
							Show hidden
						</DropdownMenuCheckboxItem>
						<DropdownMenuRadioGroup value="compact">
							<DropdownMenuRadioItem value="compact">
								Compact rows
							</DropdownMenuRadioItem>
						</DropdownMenuRadioGroup>
						<DropdownMenuSeparator />
						<DropdownMenuSub open={true}>
							<DropdownMenuSubTrigger inset={true}>
								More actions
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								<DropdownMenuItem>Archive</DropdownMenuItem>
							</DropdownMenuSubContent>
						</DropdownMenuSub>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>,
		);

		expect(await screen.findByText("Actions")).toHaveClass("pl-8");
		expect(screen.getByText("Copy")).toHaveClass("pl-8");
		expect(screen.getByText("Ctrl+C")).toHaveClass("tracking-widest");
		expect(screen.getByText("Show hidden")).toHaveAttribute(
			"data-state",
			"checked",
		);
		expect(screen.getByText("Compact rows")).toHaveAttribute(
			"data-state",
			"checked",
		);
		expect(screen.getByText("More actions")).toHaveClass("pl-8");
		expect(screen.getByText("Archive")).toBeInTheDocument();
	});
});
