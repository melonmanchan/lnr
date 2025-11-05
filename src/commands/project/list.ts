import {
	boolean,
	command,
	flag,
	oneOf,
	option,
	optional,
	string,
} from "cmd-ts";
import { getConfig } from "../../config/config.ts";
import { printOutput } from "../../console/print.ts";
import { getLinearClient } from "../../linear/client.ts";
import { getProjects } from "../../linear/requests/getProjects.ts";
import { type OutputFormat, outputFormats } from "../../types.ts";

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

		format: option({
			type: oneOf<OutputFormat>(outputFormats),
			long: "format",
			description: "Output format (table or json)",
			defaultValue: () => "table" as OutputFormat,
		}),
	},

	handler: async ({ all, query, format }) => {
		const config = await getConfig();
		const client = getLinearClient(config.linearApiKey);

		const projects = await getProjects(client, {
			ownProjectsOnly: !all,
			freeformSearch: query,
		});

		if (!projects.length) {
			if (format === "json") {
				printOutput([], format);
				process.exit(0);
			}

			console.log("No projects found");
			process.exit(0);
		}

		const tableProjects = projects.map((p) => {
			return {
				Name: p.name,
				Status: p.status.name,
				Url: p.url,
			};
		});

		const jsonProjects = projects.map((p) => {
			return {
				id: p.id,
				name: p.name,
				slugId: p.slugId,
				status: p.status.name,
				url: p.url ?? null,
			};
		});

		switch (format) {
			case "table":
				printOutput(tableProjects, format);
				break;
			case "json":
				printOutput(jsonProjects, format);
				break;
		}

		process.exit(0);
	},
});

export default list;
