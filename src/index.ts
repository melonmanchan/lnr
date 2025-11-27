import { Command } from "@cliffy/command";
import chalk from "chalk";
import packageJson from "../package.json" with { type: "json" };
import { auth } from "./commands/auth.ts";
import { issue } from "./commands/issue/index.ts";
import { project } from "./commands/project/index.ts";
import { configExists } from "./config/config.ts";

const hasConfig = await configExists();

if (!hasConfig && Deno.args[0] !== "auth" && Deno.args[1] !== "login") {
	console.log("No configuration found");
	console.log(`Please run ${chalk.bold("lnr auth login")} to authenticate!`);
	Deno.exit(1);
}

const app = new Command()
	.name("lnr")
	.version(packageJson.version)
	.description("A command-line interface for Linear")
	.command("auth", auth)
	.command("issue", issue)
	.command("project", project);

await app.parse(Deno.args);
