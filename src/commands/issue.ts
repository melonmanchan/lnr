import { command, subcommands } from "cmd-ts";
import toRelative from "../date/toRelative";

import client from "../linear/client";

const list = command({
  name: "list",
  args: {},
  handler: async () => {
    const me = await client.viewer;
    const myIssues = await me.assignedIssues();

    const notClosedIssues = myIssues.nodes.filter(
      (issue) => issue.completedAt === undefined,
    );

    notClosedIssues.forEach((issue) =>
      console.log(
        `[${issue.identifier}]: ${issue.title} ${toRelative(new Date(issue.updatedAt))}`,
      ),
    );
  },
});

export const issue = subcommands({
  name: "issue",
  cmds: { list },
});
