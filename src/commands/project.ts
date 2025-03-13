import { boolean, command, flag, subcommands } from "cmd-ts";
import process from "node:process";
import { getConfig } from "../config/config.ts";
import { getLinearClient } from "../linear/client.ts";
import { paginatedLinearRequest } from "../linear/paginatedLinearRequest.ts";
import type { ProjectsQueryVariables } from "@linear/sdk/dist/_generated_documents.d.ts";
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

    const membersFilter = all
      ? {}
      : {
          members: {
            isMe: { eq: true },
          },
        };

    const query: ProjectsQueryVariables = {
      filter: {
        ...membersFilter,
      },
    };

    const projects = await paginatedLinearRequest(
      (variables) => client.projects(variables),
      query,
    );

    const formattedProjects = await Promise.all(
      projects.map(async (p) => {
        const status = await p.status;
        return {
          Name: p.name,
          Status: status?.name,
          Health: p.health,
        };
      }),
    );

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
