import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import * as z from "zod";

const CONFIG_PATH = "~/.config/lnr/config.json";

function getConfigPath() {
	return CONFIG_PATH.replace("~", process.env.HOME || "");
}

export const ConfigSchemaV1 = z.object({
	version: z.literal(1),
	linearApiKey: z.string(),

	editor: z.preprocess((val) => {
		const envEditor = process.env.EDITOR;

		if (val === "$EDITOR" && envEditor) {
			return envEditor;
		}

		if (!val) {
			return null;
		}

		return val;
	}, z.string().nullable()),
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
	const configPath = getConfigPath();
	const fileData = await fs.readFile(configPath, "utf-8");
	const parsedData = JSON.parse(fileData);

	return ConfigSchemaV1.parse(parsedData);
}

export async function getConfig(): Promise<ConfigSchemaV1> {
	if (currentConfig === null) {
		currentConfig = await readConfig();
	}

	return currentConfig as ConfigSchemaV1;
}

export async function saveConfig(config: ConfigSchemaV1): Promise<string> {
	const configPath = getConfigPath();

	await fs.mkdir(path.dirname(configPath), { recursive: true });

	const fileData = JSON.stringify(config, null, 2);

	await fs.writeFile(configPath, fileData, "utf-8");

	return configPath;
}
