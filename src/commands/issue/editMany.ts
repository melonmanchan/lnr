import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import type { LinearDocument } from "@linear/sdk";
import { getConfig } from "../../config/config.ts";
import { printOutput } from "../../console/print.ts";
import { getLinearClient } from "../../linear/client.ts";
import { formatIssueForOutput } from "../../linear/formatters.ts";
import { batchUpdateIssue } from "../../linear/requests/batchUpdateIssue.ts";
import { getIssueLabels } from "../../linear/requests/getIssueLabels.ts";
import { getIssues } from "../../linear/requests/getIssues.ts";
import { cycleStates, type IssueStatus, issueStatuses } from "../../types.ts";

export default new Command()
	.description("Edit many issues")
	.option("-s, --status <status:string[]>", "Filter by issue status", {
		collect: true,
	})
	.option(
		"-c, --cycle <cycle:issueStatus>",
		"Cycle filters (current, previous, next)",
		{
			value: (value) => {
				if (!cycleStates.includes(value as IssueStatus)) {
					throw new Error(
						`Invalid cycle: ${value}. Must be one of ${cycleStates.join(", ")}`,
					);
				}
				return value as IssueStatus;
			},
		},
	)
	.option("-cr, --creator <creator:string[]>", "Creator name", {
		collect: true,
	})
	.option("-a, --assignee <assignee:string[]>", "Assignee name", {
		collect: true,
	})
	.option("-p, --project <project:string[]>", "Project name", { collect: true })
	.option("-q, --query <query:string>", "Freeform text search")
	.option("-l, --label <label:string[]>", "Issue label(s)", { collect: true })
	.option("-t, --team <team:string[]>", "Issue team", { collect: true })
	.option(
		"--add-assignee <assigneeToAdd:string>",
		"Assignee to add to all issues",
	)
	.option("--add-label <labelToAdd:string>", "Label to add to all issues")
	.option("--confirm", "Auto-confirm you want to edit issues", {
		default: false,
		action: () => true, // Ensure it's a boolean true when present
	})
	.action(
		async ({
			status,
			assignee,
			project,
			cycle,
			query,
			creator,
			label,
			team,
			confirm,

			labelToAdd,
			assigneeToAdd,
		}) => {
			const config = await getConfig();
			const client = getLinearClient(config.linearApiKey);

			const issues = await getIssues(client, {
				issueStates: status,
				freeformSearch: query,
				assignees: assignee,
				teams: team,
				cycle,
				projects: project,
				creators: creator,
				labels: label,
			});

			if (!issues.length) {
				console.info("No issues found");
				Deno.exit(0);
			}

			const getStatusOrder = (stateType?: IssueStatus | null) => {
				if (!stateType) {
					return Number.MAX_SAFE_INTEGER;
				}

				const index = issueStatuses.indexOf(stateType);

				return index === -1 ? Number.MAX_SAFE_INTEGER : index;
			};

			const sortedIssues = [...issues].sort((a, b) => {
				const aStatus = getStatusOrder(
					a.state?.type as IssueStatus | undefined,
				);
				const bStatus = getStatusOrder(
					b.state?.type as IssueStatus | undefined,
				);
				return aStatus - bStatus;
			});

			const formattedIssues = sortedIssues.map((issue) =>
				formatIssueForOutput(issue, "table"),
			);

			if (!confirm) {
				printOutput(formattedIssues, "table");

				const resp = await Confirm.prompt({
					message: "Are you sure you want to edit the issues?",
				});

				if (!resp) {
					Deno.exit(0);
				}
			}

			const issueIds = issues.map((i) => i.id);

			const input: LinearDocument.IssueUpdateInput = {};

			if (labelToAdd) {
				const labels = await getIssueLabels(client, {
					name: {
						containsIgnoreCase: labelToAdd,
					},
				});

				const labelIds = labels.map((l) => l.id);

				if (labelIds.length === 0) {
					console.warn("No labels to add found ");
					Deno.exit(1);
				}

				input.addedLabelIds = labelIds;
			}

			if (assigneeToAdd) {
				const users = await client.users({
					filter: {
						name: {
							containsIgnoreCase: assigneeToAdd,
						},
					},
				});

				const userIds = users.nodes.map((u) => u.id);

				if (userIds.length === 0) {
					console.warn("No users to assign found");
					Deno.exit(1);
				}

				if (userIds.length > 1) {
					console.warn(
						"Multiple users to assign found, please narrow down your filter",
					);

					console.log(
						"Matching users:",
						users.nodes.map((u) => u.name).join(", "),
					);

					Deno.exit(1);
				}

				input.assigneeId = userIds[0];
			}

			console.log("Updating issues...");

			await batchUpdateIssue(client, {
				ids: issueIds,
				input,
			});

			console.log("Done!");

			Deno.exit(0);
		},
	);
