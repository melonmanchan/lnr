import { subcommands } from "cmd-ts";

import edit from "./edit.ts";
import editMany from "./editMany.ts";
import list from "./list.ts";

export const milestone = subcommands({
	name: "milestone",
	description: "Project milestone management",
	cmds: { list, edit, "edit-many": editMany },
});

export default milestone;
