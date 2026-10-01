
const fs = require("fs");
let content = fs.readFileSync("src/app/api/notebooks/analytics/route.ts", "utf-8");
content = content.replace("model: resolveModelId(\"llama3.1-70b\")", "model: resolveModelId(\"gpt-oss-120b\")");
fs.writeFileSync("src/app/api/notebooks/analytics/route.ts", content);

