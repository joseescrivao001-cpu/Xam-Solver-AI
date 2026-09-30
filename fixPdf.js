const fs = require("fs");

let code = fs.readFileSync("src/app/api/chat/route.ts", "utf-8");
if (!code.includes("pdf-parse")) {
  code = code.replace(/import \{ createClient \} from "@\/lib\/supabase\/server";/, "import { createClient } from \"@/lib/supabase/server\";\nimport pdfParse from \"pdf-parse\";");
}
code = code.replace(/let imageUrl: string \| null = null;/g, "let imageUrl: string | null = null;\n    let pdfExtractedText: string | null = null;");
code = code.replace(/if \(isPdf\) \{\n\s*imageUrl = `data:application\/pdf;base64,\$\{base64Data\}`;[\s\n]*\}/g, "if (isPdf) {\n        try {\n          const pdfData = await pdfParse(Buffer.from(buffer));\n          pdfExtractedText = pdfData.text;\n        } catch (e) {\n          console.error(\"PDF Parse Error:\", e);\n          pdfExtractedText = \"Erro ao extrair texto do PDF.\";\n        }\n      }");
code = code.replace(/\} else if \(isPdf\) \{\s*\/\/[^\n]*\s*openAiMessages\.push\(\{\s*role: 'user',\s*content: `\[ARQUIVO PDF ENVIADO PELO USUÁRIO\][\s\S]*?\}\);\s*\}/g, "} else if (isPdf) {\n      openAiMessages.push({\n        role: \"user\",\n        content: `[CONTEÚDO DO PDF EXTRAÍDO]:\\n\\n${pdfExtractedText}\\n\\nPergunta do Usuário: ${text || \"Resolva as questões presentes no documento.\"}`\n      });\n    }");
fs.writeFileSync("src/app/api/chat/route.ts", code);

let solveCode = fs.readFileSync("src/app/api/solve/route.ts", "utf-8");
if (!solveCode.includes("pdf-parse")) {
  solveCode = solveCode.replace(/import \{ createClient, createServiceClient \} from "@\/lib\/supabase\/server";/, "import { createClient, createServiceClient } from \"@/lib/supabase/server\";\nimport pdfParse from \"pdf-parse\";");
}
solveCode = solveCode.replace(/let isPdf = false;/g, "let isPdf = false;\n    let pdfExtractedText: string | null = null;");
solveCode = solveCode.replace(/isPdf = file\.type === 'application\/pdf';/g, "isPdf = file.type === 'application/pdf';\n      if (isPdf) {\n        try {\n          const pdfData = await pdfParse(Buffer.from(fileBuffer));\n          pdfExtractedText = pdfData.text;\n        } catch(e) { pdfExtractedText = \"Erro ao ler PDF\"; }\n      }");
solveCode = solveCode.replace(/const pdfNote = isPdf \? `\[PDF enviado com \$\{Math\.round\(\(fileBuffer\?\.byteLength \|\| 0\) \/ 1024\)\}KB\]\\n` : '';[\s\S]*?messages\.push\(\{[\s\S]*?\}\);/g, "const pdfNote = isPdf ? `[CONTEÚDO DO PDF EXTRAÍDO]:\\n${pdfExtractedText}\\n\\n` : '';\n    messages.push({ role: 'user', content: `${pdfNote}${modePrefix}` });");
fs.writeFileSync("src/app/api/solve/route.ts", solveCode);
