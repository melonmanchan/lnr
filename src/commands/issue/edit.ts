import process from "node:process";
import type { Issue, Team, User, WorkflowState } from "@linear/sdk";
import chalk from "chalk";
import { command, oneOf, option, optional, positional, string } from "cmd-ts";
import enquirer from "enquirer";
import { getConfig } from "../../config/config.ts";
import { getLinearClient } from "../../linear/client.ts";
import {
	type UpdateIssueData,
	updateIssue,
} from "../../linear/requests/updateIssue.ts";
import {
	type IssuePriority,
	issuePriorities,
	issueStatuses,
} from "../../types.ts";

const edit = command({
	name: "edit",
	description: "Edit an individual issue",
	args: {
		issue: positional({
			type: string,
			description: "Issue identifier",
		}),

		title: option({
			type: optional(string),
			long: "title",
			short: "t",
			description: "Title",
		}),

		description: option({
			type: optional(string),
			long: "description",
			short: "d",
			description: "Description",
		}),

		assignee: option({
			type: optional(string),
			long: "assignee",
			short: "a",
			description: "Assignee",
		}),

		status: option({
			type: optional(string),
			long: "status",
			short: "s",
			description: `Update status ${issueStatuses.join(", ")}`,
		}),

		priority: option({
			type: optional(oneOf<IssuePriority>(issuePriorities)),
			long: "priority",
			short: "p",
			description: `Update priority (${issuePriorities.join(", ")})`,
		}),

		label: option({
			type: optional(string),
			long: "label",
			short: "l",
			description: "Label name",
		}),
	},

	handler: async ({
		issue,
		title,
		description,
		assignee,
		priority,
		status,
		label,
	}) => {
		const config = await getConfig();
		const client = getLinearClient(config.linearApiKey);

		const updateData: UpdateIssueData = {
			id: issue,
		};

		if (title) {
			updateData.title = title;
		}

		if (description) {
			updateData.description = description;
		}
		if (priority) {
			updateData.priority = issuePriorities.indexOf(priority);
		}

		let cachedIssue: Issue | null = null;
		let cachedTeam: Team | null = null;

		const getIssue = async () => {
			if (!cachedIssue) {
				cachedIssue = await client.issue(issue);
			}

			return cachedIssue;
		};

		const getTeam = async () => {
			if (!cachedTeam) {
				const apiIssue = await getIssue();
				const team = await apiIssue.team;

				if (!team) {
					console.warn("Could not find team for issue");
					process.exit(1);
				}

				cachedTeam = team;
			}

			return cachedTeam;
		};

		if (assignee) {
			const assignees = await client.users({
				filter: {
					displayName: {
						containsIgnoreCase: assignee,
					},
				},
			});

			if (assignees.nodes.length === 0) {
				console.warn(`No assignees found for "${assignee}"`);
				process.exit(1);
			}

			if (assignees.nodes.length > 1) {
				const assigneeChoices = assignees.nodes.map((p: User) => {
					return {
						name: `${p.name}`,
						value: p.id,
					};
				});

				const newAssignee = await enquirer.prompt<{ assigneeId: string }>({
					type: "autocomplete",
					name: "assigneeId",
					message: "Select assignee",
					choices: assigneeChoices,
				});

				updateData.assigneeId = newAssignee.assigneeId;
			} else {
				updateData.assigneeId = assignees.nodes[0].id;
			}
		}

		if (status) {
			const team = await getTeam();
			const states = await team.states();

			const { nodes } = states;

			const filterByStatus = nodes.filter(
				(s: WorkflowState) =>
					s.type === status ||
					s.name.toLowerCase().includes(status.toLowerCase()),
			);

			if (filterByStatus.length === 0) {
				console.warn(`Could not find state for status ${status} in team`);
				process.exit(1);
			}

			const statusChoices = filterByStatus.map((p: WorkflowState) => {
				return {
					name: `${p.name}`,
					value: p.id,
				};
			});

			const newStatusId =
				filterByStatus.length === 1
					? filterByStatus[0].id
					: (
							await enquirer.prompt<{ statusId: string }>({
								type: "autocomplete",
								name: "statusId",
								message: "Narrow down status",
								choices: statusChoices,
							})
						).statusId;

			updateData.stateId = newStatusId;
		}

		if (label) {
			const team = await getTeam();
			const availableLabels = await team.labels({
				filter: {
					name: {
						containsIgnoreCase: label,
					},
				},
			});

			const labelNodes = availableLabels.nodes.filter((l) => !l.isGroup);

			if (labelNodes.length === 0) {
				console.warn(`Could not find labels matching "${label}"`);
				process.exit(1);
			}

			const issueLabels = await (await getIssue()).labels();
			const currentLabelIds = issueLabels.nodes.map((l) => l.id);

			const formattedLabels = labelNodes.map((l) => {
				return {
					name: l.name,
					value: l.id,
					enabled: currentLabelIds.includes(l.id),
				};
			});

			const formattedLabelIds = formattedLabels.map((l) => l.value);

			let selectedLabelIds: string[];

			if (formattedLabels.length === 1) {
				selectedLabelIds = [formattedLabels[0].value];
			} else {
				const response = await enquirer.prompt<{ labelIds: string[] }>({
					type: "multiselect",
					name: "labelIds",
					message: "Select labels",
					choices: formattedLabels,
				});

				selectedLabelIds = response.labelIds;
			}

			const formattedLabelMap = new Map<string, string>();
			for (const labelChoice of formattedLabels) {
				formattedLabelMap.set(labelChoice.name, labelChoice.value);
				formattedLabelMap.set(labelChoice.value, labelChoice.value);
			}

			const selectedLabelValues = selectedLabelIds.map((id) => {
				return formattedLabelMap.get(id) ?? id;
			});

			const preservedLabelIds = currentLabelIds.filter(
				(id) => !formattedLabelIds.includes(id),
			);

			const nextLabelIds = Array.from(
				new Set([...preservedLabelIds, ...selectedLabelValues]),
			);

			const currentSet = new Set(currentLabelIds);
			const nextSet = new Set(nextLabelIds);

			let hasChanged = currentSet.size !== nextSet.size;

			if (!hasChanged) {
				for (const id of nextSet) {
					if (!currentSet.has(id)) {
						hasChanged = true;
						break;
					}
				}
			}

			if (hasChanged) {
				updateData.labelIds = nextLabelIds;
			}
		}

		if (Object.keys(updateData).length === 1) {
			console.warn("Nothing to update");
			process.exit(1);
		}

		const apiIssue = await updateIssue(client, updateData);

		console.log(`Issue ${chalk.bold(apiIssue.identifier)} updated`);
		console.log(apiIssue.url);

		process.exit(0);
	},
});

export default edit;
