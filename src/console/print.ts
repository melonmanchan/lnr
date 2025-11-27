import { Table } from "@cliffy/table";
import type { OutputFormat } from "../types.ts";

// biome-ignore lint/suspicious/noExplicitAny: This function handles generic data for printing.
export function printTable(values: any[]) {
	if (!values || values.length === 0) {
		return;
	}

	const keys = Object.keys(values[0])
		.filter((key) => !key.startsWith("_"))
		.filter((key) => {
			return values.some((row) => row[key] !== null && row[key] !== undefined);
		});

	const table = new Table()
		.header(keys)
		.body(values.map((value) => keys.map((key) => value[key])))
		.padding(1)
		.indent(2)
		.border(true);

	console.log(table.toString());
}

export function printOutput(values: any[], format: OutputFormat) {
	const safeValues = values ?? [];

	if (format === "json") {
		console.log(JSON.stringify(safeValues, null, 2));
		return;
	}

	printTable(safeValues);
}
