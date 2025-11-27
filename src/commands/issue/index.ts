import { Command } from "@cliffy/command";
import create from "./create.ts";
import edit from "./edit.ts";
import editMany from "./editMany.ts";
import list from "./list.ts";
import view from "./view.ts";

export const issue = new Command()
	.description("Individual issue management")
	.command("create", create)
	.command("view", view)
	.command("list", list)
	.command("edit", edit)
	.command("edit-many", editMany);
