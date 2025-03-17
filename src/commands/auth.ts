import process from "node:process";
import chalk from "chalk";
import { command, subcommands } from "cmd-ts";
import enquirer from "enquirer";
import open from "open";
import { type ConfigSchemaV1, saveConfig } from "../config/config.ts";
import { getLinearClient } from "../linear/client.ts";

const AUTH_URL = "https://linear.app/settings/account/security";

const login = command({
  name: "login",
  args: {},

  handler: async () => {
    const confirmResponse = await enquirer.prompt<{ confirm: boolean }>({
      type: "input",
      name: "confirm",
      message: "Press enter to open your browser and create a personal API key",
    });

    if (confirmResponse.confirm) {
      return;
    }

    await open(AUTH_URL);

    const apiKeyResponse = await enquirer.prompt<{ linearApiKey: string }>({
      type: "password",
      name: "linearApiKey",
      message: "Paste in your personal API key:",
    });

    const { linearApiKey } = apiKeyResponse;

    const testClient = getLinearClient(linearApiKey);

    try {
      await testClient.viewer;
    } catch {
      console.error(
        "Unable to authenticate with Linear. Please check your API key and try again.",
      );

      process.exit(-1);
    }

    const editorResponse = await enquirer.prompt<{ cliEditor: string }>({
      type: "input",
      name: "cliEditor",
      initial: "$EDITOR",
      message:
        "Which editor would you like to use? (default: use shell env $EDITOR)",
    });

    const newConfig: ConfigSchemaV1 = {
      version: 1,
      linearApiKey,
      editor: editorResponse.cliEditor,
    };

    const path = await saveConfig(newConfig);

    console.log(`Config saved succesfully to ${chalk.bold(path)}`);

    process.exit(0);
  },
});

export const auth = subcommands({
  name: "auth",
  description: "Authenticate with Linear",
  cmds: { login },
});
