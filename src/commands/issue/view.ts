import process from "node:process";
import { boolean, command, flag, positional, string } from "cmd-ts";
import open from "open";
import { getConfig } from "../../config/config.ts";
import { getLinearClient } from "../../linear/client.ts";

const view = command({
	name: "view",
	description: "View an individual issue",
	args: {
		issue: positional({
			type: string,
			displayName: "issueIdentifier",
			description: "Issue identifier",
		}),
		web: flag({
			type: boolean,
			long: "web",
			short: "w",
			description: "View issue in web/native app",
		}),
	},

	handler: async ({ issue, web }) => {
		const config = await getConfig();
		const client = getLinearClient(config.linearApiKey);
		const me = await client.viewer;

		const [org, apiIssue] = await Promise.all([
			me.organization,
			client.issue(issue).catch(() => null),
		]);

		if (!apiIssue) {
			console.warn("Issue not found!");
			process.exit(1);
		}

		const url = `https://linear.app/${org.urlKey}/issue/${apiIssue.identifier}`;

		console.log(`Opening issue ${url}...`);

		open(url);

		process.exit(0);
	},
});

export default view;
