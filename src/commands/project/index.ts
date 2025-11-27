import { Command } from "@cliffy/command";

import list from "./list.ts";
import view from "./view.ts";

export const project = new Command()
	.description("Linear project-related tasks")
	.command("list", list)
	.command("view", view);
