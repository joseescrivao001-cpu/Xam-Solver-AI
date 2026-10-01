const fs = require('fs');

function fixChatRoute() {
  let content = fs.readFileSync('src/app/api/chat/route.ts', 'utf-8');
  
  // Substituir a variável pdfExtractedText
  content = content.replace(/let pdfExtractedText: string \| null = null; \/\/ eslint-disable-line prefer-const/g, "let pdfExtractedText: string | null = null;");
  
  // Encontrar o bloco isPdf = file.type === 'application/pdf';
  const pdfExtractionBlock = `
      buffer = await file.arrayBuffer();
      const base64Data = arrayBufferToBase64(buffer);
      imageUrl = \`data:\${file.type};base64,\${base64Data}\`;

      if (isPdf) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require('pdf-parse');
          const pdfData = await pdfParse(Buffer.from(buffer));
          pdfExtractedText = pdfData.text ? pdfData.text.trim() : "";
          
          if (pdfExtractedText.length < 15) {
            return new Response(JSON.stringify({ error: "PDF sem texto extraível (provavelmente digitalizado/imagem). OCR não suportado nesta versão. Nenhum crédito descontado." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
          }
        } catch (e) {
          return new Response(JSON.stringify({ error: "Falha ao ler o PDF. Arquivo corrompido ou protegido. Nenhum crédito descontado." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
      }
`;
  
  content = content.replace(/buffer = await file\.arrayBuffer\(\);\s+const base64Data = arrayBufferToBase64\(buffer\);\s+imageUrl = `data:\$\{file\.type\};base64,\$\{base64Data\}`;/g, pdfExtractionBlock);
  fs.writeFileSync('src/app/api/chat/route.ts', content);
}

function fixSolveRoute() {
  let content = fs.readFileSync('src/app/api/solve/route.ts', 'utf-8');
  
  const solveExtractionBlock = `
      fileBuffer = await file.arrayBuffer();
      const base64Data = arrayBufferToBase64(fileBuffer);
      imageUrl = \`data:\${file.type};base64,\${base64Data}\`;
      isPdf = file.type === 'application/pdf';

      if (isPdf) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require('pdf-parse');
          const pdfData = await pdfParse(Buffer.from(fileBuffer));
          pdfExtractedText = pdfData.text ? pdfData.text.trim() : "";
          
          if (pdfExtractedText.length < 15) {
            return new Response(JSON.stringify({ error: "PDF sem texto extraível (provavelmente digitalizado/imagem). OCR não suportado nesta versão. Nenhum crédito descontado." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
          }
        } catch (e) {
          return new Response(JSON.stringify({ error: "Falha ao ler o PDF. Arquivo corrompido ou protegido. Nenhum crédito descontado." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
      }
`;
  content = content.replace(/let isPdf = false;[\s\n]*let pdfExtractedText: string \| null = null;/g, "let isPdf = false;\n    let pdfExtractedText: string | null = null;");
  
  content = content.replace(/isPdf = file\.type === 'application\/pdf';[\s\S]*?catch[\s\S]*?\}/g, solveExtractionBlock);
  
  content = content.replace(/const cerebrasModel = \(imageUrl && !isPdf\) \? 'qwen-3\.8-27b' : 'gpt-oss-120b';/g, "const cerebrasModel = (imageUrl && !isPdf) ? 'qwen-3.8-27b' : 'llama3.1-70b';");

  fs.writeFileSync('src/app/api/solve/route.ts', content);
}

function fixNotebooksMaterials() {
  let content = fs.readFileSync('src/app/api/notebooks/materials/route.ts', 'utf-8');
  
  const uploadBlock = `
    let finalExtractedText = extracted_text?.trim() || null;
    
    if (file_type === 'application/pdf' && file_url && file_url.startsWith('data:application/pdf;base64,')) {
      try {
        const base64Data = file_url.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(buffer);
        const text = pdfData.text ? pdfData.text.trim() : "";
        if (text.length >= 15) {
          finalExtractedText = text;
        } else {
          return NextResponse.json({ error: "PDF sem texto extraível (provavelmente digitalizado/imagem). OCR não suportado nesta versão. Falha ao adicionar material." }, { status: 400 });
        }
      } catch (e) {
        return NextResponse.json({ error: "Falha ao ler o PDF. Arquivo corrompido ou protegido." }, { status: 400 });
      }
    }

    const { data: material, error } = await db
      .from("notebook_materials")
      .insert({
        notebook_id,
        user_id: user.id,
        title: title.trim().slice(0, 150),
        file_url,
        file_type: file_type || "document",
        file_size: file_size || 0,
        extracted_text: finalExtractedText,
      })
`;
  
  content = content.replace(/const \{ data: material, error \} = await db[\s\S]*?extracted_text: extracted_text\?\.trim\(\) \|\| null,\s*\}\)/g, uploadBlock);
  fs.writeFileSync('src/app/api/notebooks/materials/route.ts', content);
}

fixChatRoute();
fixSolveRoute();
fixNotebooksMaterials();

console.log("Arquivos corrigidos com sucesso.");
