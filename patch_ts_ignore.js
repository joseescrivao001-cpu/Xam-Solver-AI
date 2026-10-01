
const fs = require("fs");
let content = fs.readFileSync("src/lib/pdf-renderer.ts", "utf-8");
content = content.replace("// @ts-ignore", "// @ts-expect-error");
fs.writeFileSync("src/lib/pdf-renderer.ts", content);

