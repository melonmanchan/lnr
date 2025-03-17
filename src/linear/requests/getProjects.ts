import * as z from "zod";
import { LinearClient } from "@linear/sdk";
import { ProjectFilter } from "@linear/sdk/dist/_generated_documents.d.ts";

import { paginate } from "./paginate.ts";

import { pageInfoFragment } from "./pageInfo.ts";

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

  const query: ProjectFilter = {
    ...teamFilter,
    ...membersFilter,
    ...nameFilter,
    ...contentFilter,
  };

  const resp = await paginate<LnrProject, { filter: ProjectFilter }>(
    client,
    getProjectsQuery,
    { filter: query },
    extractProjectsPage,
  );

  return z.array(LnrProject).parse(resp);
}
