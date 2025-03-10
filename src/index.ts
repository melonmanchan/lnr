import process from "node:process";
import { run, subcommands } from "cmd-ts";
import { issue } from "./commands/issue.ts";
import { auth } from "./commands/auth.ts";
import chalk from "chalk";
import { configExists } from "./config/config.ts";
import packageJson from "../package.json" with { type: "json" };

const hasConfig = await configExists();

const ARGS = process.argv.slice(2);

const fullCommand = ARGS.join(" ");

if (!hasConfig && fullCommand !== "auth login") {
  console.log("No configuration found");
  console.log(`Please run ${chalk.bold("lr auth login")} to authenticate!`);
  process.exit(1);
}

const app = subcommands({
  version: packageJson.version,
  description: "A command-line interface for Linear",
  name: "lr",
  cmds: { issue, auth },
});

run(app, ARGS);
