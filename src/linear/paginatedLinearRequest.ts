import { Connection, LinearFetch } from "@linear/sdk";

const DEFAULT_LIMIT = 50;

export async function paginatedLinearRequest<T, U>(
  fetchFn: (variables: U) => LinearFetch<Connection<T>>,
  variables: U,
): Promise<T[]> {
  const results: T[] = [];

  const withLimit = {
    first: DEFAULT_LIMIT,
    ...variables,
  };

  let response = await fetchFn(withLimit);

  results.push(...response.nodes);

  while (response.pageInfo.hasNextPage && response.pageInfo.endCursor) {
    response = await fetchFn({
      ...withLimit,
      after: response.pageInfo.endCursor,
    });
    results.push(...response.nodes);
  }

  return results;
}
