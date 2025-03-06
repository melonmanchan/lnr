import { command, subcommands } from "cmd-ts";

const list = command({
  name: "list",
  args: {},
  handler: async () => {
    console.log("list");
  },
});

export const issue = subcommands({
  name: "issue",
  cmds: { list },
});
