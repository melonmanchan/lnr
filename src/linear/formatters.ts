import chalk from "chalk";
import type { OutputFormat } from "../types.ts";
import truncate from "../utils/truncate.ts";
import type { LnrIssue } from "./requests/getIssues.ts";
import type { LnrProject } from "./requests/getProjects.ts";

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
			assignee: issue.assignee?.displayName ?? null,
			creator: issue.creator?.displayName ?? null,
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
		Assignee: issue.assignee?.displayName,
		Creator: issue.creator?.displayName,
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
