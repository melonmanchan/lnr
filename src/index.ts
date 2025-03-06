import { command, run, string, positional } from "cmd-ts";

const app = command({
  name: "my-first-app",
  args: {
    someArg: positional({ type: string, displayName: "some arg" }),
  },
  handler: ({ someArg }) => {
    console.log({ someArg });
  },
});

run(app, process.argv.slice(2));
