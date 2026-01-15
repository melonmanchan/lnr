import { subcommands } from "cmd-ts";

import list from "./list.ts";
import milestone from "./milestone/index.ts";
import view from "./view.ts";

export const project = subcommands({
	name: "project",
	description: "Linear project-related tasks",
	cmds: { list, view, milestone },
});
