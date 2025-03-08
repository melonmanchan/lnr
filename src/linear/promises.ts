import client from "./client.ts";

// Hot promise is fired immediately upon app start since we need it pretty much everywhere
const self = client.viewer;

export { self };
