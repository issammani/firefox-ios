const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 5678; // Probably should get from CI environment
const assetsDir = path.join(__dirname, "assets");

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not Found");
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const typeMap = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    default: "text/plain",
  };
  const requestedPath = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.join(assetsDir, requestedPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = typeMap[ext] || typeMap["default"];
  serveFile(res, filePath, contentType);
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on("SIGTERM", () => {
  server.close(() => {
    console.log("Server closed gracefully");
    process.exit(0);
  });
});
