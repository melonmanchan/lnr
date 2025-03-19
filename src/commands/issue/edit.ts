import { command, oneOf, option, optional, positional, string } from "cmd-ts";
import {
  type IssuePriority,
  issuePriorities,
  issueStatuses,
} from "../../types.ts";

import type { User, WorkflowState } from "@linear/sdk";
import enquirer from "enquirer";
import { getConfig } from "../../config/config.ts";
import { getLinearClient } from "../../linear/client.ts";

import process from "node:process";
import chalk from "chalk";
import {
  type UpdateIssueData,
  updateIssue,
} from "../../linear/requests/updateIssue.ts";

const edit = command({
  name: "edit",
  description: "Edit an individual issue",
  args: {
    issue: positional({
      type: string,
      description: "Issue identifier",
    }),

    title: option({
      type: optional(string),
      long: "title",
      short: "t",
      description: "Title",
    }),

    description: option({
      type: optional(string),
      long: "description",
      short: "d",
      description: "Description",
    }),

    assignee: option({
      type: optional(string),
      long: "assignee",
      short: "a",
      description: "Assignee",
    }),

    status: option({
      type: optional(string),
      long: "status",
      short: "s",
      description: `Update status ${issueStatuses.join(", ")}`,
    }),

    priority: option({
      type: optional(oneOf<IssuePriority>(issuePriorities)),
      long: "priority",
      short: "p",
      description: `Update priority (${issuePriorities.join(", ")})`,
    }),
  },

  handler: async ({
    issue,
    title,
    description,
    assignee,
    priority,
    status,
  }) => {
    const config = await getConfig();
    const client = getLinearClient(config.linearApiKey);

    const updateData: UpdateIssueData = {
      id: issue,
    };

    if (title) {
      updateData.title = title;
    }

    if (description) {
      updateData.description = description;
    }
    if (priority) {
      updateData.priority = issuePriorities.indexOf(priority);
    }

    if (assignee) {
      const assignees = await client.users({
        filter: {
          displayName: {
            containsIgnoreCase: assignee,
          },
        },
      });

      if (assignees.nodes.length === 0) {
        console.warn('No assignees found for "${assignee}"');
        process.exit(1);
      }

      if (assignees.nodes.length > 1) {
        const assigneeChoices = assignees.nodes.map((p: User) => {
          return {
            name: `${p.name}`,
            value: p.id,
          };
        });

        const newAssignee = await enquirer.prompt<{ assigneeId: string }>({
          type: "autocomplete",
          name: "assigneeId",
          message: "Select assignee",
          choices: assigneeChoices,
        });

        updateData.assigneeId = newAssignee.assigneeId;
      } else {
        updateData.assigneeId = assignees.nodes[0].id;
      }
    }

    if (status) {
      const apiIssue = await client.issue(issue);
      const team = await apiIssue.team;

      if (!team) {
        console.warn("Could not find team for issue");
        process.exit(1);
      }

      const states = await team.states();

      const { nodes } = states;

      const filterByStatus = nodes.filter(
        (s: WorkflowState) =>
          s.type === status ||
          s.name.toLowerCase().includes(status.toLowerCase()),
      );

      if (filterByStatus.length === 0) {
        console.warn(`Could not find state for status ${status} in team`);
        process.exit(1);
      }

      const statusChoices = filterByStatus.map((p: WorkflowState) => {
        return {
          name: `${p.name}`,
          value: p.id,
        };
      });

      const newStatusId =
        filterByStatus.length === 1
          ? filterByStatus[0].id
          : (
              await enquirer.prompt<{ statusId: string }>({
                type: "autocomplete",
                name: "statusId",
                message: "Narrow down status",
                choices: statusChoices,
              })
            ).statusId;

      updateData.stateId = newStatusId;
    }

    if (Object.keys(updateData).length === 0) {
      console.warn("Nothing to update");
      process.exit(1);
    }

    const apiIssue = await updateIssue(client, updateData);

    console.log(`Issue ${chalk.bold(apiIssue.identifier)} updated`);
    console.log(apiIssue.url);

    process.exit(0);
  },
});

export default edit;
