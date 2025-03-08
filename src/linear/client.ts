import process from "node:process";

import { LinearClient, type LinearClientOptions } from "@linear/sdk";

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const LINEAR_OAUTH_TOKEN = process.env.LINEAR_OAUTH_TOKEN;

const options: LinearClientOptions = {
  apiKey: LINEAR_API_KEY,
  accessToken: LINEAR_OAUTH_TOKEN,
};

const linearInitialized = () => {
  return options.apiKey || options.accessToken;
};

const getLinearClient = () => {
  if (!linearInitialized()) {
    return null;
  }

  const client = new LinearClient(options);

  return client;
};

export { getLinearClient, linearInitialized };
