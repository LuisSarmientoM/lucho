import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";

type ThinkingLevel =
	| "off"
	| "minimal"
	| "low"
	| "medium"
	| "high"
	| "xhigh"
	| "max";

type Candidate = {
	provider: string;
	id: string;
	thinking?: ThinkingLevel;
};

type BeforeAgentStartEvent = { prompt: string };
type MessageEndEvent = {
	message: { role: string; stopReason?: string; errorMessage?: string };
};

const GPT_SOL: Candidate = { provider: "openai-codex", id: "gpt-5.6-sol" };
const GPT_LUNA: Candidate = {
	provider: "openai-codex",
	id: "gpt-5.6-luna",
	thinking: "max",
};
const KIMI: Candidate = { provider: "opencode-go", id: "kimi-k3" };
const GROK: Candidate = { provider: "opencode-go", id: "grok-4.5" };
const DEEPSEEK: Candidate = {
	provider: "opencode-go",
	id: "deepseek-v4-pro",
};

export const MODELS: Candidate[] = [GPT_SOL, GPT_LUNA, KIMI, GROK, DEEPSEEK];

const ROUTES: Array<{ candidate: Candidate; pattern: RegExp }> = [
	{
		candidate: KIMI,
		pattern:
			/\b(audit|codebase|contexto largo|large (repo|codebase)|whole repo|repositorio completo|explora(?:r)? todo)\b/i,
	},
	{
		candidate: GROK,
		pattern:
			/\b(actualidad|current events?|investiga(?:r|ción)? web|noticias|research web|social media|web research)\b/i,
	},
	{
		candidate: DEEPSEEK,
		pattern:
			/\b(rápido|rapido|simple|sencillo|quick|small change|cambio pequeño|boilerplate)\b/i,
	},
	{
		candidate: GPT_LUNA,
		pattern:
			/\b(algoritmo|algorithm|matemátic(?:a|o|as|os)|mathematic|proof|demostración|optimiza(?:r|ción)?|performance|rendimiento|concurrencia|concurrency)\b/i,
	},
	{
		candidate: GPT_LUNA,
		pattern:
			/\b(arquitectura|architecture|seguridad|security|threat model|migración|migration|distributed|distribuido|root cause|causa raíz|debug complejo|complex debug)\b/i,
	},
	{
		candidate: GPT_SOL,
		pattern:
			/\b(implementa(?:r|ción)?|implementation|refactor|corrige|fix|bug|test|prueba|compile|compila|api|endpoint|typescript|javascript|python|golang|\bgo\b|rust)\b/i,
	},
];

const NO_FALLBACK_ERROR =
	/\b(abort(?:ed|ing)?|cancel(?:led|ed|ling|ing|ation)?|context.?(?:length|window|overflow)|too many tokens|prompt too long)\b/i;

export function selectStartIndex(prompt: string): number {
	const candidate =
		ROUTES.find(({ pattern }) => pattern.test(prompt))?.candidate ?? GPT_SOL;
	return MODELS.indexOf(candidate);
}

export function shouldFallback(error: string): boolean {
	return !NO_FALLBACK_ERROR.test(error);
}

function rotateFrom(index: number): Candidate[] {
	return [...MODELS.slice(index), ...MODELS.slice(0, index)];
}

function label(candidate: Candidate): string {
	return `${candidate.provider}/${candidate.id}${candidate.thinking ? `:${candidate.thinking}` : ""}`;
}

export default function modelRouter(pi: ExtensionAPI) {
	let enabled = false;
	let baseThinking: ThinkingLevel = "medium";
	let chain: Candidate[] = [];
	let nextIndex = 0;
	let activeTask = false;
	let pendingRetry = false;
	let continuationPending = false;
	let activeCandidate: Candidate | undefined;

	pi.registerFlag("model-router", {
		description: "Route tasks across configured subscription models",
		type: "boolean",
		default: true,
	});

	async function activateNext(
		ctx: ExtensionContext,
		fallback: boolean,
	): Promise<boolean> {
		while (nextIndex < chain.length) {
			const candidate = chain[nextIndex++];
			const model = ctx.modelRegistry.find(candidate.provider, candidate.id);
			if (!model || !(await pi.setModel(model))) {
				ctx.ui.notify(
					`Model router skipped unavailable ${label(candidate)}`,
					"warning",
				);
				continue;
			}

			pi.setThinkingLevel(candidate.thinking ?? baseThinking);
			activeCandidate = candidate;
			ctx.ui.setStatus("model-router", `router:${candidate.id}`);
			if (fallback) ctx.ui.notify(`Fallback → ${label(candidate)}`, "warning");
			return true;
		}
		return false;
	}

	pi.on("session_start", (_event: unknown, ctx: ExtensionContext) => {
		enabled = pi.getFlag("model-router") === true;
		baseThinking = pi.getThinkingLevel();
		if (enabled) ctx.ui.setStatus("model-router", "router:ready");
	});

	pi.on(
		"before_agent_start",
		async (event: BeforeAgentStartEvent, ctx: ExtensionContext) => {
			if (!enabled) return;
			if (continuationPending) {
				continuationPending = false;
				return;
			}

			chain = rotateFrom(selectStartIndex(event.prompt));
			nextIndex = 0;
			activeTask = true;
			pendingRetry = false;
			activeCandidate = undefined;
			if (!(await activateNext(ctx, false))) {
				activeTask = false;
				ctx.ui.notify("Model router: no configured model is available", "error");
			}
		},
	);

	pi.on("message_end", async (event: MessageEndEvent, ctx: ExtensionContext) => {
		if (!enabled || !activeTask || event.message.role !== "assistant") return;
		if (event.message.stopReason !== "error") {
			pendingRetry = false;
			return;
		}

		const error = event.message.errorMessage ?? "";
		if (!shouldFallback(error)) {
			activeTask = false;
			pendingRetry = false;
			return;
		}

		const failed = activeCandidate;
		if (await activateNext(ctx, true)) {
			pendingRetry = true;
			return;
		}

		activeTask = false;
		pendingRetry = false;
		ctx.ui.notify(
			`Model router exhausted after ${failed ? label(failed) : "provider error"}`,
			"error",
		);
	});

	pi.on("agent_settled", (_event: unknown, ctx: ExtensionContext) => {
		if (!enabled || !activeTask) return;
		if (!pendingRetry) {
			activeTask = false;
			return;
		}

		pendingRetry = false;
		continuationPending = true;
		pi.sendMessage(
			{
				customType: "model-router-fallback",
				content:
					"The previous model failed because of a provider error. Continue the current user task from the existing context without repeating completed side effects.",
				display: true,
			},
			{ deliverAs: "followUp", triggerTurn: true },
		);
		ctx.ui.notify(
			`Retrying with ${activeCandidate ? label(activeCandidate) : "fallback model"}`,
			"warning",
		);
	});
}
