import process from "node:process";
import { command, oneOf, option, positional, string } from "cmd-ts";
import { getConfig } from "../../../config/config.ts";
import { printOutput } from "../../../console/print.ts";
import { getLinearClient } from "../../../linear/client.ts";
import { formatMilestoneForOutput } from "../../../linear/formatters.ts";
import { getProjectMilestones } from "../../../linear/requests/getProjectMilestones.ts";
import { getProjects } from "../../../linear/requests/getProjects.ts";
import { type OutputFormat, outputFormats } from "../../../types.ts";

const list = command({
	name: "list",
	description: "List milestones for a project",
	args: {
		project: positional({
			type: string,
			displayName: "project",
			description: "Project name",
		}),

		format: option({
			type: oneOf<OutputFormat>(outputFormats),
			long: "format",
			description: "Output format (table or json)",
			defaultValue: () => "table" as OutputFormat,
		}),
	},

	handler: async ({ project, format }) => {
		const config = await getConfig();
		const client = getLinearClient(config.linearApiKey);

		const projects = await getProjects(client, {
			ownProjectsOnly: false,
			name: project,
		});

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

		const foundProject = projects[0];

		const milestones = await getProjectMilestones(client, foundProject.id);

		if (!milestones.length) {
			if (format === "json") {
				printOutput([], format);
				process.exit(0);
			}

			console.log("No milestones found for this project");
			process.exit(0);
		}

		// Sort by sortOrder
		const sortedMilestones = milestones.sort(
			(a, b) => a.sortOrder - b.sortOrder,
		);

		const formattedMilestones = sortedMilestones.map((milestone) =>
			formatMilestoneForOutput(milestone, format),
		);

		printOutput(formattedMilestones, format);

		process.exit(0);
	},
});

export default list;
