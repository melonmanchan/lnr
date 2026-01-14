import type { LinearClient } from "@linear/sdk";
import * as z from "zod";
import { pageInfoFragment } from "./pageInfo.ts";
import { paginate } from "./paginate.ts";

export const LnrProjectMilestone = z.object({
	id: z.string(),
	name: z.string(),
	targetDate: z.string().nullish(),
	sortOrder: z.number(),
	description: z.string().nullish(),
});

export type LnrProjectMilestone = z.infer<typeof LnrProjectMilestone>;

const getProjectMilestonesQuery = `
  query getProjectMilestones($projectId: String!, $after: String) {
    project(id: $projectId) {
      projectMilestones(first: 250, after: $after) {
        nodes {
          id
          name
          targetDate
          sortOrder
          description
        }

        pageInfo {
          ...PageInfoFragment
        }
      }
    }
  }

  ${pageInfoFragment}
`;

// biome-ignore lint/suspicious/noExplicitAny: TODO
const extractMilestonesPage = (response: any) =>
	response.project?.projectMilestones;

export async function getProjectMilestones(
	{ client }: LinearClient,
	projectId: string,
): Promise<LnrProjectMilestone[]> {
	const resp = await paginate<LnrProjectMilestone, { projectId: string }>(
		client,
		getProjectMilestonesQuery,
		{ projectId },
		extractMilestonesPage,
	);

	return z.array(LnrProjectMilestone).parse(resp);
}
