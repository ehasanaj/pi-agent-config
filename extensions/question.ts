/**
 * Agent-driven interactive question tool.
 *
 * Lets the model ask the user one question at a time via a selectable TUI list,
 * with an always-available fallback for a custom typed answer.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Editor, Input, type EditorTheme, Key, matchesKey, Text, truncateToWidth } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

interface OptionWithDesc {
	label: string;
	description?: string;
}

type DisplayOption = OptionWithDesc & { isOther?: boolean };

interface QuestionDetails {
	question: string;
	options: string[];
	answer: string | null;
	wasCustom?: boolean;
	index?: number;
}

const CUSTOM_OPTION_LABEL = "Write your own answer";
const CUSTOM_OPTION_NORMALIZED_LABELS = new Set([
	"write your own answer",
	"write your own response",
	"write your own",
	"type your own answer",
	"type your own response",
	"type your own",
	"custom answer",
	"custom response",
	"other",
	"other answer",
	"other response",
	"something else",
	"none of the above",
]);

function normalizeOptionLabel(label: string): string {
	return label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isCustomAnswerOption(option: OptionWithDesc): boolean {
	return CUSTOM_OPTION_NORMALIZED_LABELS.has(normalizeOptionLabel(option.label));
}

function buildDisplayOptions(options: OptionWithDesc[]): DisplayOption[] {
	const mapped = options.map((option) => ({ ...option, isOther: isCustomAnswerOption(option) }));
	return mapped.some((option) => option.isOther)
		? mapped
		: [...mapped, { label: CUSTOM_OPTION_LABEL, isOther: true }];
}

function filterDisplayOptions(options: DisplayOption[], query: string): DisplayOption[] {
	const normalizedQuery = normalizeOptionLabel(query);
	if (!normalizedQuery) return options;

	return options.filter((option) => {
		if (option.isOther) return true;
		const haystacks = [option.label, option.description ?? ""].map(normalizeOptionLabel);
		return haystacks.some((value) => value.includes(normalizedQuery));
	});
}

const OptionSchema = Type.Object({
	label: Type.String({ description: "Display label for the option" }),
	description: Type.Optional(Type.String({ description: "Optional description shown below label" })),
});

const QuestionParams = Type.Object({
	question: Type.String({ description: "The question to ask the user" }),
	options: Type.Array(OptionSchema, {
		description: "Short answer choices for the user to select from",
		minItems: 1,
	}),
});

export default function question(pi: ExtensionAPI) {
	pi.registerTool({
		name: "question",
		label: "Question",
		description:
			"Ask the user a question with a selectable list of options. Use this when you need a decision, preference, classification, or clarification from the user before continuing.",
		promptSnippet: "Ask the user one interactive multiple-choice question with a custom-answer fallback.",
		promptGuidelines: [
			"Use the question tool when you need the user to choose from a short set of options instead of typing freeform text.",
			"Ask one question at a time. After getting the answer, decide the next best follow-up question.",
			"Keep options short, mutually distinct, and easy to scan. Add descriptions only when they help disambiguate choices.",
			"Prefer this tool for decision points, triage, preference selection, and requirement clarification.",
			"Do not add your own generic 'write your own answer', 'other', or similar fallback unless the wording is semantically important; the tool already provides and recognizes a custom-answer fallback.",
		],
		parameters: QuestionParams,

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			if (!ctx.hasUI) {
				return {
					content: [{ type: "text", text: "Error: UI not available (running in non-interactive mode)" }],
					details: {
						question: params.question,
						options: params.options.map((o) => o.label),
						answer: null,
					} as QuestionDetails,
				};
			}

			if (params.options.length === 0) {
				return {
					content: [{ type: "text", text: "Error: No options provided" }],
					details: { question: params.question, options: [], answer: null } as QuestionDetails,
				};
			}

			const allOptions = buildDisplayOptions(params.options);

			const result = await ctx.ui.custom<{ answer: string; wasCustom: boolean; index?: number } | null>(
				(tui, theme, _kb, done) => {
					let optionIndex = 0;
					let editMode = false;
					let filterMode = false;
					let filterQuery = "";
					let cachedLines: string[] | undefined;

					const editorTheme: EditorTheme = {
						borderColor: (s) => theme.fg("accent", s),
						selectList: {
							selectedPrefix: (t) => theme.fg("accent", t),
							selectedText: (t) => theme.fg("accent", t),
							description: (t) => theme.fg("muted", t),
							scrollInfo: (t) => theme.fg("dim", t),
							noMatch: (t) => theme.fg("warning", t),
						},
					};
					const editor = new Editor(tui, editorTheme);
					const filterInput = new Input();

					editor.onSubmit = (value) => {
						const trimmed = value.trim();
						if (trimmed) {
							done({ answer: trimmed, wasCustom: true });
						} else {
							editMode = false;
							editor.setText("");
							refresh();
						}
					};

					filterInput.onSubmit = (value) => {
						filterQuery = value;
						filterMode = false;
						clampOptionIndex();
						refresh();
					};

					filterInput.onEscape = () => {
						filterQuery = "";
						filterInput.setValue("");
						filterMode = false;
						optionIndex = 0;
						refresh();
					};

					function getVisibleOptions() {
						return filterDisplayOptions(allOptions, filterQuery);
					}

					function clampOptionIndex() {
						const visibleOptions = getVisibleOptions();
						optionIndex = Math.max(0, Math.min(optionIndex, Math.max(visibleOptions.length - 1, 0)));
					}

					function refresh() {
						cachedLines = undefined;
						tui.requestRender();
					}

					function selectOption(selected: DisplayOption, displayIndex: number) {
						if (selected.isOther) {
							editMode = true;
							refresh();
							return;
						}

						done({ answer: selected.label, wasCustom: false, index: displayIndex + 1 });
					}

					function handleInput(data: string) {
						if (editMode) {
							if (matchesKey(data, Key.escape)) {
								editMode = false;
								editor.setText("");
								refresh();
								return;
							}
							editor.handleInput(data);
							refresh();
							return;
						}

						if (filterMode) {
							filterInput.handleInput(data);
							filterQuery = filterInput.getValue();
							clampOptionIndex();
							refresh();
							return;
						}

						const visibleOptions = getVisibleOptions();

						if (data === "/") {
							filterMode = true;
							filterInput.setValue(filterQuery);
							refresh();
							return;
						}

						if (/^[1-9]$/.test(data)) {
							const shortcutIndex = Number.parseInt(data, 10) - 1;
							const selected = visibleOptions[shortcutIndex];
							if (selected) {
								selectOption(selected, shortcutIndex);
							}
							return;
						}

						if (matchesKey(data, Key.up) || data === "k") {
							optionIndex = Math.max(0, optionIndex - 1);
							refresh();
							return;
						}
						if (matchesKey(data, Key.down) || data === "j") {
							optionIndex = Math.min(Math.max(visibleOptions.length - 1, 0), optionIndex + 1);
							refresh();
							return;
						}
						if (matchesKey(data, Key.left) || data === "h") {
							optionIndex = 0;
							refresh();
							return;
						}
						if (matchesKey(data, Key.right) || data === "l") {
							optionIndex = Math.max(0, visibleOptions.length - 1);
							refresh();
							return;
						}

						if (matchesKey(data, Key.enter)) {
							const selected = visibleOptions[optionIndex];
							if (selected) {
								selectOption(selected, optionIndex);
							}
							return;
						}

						if (matchesKey(data, Key.escape)) {
							done(null);
						}
					}

					function render(width: number): string[] {
						if (cachedLines) return cachedLines;

						const visibleOptions = getVisibleOptions();
						clampOptionIndex();

						const lines: string[] = [];
						const add = (s: string) => lines.push(truncateToWidth(s, width));

						add(theme.fg("accent", "─".repeat(width)));
						add(theme.fg("text", ` ${params.question}`));
						lines.push("");

						if (filterMode || filterQuery) {
							add(theme.fg("muted", " Filter:"));
							if (filterMode) {
								for (const line of filterInput.render(width - 2)) {
									add(` ${line}`);
								}
							} else {
								add(` ${theme.fg("accent", filterQuery)}`);
							}
							lines.push("");
						}

						for (let i = 0; i < visibleOptions.length; i++) {
							const opt = visibleOptions[i]!;
							const selected = i === optionIndex;
							const isOther = opt.isOther === true;
							const prefix = selected ? theme.fg("accent", "> ") : "  ";

							if (isOther && editMode) {
								add(prefix + theme.fg("accent", `${i + 1}. ${opt.label} ✎`));
							} else if (selected) {
								add(prefix + theme.fg("accent", `${i + 1}. ${opt.label}`));
							} else {
								add(`  ${theme.fg("text", `${i + 1}. ${opt.label}`)}`);
							}

							if (opt.description) {
								add(`     ${theme.fg("muted", opt.description)}`);
							}
						}

						if (visibleOptions.length === 0) {
							add(theme.fg("warning", " No matching options."));
						}

						if (editMode) {
							lines.push("");
							add(theme.fg("muted", " Your answer:"));
							for (const line of editor.render(width - 2)) {
								add(` ${line}`);
							}
						}

						lines.push("");
						if (editMode) {
							add(theme.fg("dim", " Enter to submit • Esc to go back"));
						} else if (filterMode) {
							add(theme.fg("dim", " Type to filter • Enter to keep filter • Esc to clear filter"));
						} else {
							add(
								theme.fg(
									"dim",
									" ↑↓ or j/k navigate • h/l first/last • 1-9 quick select • / filter • Enter select • Esc cancel",
								),
							);
						}
						add(theme.fg("accent", "─".repeat(width)));

						cachedLines = lines;
						return lines;
					}

					return {
						render,
						invalidate: () => {
							cachedLines = undefined;
						},
						handleInput,
					};
				},
			);

			const simpleOptions = params.options.map((o) => o.label);

			if (!result) {
				return {
					content: [{ type: "text", text: "User cancelled the selection" }],
					details: { question: params.question, options: simpleOptions, answer: null } as QuestionDetails,
				};
			}

			if (result.wasCustom) {
				return {
					content: [{ type: "text", text: `User wrote: ${result.answer}` }],
					details: {
						question: params.question,
						options: simpleOptions,
						answer: result.answer,
						wasCustom: true,
					} as QuestionDetails,
				};
			}

			return {
				content: [{ type: "text", text: `User selected: ${result.index}. ${result.answer}` }],
				details: {
					question: params.question,
					options: simpleOptions,
					answer: result.answer,
					wasCustom: false,
					index: result.index,
				} as QuestionDetails,
			};
		},

		renderCall(args, theme, _context) {
			let text = theme.fg("toolTitle", theme.bold("question ")) + theme.fg("muted", args.question);
			const opts = Array.isArray(args.options) ? args.options : [];
			if (opts.length) {
				const labels = buildDisplayOptions(opts as OptionWithDesc[]).map((o) => o.label);
				const numbered = labels.map((o, i) => `${i + 1}. ${o}`);
				text += `\n${theme.fg("dim", `  Options: ${numbered.join(", ")}`)}`;
			}
			return new Text(text, 0, 0);
		},

		renderResult(result, _options, theme, _context) {
			const details = result.details as QuestionDetails | undefined;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}

			if (details.answer === null) {
				return new Text(theme.fg("warning", "Cancelled"), 0, 0);
			}

			if (details.wasCustom) {
				return new Text(
					theme.fg("success", "✓ ") + theme.fg("muted", "(wrote) ") + theme.fg("accent", details.answer),
					0,
					0,
				);
			}

			const idx = details.index ?? details.options.indexOf(details.answer) + 1;
			const display = idx > 0 ? `${idx}. ${details.answer}` : details.answer;
			return new Text(theme.fg("success", "✓ ") + theme.fg("accent", display), 0, 0);
		},
	});
}
