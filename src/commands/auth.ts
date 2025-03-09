import { command, subcommands } from "cmd-ts";

const login = command({
  name: "login",
  args: {},

  handler: async () => {
    console.log("login");
  },
});

export const auth = subcommands({
  name: "auth",
  cmds: { login },
});
