import {
  command,
  oneOf,
  multioption,
  subcommands,
  array,
  option,
  string,
  optional,
} from "cmd-ts";

import Enquirer from "enquirer";

import client from "../linear/client.ts";
import config from "../config.ts";
import { printTable } from "../console/print.ts";
import truncate from "../utils/truncate.ts";
import { openTextEditor } from "../console/editor.ts";
import { Project, Team } from "@linear/sdk";

const issueStates = [
  "started",
  "completed",
  "canceled",
  "completed",
  "backlog",
  "triage",
  "unstarted",
];

type IssueState = (typeof issueStates)[number];

const list = command({
  name: "list",
  args: {
    state: multioption({
      type: array(oneOf<IssueState>(issueStates)),
      long: "state",
      short: "s",
      description:
        "Filter by issue state (completed, canceled, backlog, triage, unstarted, started). Default is everything except completed or cancelled",
    }),

    assignee: option({
      type: string,
      long: "assignee",
      short: "a",
      defaultValue: () => "@me",
      description: "assignee",
    }),
  },

  handler: async ({ state, assignee }) => {
    const me = await client.viewer;

    const stateFilter =
      state.length === 0
        ? { state: { type: { nin: ["completed", "canceled"] } } }
        : { state: { type: { in: state } } };

    const issues =
      assignee === "@me"
        ? await me.assignedIssues({ filter: { ...stateFilter } })
        : await client.issues({
            filter: {
              ...stateFilter,
              ...{
                assignee: {
                  displayName: {
                    contains: assignee.toLowerCase(),
                  },
                },
              },
            },
          });

    const mappedIssues = await Promise.all(
      issues.nodes.map(async (i) => {
        const [assignee, state] = await Promise.all([i.assignee, i.state]);
        return {
          ID: `[${i.identifier}]`,
          Title: truncate(i.title, 64),
          // Priority: i.priorityLabel,
          Status: state?.name,
          Assignee: assignee?.displayName,
          // Updated: toRelative(new Date(i.updatedAt)),
        };
      }),
    );

    if (!mappedIssues.length) {
      console.info("No issues found");
      return;
    }

    console.log(`Issues assigned to ${assignee}:\n`);

    printTable(mappedIssues);
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
    project: option({
      type: optional(string),
      long: "project",
      short: "-p",
      description: "Project",
    }),
  },
  handler: async ({ title, project, description }) => {
    // Start loading projects in the background
    async function fetchOwnProjectsAndTeams(): Promise<[Team[], Project[]]> {
      const me = await client.viewer;
      const myTeams = await me.teams();

      const projects = await client.projects({
        filter: {
          accessibleTeams: {
            id: {
              in: myTeams.nodes.map((t) => t.id),
            },
          },
        },
      });

      return [myTeams.nodes, projects.nodes];
    }

    const projectsPromise = fetchOwnProjectsAndTeams();

    if (!title) {
      const titlePrompt = new Enquirer<{ title: string }>();
      const newTitle = await titlePrompt.prompt({
        type: "input",
        name: "title",
        message: "Issue title",
      });

      title = newTitle.title;
    }

    const [myTeams, projects] = await projectsPromise;

    let teamId = myTeams[0].id;

    // TODO: Some default logic here?
    if (myTeams.length > 1) {
      const teamChoices = myTeams.map((t: Team) => {
        return {
          name: `${t.name}`,
          value: t.id,
        };
      });

      const teamPrompt = new Enquirer<{ teamId: string }>();

      // TODO: Allow passing project from command line
      const newTeam = await teamPrompt.prompt({
        type: "autocomplete",
        name: "teamId",
        message: "Select a team",
        choices: teamChoices,
      });

      teamId = newTeam.teamId;
    }

    if (!project) {
      const projectChoices = projects.map((p: Project) => {
        return {
          name: `${p.name}`,
          value: p.id,
        };
      });

      const projectPrompt = new Enquirer<{ project: string }>();

      // TODO: Allow passing project from command line
      const newProject = await projectPrompt.prompt({
        type: "autocomplete",
        name: "project",
        message: "Select a project",
        choices: projectChoices,
      });

      project = newProject.project;
    }

    if (!description) {
      const makeDescriptionPrompt = new Enquirer<{ makeDescription: string }>();

      const makeDescription = await makeDescriptionPrompt.prompt({
        type: "input",
        name: "makeDescription",
        message: `Body: (e to launch ${config.EDITOR}, enter to skip)`,
      });

      if (makeDescription.makeDescription === "e") {
        const editorDescription = openTextEditor();

        description = editorDescription;
      }
    }

    const response = await client.createIssue({
      teamId,
      description,
      projectId: project,
      title,
    });

    const newIssue = await response.issue;

    console.log(`Issue ${newIssue?.identifier} created`, newIssue?.url);
  },
});

export const issue = subcommands({
  name: "issue",
  cmds: { list, create },
});
