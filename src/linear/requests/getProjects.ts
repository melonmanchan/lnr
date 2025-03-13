import * as z from "zod";
import gql from "graphql-tag";
import { LinearClient } from "@linear/sdk";
import { ProjectFilter } from "@linear/sdk/dist/_generated_documents.d.ts";

import { paginate } from "./paginate.ts";

import { pageInfoFragment, PageInfo } from "./utils.ts";

export const Project = z.object({
  name: z.string(),
  status: z.object({ name: z.string() }),
});

export type Project = z.infer<typeof Project>;

const ProjectsResponse = z.object({
  nodes: z.array(Project),
  pageInfo: PageInfo,
});

type ProjectsResponse = z.infer<typeof ProjectsResponse>;

const getProjectsQuery = gql`
  query getProjects($filter: ProjectFilter!, $after: String) {
    projects(first: 250, filter: $filter, after: $after) {
      nodes {
        name
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
  ownProjectsOnly: boolean,
): Promise<Project[]> {
  const membersFilter = ownProjectsOnly
    ? {}
    : {
        members: {
          isMe: { eq: true },
        },
      };

  const query: ProjectFilter = {
    ...membersFilter,
  };

  const resp = await paginate<ProjectsResponse, { filter: ProjectFilter }>(
    client,
    getProjectsQuery,
    { filter: query },
    extractProjectsPage,
  );

  return z.array(Project).parse(resp);
}
