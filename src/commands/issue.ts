import { command, oneOf, option, optional, subcommands } from "cmd-ts";
import toRelative from "../date/toRelative";

import client from "../linear/client";
import { printTable } from "../console/print";

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
    // The user can optionally provide a state. If omitted, we default to "everything except completed".
    state: option({
      // Validate user input against IssueState
      type: optional(
        oneOf<IssueState>([
          "completed",
          "canceled",
          "backlog",
          "triage",
          "started",
          "unstarted",
        ]),
      ),

      long: "state",
      description:
        "Filter by issue state (completed, canceled, backlog, triage, unstarted, started). Defaults to everything except 'completed'.",
    }),
  },

  handler: async ({ state }) => {
    const me = await client.viewer;

    const filter = state
      ? { state: { type: { eq: state } } }
      : { state: { type: { neq: "completed" } } };

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
