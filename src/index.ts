import process from "node:process";
import { run, subcommands } from "cmd-ts";
import { issue } from "./commands/issue.ts";

const app = subcommands({
  name: "lr",
  cmds: { issue },
});

run(app, process.argv.slice(2));
