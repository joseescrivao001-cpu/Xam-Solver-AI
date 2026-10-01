
const fs = require("fs");
let content = fs.readFileSync("src/app/api/admin/stats/route.ts", "utf-8");
content = content.replace(/modelDistribution: \[[\s\S]*?\]/, `modelDistribution: [
          { name: "Cerebras LLaMA 3.2 90B Vision (OCR/Imagens)", share: 55, color: "emerald" },
          { name: "Cerebras LLaMA 3.1 70B (Raciocínio Rápido)", share: 30, color: "violet" },
          { name: "Cerebras LLaMA 3.3 70B (Matemática Complexa)", share: 15, color: "indigo" }
        ]`);
fs.writeFileSync("src/app/api/admin/stats/route.ts", content);

