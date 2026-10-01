const fs = require("fs");
function fix(file, isChat) {
  let content = fs.readFileSync(file, "utf-8");
  if (!content.includes("resolveModelId")) {
    content = "import { resolveModelId } from \"@/lib/models\";\n" + content;
  } else if (isChat) {
    content = content.replace(/function resolveModelId\(model: string\): string \{[\s\S]*?return 'gpt-oss-120b'; \/\/ Fallback final\s*\}/, "");
    if (!content.includes("import { resolveModelId }")) {
      content = "import { resolveModelId } from \"@/lib/models\";\n" + content;
    }
  }
  content = content.replace(/const cerebrasModel = \(imageUrl && !isPdf\) \? 'qwen-3\.8-27b' : resolveModelId\(targetModel\);/g, "const cerebrasModel = resolveModelId(targetModel);");
  content = content.replace(/const cerebrasModel = \(imageUrl && !isPdf\) \? 'qwen-3\.8-27b' : 'llama3\.1-70b';/g, "const cerebrasModel = resolveModelId(\"llama3.1-70b\");");
  content = content.replace(/model: "llama3\.1-70b",/g, "model: resolveModelId(\"llama3.1-70b\"),");
  fs.writeFileSync(file, content);
}
fix("src/app/api/chat/route.ts", true);
fix("src/app/api/solve/route.ts", false);
fix("src/app/api/notebooks/ai-tool/route.ts", false);
fix("src/app/api/notebooks/analytics/route.ts", false);
fix("src/app/api/system-check-ai/route.ts", true);
