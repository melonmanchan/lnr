import {
	array,
	command,
	multioption,
	oneOf,
	option,
	optional,
	string,
} from "cmd-ts";
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

const list = command({
	name: "list",
	args: {
		status: multioption({
			type: array(string),
			long: "status",
			short: "s",
			description:
				"Filter by issue status (completed, canceled, backlog, triage, unstarted, started). Default is everything except completed or cancelled",
		}),

		cycle: option({
			type: optional(oneOf<IssueStatus>(cycleStates)),
			long: "cycle",
			short: "c",
			description: "Cycle filters (current, previous, next)",
		}),

		creator: option({
			type: optional(string),
			long: "creator",
			short: "cr",
			description: "Creator name",
		}),

		assignee: option({
			type: optional(string),
			long: "assignee",
			short: "a",
			description: "Assignee name",
		}),

		project: option({
			type: optional(string),
			long: "project",
			short: "p",
			description: "Project name",
		}),

		query: option({
			type: optional(string),
			long: "query",
			short: "q",
			description: "Freeform text search",
		}),

		label: multioption({
			type: array(string),
			long: "label",
			short: "l",
			description: "Issue label(s)",
		}),

		format: option({
			type: oneOf<OutputFormat>(outputFormats),
			long: "format",
			description: "Output format (table or json)",
			defaultValue: () => "table" as OutputFormat,
		}),
	},

	handler: async ({
		status,
		assignee,
		project,
		cycle,
		query,
		creator,
		label,
		format,
	}) => {
		const config = await getConfig();
		const client = getLinearClient(config.linearApiKey);

		const issues = await getIssues(
			client,

			{
				issueStates: status,
				freeformSearch: query,
				assignee,
				cycle,
				project,
				creator,
				label,
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
			const aStatus = getStatusOrder(a.state?.type as IssueStatus | undefined);
			const bStatus = getStatusOrder(b.state?.type as IssueStatus | undefined);
			return aStatus - bStatus;
		});

		const formattedIssues = sortedIssues.map((issue) =>
			formatIssueForOutput(issue, format),
		);

		printOutput(formattedIssues, format);

		process.exit(0);
	},
});

export default list;
