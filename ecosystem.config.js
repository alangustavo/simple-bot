module.exports = {
  apps: [
    {
      name: "simple-bot",
      script: "ts-node",
      args: "src/index.ts",
      watch: true,
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
