
const fs = require("fs");

let chat = fs.readFileSync("src/app/api/chat/route.ts", "utf-8");
chat = chat.replace(/let pdfExtractedText: string \| null = null;/g, "let pdfExtractedText: string | null = null; // eslint-disable-line prefer-const");
fs.writeFileSync("src/app/api/chat/route.ts", chat);

let solve = fs.readFileSync("src/app/api/solve/route.ts", "utf-8");
solve = solve.replace(/catch\(e\)/g, "catch");
solve = solve.replace(/catch \(e\)/g, "catch");
fs.writeFileSync("src/app/api/solve/route.ts", solve);

let login = fs.readFileSync("src/app/login/page.tsx", "utf-8");
login = login.replace(/Sparkles,\s?/g, "");
fs.writeFileSync("src/app/login/page.tsx", login);

