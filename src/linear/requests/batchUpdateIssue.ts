import type { LinearClient, LinearDocument } from "@linear/sdk";
import * as z from "zod";

const batchUpdateIssueMutation = `
	mutation($ids: [UUID!]!, $input: IssueUpdateInput!) {
	 issueBatchUpdate(ids: $ids, input: $input) {
	       success
	 }
	}
`;

const BatchIssueUpdateResponse = z.object({
	issueBatchUpdate: z.object({
		success: z.boolean(),
	}),
});

type IssueUpdateResponse = z.infer<typeof BatchIssueUpdateResponse>;

export type BatchUpdateIssueData = {
	ids: string[];
	input: LinearDocument.IssueUpdateInput;
};

export async function updateIssue(
	{ client }: LinearClient,
	updateData: BatchUpdateIssueData,
): Promise<boolean> {
	const { ids, ...input } = updateData;

	const resp = await client.request(batchUpdateIssueMutation, {
		ids,
		input,
	});

	const parsed: IssueUpdateResponse = BatchIssueUpdateResponse.parse(resp);

	return parsed.issueBatchUpdate.success;
}
