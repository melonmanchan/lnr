import { Command } from "@cliffy/command";
import { getConfig } from "../../config/config.ts";
import { printOutput } from "../../console/print.ts";
import { getLinearClient } from "../../linear/client.ts";
import { formatProjectForOutput } from "../../linear/formatters.ts";
import { getProjects } from "../../linear/requests/getProjects.ts";
import { type OutputFormat, outputFormats } from "../../types.ts";

export default new Command()
	.description("List projects")
	.option("-a, --all", "List all projects?", { default: false })
	.option("-q, --query <query:string>", "Freeform text search")
	.option("--format <format:outputFormat>", "Output format (table or json)", {
		default: "table",
		value: (value) => {
			if (!outputFormats.includes(value as OutputFormat)) {
				throw new Error(
					`Invalid format: ${value}. Must be one of ${outputFormats.join(", ")}`,
				);
			}
			return value as OutputFormat;
		},
	})
	.action(async ({ all, query, format }) => {
		const config = await getConfig();
		const client = getLinearClient(config.linearApiKey);

		const projects = await getProjects(client, {
			ownProjectsOnly: !all,
			freeformSearch: query,
		});

		if (!projects.length) {
			if (format === "json") {
				printOutput([], format);
				Deno.exit(0);
			}

			console.log("No projects found");
			Deno.exit(0);
		}

		const formattedProjects = projects.map((project) =>
			formatProjectForOutput(project, format),
		);

		printOutput(formattedProjects, format);

		Deno.exit(0);
	});
