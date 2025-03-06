import { run, subcommands } from "cmd-ts";
import { issue } from "./commands/issue";

const app = subcommands({
  name: "lr",
  cmds: { issue },
});

run(app, process.argv.slice(2));
