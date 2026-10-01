
const fs = require("fs");
let chat = fs.readFileSync("src/app/api/chat/route.ts", "utf-8");
chat = chat.replace(/if \(pdfExtractedText\.length < 15\)/g, "if ((pdfExtractedText || \"\").length < 15)");
fs.writeFileSync("src/app/api/chat/route.ts", chat);

let solve = fs.readFileSync("src/app/api/solve/route.ts", "utf-8");
solve = solve.replace(/if \(pdfExtractedText\.length < 15\)/g, "if ((pdfExtractedText || \"\").length < 15)");
fs.writeFileSync("src/app/api/solve/route.ts", solve);

