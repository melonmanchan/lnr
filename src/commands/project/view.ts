import { Command } from "@cliffy/command";
import open from "open";
import { getConfig } from "../../config/config.ts";
import { getLinearClient } from "../../linear/client.ts";
import { getProjects } from "../../linear/requests/getProjects.ts";

export default new Command()
	.description("View an individual project")
	.arguments("<project-name:string>")
	.option("-w, --web", "View project in web/native app", { default: false })
	.action(async (projectName, { web }) => {
		const config = await getConfig();

		const client = getLinearClient(config.linearApiKey);
		const me = await client.viewer;

		const [org, projects] = await Promise.all([
			me.organization,
			getProjects(client, {
				ownProjectsOnly: false,
				name: projectName,
			}),
		]);

		if (projects.length === 0) {
			console.warn("No projects found");
			Deno.exit(1);
		}

		if (projects.length > 1) {
			console.warn(
				"More than one project found for name, please narrow down your search",
			);

			const foundNames = projects.map((p) => p.name);

			console.log(`Found projects: ${foundNames.join(", ")}`);

			Deno.exit(1);
		}

		const projectToView = projects[0];

		const url = `https://linear.app/${org.urlKey}/project/${projectToView.slugId}/overview`;

		console.log(`Opening project ${url}...`);

		open(url);

		Deno.exit(0);
	});
