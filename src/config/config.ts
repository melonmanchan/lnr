import fs from "node:fs/promises";
import process from "node:process";
import * as z from "zod";
import path from "node:path";

const CONFIG_PATH = "~/.config/lr/config.json";

function getConfigPath() {
  return CONFIG_PATH.replace("~", process.env.HOME || "");
}

export const ConfigSchemaV1 = z.object({
  version: z.literal(1),
  linearApiKey: z.string(),

  editor: z.preprocess((val) => {
    if (val) {
      return val;
    }

    const envEditor = process.env.EDITOR;

    if (!envEditor) {
      throw new Error(
        "Editor is not provided in the config and $EDITOR is not set.",
      );
    }

    return envEditor;
  }, z.string()),
});

let currentConfig: ConfigSchemaV1 | null = null;

export type ConfigSchemaV1 = z.infer<typeof ConfigSchemaV1>;

export async function configExists(): Promise<boolean> {
  const configPath = getConfigPath();

  try {
    await fs.stat(configPath);
    return true;
  } catch {
    return false;
  }
}

async function readConfig(): Promise<ConfigSchemaV1 | null> {
  try {
    const configPath = getConfigPath();
    const fileData = await fs.readFile(configPath, "utf-8");
    const parsedData = JSON.parse(fileData);

    return ConfigSchemaV1.parse(parsedData);
  } catch (error) {
    throw error;
  }
}

export async function getConfig(): Promise<ConfigSchemaV1> {
  if (currentConfig === null) {
    currentConfig = await readConfig();
  }

  return currentConfig as ConfigSchemaV1;
}

export async function saveConfig(config: ConfigSchemaV1): Promise<void> {
  try {
    const configPath = getConfigPath();

    await fs.mkdir(path.dirname(configPath), { recursive: true });

    const fileData = JSON.stringify(config, null, 2);

    await fs.writeFile(configPath, fileData, "utf-8");
  } catch (error) {
    throw error;
  }
}
