import Table from "cli-table3";

export function printTable(values: any[]) {
  const keys = Object.keys(values[0]);

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

  // table.push([
  //   ...keys.map(() => {
  //     return " ";
  //   }),
  // ]);

  for (const value of values) {
    table.push([
      ...keys.map((key) => {
        return value[key];
      }),
    ]);
  }

  console.log(table.toString());
}
