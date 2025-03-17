import {
  boolean,
  command,
  flag,
  option,
  optional,
  positional,
  string,
  subcommands,
} from "cmd-ts";
import process from "node:process";
import { getConfig } from "../config/config.ts";
import { getLinearClient } from "../linear/client.ts";
import { getProjects } from "../linear/requests/getProjects.ts";
import { printTable } from "../console/print.ts";
import open from "open";

const list = command({
  name: "list",
  description: "List projects",
  args: {
    all: flag({
      type: boolean,
      long: "all",
      short: "a",
      description: "List all projects?",
    }),

    query: option({
      type: optional(string),
      long: "query",
      short: "q",
      description: "Freeform text search",
    }),
  },

  handler: async ({ all, query }) => {
    const config = await getConfig();
    const client = getLinearClient(config.linearApiKey);

    const projects = await getProjects(client, {
      ownProjectsOnly: !all,
      freeformSearch: query,
    });

    const formattedProjects = projects.map((p) => {
      return {
        Name: p.name,
        Status: p.status.name,
        Url: p.url,
      };
    });

    const message = all ? "Projects\n" : "Projects you are a member of\n";

    console.log(message);

    printTable(formattedProjects);

    process.exit(0);
  },
});

const view = command({
  name: "view",
  description: "View an invidivual project",
  args: {
    project: positional({
      type: string,
      displayName: "project",
      description: "Project name",
    }),
    web: flag({
      type: boolean,
      long: "web",
      short: "w",
      description: "View project in web/native app",
    }),
  },

  handler: async ({ project, web }) => {
    const config = await getConfig();

    const client = getLinearClient(config.linearApiKey);
    const me = await client.viewer;

    const [org, projects] = await Promise.all([
      me.organization,
      getProjects(client, {
        ownProjectsOnly: false,
        name: project,
      }),
    ]);

    if (projects.length === 0) {
      console.warn("No projects found");
      process.exit(1);
    }

    if (projects.length > 1) {
      console.warn(
        "More than one project found for name, please narrow down your search",
      );

      const foundNames = projects.map((p) => p.name);

      console.log(`Found projects: ${foundNames.join(", ")}`);

      process.exit(1);
    }

    const projectToView = projects[0];

    const url = `https://linear.app/${org.urlKey}/project/${projectToView.slugId}/overview`;

    console.log(`Opening project ${url}...`);

    open(url);

    process.exit(0);
  },
});

export const project = subcommands({
  name: "project",
  description: "Linear project-related tasks",
  cmds: { list, view },
});
