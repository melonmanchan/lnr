import { Command } from "@cliffy/command";
import { Confirm, Input, Secret } from "@cliffy/prompt";
import chalk from "chalk";
import open from "open";
import { type ConfigSchemaV1, saveConfig } from "../config/config.ts";
import { getLinearClient } from "../linear/client.ts";

const AUTH_URL = "https://linear.app/settings/account/security";

const login = new Command()
	.description("Authenticate with Linear")
	.action(async () => {
		const confirmResponse = await Confirm.prompt({
			message: "Press enter to open your browser and create a personal API key",
		});

		if (!confirmResponse) {
			console.log("Login cancelled.");
			Deno.exit(0);
		}

		await open(AUTH_URL);

		const linearApiKey = await Secret.prompt({
			message: "Paste in your personal API key:",
		});

		if (!linearApiKey) {
			console.error(chalk.red("API key cannot be empty."));
			Deno.exit(1);
		}

		const testClient = getLinearClient(linearApiKey);

		try {
			await testClient.viewer;
		} catch {
			console.error(
				chalk.red(
					"Unable to authenticate with Linear. Please check your API key and try again.",
				),
			);

			Deno.exit(1);
		}

		const cliEditor = await Input.prompt({
			message:
				"Which editor would you like to use? (default: use shell env $EDITOR)",
			default: "$EDITOR",
		});

		const newConfig: ConfigSchemaV1 = {
			version: 1,
			linearApiKey,
			editor: cliEditor,
		};

		const path = await saveConfig(newConfig);

		console.log(`Config saved succesfully to ${chalk.bold(path)}`);

		Deno.exit(0);
	});

export const auth = new Command()
	.description("Authenticate with Linear")
	.command("login", login);
