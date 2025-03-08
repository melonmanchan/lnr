import process from "node:process";
import { run, subcommands } from "cmd-ts";
import { issue } from "./commands/issue.ts";
import { linearInitialized } from "./linear/client.ts";

import packageJson from "../package.json" with { type: "json" };

if (!linearInitialized()) {
  console.log(1);
  process.exit(0);
}

const app = subcommands({
  version: packageJson.version,
  name: "lr",
  cmds: { issue },
});

run(app, process.argv.slice(2));
