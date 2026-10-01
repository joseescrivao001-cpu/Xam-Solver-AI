
const fs = require("fs");
let content = fs.readFileSync("src/components/pricing-modal.tsx", "utf-8");
content = content.replace(/Motor IA Groq Ultra-Rápido & Gemini Flash/g, "Motor IA Cerebras de Ultra-Baixa Latência");
content = content.replace(/Motor IA Groq Ultra-Rpido & Gemini Flash/g, "Motor IA Cerebras de Ultra-Baixa Latência");
content = content.replace(/<strong>Cluster Completo: Gemini 1\.5 Pro \+ LLaMA 3\.3 \+ Groq<\/strong>/g, "<strong>Cluster Completo: Cerebras LLaMA 3.1 70B + Vision</strong>");
fs.writeFileSync("src/components/pricing-modal.tsx", content);

