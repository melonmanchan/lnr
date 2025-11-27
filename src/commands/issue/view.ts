import { Command } from "@cliffy/command";
import open from "open";
import { getConfig } from "../../config/config.ts";
import { getLinearClient } from "../../linear/client.ts";

export default new Command()
	.description("View an individual issue")
	.arguments("<issueId:string>")
	.option("-w, --web", "View issue in web/native app", { default: false })
	.action(async ({ web }, issueId: string) => {
		const config = await getConfig();
		const client = getLinearClient(config.linearApiKey);
		const me = await client.viewer;

		const [org, apiIssue] = await Promise.all([
			me.organization,
			client.issue(issueId).catch(() => null),
		]);

		if (!apiIssue) {
			console.warn("Issue not found!");
			Deno.exit(1);
		}

		const url = `https://linear.app/${org.urlKey}/issue/${apiIssue.identifier}`;

		console.log(`Opening issue ${url}...`);

		open(url);

		Deno.exit(0);
	});
