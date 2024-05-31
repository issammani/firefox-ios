const { defineConfig } = require("@playwright/test");

module.exports = {
  projects: [
    {
      name: "WebKit",
      use: { browserName: "webkit" },
    },
  ],
};
