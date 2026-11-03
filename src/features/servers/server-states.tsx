import { ServerStackIcon } from "@heroicons/react/20/solid";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { isUnauthorizedError } from "@/lib/nezha-api";

const getErrorMessage = (error: unknown) => {
	if (!error) return "";
	if (error instanceof Error) return error.message;
	return String(error);
};

export function BackendErrorState({ error }: { error: unknown }) {
	const { t } = useTranslation();
	const unauthorized = isUnauthorizedError(error);
	const message = getErrorMessage(error);

	return (
		<div className="flex min-h-96 flex-col items-center justify-center px-4 text-center">
			<div className="flex max-w-md flex-col items-center gap-2">
				<p className="text-sm font-semibold text-foreground">
					{t(
						unauthorized
							? "error.loginRequiredTitle"
							: "error.backendUnavailableTitle",
					)}
				</p>
				<p className="text-sm text-muted-foreground">
					{t(
						unauthorized
							? "error.loginRequiredDescription"
							: "error.backendUnavailableDescription",
					)}
				</p>
				{unauthorized ? (
					<Button asChild className="mt-2">
						<a href="/dashboard">{t("login")}</a>
					</Button>
				) : (
					message && (
						<p className="mt-1 max-w-full break-words rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
							{message}
						</p>
					)
				)}
			</div>
		</div>
	);
}

export function ServerEmptyState({ filtered = false }: { filtered?: boolean }) {
	const { t } = useTranslation();

	return (
		<div
			className="server-empty-state mt-6 flex min-h-52 flex-col items-center justify-center gap-2 px-4 text-center"
			role="status"
		>
			<ServerStackIcon
				aria-hidden="true"
				className="size-7 text-muted-foreground/50"
			/>
			<p className="text-sm font-medium text-muted-foreground">
				{t(filtered ? "info.noMatchingServers" : "info.noServers")}
			</p>
		</div>
	);
}
