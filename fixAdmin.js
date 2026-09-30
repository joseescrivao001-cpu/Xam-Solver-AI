
const fs = require("fs");
let code = fs.readFileSync("src/components/admin/admin-command-center.tsx", "utf-8");

code = code.replace(/Uso equilibrado entre Google[\s\S]*?Groq Nuclear\./, "Motor de Inferência Neural operado nativamente pela Cerebras AI (Modelos open-source de altíssima velocidade).");
code = code.replace(/Gemini 1\.5 Flash[\s\S]*?\)/, "Cerebras Qwen 3.8 27B (Análise Visual e Estrutural)");
code = code.replace(/Gemini 1\.5 Pro[\s\S]*?\)/, "Cerebras LLaMA 3.1 70B (Raciocínio Profundo)");
code = code.replace(/Meta LLaMA 3\.3 \(Groq Nuclear\)/, "Cerebras GPT-OSS 120B (Velocidade Extrema)");
code = code.replace(/failover para Groq/g, "desempenho da API");

fs.writeFileSync("src/components/admin/admin-command-center.tsx", code);

