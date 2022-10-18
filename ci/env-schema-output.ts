import { config } from "../lib/environment";
const json2md = require("json2md");
const schema: any = config.getSchema();

const recurse = (parentKey: string | null, object: any): any => {
  if (object._cvtProperties) {
    return recurse(parentKey, object._cvtProperties);
  }
  if (!object.env && !object.doc) {
    return Object.entries(object).map(([key, obj]) =>
      recurse(`${parentKey ? parentKey + "." : ""}${key}`, obj)
    );
  }
  return { key: parentKey, ...object };
};

const result = recurse(null, schema)
  .flat(5)
  .sort(({ key: aKey }: any, { key: bKey }: any) => aKey.localeCompare(bKey));
const toTable = [
  {
    table: {
      headers: ["Environment Variable", "Description", "Options (**default**)"],
      rows: result.map((config: any) => [
        config.env,
        config.doc,
        Array.isArray(config.format)
          ? config.format
              .map((x: string) => (x === config.default ? `**${x}**` : x))
              .join(", ")
          : config.format,
      ]),
    },
  },
];

console.log(JSON.stringify(toTable, null, 4));

const md = json2md(toTable);

console.log(md);
