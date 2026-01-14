import type { LinearDocument } from "@linear/sdk";
import {
	array,
	boolean,
	command,
	flag,
	multioption,
	oneOf,
	option,
	optional,
	string,
} from "cmd-ts";
import enquirer from "enquirer";
import { getConfig } from "../../config/config.ts";
import { printOutput } from "../../console/print.ts";
import { getLinearClient } from "../../linear/client.ts";
import { formatIssueForOutput } from "../../linear/formatters.ts";
import { batchUpdateIssue } from "../../linear/requests/batchUpdateIssue.ts";
import { getIssueLabels } from "../../linear/requests/getIssueLabels.ts";
import { getIssues } from "../../linear/requests/getIssues.ts";
import { cycleStates, type IssueStatus, issueStatuses } from "../../types.ts";

const editMany = command({
	// TODO: Unify these to be the same as issue list
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
		milestone: option({
			type: optional(string),
			long: "milestone",
			short: "m",
			description: "Project milestone",
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

		milestoneToAdd: option({
			type: optional(string),
			long: "add-milestone",
			description: "Project milestone to add all issues to",
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
		milestone,

		confirm,

		milestoneToAdd,
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
				milestone,
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

		const input: LinearDocument.IssueUpdateInput = {};

		if (labelToAdd) {
			const labels = await getIssueLabels(client, {
				name: {
					containsIgnoreCase: labelToAdd,
				},
			});

			const labelIds = labels.map((l) => l.id);

			if (labelIds.length === 0) {
				console.warn("No labels to add found ");
				process.exit(-1);
			}

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

			if (userIds.length > 1) {
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

		if (milestoneToAdd) {
			// Check that all the issues belong to the same project
			const uniqueProjects = new Set(
				issues.map((i) => i.project?.id).filter((id): id is string => !!id),
			);

			if (uniqueProjects.size > 1) {
				console.warn(
					"Cannot batch add a milestone when issues belong to multiple projects",
				);

				process.exit(-1);
			}

			const projectId = [...uniqueProjects][0];

			const project = await client.project(projectId);
			const projectMilestones = await project.projectMilestones();

			if (!projectMilestones) {
				console.warn(`No milestones found in projects ${project?.name}`);
				process.exit(1);
			}

			const filteredByMilestone = projectMilestones.nodes.filter((p) =>
				p.name.toLowerCase().includes(milestoneToAdd.toLowerCase()),
			);

			if (filteredByMilestone.length === 0) {
				console.warn(
					`Could not find milestones containing name ${milestoneToAdd} in project`,
				);

				process.exit(1);
			}

			const milestoneChoices = filteredByMilestone.map((p) => {
				return {
					name: `${p.name}`,
					value: p.id,
				};
			});

			const newMilestoneId =
				milestoneChoices.length === 1
					? milestoneChoices[0].value
					: (
							await enquirer.prompt<{ milestoneId: string }>({
								type: "autocomplete",
								name: "milestoneId",
								message: "Narrow down milestone",
								choices: milestoneChoices,
							})
						).milestoneId;

			input.projectMilestoneId = newMilestoneId;
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
