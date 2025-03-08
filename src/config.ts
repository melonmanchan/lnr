import process from "node:process";

const config = {
  EDITOR: process.env.EDITOR || "vim",
};

export default config;
