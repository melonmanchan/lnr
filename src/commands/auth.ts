import enquirer from "enquirer";
import { command, subcommands } from "cmd-ts";
import process from "node:process";
import open from "open";
import { ConfigSchemaV1, saveConfig } from "../config/config.ts";
import { getLinearClient } from "../linear/client.ts";

const AUTH_URL = "https://linear.app/settings/account/security";

const login = command({
  name: "login",
  args: {},

  handler: async () => {
    const resp = await enquirer.prompt<{ confirm: boolean }>({
      type: "input",
      name: "confirm",
      message: "Press enter to open your browser and create a personal API key",
    });

    if (resp.confirm) {
      return;
    }

    await open(AUTH_URL);

    const response = await enquirer.prompt<{ linearApiKey: string }>({
      type: "password",
      name: "linearApiKey",
      message: "Paste in your personal API key:",
    });

    const { linearApiKey } = response;

    const newConfig: ConfigSchemaV1 = {
      version: 1,
      linearApiKey,
      editor: "$EDITOR",
    };

    const testClient = getLinearClient(linearApiKey);
    try {
      await testClient.viewer;
    } catch {
      console.error(
        "Unable to authenticate with Linear. Please check your API key and try again.",
      );

      process.exit(-1);
    }

    await saveConfig(newConfig);

    console.log("Config saved succesfully");

    process.exit(0);
  },
});

export const auth = subcommands({
  name: "auth",
  description: "Authenticate with Linear",
  cmds: { login },
});
