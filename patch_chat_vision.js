
const fs = require("fs");
let content = fs.readFileSync("src/app/api/chat/route.ts", "utf-8");

content = content.replace("const cerebrasModel = resolveModelId(targetModel);", "let cerebrasModel = resolveModelId(targetModel);\n    if (imageUrl) {\n      cerebrasModel = \"llama3.2-90b-vision-instruct\";\n    }");
fs.writeFileSync("src/app/api/chat/route.ts", content);

