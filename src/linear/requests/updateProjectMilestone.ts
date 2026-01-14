import type { LinearClient } from "@linear/sdk";
import * as z from "zod";

const updateProjectMilestoneMutation = `
  mutation ProjectMilestoneUpdate($id: String!, $input: ProjectMilestoneUpdateInput!) {
    projectMilestoneUpdate(id: $id, input: $input) {
      success
      projectMilestone {
        id
        name
        targetDate
      }
    }
  }
`;

const ProjectMilestoneUpdateResponse = z.object({
	projectMilestoneUpdate: z.object({
		projectMilestone: z.object({
			id: z.string(),
			name: z.string(),
			targetDate: z.string().nullable(),
		}),
	}),
});

type ProjectMilestoneUpdateResponse = z.infer<
	typeof ProjectMilestoneUpdateResponse
>;

export type UpdateProjectMilestoneData = {
	id: string;
	targetDate?: string;
	name?: string;
	description?: string;
};

export async function updateProjectMilestone(
	{ client }: LinearClient,
	updateData: UpdateProjectMilestoneData,
): Promise<{
	id: string;
	name: string;
	targetDate: string | null | undefined;
}> {
	const { id, ...input } = updateData;

	const resp = await client.request(updateProjectMilestoneMutation, {
		id,
		input,
	});

	const parsed: ProjectMilestoneUpdateResponse =
		ProjectMilestoneUpdateResponse.parse(resp);

	return parsed.projectMilestoneUpdate.projectMilestone;
}
