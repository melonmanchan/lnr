import { subcommands } from "cmd-ts";
import create from "./create.ts";
import edit from "./edit.ts";
import list from "./list.ts";
import view from "./view.ts";

export const issue = subcommands({
  name: "issue",
  description: "Invidividal issue management",
  cmds: { create, view, list, edit },
});
