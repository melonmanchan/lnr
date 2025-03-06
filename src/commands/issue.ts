import { command, subcommands } from "cmd-ts";
import toRelative from "../date/toRelative";

import client from "../linear/client";
import { printTable } from "../console/print";

const list = command({
  name: "list",
  args: {},
  handler: async () => {
    const me = await client.viewer;
    const myIssues = await me.assignedIssues();

    const notClosedIssues = myIssues.nodes.filter(
      (issue) => issue.completedAt === undefined,
    );

    const mappedIssues = notClosedIssues.map((i) => ({
      ID: `[${i.identifier}]`,
      Title: i.title,
      Updated: toRelative(new Date(i.updatedAt)),
    }));

    printTable(mappedIssues);
  },
});

export const issue = subcommands({
  name: "issue",
  cmds: { list },
});
