const fs = require('fs');

function fixSolveRoute() {
  let content = fs.readFileSync('src/app/api/solve/route.ts', 'utf-8');
  
  const originalBlock = `      isPdf = file.type === 'application/pdf';
      if (isPdf) {
        try {
          const pdfData = await pdfParse(Buffer.from(fileBuffer));
          pdfExtractedText = pdfData.text;
        } catch { pdfExtractedText = "Erro ao ler PDF"; }
      }`;
      
  const newBlock = `      isPdf = file.type === 'application/pdf';
      if (isPdf) {
        try {
          const pdfData = await pdfParse(Buffer.from(fileBuffer));
          pdfExtractedText = pdfData.text ? pdfData.text.trim() : "";
          if (pdfExtractedText.length < 15) {
            return new Response(JSON.stringify({ error: "O PDF parece estar vazio ou escaneado (necessita OCR). OCR não suportado nesta versão. Nenhum crédito foi descontado." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
          }
        } catch (err) { 
            return new Response(JSON.stringify({ error: "Falha ao ler o PDF. Arquivo pode estar corrompido. Nenhum crédito foi descontado." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
      }`;
  
  content = content.replace(originalBlock, newBlock);
  content = content.replace(/const cerebrasModel = \(imageUrl && !isPdf\) \? 'qwen-3\.8-27b' : 'gpt-oss-120b';/g, "const cerebrasModel = (imageUrl && !isPdf) ? 'qwen-3.8-27b' : 'llama3.1-70b';");

  fs.writeFileSync('src/app/api/solve/route.ts', content);
}

fixSolveRoute();
