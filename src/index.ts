import process from "node:process";
import { run, subcommands } from "cmd-ts";
import { issue } from "./commands/issue.ts";
import { linearInitialized } from "./linear/client.ts";

if (!linearInitialized()) {
  console.log(1);
  process.exit(0);
}

const app = subcommands({
  name: "lr",
  cmds: { issue },
});

run(app, process.argv.slice(2));
