import { Command } from "@cliffy/command";
import { Input, List, Select, Toggle } from "@cliffy/prompt";
import type { LinearDocument, Team } from "@linear/sdk";
import chalk from "chalk";
import { getConfig } from "../../config/config.ts";
import { openTextEditor } from "../../console/editor.ts";
import { getLinearClient } from "../../linear/client.ts";
import {
	getProjects,
	type LnrProject,
} from "../../linear/requests/getProjects.ts";
import { type IssuePriority, issuePriorities } from "../../types.ts";

export default new Command()
	.description("Create a new issue")
	.option("-t, --title <title:string>", "Issue title")
	.option("-d, --description <description:string>", "Issue description")
	.option("-p, --project <project:string>", "Project name")
	.option(
		"-P, --priority <priority:issuePriority>",
		`Issue priority (${issuePriorities.join(", ")})`,
		{
			value: (value: any) => {
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
	.action(async ({ title, description, project, label, priority }) => {
		const config = await getConfig();
		const client = getLinearClient(config.linearApiKey);

		async function fetchTeams(): Promise<Team[]> {
			const me = await client.viewer;
			const myTeams = await me.teams();

			return myTeams.nodes;
		}

		const teamsPromise = fetchTeams();

		const newTitle = title
			? title
			: await Input.prompt({
					message: "Issue title",
					validate: (value: string) =>
						value.length === 0 ? "Title is required!" : true,
				});

		if (newTitle.length === 0) {
			console.error(chalk.red("Title is required!"));
			Deno.exit(1);
		}

		const myTeams = await teamsPromise;

		let defaultTeam = myTeams[0];

		if (myTeams.length > 1) {
			const teamChoices = myTeams.map((t: Team) => {
				return {
					name: `${t.name}`,
					value: t.id,
				};
			});

			const selectedTeamId = await Select.prompt({
				message: "Select a team",
				options: teamChoices,
			});

			defaultTeam = myTeams.find((t) => t.id === selectedTeamId) as Team;
		}

		const projects = await getProjects(client, {
			ownProjectsOnly: !project,
			name: project,
			accessibleByTeamId: defaultTeam.id,
		});

		const projectChoices = projects.map((p: LnrProject) => {
			return {
				name: p.name,
				value: p.id,
			};
		});

		if (projectChoices.length === 0) {
			console.log("No projects found matching filters");
			Deno.exit(0);
		}

		const projectId =
			projectChoices.length === 1
				? projectChoices[0].value
				: await Select.prompt({
						message: "Select a project",
						options: projectChoices,
					});

		if (!description) {
			const hasEditorAvailable = !!config.editor;

			const message = hasEditorAvailable
				? `Body: (e to launch ${config.editor}, enter to skip)`
				: "Body: (enter to skip)";

			const bodyPrompt = await Input.prompt({
				message,
			});

			if (bodyPrompt === "e" && hasEditorAvailable && config.editor) {
				const editorDescription = openTextEditor(config.editor);

				description = editorDescription;
			} else {
				description = bodyPrompt;
			}
		}

		const defaultTeamState = await defaultTeam.defaultIssueState;

		const createInput: LinearDocument.IssueCreateInput = {
			teamId: defaultTeam.id,
			stateId: defaultTeamState?.id,
			description,
			projectId: projectId,
			title: newTitle,
		};

		if (label) {
			const availableLabels = await defaultTeam.labels({
				filter: {
					name: {
						containsIgnoreCase: label,
					},
				},
			});

			const noGroups = availableLabels.nodes.filter((l) => !l.isGroup);

			if (!noGroups.length) {
				console.log(`No labels found for query "${label}"`);
				Deno.exit(1);
			}

			const formattedLabels = noGroups.map((l) => {
				return {
					name: l.name,
					value: l.id,
				};
			});

			if (formattedLabels.length === 1) {
				createInput.labelIds = [formattedLabels[0].value];
			} else {
				const selectedLabelNames: string[] = await List.prompt({
					message: "Select labels",
					suggestions: formattedLabels.map((l) => l.name),
				});

				createInput.labelIds = formattedLabels
					.filter((l) => selectedLabelNames.includes(l.name))
					.map((l) => l.value);
			}
		}

		if (priority) {
			createInput.priority = issuePriorities.indexOf(priority);
		}

		const response = await client.createIssue({
			...createInput,
		});

		const newIssue = await response.issue;

		const projectName = projects.find((p) => p.id === projectId)?.name;

		console.log(
			`Created issue ${chalk.bold(newIssue?.identifier)} for project ${chalk.bold(projectName)}`,
		);

		console.log(newIssue?.url);

		Deno.exit(0);
	});
