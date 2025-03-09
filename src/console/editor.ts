import path from "node:path";
import os from "node:os";
// import config from "../config.ts";
import fs from "node:fs";
import { execSync } from "node:child_process";

export function openTextEditor(editor: string): string {
  const randomHash = Math.random().toString(36).substring(2, 15);

  const fileName = `issue-description-${randomHash}.md`;

  const tmpFileName = path.join(os.tmpdir(), fileName);

  fs.writeFileSync(tmpFileName, "", "utf8");

  execSync(`${editor} "${tmpFileName}"`, { stdio: "inherit" });

  const finalContent = fs.readFileSync(tmpFileName, "utf8");
  return finalContent.trim();
}
