import type { LinearClient } from "@linear/sdk";
import * as z from "zod";

const updateIssueMutation = `
  mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue {
        identifier
        url
      }
    }
  }
`;

const IssueUpdateResponse = z.object({
	issueUpdate: z.object({
		issue: z.object({
			identifier: z.string(),
			url: z.string(),
		}),
	}),
});

type IssueUpdateResponse = z.infer<typeof IssueUpdateResponse>;

export type UpdateIssueData = {
	id: string;
	stateId?: string;
	assigneeId?: string;
	title?: string;
	description?: string;
	priority?: number;
};

export async function updateIssue(
	{ client }: LinearClient,
	updateData: UpdateIssueData,
): Promise<{ url: string; identifier: string }> {
	const { id, ...input } = updateData;

	const resp = await client.request(updateIssueMutation, {
		id,
		input,
	});

	return IssueUpdateResponse.parse(resp).issueUpdate.issue;
}
