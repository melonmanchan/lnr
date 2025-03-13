import * as z from "zod";
// import gql from "graphql-tag";

export const PageInfo = z.object({
  startCursor: z.string(),
  endCursor: z.string(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export type PageInfo = z.infer<typeof PageInfo>;

export const pageInfoFragment = `
  fragment PageInfoFragment on PageInfo {
    startCursor
    endCursor
    hasNextPage
    hasPreviousPage
  }
`;
