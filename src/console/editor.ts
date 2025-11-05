import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function openTextEditor(editor: string): string {
	const randomHash = Math.random().toString(36).substring(2, 15);

	const fileName = `issue-description-${randomHash}.md`;

	const tmpFileName = path.join(os.tmpdir(), fileName);

	fs.writeFileSync(tmpFileName, "", "utf8");

	execSync(`${editor} "${tmpFileName}"`, { stdio: "inherit" });

	const finalContent = fs.readFileSync(tmpFileName, "utf8");
	return finalContent.trim();
}
