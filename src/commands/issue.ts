import { command, subcommands } from "cmd-ts";
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const list = command({
  name: "list",
  args: {},
  handler: async () => {
    console.log("list1");
    await delay(1000);

    console.log("list");
  },
});

export const issue = subcommands({
  name: "issue",
  cmds: { list },
});
