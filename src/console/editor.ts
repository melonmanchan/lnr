import path from "path";
import os from "os";
import config from "../config";
import fs from "fs";
import { execSync } from "child_process";

export async function openTextEditor(initialContent = ""): Promise<string> {
  const randomHash = Math.random().toString(36).substring(2, 15);

  const fileName = `issue-description-${randomHash}.md`;

  const tmpFileName = path.join(os.tmpdir(), fileName);

  fs.writeFileSync(tmpFileName, initialContent, "utf8");

  const editor = config.EDITOR;

  execSync(`${editor} "${tmpFileName}"`, { stdio: "inherit" });

  const finalContent = fs.readFileSync(tmpFileName, "utf8");
  return finalContent.trim();
}
