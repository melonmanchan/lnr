import chalk, { type ChalkInstance } from "chalk";
import {
  array,
  command,
  multioption,
  oneOf,
  option,
  optional,
  string,
} from "cmd-ts";
import { getConfig } from "../../config/config.ts";
import { printTable } from "../../console/print.ts";
import { getLinearClient } from "../../linear/client.ts";
import { getIssues } from "../../linear/requests/getIssues.ts";
import { type IssueStatus, cycleStates, issueStatuses } from "../../types.ts";
import truncate from "../../utils/truncate.ts";

const statusColors: { [key: IssueStatus]: ChalkInstance } = {
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
      type: array(oneOf<IssueStatus>(issueStatuses)),
      long: "status",
      short: "s",
      description:
        "Filter by issue status (completed, canceled, backlog, triage, unstarted, started). Default is everything except completed or cancelled",
    }),

    cycle: option({
      type: optional(oneOf<IssueStatus>(cycleStates)),
      long: "cycle",
      short: "c",
      description: "Cycle filters (current, previous, next)",
    }),

    creator: option({
      type: optional(string),
      long: "creator",
      short: "cr",
      description: "Creator name",
    }),

    assignee: option({
      type: string,
      long: "assignee",
      short: "a",
      defaultValue: () => "@me",
      description: "Assignee name",
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

  handler: async ({ status, assignee, project, cycle, query, creator }) => {
    const config = await getConfig();
    const client = getLinearClient(config.linearApiKey);

    const issues = await getIssues(
      client,

      {
        issueStates: status,
        freeformSearch: query,
        assignee,
        cycle,
        project,
        creator,
      },
    );

    const mappedIssues = issues.map((i) => {
      const stateColorFn = statusColors[i.state?.type as IssueStatus] ?? chalk;

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
      const aStatus = issueStatuses.indexOf(a._state) ?? 0;
      const bStatus = issueStatuses.indexOf(b._state) ?? 0;
      return aStatus - bStatus;
    });

    const message = project
      ? `Issues in project ${chalk.bold(project)}`
      : `Issues assigned to ${chalk.bold(assignee)}`;

    console.log(message);

    printTable(sortedIssues);
  },
});

export default list;
