
const fs = require("fs");
let sol = fs.readFileSync("src/app/api/solve/route.ts", "utf-8");
sol = sol.replace(/const pdfParse = require\("pdf-parse"\);\n/g, "");
fs.writeFileSync("src/app/api/solve/route.ts", sol);

let chat = fs.readFileSync("src/app/api/chat/route.ts", "utf-8");
chat = chat.replace(/const pdfParse = require\("pdf-parse"\);\n/g, "");
fs.writeFileSync("src/app/api/chat/route.ts", chat);

