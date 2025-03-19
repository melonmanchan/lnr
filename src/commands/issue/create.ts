import type { IssueCreateInput } from "@linear/sdk/dist/_generated_documents.d.ts";
import { command, oneOf, option, optional, string } from "cmd-ts";

import process from "node:process";
import type { Team } from "@linear/sdk";
import chalk from "chalk";
import enquirer from "enquirer";
import { getConfig } from "../../config/config.ts";
import { openTextEditor } from "../../console/editor.ts";
import { getLinearClient } from "../../linear/client.ts";
import {
  type LnrProject,
  getProjects,
} from "../../linear/requests/getProjects.ts";
import { type IssuePriority, issuePriorities } from "../../types.ts";

const create = command({
  name: "create",
  args: {
    title: option({
      type: optional(string),
      long: "title",
      short: "t",
      description: "Issue title",
    }),

    description: option({
      type: optional(string),
      long: "description",
      short: "d",
      description: "Issue description",
    }),

    project: option({
      type: optional(string),
      long: "project",
      short: "p",
      description: "Project name",
    }),

    priority: option({
      type: optional(oneOf<IssuePriority>(issuePriorities)),
      long: "priority",
      description: `Issue priority (${issuePriorities.join(", ")})`,
    }),

    label: option({
      type: optional(string),
      long: "label",
      short: "l",
      description: "Label name",
    }),
  },
  handler: async ({ title, description, project, label, priority }) => {
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
      : (
          await enquirer.prompt<{ title: string }>({
            type: "input",
            name: "title",
            message: "Issue title",
          })
        ).title;

    if (newTitle.length === 0) {
      console.error(chalk.red("Title is required!"));
      process.exit(-1);
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

      const newTeam = await enquirer.prompt<{ teamId: string }>({
        type: "autocomplete",
        name: "teamId",
        message: "Select a team",
        choices: teamChoices,
      });

      defaultTeam = myTeams.find((t) => t.id === newTeam.teamId) as Team;
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
      process.exit(0);
    }

    const projectId =
      projectChoices.length === 1
        ? projectChoices[0].value
        : (
            await enquirer.prompt<{ projectId: string }>({
              type: "autocomplete",
              name: "projectId",
              message: "Select a project",
              choices: projectChoices,
            })
          ).projectId;

    if (!description) {
      const hasEditorAvailable = !!config.editor;

      const message = hasEditorAvailable
        ? `Body: (e to launch ${config.editor}, enter to skip)`
        : "Body: (enter to skip)";

      const makeDescription = await enquirer.prompt<{
        descriptionPrompt: string;
      }>({
        type: "input",
        name: "descriptionPrompt",
        message,
      });

      const { descriptionPrompt } = makeDescription;

      if (descriptionPrompt === "e" && hasEditorAvailable && config.editor) {
        const editorDescription = openTextEditor(config.editor);

        description = editorDescription;
      } else {
        description = descriptionPrompt;
      }
    }

    const defaultTeamState = await defaultTeam.defaultIssueState;

    const createInput: IssueCreateInput = {
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
        console.log('No labels found for query "${label}"');
        process.exit(1);
      }

      const formattedLabels = noGroups.map((l) => {
        return {
          name: l.name,
          value: l.id,
        };
      });

      const labelIds =
        formattedLabels.length === 1
          ? [formattedLabels[0].value]
          : (
              await enquirer.prompt<{ labelIds: string[] }>({
                type: "multiselect",
                name: "labelIds",
                message: "Select labels",
                choices: formattedLabels,
              })
            ).labelIds;

      const actualIds: string[] = labelIds
        .map((id) => formattedLabels.find((l) => l.name === id)?.value)
        .filter((v): v is string => !!v);

      createInput.labelIds = actualIds;
    }

    if (priority) {
      createInput.priority = issuePriorities.indexOf(priority);
    }

    const response = await client.createIssue({
      labelIds: [],
      ...createInput,
    });

    const newIssue = await response.issue;

    const projectName = projects.find((p) => p.id === projectId)?.name;

    console.log(
      `Created issue ${chalk.bold(newIssue?.identifier)} for project ${chalk.bold(projectName)}`,
    );

    console.log(newIssue?.url);

    process.exit(0);
  },
});

export default create;
