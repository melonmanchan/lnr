import process from "node:process";
import {
	boolean,
	command,
	flag,
	option,
	optional,
	positional,
	string,
} from "cmd-ts";
import enquirer from "enquirer";
import { getConfig } from "../../../config/config.ts";
import { printOutput } from "../../../console/print.ts";
import { getLinearClient } from "../../../linear/client.ts";
import { formatMilestoneForOutput } from "../../../linear/formatters.ts";
import { getProjectMilestones } from "../../../linear/requests/getProjectMilestones.ts";
import { getProjects } from "../../../linear/requests/getProjects.ts";
import {
	type UpdateProjectMilestoneData,
	updateProjectMilestone,
} from "../../../linear/requests/updateProjectMilestone.ts";

const editMany = command({
	name: "edit-many",
	description: "Edit multiple project milestone dates",
	args: {
		project: positional({
			type: string,
			displayName: "project",
			description: "Project name",
		}),

		milestone: option({
			type: optional(string),
			long: "milestone",
			short: "m",
			description: "Filter milestones by name (partial match)",
		}),

		date: option({
			type: optional(string),
			long: "date",
			short: "d",
			description: "Target date to set (YYYY-MM-DD format)",
		}),

		confirm: flag({
			type: boolean,
			long: "confirm",
			description: "Auto-confirm you want to edit milestones",
		}),
	},

	handler: async ({ project, milestone, date, confirm }) => {
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

		// Get milestones
		const allMilestones = await getProjectMilestones(client, foundProject.id);

		if (allMilestones.length === 0) {
			console.warn("No milestones found for this project");
			process.exit(1);
		}

		// Filter milestones if filter is provided
		const filteredMilestones = milestone
			? allMilestones.filter((m) =>
					m.name.toLowerCase().includes(milestone.toLowerCase()),
				)
			: allMilestones;

		if (filteredMilestones.length === 0) {
			console.warn(
				`No milestones found matching filter "${milestone}" in project`,
			);
			process.exit(1);
		}

		// Sort by sortOrder
		const sortedMilestones = filteredMilestones.sort(
			(a, b) => a.sortOrder - b.sortOrder,
		);

		// Display milestones
		const formattedMilestones = sortedMilestones.map((m) =>
			formatMilestoneForOutput(m, "table"),
		);

		if (!confirm) {
			printOutput(formattedMilestones, "table");

			const confirmResponse = await enquirer.prompt<{ confirm: boolean }>({
				name: "confirm",
				type: "confirm",
				message: "Are you sure you want to edit these milestones?",
			});

			if (!confirmResponse.confirm) {
				console.log("Cancelled");
				process.exit(0);
			}
		}

		if (!date) {
			console.warn("No date specified. Use --date to set target date");
			process.exit(1);
		}

		// Prepare updates
		const updates: UpdateProjectMilestoneData[] = sortedMilestones.map((m) => ({
			id: m.id,
			targetDate: date,
		}));

		console.log("Updating milestones...");

		for (const updateData of updates) {
			await updateProjectMilestone(client, updateData);
		}

		console.log(`Done! Updated ${updates.length} milestone(s)`);

		process.exit(0);
	},
});

export default editMany;
