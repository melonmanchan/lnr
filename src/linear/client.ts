import { LinearClient, type LinearClientOptions } from "@linear/sdk";

const getLinearClient = (apiKey: string) => {
	const options: LinearClientOptions = {
		apiKey,
	};

	const client = new LinearClient(options);

	return client;
};

export { getLinearClient };
