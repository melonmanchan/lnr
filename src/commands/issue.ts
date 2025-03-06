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

import client from "../linear/client";
import config from "../config";
import { printTable } from "../console/print";
import truncate from "../utils/truncate";

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
    project: option({
      type: optional(string),
      long: "project",
      short: "-p",
      description: "Project",
    }),
  },
  handler: async ({ title, project }) => {
    const me = await client.viewer;
    const teams = await me.teams();

    const projects = (
      await Promise.all(
        teams.nodes.map(async (t) => {
          const p = await t.projects();

          return p.nodes;
        }),
      )
    ).flat();

    const projectChoices = projects.map((p) => {
      return {
        name: `${p.name}`,
        value: p.id,
      };
    });

    const titlePrompt = new Enquirer<{ title: string }>();

    const newTitle = title
      ? { title }
      : await titlePrompt.prompt({
          type: "input",
          name: "title",
          message: "Issue title",
        });

    const projectPrompt = new Enquirer<{ project: string }>();

    const newProject = project
      ? { project }
      : await projectPrompt.prompt({
          type: "autocomplete",
          name: "project",
          message: "Select a project",
          choices: projectChoices,
        });

    console.log(newProject.project);

    // const payload = await client.createIssue({
    //   teamId: config.TEAM_ID,

    //   projectId: project,
    //   title,
    // });
  },
});

export const issue = subcommands({
  name: "issue",
  cmds: { list, create },
});
