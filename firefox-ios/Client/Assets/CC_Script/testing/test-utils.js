const fs = require("fs");
const path = require("path");

const getTestAssets = (extensions = [".html"]) => {
  const assetsDirectory = path.join(__dirname, "assets");
  const files = fs.readdirSync(assetsDirectory);

  return files
    .filter((file) => extensions.includes(path.extname(file)))
    .map((file) => ({
      name: path.parse(file).name,
      path: path.parse(file).base,
    }));
};

// Need to get the port from the CI environment
const getFileUrl = (path) => `http://localhost:5678/${path}`;

module.exports = { getTestAssets, getFileUrl };
