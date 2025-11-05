import process from "node:process";
import chalk from "chalk";
import { run, subcommands } from "cmd-ts";
import packageJson from "../package.json" with { type: "json" };
import { auth } from "./commands/auth.ts";
import { issue } from "./commands/issue/index.ts";
import { project } from "./commands/project/index.ts";
import { configExists } from "./config/config.ts";

const hasConfig = await configExists();

const ARGS = process.argv.slice(2);

const fullCommand = ARGS.join(" ");

if (!hasConfig && fullCommand !== "auth login") {
	console.log("No configuration found");
	console.log(`Please run ${chalk.bold("lnr auth login")} to authenticate!`);
	process.exit(1);
}

const app = subcommands({
	version: packageJson.version,
	description: "A command-line interface for Linear",
	name: "lnr",
	cmds: { issue, auth, project },
});

run(app, ARGS);
