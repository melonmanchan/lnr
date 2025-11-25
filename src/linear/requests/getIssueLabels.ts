import type { LinearClient, LinearDocument } from "@linear/sdk";
import * as z from "zod";
import { pageInfoFragment } from "./pageInfo.ts";
import { paginate } from "./paginate.ts";

const getIssueLabelsQuery = `query GetIssueLabels($filter: IssueLabelFilter, $after: String)
	{
	  issueLabels(first: 250, filter: $filter, after: $after) {
	    nodes {
	      id,
	      name
	    }

	    pageInfo {
	    ...PageInfoFragment
	    }
	  }
	}
  ${pageInfoFragment}
`;

const LnrIssueLabel = z.object({
	id: z.string(),
	name: z.string(),
});

export type LnrIssueLabel = z.infer<typeof LnrIssueLabel>;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const extractIssuesPage = (response: any) => response.issueLabels;

export async function getIssueLabels(
	{ client }: LinearClient,
	filter: LinearDocument.IssueLabelFilter,
): Promise<LnrIssueLabel[]> {
	const resp = await paginate<
		LnrIssueLabel,
		{ filter: LinearDocument.IssueLabelFilter }
	>(client, getIssueLabelsQuery, { filter }, extractIssuesPage);

	return z.array(LnrIssueLabel).parse(resp);
}
