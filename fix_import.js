const fs = require("fs");
let chat = fs.readFileSync("src/app/api/chat/route.ts", "utf-8");
chat = chat.replace(/require\('pdf-parse'\)/g, "require('pdf-parse-new')");
fs.writeFileSync("src/app/api/chat/route.ts", chat);

let sol = fs.readFileSync("src/app/api/solve/route.ts", "utf-8");
sol = sol.replace(/require\('pdf-parse'\)/g, "require('pdf-parse-new')");
fs.writeFileSync("src/app/api/solve/route.ts", sol);

let mat = fs.readFileSync("src/app/api/notebooks/materials/route.ts", "utf-8");
mat = mat.replace(/require\('pdf-parse'\)/g, "require('pdf-parse-new')");
fs.writeFileSync("src/app/api/notebooks/materials/route.ts", mat);
