import { Command } from "@cliffy/command";
import { Checkbox, Select } from "@cliffy/prompt";
import type { Issue, Team, User, WorkflowState } from "@linear/sdk";
import chalk from "chalk";
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

export default new Command()
	.description("Edit an individual issue")
	.arguments("<issue-id:string>")
	.option("-t, --title <title:string>", "Title")
	.option("-d, --description <description:string>", "Description")
	.option("-a, --assignee <assignee:string>", "Assignee")
	.option(
		"-s, --status <status:string>",
		`Update status (${issueStatuses.join(", ")})`,
	)
	.option(
		"-p, --priority <priority:issuePriority>",
		`Update priority (${issuePriorities.join(", ")})`,
		{
			value: (value) => {
				if (!issuePriorities.includes(value as IssuePriority)) {
					throw new Error(
						`Invalid priority: ${value}. Must be one of ${issuePriorities.join(", ")}`,
					);
				}
				return value as IssuePriority;
			},
		},
	)
	.option("-l, --label <label:string>", "Label name")
	.action(
		async (
			issueId,
			{ title, description, assignee, priority, status, label },
		) => {
			const config = await getConfig();
			const client = getLinearClient(config.linearApiKey);

			const updateData: UpdateIssueData = {
				id: issueId,
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
					cachedIssue = await client.issue(issueId);
				}

				return cachedIssue;
			};

			const getTeam = async () => {
				if (!cachedTeam) {
					const apiIssue = await getIssue();
					const team = await apiIssue.team;

					if (!team) {
						console.warn("Could not find team for issue");
						Deno.exit(1);
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
					Deno.exit(1);
				}

				if (assignees.nodes.length > 1) {
					const assigneeChoices = assignees.nodes.map((p: User) => {
						return {
							name: `${p.name}`,
							value: p.id,
						};
					});

					const newAssigneeId = await Select.prompt({
						message: "Select assignee",
						options: assigneeChoices,
					});

					updateData.assigneeId = newAssigneeId;
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
					Deno.exit(1);
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
						: await Select.prompt({
								message: "Narrow down status",
								options: statusChoices,
							});

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
					Deno.exit(1);
				}

				const issueLabels = await (await getIssue()).labels();
				const currentLabelIds = issueLabels.nodes.map((l) => l.id);

				const formattedLabels = labelNodes.map((l) => {
					return {
						name: l.name,
						value: l.id,
						checked: currentLabelIds.includes(l.id),
					};
				});

				const formattedLabelIds = formattedLabels.map((l) => l.value);

				let selectedLabelIds: string[];

				if (formattedLabels.length === 1) {
					selectedLabelIds = [formattedLabels[0].value];
				} else {
					selectedLabelIds = await Checkbox.prompt({
						message: "Select labels to add/remove",
						options: formattedLabels,
					});
				}

				const preservedLabelIds = currentLabelIds.filter(
					(id) => !formattedLabelIds.includes(id),
				);

				const nextLabelIds = Array.from(
					new Set([...preservedLabelIds, ...selectedLabelIds]),
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
				Deno.exit(1);
			}

			const apiIssue = await updateIssue(client, updateData);

			console.log(`Issue ${chalk.bold(apiIssue.identifier)} updated`);
			console.log(apiIssue.url);

			Deno.exit(0);
		},
	);
