import type { LinearClient, LinearDocument } from "@linear/sdk";
import * as z from "zod";
import {
	type CycleState,
	type IssueStatus,
	issueStatuses,
} from "../../types.ts";
import { pageInfoFragment } from "./pageInfo.ts";
import { paginate } from "./paginate.ts";

const getIssuesQuery = `query GetIssues($filter: IssueFilter!, $after: String) {
  issues(first: 250, filter: $filter, after: $after) {
    nodes {
      id
      identifier
      title
      state {
        name
        type
        color
      }
      assignee {
        name
        displayName
      }
      creator {
        name
        displayName
      }
    }
    pageInfo {
    ...PageInfoFragment
    }
  }
}

  ${pageInfoFragment}
`;

const LnrIssue = z.object({
	id: z.string(),
	identifier: z.string(),
	title: z.string(),
	state: z.object({ name: z.string(), type: z.string(), color: z.string() }),
	assignee: z.union([
		z.null(),
		z.object({ name: z.string(), displayName: z.string() }),
	]),
	creator: z.object({ name: z.string(), displayName: z.string() }).nullish(),
});

export type LnrIssue = z.infer<typeof LnrIssue>;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const extractIssuesPage = (response: any) => response.issues;

const getCycleFilter = (
	cycle: CycleState,
): { cycle: LinearDocument.NullableCycleFilter } => {
	switch (cycle) {
		case "active":
			return { cycle: { isActive: { eq: true } } };
		case "previous":
			return { cycle: { isNext: { eq: true } } };
		case "next":
			return { cycle: { isPrevious: { eq: true } } };

		default:
			return { cycle: {} };
	}
};

const getIssueStatusFilter = (issueStates: (IssueStatus | string)[]) => {
	const validIssueTypes: IssueStatus[] = issueStates.filter((s) =>
		issueStatuses.includes(s),
	);

	const issueNameFilters = issueStates.filter(
		(s) => !issueStatuses.includes(s),
	);

	const stateFilter =
		validIssueTypes.length === 0
			? { state: { type: { nin: ["completed", "canceled"] } } }
			: { state: { type: { in: issueStates } } };

	const nameFilter =
		issueNameFilters.length === 0
			? {}
			: {
					or: issueNameFilters.map((name) => ({
						state: {
							name: { containsIgnoreCase: name },
						},
					})),
				};

	return {
		stateFilter,
		nameFilter,
	};
};

const getLabelFilter = (
	labels: string[],
): { labels: LinearDocument.IssueLabelCollectionFilter } => {
	return {
		labels: {
			some: {
				or: labels.map((label) => ({
					name: { containsIgnoreCase: label },
				})),
			},
		},
	};
};

const getContentFilter = (
	query: string,
): { searchableContent: LinearDocument.ContentComparator } => {
	return {
		searchableContent: {
			contains: query,
		},
	};
};

const getCreatorFilter = (
	creator: string,
): { creator: LinearDocument.UserFilter } => {
	return {
		creator: {
			displayName: {
				containsIgnoreCase: creator,
			},
		},
	};
};

const getProjectFilter = (
	project: string,
): { project: LinearDocument.ProjectFilter } => {
	return {
		project: {
			name: {
				containsIgnoreCase: project,
			},
		},
	};
};

const getTeamFilter = (team: string[]): { team: LinearDocument.TeamFilter } => {
	return {
		team: {
			or: team.map((t) => ({
				name: { containsIgnoreCase: t },
			})),
		},
	};
};

const getAssigneeFilter = (
	assignee: string,
): { assignee: LinearDocument.UserFilter } => {
	if (assignee === "@me") {
		return {
			assignee: {
				isMe: {
					eq: true,
				},
			},
		};
	}

	return {
		assignee: {
			displayName: {
				containsIgnoreCase: assignee,
			},
		},
	};
};

export async function getIssues(
	{ client }: LinearClient,

	searchParams: {
		issueStates: (IssueStatus | string)[];
		assignee?: string;
		cycle?: CycleState;
		creator?: string;
		project?: string;
		freeformSearch?: string;
		team: string[];
		label: string[];
	},
): Promise<LnrIssue[]> {
	const {
		issueStates,
		assignee,
		creator,
		cycle,
		project,
		freeformSearch,
		team,
		label,
	} = searchParams;

	const { stateFilter, nameFilter } = getIssueStatusFilter(issueStates);
	const assigneeFilter = assignee ? getAssigneeFilter(assignee) : {};

	const teamFilter = team.length > 0 ? getTeamFilter(team) : {};
	const labelFilter = label.length > 0 ? getLabelFilter(label) : {};

	const cycleFilter = cycle ? getCycleFilter(cycle) : {};
	const contentFilter = freeformSearch ? getContentFilter(freeformSearch) : {};
	const creatorFilter = creator ? getCreatorFilter(creator) : {};
	const projectFilter = project ? getProjectFilter(project) : {};

	const query: LinearDocument.IssueFilter = {
		...stateFilter,
		...nameFilter,
		...assigneeFilter,
		...cycleFilter,
		...contentFilter,
		...creatorFilter,
		...labelFilter,
		...projectFilter,
		...teamFilter,
	};

	const resp = await paginate<LnrIssue, { filter: LinearDocument.IssueFilter }>(
		client,
		getIssuesQuery,
		{ filter: query },
		extractIssuesPage,
	);

	return z.array(LnrIssue).parse(resp);
}
