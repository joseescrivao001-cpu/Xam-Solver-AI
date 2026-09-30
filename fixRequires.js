
const fs = require("fs");

let chat = fs.readFileSync("src/app/api/chat/route.ts", "utf-8");
chat = chat.replace(/const pdfParse = require\("pdf-parse"\);/g, "// eslint-disable-next-line @typescript-eslint/no-require-imports\nconst pdfParse = require(\"pdf-parse\");");
fs.writeFileSync("src/app/api/chat/route.ts", chat);

let solve = fs.readFileSync("src/app/api/solve/route.ts", "utf-8");
solve = solve.replace(/const pdfParse = require\("pdf-parse"\);/g, "// eslint-disable-next-line @typescript-eslint/no-require-imports\nconst pdfParse = require(\"pdf-parse\");");
fs.writeFileSync("src/app/api/solve/route.ts", solve);

