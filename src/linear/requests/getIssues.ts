import * as z from "zod";
import { LinearClient } from "@linear/sdk";
import { paginate } from "./paginate.ts";
import { pageInfoFragment } from "./pageInfo.ts";
import {
  IssueFilter,
  NullableCycleFilter,
} from "@linear/sdk/dist/_generated_documents.d.ts";
import { CycleState, IssueState } from "../../types.ts";

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
  issueStates: IssueState[],
  assignee: string,
  cycle?: CycleState,
  project?: string,
  freeformSearch?: string,
): Promise<LnrIssue[]> {
  const stateFilter =
    issueStates.length === 0
      ? { state: { type: { nin: ["completed", "canceled"] } } }
      : { state: { type: { in: issueStates } } };

  const assigneeFilter =
    assignee === "@me"
      ? project
        ? {}
        : { assignee: { isMe: { eq: true } } }
      : { assignee: { displayName: { containsIgnoreCase: assignee } } };

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
