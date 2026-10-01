
const fs = require("fs");

function replaceInFile(path) {
  let content = fs.readFileSync(path, "utf-8");
  content = content.replace(/llama3\.2-90b-vision-instruct/g, "qwen-3.8-27b");
  content = content.replace(/llama3\.1-70b/g, "gpt-oss-120b");
  fs.writeFileSync(path, content);
}

replaceInFile("src/app/api/chat/route.ts");
replaceInFile("src/app/api/solve/route.ts");
replaceInFile("src/app/api/notebooks/materials/route.ts");
replaceInFile("src/app/api/admin/stats/route.ts");

