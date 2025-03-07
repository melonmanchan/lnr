import path from "path";
import os from "os";
import config from "../config";

export async function openTextEditor(initialContent = ""): Promise<string> {
  const randomHash = Math.random().toString(36).substring(2, 15);

  const fileName = `issue-description-${randomHash}.md`;

  const tmpFileName = path.join(os.tmpdir(), fileName);

  await Bun.write(tmpFileName, initialContent);

  const editor = config.EDITOR;

  const process = Bun.spawn({
    cmd: [editor, tmpFileName],
    stdout: "inherit",
    stdin: "inherit",
    stderr: "inherit",
  });

  await process.exited;

  const finalContent = await Bun.file(tmpFileName).text();

  return finalContent.trim();
}
