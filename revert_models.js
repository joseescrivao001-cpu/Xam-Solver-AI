
const fs = require("fs");
let code1 = fs.readFileSync("src/app/api/notebooks/ai-tool/route.ts", "utf8");
code1 = code1.replace(/"llama3\.1-70b"/g, "resolveModelId(\"gpt-oss-120b\")");
fs.writeFileSync("src/app/api/notebooks/ai-tool/route.ts", code1);

let code2 = fs.readFileSync("src/app/api/notebooks/analytics/route.ts", "utf8");
code2 = code2.replace(/"llama3\.1-70b"/g, "resolveModelId(\"gpt-oss-120b\")");
fs.writeFileSync("src/app/api/notebooks/analytics/route.ts", code2);

