
const fs = require("fs");
let content = fs.readFileSync("src/app/api/solve/route.ts", "utf-8");

content = content.replace("const cerebrasModel = resolveModelId(\"llama3.1-70b\");", "let cerebrasModel = resolveModelId(\"llama3.1-70b\");\n    if (imageUrl) cerebrasModel = \"llama3.2-90b-vision-instruct\";");
fs.writeFileSync("src/app/api/solve/route.ts", content);

