import { subcommands } from "cmd-ts";

import list from "./list.ts";
import view from "./view.ts";

export const project = subcommands({
	name: "project",
	description: "Linear project-related tasks",
	cmds: { list, view },
});
