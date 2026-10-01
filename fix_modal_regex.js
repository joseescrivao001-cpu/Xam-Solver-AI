
const fs = require("fs");
let content = fs.readFileSync("src/components/pricing-modal.tsx", "utf-8");
content = content.replace(/Motor IA Groq Ultra-R[^&]*& Gemini Flash/g, "Cerebras LLaMA 3.1 70B");
content = content.replace(/<strong>Cluster Completo: Gemini 1\.5 Pro \+ LLaMA 3\.3 \+ Groq<\/strong>/g, "<strong>Cluster Completo: Cerebras LLaMA 3.1 70B & Qwen Vision</strong>");
fs.writeFileSync("src/components/pricing-modal.tsx", content);

