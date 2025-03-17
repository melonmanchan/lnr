import type { LinearClient } from "@linear/sdk";
import type {
  IssueFilter,
  NullableCycleFilter,
} from "@linear/sdk/dist/_generated_documents.d.ts";
import * as z from "zod";
import type { CycleState, IssueStatus } from "../../types.ts";
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
  state: z.object({ name: z.string(), type: z.string() }),
  assignee: z.union([
    z.null(),
    z.object({ name: z.string(), displayName: z.string() }),
  ]),
  creator: z.object({ name: z.string(), displayName: z.string() }).nullish(),
});

export type LnrIssue = z.infer<typeof LnrIssue>;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const extractIssuesPage = (response: any) => response.issues;

const getCycleFilter = (cycle: CycleState): { cycle: NullableCycleFilter } => {
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

export async function getIssues(
  { client }: LinearClient,

  searchParams: {
    issueStates: IssueStatus[];
    assignee?: string;
    cycle?: CycleState;
    creator?: string;
    project?: string;
    freeformSearch?: string;
  },
): Promise<LnrIssue[]> {
  const { issueStates, assignee, creator, cycle, project, freeformSearch } =
    searchParams;

  const stateFilter =
    issueStates.length === 0
      ? { state: { type: { nin: ["completed", "canceled"] } } }
      : { state: { type: { in: issueStates } } };

  // TODO: This is really messy
  const assigneeFilter =
    assignee === "@me"
      ? project || freeformSearch || assignee === undefined
        ? {}
        : { assignee: { isMe: { eq: true } } }
      : { assignee: { displayName: { containsIgnoreCase: assignee } } };

  const creatorFilter = creator
    ? {
        creator: {
          displayName: {
            containsIgnoreCase: creator,
          },
        },
      }
    : {};

  const cycleFilter = cycle ? getCycleFilter(cycle) : {};

  const contentFilter = freeformSearch
    ? {
        searchableContent: {
          contains: freeformSearch,
        },
      }
    : {};

  const query: IssueFilter = {
    ...stateFilter,
    ...assigneeFilter,
    ...cycleFilter,
    ...contentFilter,
    ...creatorFilter,

    ...(project ? { project: { name: { containsIgnoreCase: project } } } : {}),
  };

  const resp = await paginate<LnrIssue, { filter: IssueFilter }>(
    client,
    getIssuesQuery,
    { filter: query },
    extractIssuesPage,
  );

  return z.array(LnrIssue).parse(resp);
}
