import { command, oneOf, multioption, subcommands, array } from "cmd-ts";
import toRelative from "../date/toRelative";

import client from "../linear/client";
import { printTable } from "../console/print";

const issueStates = [
  "started",
  "completed",
  "cancelled",
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
      description:
        "Filter by issue state (completed, canceled, backlog, triage, unstarted, started). Defaults to everything except 'completed'.",
    }),
  },

  handler: async ({ state }) => {
    const me = await client.viewer;

    const filter =
      state.length === 0
        ? { state: { type: { neq: "completed" } } }
        : { state: { type: { in: state } } };

    const myIssues = await me.assignedIssues({
      filter: filter,
    });

    const mappedIssues = myIssues.nodes.map((i) => ({
      ID: `[${i.identifier}]`,
      Title: i.title,
      Updated: toRelative(new Date(i.updatedAt)),
    }));

    if (!mappedIssues.length) {
      console.info("No issues found");
      return;
    }

    printTable(mappedIssues);
  },
});

export const issue = subcommands({
  name: "issue",
  cmds: { list },
});
