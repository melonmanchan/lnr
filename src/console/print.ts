import Table from "cli-table3";

export function printTable(values: any[]) {
  // Filter out keys that begin with "_"
  const keys = Object.keys(values[0]).filter((key) => !key.startsWith("_"));

  const table = new Table({
    head: keys,
    truncate: "true",

    chars: {
      top: "",
      "top-mid": "",
      "top-left": "",
      "top-right": "",
      bottom: "",
      "bottom-mid": "",
      "bottom-left": "",
      "bottom-right": "",
      left: "",
      "left-mid": "",
      mid: "",
      "mid-mid": "",
      right: "",
      "right-mid": "",
      middle: " ",
    },

    style: { "padding-left": 0, "padding-right": 0 },
  });

  for (const value of values) {
    table.push([
      ...keys.map((key) => {
        return value[key];
      }),
    ]);
  }

  console.log(table.toString());
}
