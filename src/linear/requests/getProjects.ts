import type { LinearClient, LinearDocument } from "@linear/sdk";
import * as z from "zod";
import { pageInfoFragment } from "./pageInfo.ts";
import { paginate } from "./paginate.ts";

export const LnrProject = z.object({
	id: z.string(),
	name: z.string(),
	slugId: z.string(),
	url: z.string().optional(),
	status: z.object({ name: z.string() }),
});

export type LnrProject = z.infer<typeof LnrProject>;

const getProjectsQuery = `
  query getProjects($filter: ProjectFilter!, $after: String) {
    projects(first: 250, filter: $filter, after: $after) {
      nodes {
        id
        name
        slugId
        url
        status {
          name
        }
      }

      pageInfo {
        ...PageInfoFragment
      }
    }
  }

  ${pageInfoFragment}
`;

// biome-ignore lint/suspicious/noExplicitAny: TODO
const extractProjectsPage = (response: any) => response.projects;

export async function getProjects(
	{ client }: LinearClient,

	searchParams: {
		ownProjectsOnly: boolean;
		name?: string;
		accessibleByTeamId?: string;
		freeformSearch?: string;
	},
): Promise<LnrProject[]> {
	const { ownProjectsOnly, name, accessibleByTeamId, freeformSearch } =
		searchParams;

	const contentFilter = freeformSearch
		? {
				searchableContent: {
					contains: freeformSearch,
				},
			}
		: {};

	const membersFilter = ownProjectsOnly
		? {
				members: {
					isMe: { eq: true },
				},
			}
		: {};

	const nameFilter = name
		? {
				name: {
					containsIgnoreCase: name,
				},
			}
		: {};

	const teamFilter = accessibleByTeamId
		? {
				accessibleTeams: {
					id: {
						eq: accessibleByTeamId,
					},
				},
			}
		: {};

	const query: LinearDocument.ProjectFilter = {
		...teamFilter,
		...membersFilter,
		...nameFilter,
		...contentFilter,
	};

	const resp = await paginate<
		LnrProject,
		{ filter: LinearDocument.ProjectFilter }
	>(client, getProjectsQuery, { filter: query }, extractProjectsPage);

	return z.array(LnrProject).parse(resp);
}
