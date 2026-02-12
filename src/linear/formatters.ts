import chalk from "chalk";
import type { OutputFormat } from "../types.ts";
import truncate from "../utils/truncate.ts";
import type { LnrIssue } from "./requests/getIssues.ts";
import type { LnrProjectMilestone } from "./requests/getProjectMilestones.ts";
import type { LnrProject } from "./requests/getProjects.ts";

function formatPriority(priorityLabel: string): string | null {
	switch (priorityLabel) {
		case "Urgent":
			return chalk.red(priorityLabel);
		case "High":
			return chalk.hex("#db6e1f")(priorityLabel);
		case "Medium":
			return chalk.yellow(priorityLabel);
		case "Low":
			return chalk.blue(priorityLabel);
		default:
			return null;
	}
}

export function formatIssueForOutput(
	issue: LnrIssue,
	format: OutputFormat,
): Record<string, unknown> {
	if (format === "json") {
		return {
			id: issue.id,
			identifier: issue.identifier,
			title: issue.title,
			status: issue.state?.name ?? null,
			statusType: issue.state?.type ?? null,
			priority: issue.priorityLabel,
			assignee: issue.assignee?.displayName ?? null,
			creator: issue.creator?.displayName ?? null,
			milestone: issue.projectMilestone?.name ?? null,
			target: issue.projectMilestone?.targetDate ?? null,
		};
	}

	const statusName = issue.state?.name ?? "";
	const stateColorFn = issue.state?.color
		? chalk.hex(issue.state.color)
		: (value: string) => value;

	return {
		ID: `[${issue.identifier}]`,
		Title: truncate(issue.title, 64),
		Status: statusName ? stateColorFn(statusName) : "",
		Priority: formatPriority(issue.priorityLabel),
		Assignee: issue.assignee?.displayName,
		Creator: issue.creator?.displayName,
		Milestone: issue.projectMilestone?.name ?? null,
		"Target date": issue.projectMilestone?.targetDate ?? null,
	};
}

export function formatProjectForOutput(
	project: LnrProject,
	format: OutputFormat,
): Record<string, unknown> {
	if (format === "json") {
		return {
			id: project.id,
			name: project.name,
			slugId: project.slugId,
			status: project.status.name,
			url: project.url ?? null,
		};
	}

	return {
		Name: project.name,
		Status: project.status.name,
		Url: project.url,
	};
}

export function formatMilestoneForOutput(
	milestone: LnrProjectMilestone,
	format: OutputFormat,
): Record<string, unknown> {
	if (format === "json") {
		return {
			id: milestone.id,
			name: milestone.name,
			targetDate: milestone.targetDate ?? null,
			sortOrder: milestone.sortOrder,
			description: milestone.description ?? null,
		};
	}

	return {
		Name: milestone.name,
		"Target Date": milestone.targetDate ?? "-",
		Description: milestone.description
			? truncate(milestone.description, 40)
			: "-",
	};
}
