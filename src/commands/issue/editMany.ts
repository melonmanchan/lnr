import {
	array,
	command,
	flag,
	multioption,
	oneOf,
	option,
	boolean,
	optional,
	string,
} from "cmd-ts";
import enquirer from "enquirer";
import { getConfig } from "../../config/config.ts";
import type { LinearDocument } from "@linear/sdk";
import { printOutput } from "../../console/print.ts";
import { getLinearClient } from "../../linear/client.ts";
import { formatIssueForOutput } from "../../linear/formatters.ts";
import { getIssues } from "../../linear/requests/getIssues.ts";
import { cycleStates, type IssueStatus, issueStatuses } from "../../types.ts";
import { batchUpdateIssue } from "../../linear/requests/batchUpdateIssue.ts";

const editMany = command({
	// TODO: Unity these to be the same as issue list
	name: "edit-many",
	args: {
		status: multioption({
			type: array(string),
			long: "status",
			short: "s",
			description: "Filter by issue status",
		}),

		cycle: option({
			type: optional(oneOf<IssueStatus>(cycleStates)),
			long: "cycle",
			short: "c",
			description: "Cycle filters (current, previous, next)",
		}),

		creator: multioption({
			type: array(string),
			long: "creator",
			short: "cr",
			description: "Creator name",
		}),

		assignee: multioption({
			type: array(string),
			long: "assignee",
			short: "a",
			description: "Assignee name",
		}),

		project: multioption({
			type: array(string),
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

		team: multioption({
			type: array(string),
			long: "team",
			short: "t",
			description: "Issue team",
		}),

		assigneeToAdd: option({
			type: optional(string),
			long: "add-assignee",
			description: "Assignee to add to all issues",
		}),

		labelToAdd: option({
			type: optional(string),
			long: "add-label",
			description: "Label to add to all issues",
		}),

		confirm: flag({
			type: boolean,
			short: "c",
			long: "confirm",
			description: "Auto-confirm you want to edit issues",
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
		team,
		confirm,

		labelToAdd,
		assigneeToAdd,
	}) => {
		const config = await getConfig();
		const client = getLinearClient(config.linearApiKey);

		const issues = await getIssues(
			client,

			{
				issueStates: status,
				freeformSearch: query,
				assignees: assignee,
				teams: team,
				cycle,
				projects: project,
				creators: creator,
				labels: label,
			},
		);

		if (!issues.length) {
			console.info("No issues found");
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
			formatIssueForOutput(issue, "table"),
		);

		if (!confirm) {
			printOutput(formattedIssues, "table");

			const resp = await enquirer.prompt({
				name: "confirm",
				type: "confirm",
				message: "Are you sure you want to edit the issues?",
			});

			if (!resp) {
				process.exit(0);
			}
		}

		const issueIds = issues.map((i) => i.id);

		let input: LinearDocument.IssueUpdateInput = {};

		if (labelToAdd) {
			const labels = await client.issueLabels({
				filter: {
					name: {
						containsIgnoreCase: labelToAdd,
					},
				},
			});

			const labelIds = labels.nodes.map((l) => l.id);

			input.addedLabelIds = labelIds;
		}

		if (assigneeToAdd) {
			const users = await client.users({
				filter: {
					name: {
						containsIgnoreCase: assigneeToAdd,
					},
				},
			});

			const userIds = users.nodes.map((u) => u.id);

			if (userIds.length === 0) {
				console.warn("No users to assign found");
				process.exit(-1);
			}

			if (userIds.length >= 1) {
				console.warn(
					"Multiple users to assign found, please narrow down your filter",
				);

				console.log(
					"Matching users:",
					users.nodes.map((u) => u.name).join(", "),
				);

				process.exit(-1);
			}

			input.assigneeId = userIds[0];
		}

		console.log("Updating issues...");

		await batchUpdateIssue(client, {
			ids: issueIds,
			input,
		});

		console.log("Done!");

		process.exit(0);
	},
});

export default editMany;
