import { Command } from "@cliffy/command";
import { getConfig } from "../../config/config.ts";
import { printOutput } from "../../console/print.ts";
import { getLinearClient } from "../../linear/client.ts";
import { formatIssueForOutput } from "../../linear/formatters.ts";
import { getIssues } from "../../linear/requests/getIssues.ts";
import {
	cycleStates,
	type IssueStatus,
	issueStatuses,
	type OutputFormat,
	outputFormats,
} from "../../types.ts";

export default new Command()
	.description("List issues")
	.option(
		"-s, --status <status:string[]>",
		"Filter by issue status (completed, canceled, backlog, triage, unstarted, started). Default is everything except completed or cancelled",
		{ default: [] },
	)
	.option(
		"-c, --cycle <cycle:string>",
		"Cycle filters (current, previous, next)",
		{
			value: (value: unknown) => {
				if (!value) {
					return;
				}

				if (!cycleStates.includes(value as IssueStatus)) {
					throw new Error(
						`Invalid cycle: ${value}. Must be one of ${cycleStates.join(", ")}`,
					);
				}
				return value as IssueStatus;
			},
		},
	)
	.option("-cr, --creator <creator:string>", "Creator name", {
		default: [],
		collect: true,
	})
	.option("-a, --assignee <assignee:string>", "Assignee name", {
		default: [],
		collect: true,
	})
	.option("-p, --project <project:string>", "Project name", {
		default: [],
		collect: true,
	})
	.option("-q, --query <query:string>", "Freeform text search")
	.option("-l, --label <label:string>", "Issue label(s)", {
		default: [],
		collect: true,
	})
	.option("-t, --team <team:string>", "Issue team", {
		default: [],
		collect: true,
	})
	.option("--format <format:outputFormat>", "Output format (table or json)", {
		default: "table",
		value: (value: unknown) => {
			if (!outputFormats.includes(value as OutputFormat)) {
				throw new Error(
					`Invalid format: ${value}. Must be one of ${outputFormats.join(", ")}`,
				);
			}
			return value as OutputFormat;
		},
	})
	.action(
		async ({
			status,
			assignee,
			project,
			cycle,
			query,
			creator,
			label,
			team,
			format,
		}) => {
			const config = await getConfig();
			const client = getLinearClient(config.linearApiKey);

			const issues = await getIssues(
				client,

				{
					issueStates: status as string[],
					freeformSearch: query,
					assignees: assignee as string[],
					teams: team as string[],
					cycle,
					projects: project as string[],
					creators: creator as string[],
					labels: label as string[],
				},
			);

			if (!issues.length) {
				if (format === "json") {
					printOutput([], format);
				} else {
					console.info("No issues found");
				}

				return;
			}

			const getStatusOrder = (stateType?: IssueStatus | null) => {
				if (!stateType) {
					return Number.MAX_SAFE_INTEGER;
				}

				const index = issueStatuses.indexOf(stateType);

				return index === -1 ? Number.MAX_SAFE_INTEGER : index;
			};

			const sortedIssues = [...issues].sort((a, b) => {
				const aStatus = getStatusOrder(
					a.state?.type as IssueStatus | undefined,
				);
				const bStatus = getStatusOrder(
					b.state?.type as IssueStatus | undefined,
				);
				return aStatus - bStatus;
			});

			const formattedIssues = sortedIssues.map((issue) =>
				formatIssueForOutput(issue, format),
			);

			printOutput(formattedIssues, format);

			Deno.exit(0);
		},
	);
