import { boolean, command, flag, option, optional, string } from "cmd-ts";
import { getConfig } from "../../config/config.ts";
import { printTable } from "../../console/print.ts";
import { getLinearClient } from "../../linear/client.ts";
import { getProjects } from "../../linear/requests/getProjects.ts";

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

export default list;
