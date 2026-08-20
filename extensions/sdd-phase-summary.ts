import type {
	ExtensionAPI,
	ExtensionContext,
	ToolResultEvent,
} from "@earendil-works/pi-coding-agent";

type TaskDetails = {
	agent?: string;
	result?: string;
};

function toText(content: unknown): string {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.map((block) =>
				typeof block === "string"
					? block
					: ((block as { text?: string }).text ?? ""),
			)
			.join("\n");
	}
	return "";
}

function firstMatch(re: RegExp, text: string): string | undefined {
	const m = text.match(re);
	return m?.[1]?.trim() || undefined;
}

function normalize(text: string): string {
	return text
		.replace(/\*\*/g, "")
		.replace(/`/g, "")
		.replace(/^[ \t]*[-*]\s*/gm, "");
}

function extractKey(text: string): string | undefined {
	const artifacts = text.match(/artifacts\s*:\s*\[([^\]]*)\]/);
	if (artifacts) {
		const key = artifacts[1].match(/sdd\/[^\s"',]+/);
		if (key) return key[0];
	}
	return (
		firstMatch(/topic_key\s*:\s*["']?([^"'\n]+)/, text) ??
		text.match(/sdd\/[^\s"'`,.\]]+/)?.[0]
	);
}

function parsePhase(event: ToolResultEvent): string | undefined {
	const details = (event.details ?? {}) as Record<string, unknown>;
	const firstTask =
		(details.tasks as TaskDetails[] | undefined)?.[0] ??
		(details.results as TaskDetails[] | undefined)?.[0];
	const agent =
		typeof firstTask?.agent === "string" ? firstTask.agent : undefined;
	const fullResult =
		typeof (details as { full_result?: unknown }).full_result === "string"
			? (details.full_result as string)
			: "";
	const haystack = normalize(
		[toText(event.content), firstTask?.result ?? "", fullResult].join("\n"),
	);
	const summary = firstMatch(/executive_summary\s*:\s*["']?([^\n]+)/, haystack);
	const key = extractKey(haystack);
	if (!summary && !key) return undefined;
	const label = agent ?? "subagent";
	const summaryText = summary ?? "(sin executive_summary)";
	return key
		? `${label} → ${summaryText} · ${key}`
		: `${label} → ${summaryText}`;
}

export default function sddPhaseSummary(pi: ExtensionAPI) {
	const phases: string[] = [];

	pi.on("session_start", () => {
		phases.length = 0;
	});

	pi.on("agent_start", () => {
		phases.length = 0;
	});

	pi.on("tool_result", (event: ToolResultEvent, ctx: ExtensionContext) => {
		if (event.toolName !== "subagent_run" || !ctx.hasUI) return;
		const line = parsePhase(event);
		if (!line) return;
		phases.push(line);
	});

	pi.on("agent_end", (_event, ctx: ExtensionContext) => {
		if (!ctx.hasUI || phases.length === 0) return;
		ctx.ui.setWidget("sdd-pipeline", phases);
		ctx.ui.notify(`SDD pipeline: ${phases.length} fase(s)`, "info");
	});
}
