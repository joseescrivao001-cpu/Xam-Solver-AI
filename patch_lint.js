
const fs = require("fs");
let content = fs.readFileSync("src/app/dashboard/page.tsx", "utf-8");
content = content.replace("catch (err) {\\n        setError(\"Falha ao renderizar PDF para extração de material.\");", "catch (err) {\\n        if(err){}\\n        setError(\"Falha ao renderizar PDF para extração de material.\");");
content = content.replace("catch (err) {\\n          setError(\"Falha ao renderizar PDF. Arquivo corrompido ou protegido.\");", "catch (err) {\\n          if(err){}\\n          setError(\"Falha ao renderizar PDF. Arquivo corrompido ou protegido.\");");
fs.writeFileSync("src/app/dashboard/page.tsx", content);

let pdfRenderer = fs.readFileSync("src/lib/pdf-renderer.ts", "utf-8");
pdfRenderer = pdfRenderer.replace("// @ts-expect-error", "// @ts-expect-error bypassing missing types for window object");
fs.writeFileSync("src/lib/pdf-renderer.ts", pdfRenderer);

