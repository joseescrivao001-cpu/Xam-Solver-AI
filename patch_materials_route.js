
const fs = require("fs");
let content = fs.readFileSync("src/app/api/notebooks/materials/route.ts", "utf-8");

const startIndex = content.indexOf("let finalExtractedText = extracted_text?.trim() || null;");
const endIndex = content.indexOf("const { data: material, error } = await db");

if (startIndex !== -1 && endIndex !== -1) {
  const newLogic = `let finalExtractedText = extracted_text?.trim() || null;
    
    // OCR VISÃO AVANÇADA (Para Imagens ou PDFs renderizados no cliente)
    if (file_url && file_url.startsWith("data:image/") && !finalExtractedText) {
      try {
        const apiKey = process.env.CEREBRAS_API_KEY;
        if (apiKey) {
          const ocrRes = await fetch("https://api.cerebras.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": \`Bearer \${apiKey.trim()}\`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "llama3.2-90b-vision-instruct",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: "Você é um extrator de OCR cirúrgico. Extraia absolutamente todo o texto, tabelas, fórmulas matemáticas e equações presentes nesta imagem. Mantenha a estrutura original, transcreva gráficos e preserve matrizes matematicamente corretas." },
                    { type: "image_url", image_url: { url: file_url } }
                  ]
                }
              ],
              stream: false,
              temperature: 0.1
            })
          });
          
          if (ocrRes.ok) {
            const ocrJson = await ocrRes.json();
            const text = ocrJson.choices?.[0]?.message?.content?.trim();
            if (text && text.length > 5) {
              finalExtractedText = text;
            }
          } else {
             console.error("[OCR_ERROR]", await ocrRes.text());
          }
        }
      } catch (err) {
        console.error("[OCR_FATAL]", err);
      }
    }
    
    `;
    
  content = content.substring(0, startIndex) + newLogic + content.substring(endIndex);
  fs.writeFileSync("src/app/api/notebooks/materials/route.ts", content);
  console.log("REPLACED API ROUTE!");
}

