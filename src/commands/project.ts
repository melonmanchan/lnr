import { boolean, command, flag, subcommands } from "cmd-ts";
import process from "node:process";
import { getConfig } from "../config/config.ts";
import { getLinearClient } from "../linear/client.ts";
import { getProjects } from "../linear/requests/getProjects.ts";
import { printTable } from "../console/print.ts";

const list = command({
  name: "list",
  description: "List projects you are a member of",
  args: {
    all: flag({
      type: boolean,
      long: "all",
      short: "a",
      description: "List all projects?",
    }),
  },

  handler: async ({ all }) => {
    const config = await getConfig();
    const client = getLinearClient(config.linearApiKey);

    const projects = await getProjects(client, !!all);

    const formattedProjects = projects.map((p) => {
      return {
        Name: p.name,
        Status: p.status.name,
      };
    });

    const message = `Projects you are a member of\n`;

    console.log(message);

    printTable(formattedProjects);

    process.exit(0);
  },
});

export const project = subcommands({
  name: "project",
  description: "Linear project-related tasks",
  cmds: { list },
});
