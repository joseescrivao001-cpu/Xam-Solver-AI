
const fs = require("fs");
let code = fs.readFileSync("src/app/api/notebooks/ai-tool/route.ts", "utf-8");
code = code.replace(/return new Response\(res\.body\.pipeThrough\(transformStream\), \{/g, "if (!res.body) return new Response(JSON.stringify({ error: \"Sem resposta da IA.\" }), { status: 500 });\n    return new Response(res.body.pipeThrough(transformStream), {");
fs.writeFileSync("src/app/api/notebooks/ai-tool/route.ts", code);

