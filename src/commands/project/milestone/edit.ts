import process from "node:process";
import chalk from "chalk";
import { command, option, optional, string } from "cmd-ts";
import enquirer from "enquirer";
import { getConfig } from "../../../config/config.ts";
import { getLinearClient } from "../../../linear/client.ts";
import { getProjectMilestones } from "../../../linear/requests/getProjectMilestones.ts";
import { getProjects } from "../../../linear/requests/getProjects.ts";
import {
	type UpdateProjectMilestoneData,
	updateProjectMilestone,
} from "../../../linear/requests/updateProjectMilestone.ts";

const edit = command({
	name: "edit",
	description: "Edit a project milestone",
	args: {
		project: option({
			type: string,
			long: "project",
			short: "p",
			description: "Project name",
		}),

		milestone: option({
			type: string,
			long: "milestone",
			short: "m",
			description: "Milestone name",
		}),

		date: option({
			type: optional(string),
			long: "date",
			short: "d",
			description: "Target date (YYYY-MM-DD format)",
		}),

		name: option({
			type: optional(string),
			long: "name",
			short: "n",
			description: "New milestone name",
		}),
	},

	handler: async ({ project, milestone, date, name }) => {
		const config = await getConfig();
		const client = getLinearClient(config.linearApiKey);

		// Find project
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

		// Find milestone
		const milestones = await getProjectMilestones(client, foundProject.id);

		if (milestones.length === 0) {
			console.warn("No milestones found for this project");
			process.exit(1);
		}

		const filteredMilestones = milestones.filter((m) =>
			m.name.toLowerCase().includes(milestone.toLowerCase()),
		);

		if (filteredMilestones.length === 0) {
			console.warn(
				`Could not find milestones containing name "${milestone}" in project`,
			);
			process.exit(1);
		}

		let milestoneToEdit = filteredMilestones[0];

		if (filteredMilestones.length > 1) {
			const milestoneChoices = filteredMilestones.map((m) => {
				return {
					name: `${m.name} (${m.targetDate ?? "no date"})`,
					value: m.id,
				};
			});

			const response = await enquirer.prompt<{ milestoneId: string }>({
				type: "autocomplete",
				name: "milestoneId",
				message: "Select milestone",
				choices: milestoneChoices,
			});

			milestoneToEdit =
				filteredMilestones.find((m) => m.id === response.milestoneId) ??
				filteredMilestones[0];
		}

		// Collect updates
		const updateData: UpdateProjectMilestoneData = {
			id: milestoneToEdit.id,
		};

		if (date) {
			updateData.targetDate = date;
		}

		if (name) {
			updateData.name = name;
		}

		if (Object.keys(updateData).length === 1) {
			console.warn("Nothing to update");
			process.exit(1);
		}

		// Update milestone
		const updated = await updateProjectMilestone(client, updateData);

		console.log(`Milestone ${chalk.bold(updated.name)} updated`);

		if (updated.targetDate) {
			console.log(`Target date: ${updated.targetDate}`);
		}

		process.exit(0);
	},
});

export default edit;
