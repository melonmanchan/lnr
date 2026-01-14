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
      projectMilestone {
      	targetDate
      	id
      	name
      }
      assignee {
        name
        displayName
      }
      project {
      	name
      	id
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
	project: z.object({
		name: z.string(),
		id: z.string(),
	}),

	projectMilestone: z
		.object({
			name: z.string(),
			id: z.string(),
			// TODO: better typing?
			targetDate: z.string().nullish(),
		})
		.nullish(),
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
	creators: string[],
): { creator: LinearDocument.UserFilter } => {
	return {
		creator: {
			or: creators.map((creator) => ({
				displayName: {
					containsIgnoreCase: creator,
				},
			})),
		},
	};
};

const getMilestoneFilter = (
	milestone: string,
): { projectMilestone: LinearDocument.ProjectMilestoneFilter } => {
	return {
		projectMilestone: {
			name: { containsIgnoreCase: milestone },
		},
	};
};

const getProjectFilter = (
	projects: string[],
): { project: LinearDocument.ProjectFilter } => {
	return {
		project: {
			or: projects.map((p) => ({
				name: { containsIgnoreCase: p },
			})),
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
	assignees: string[],
): { assignee: LinearDocument.UserFilter } => {
	return {
		assignee: {
			or: assignees.map((assignee) => ({
				displayName: {
					containsIgnoreCase: assignee,
				},
			})),
		},
	};
};

export async function getIssues(
	{ client }: LinearClient,

	searchParams: {
		issueStates: (IssueStatus | string)[];
		assignees: string[];
		creators: string[];
		projects: string[];
		teams: string[];
		labels: string[];

		cycle?: CycleState;
		milestone?: string;
		freeformSearch?: string;
	},
): Promise<LnrIssue[]> {
	const {
		issueStates,
		assignees,
		creators,
		cycle,
		projects,
		freeformSearch,
		teams,
		labels,
		milestone,
	} = searchParams;

	const { stateFilter, nameFilter } = getIssueStatusFilter(issueStates);

	const assigneeFilter =
		assignees.length > 0 ? getAssigneeFilter(assignees) : {};
	const teamFilter = teams.length > 0 ? getTeamFilter(teams) : {};
	const labelFilter = labels.length > 0 ? getLabelFilter(labels) : {};
	const creatorFilter = creators.length > 0 ? getCreatorFilter(creators) : {};
	const projectFilter = projects.length > 0 ? getProjectFilter(projects) : {};

	const cycleFilter = cycle ? getCycleFilter(cycle) : {};
	const contentFilter = freeformSearch ? getContentFilter(freeformSearch) : {};
	const milestoneFilter = milestone ? getMilestoneFilter(milestone) : {};

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
		...milestoneFilter,
	};

	const resp = await paginate<LnrIssue, { filter: LinearDocument.IssueFilter }>(
		client,
		getIssuesQuery,
		{ filter: query },
		extractIssuesPage,
	);

	return z.array(LnrIssue).parse(resp);
}
