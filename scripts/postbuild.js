const fs = require("fs");
const path = require("path");

const source = path.join(__dirname, "..", "public", "_redirects");
const destination = path.join(__dirname, "..", "build", "_redirects");

fs.copyFileSync(source, destination);
console.log("✅ _redirects copié dans /build");