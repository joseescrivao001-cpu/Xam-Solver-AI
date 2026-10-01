
const fs = require("fs");
let content = fs.readFileSync("src/app/login/page.tsx", "utf-8");
content = content.replace(/Que bom ver voc\uFFFD!/g, "Que bom ver você!");
content = content.replace(/Junte-se \uFFFD Revolu\uFFFD/g, "Junte-se à Revolução");
content = content.replace(/Que bom ver voc!/g, "Que bom ver você!");
content = content.replace(/Junte-se  Revoluo/g, "Junte-se à Revolução");
content = content.replace(/Tecnologia Gemini/gi, "Tecnologia Cerebras");
content = content.replace(/5 crditos/gi, "50 créditos");
content = content.replace(/5 créditos/gi, "50 créditos");
fs.writeFileSync("src/app/login/page.tsx", content);

