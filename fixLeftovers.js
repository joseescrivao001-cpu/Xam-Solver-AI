
const fs = require("fs");

// Fix 1: dashboard page footer
let dash = fs.readFileSync("src/app/dashboard/page.tsx", "utf-8");
dash = dash.replace(/Alimentado por Agent Router & Gemini/g, "Alimentado por Roteador Neural & Cerebras LPU");
fs.writeFileSync("src/app/dashboard/page.tsx", dash);

// Fix 2: Admin stats dummy data
let stats = fs.readFileSync("src/app/api/admin/stats/route.ts", "utf-8");
stats = stats.replace(/Gemini 1\.5 Flash \(Instant[^)]+\)/g, "Cerebras Qwen 2.5 (Análise Visual)");
stats = stats.replace(/Gemini 1\.5 Pro \(Racioc[^)]+\)/g, "Cerebras LLaMA 3.1 70B (Raciocínio)");
fs.writeFileSync("src/app/api/admin/stats/route.ts", stats);

// Fix 3: notebooks analytics
let analytics = fs.readFileSync("src/app/api/notebooks/analytics/route.ts", "utf-8");
analytics = analytics.replace(/import \{ GoogleGenerativeAI \} from "@google\/generative-ai";\s*const genAI = new GoogleGenerativeAI\(process\.env\.GOOGLE_GEMINI_API_KEY!\);\s*/, "");
analytics = analytics.replace(/const result = await genAI\.getGenerativeModel\(\{[\s\S]*?\}\)\.generateContent\([^)]+\);[\s\S]*?const textResponse = result\.response\.text\(\);/g, `
    const resIA = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.CEREBRAS_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3.1-70b",
        messages: [{ role: "system", content: "Você é o Analista Cognitivo..." }, { role: "user", content: promptPayload }],
        temperature: 0.2
      })
    });
    if (!resIA.ok) throw new Error("Erro Cerebras API");
    const resData = await resIA.json();
    const textResponse = resData.choices[0].message.content;
`);
fs.writeFileSync("src/app/api/notebooks/analytics/route.ts", analytics);


