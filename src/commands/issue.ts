import {
  command,
  oneOf,
  multioption,
  subcommands,
  array,
  option,
  string,
  optional,
  positional,
  flag,
  boolean,
} from "cmd-ts";

import chalk, { ChalkInstance } from "chalk";
import enquirer from "enquirer";
import open from "open";

import { getLinearClient } from "../linear/client.ts";
import { getIssues } from "../linear/requests/getIssues.ts";

import { printTable } from "../console/print.ts";
import truncate from "../utils/truncate.ts";
import { openTextEditor } from "../console/editor.ts";
import { Project, Team, User } from "@linear/sdk";
import process from "node:process";
import { getConfig } from "../config/config.ts";
import { cycleStates, IssueState, issueStates } from "../types.ts";
import { IssueUpdateInput } from "@linear/sdk/dist/_generated_documents.d.ts";

const stateColors: { [key: IssueState]: ChalkInstance } = {
  canceled: chalk.red,
  completed: chalk.green,
  started: chalk.blue,
  unstarted: chalk.yellow,
  backlog: chalk.magenta,
  triage: chalk.cyan,
};

const list = command({
  name: "list",
  args: {
    status: multioption({
      type: array(oneOf<IssueState>(issueStates)),
      long: "status",
      short: "s",
      description:
        "Filter by issue status (completed, canceled, backlog, triage, unstarted, started). Default is everything except completed or cancelled",
    }),

    cycle: option({
      type: optional(oneOf<IssueState>(cycleStates)),
      long: "cycle",
      short: "c",
      description: "Cycle filters (current, previous, next)",
    }),

    assignee: option({
      type: string,
      long: "assignee",
      short: "a",
      defaultValue: () => "@me",
      description: "assignee",
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
  },

  handler: async ({ status, assignee, project, cycle, query }) => {
    const config = await getConfig();
    const client = getLinearClient(config.linearApiKey);

    const issues = await getIssues(
      client,

      {
        issueStates: status,
        assignee,
        cycle,
        project,
        freeformSearch: query,
      },
    );

    const mappedIssues = issues.map((i) => {
      const stateColorFn = stateColors[i.state?.type as IssueState] ?? chalk;

      return {
        ID: `[${i.identifier}]`,
        Title: truncate(i.title, 64),
        Status: stateColorFn(i.state?.name),
        Assignee: i.assignee?.displayName,
        Creator: i.creator?.displayName,
        _state: i.state?.type,
      };
    });

    if (!mappedIssues.length) {
      console.info("No issues found");
      return;
    }

    const sortedIssues = mappedIssues.sort((a, b) => {
      const aStatus = issueStates.indexOf(a._state!) ?? 0;
      const bStatus = issueStates.indexOf(b._state!) ?? 0;
      return aStatus - bStatus;
    });

    const message = project
      ? `Issues in project ${chalk.bold(project)}`
      : `Issues assigned to ${chalk.bold(assignee)}`;

    console.log(message);

    printTable(sortedIssues);
  },
});

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
  },
  handler: async ({ title, description }) => {
    const config = await getConfig();
    const client = getLinearClient(config.linearApiKey);

    async function fetchTeams(): Promise<Team[]> {
      const me = await client.viewer;
      const myTeams = await me.teams();

      return myTeams.nodes;
    }

    const teamsPromise = fetchTeams();

    if (!title) {
      const newTitle = await enquirer.prompt<{ title: string }>({
        type: "input",
        name: "title",
        message: "Issue title",
      });

      title = newTitle.title;
    }

    if (title.length === 0) {
      console.error(chalk.red("Title is required!"));
      process.exit(-1);
    }

    const myTeams = await teamsPromise;

    let defaultTeam = myTeams[0];

    // TODO: Some default logic here?
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

    const projects = await client.projects({
      filter: {
        accessibleTeams: {
          id: {
            eq: defaultTeam.id,
          },
        },
      },
    });

    const projectChoices = projects.nodes.map((p: Project) => {
      return {
        name: `${p.name}`,
        value: p.id,
      };
    });

    // TODO: Allow passing project from command line
    const newProject = await enquirer.prompt<{ projectId: string }>({
      type: "autocomplete",
      name: "projectId",
      message: "Select a project",
      choices: projectChoices,
    });

    const project = projects.nodes.find(
      (p) => p.id === newProject.projectId,
    ) as Project;

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

      if (descriptionPrompt === "e" && hasEditorAvailable) {
        const editorDescription = openTextEditor(config.editor!);

        description = editorDescription;
      } else {
        description = descriptionPrompt;
      }
    }

    // TODO
    // const labelPrompt = new Enquirer<{ addLabel: boolean }>();
    // const addLabel = (
    //   await labelPrompt.prompt({
    //     type: "confirm",
    //     name: "addLabel",
    //     message: "Add labels?",
    //   })
    // ).addLabel;

    // const labelIds: string[] = [];

    // if (addLabel) {
    //   const teamLabels = await defaultTeam.labels();

    //   const pickLabelsPrompt = new Enquirer<{ labelIds: string[] }>();

    //   const newLabels = await pickLabelsPrompt.prompt({
    //     type: "multiselect",
    //     name: "labelIds",
    //     message: "Select a label",
    //     choices: teamLabels.nodes.map((l) => {
    //       return {
    //         name: l.name,
    //         value: l.id,
    //       };
    //     }),
    //   });

    //   labelIds.push(...newLabels.labelIds);
    // }

    const defaultTeamState = await defaultTeam.defaultIssueState;

    const response = await client.createIssue({
      labelIds: [],
      teamId: defaultTeam.id,
      stateId: defaultTeamState?.id,
      description,
      projectId: project?.id,
      title,
    });

    const newIssue = await response.issue;

    console.log(
      `Created issue ${chalk.bold(newIssue?.identifier)} for project ${chalk.bold(project?.name)}`,
    );

    console.log(newIssue?.url);

    process.exit(0);
  },
});

const view = command({
  name: "view",
  description: "View an invidivual issue",
  args: {
    issue: positional({
      type: string,
      displayName: "issueIdentifier",
      description: "Issue identifire",
    }),
    web: flag({
      type: boolean,
      long: "web",
      short: "w",
      description: "View project in web/native app",
    }),
  },

  handler: async ({ issue, web }) => {
    const config = await getConfig();
    const client = getLinearClient(config.linearApiKey);
    const me = await client.viewer;

    const [org, apiIssue] = await Promise.all([
      me.organization,
      client.issue(issue).catch(() => null),
    ]);

    if (!apiIssue) {
      console.warn("Issue not found!");
      process.exit(1);
    }

    const url = `https://linear.app/${org.urlKey}/issue/${apiIssue.identifier}`;

    console.log(`Opening issue ${url}...`);

    open(url);

    process.exit(0);
  },
});

const edit = command({
  name: "edit",
  description: "Edit an invidivual issue",
  args: {
    issue: positional({
      type: string,
      displayName: "issueIdentifier",
      description: "Issue identifire",
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
      description: "assignee",
    }),
  },

  handler: async ({ issue, title, description, assignee }) => {
    const config = await getConfig();
    const client = getLinearClient(config.linearApiKey);
    const apiIssue = await client.issue(issue);

    if (!apiIssue) {
      console.warn("Issue not found!");
      process.exit(1);
    }

    const updateData: IssueUpdateInput = {};

    if (title) {
      updateData.title = title;
    }

    if (description) {
      updateData.description = description;
    }

    if (assignee) {
      const assignees = await client.users({
        filter: {
          displayName: {
            containsIgnoreCase: assignee,
          },
        },
      });

      if (assignees.nodes.length === 0) {
        console.warn('No assignees found for "${assignee}"');
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

    if (Object.keys(updateData).length === 0) {
      console.warn("Nothing to update");
      process.exit(1);
    }

    await apiIssue.update(updateData);

    console.log("Issue edited succesfully");

    process.exit(0);
  },
});

export const issue = subcommands({
  name: "issue",
  description: "Invidividal issue management",
  cmds: { list, create, view, edit },
});
