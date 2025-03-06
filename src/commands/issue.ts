import {
  command,
  oneOf,
  multioption,
  subcommands,
  array,
  option,
  string,
} from "cmd-ts";
import toRelative from "../date/toRelative";

import client from "../linear/client";
import { printTable } from "../console/print";
import truncate from "../utils/truncate";

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
        ? { state: { type: { neq: "completed" } } }
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

    printTable(mappedIssues);
  },
});

export const issue = subcommands({
  name: "issue",
  cmds: { list },
});
