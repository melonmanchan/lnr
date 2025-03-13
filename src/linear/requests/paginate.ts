import { LinearGraphQLClient } from "@linear/sdk";

import { PageInfo } from "./pageInfo.ts";

export async function paginate<T, V>(
  client: LinearGraphQLClient,
  query: string,
  variables: V,
  extractPage: (response: any) => {
    nodes: T[];
    pageInfo: PageInfo;
  },
): Promise<T[]> {
  const allItems: T[] = [];

  let after: string | undefined = undefined;

  while (true) {
    // Pass the "after" parameter into the query variables.
    const response = await client.request(query, { ...variables, after });

    const { nodes, pageInfo } = extractPage(response);

    allItems.push(...nodes);

    if (!pageInfo.hasNextPage) {
      break;
    }

    after = pageInfo.endCursor || undefined;
  }

  return allItems;
}
