
const fs = require("fs");
let code = fs.readFileSync("src/app/api/notebooks/analytics/route.ts", "utf-8");

code = code.replace(/\/\/ 6\. Chamar IA Gemini para gerar diagn.stico estruturado[\s\S]*?const textResponse = result\.response\.text\(\);/, `
    const resIA = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.CEREBRAS_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3.1-70b",
        messages: [{ role: "system", content: "Você é o Auditor Pedagógico de IA do ExamSolver AI..." }, { role: "user", content: promptPayload }],
        temperature: 0.2
      })
    });
    if (!resIA.ok) throw new Error("Erro Cerebras API");
    const resData = await resIA.json();
    const textResponse = resData.choices[0].message.content;
`);

fs.writeFileSync("src/app/api/notebooks/analytics/route.ts", code);

