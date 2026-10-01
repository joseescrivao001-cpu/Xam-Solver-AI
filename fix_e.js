
const fs = require("fs");
let chat = fs.readFileSync("src/app/api/chat/route.ts", "utf-8");
chat = chat.replace(/catch \(e\)/g, "catch");
fs.writeFileSync("src/app/api/chat/route.ts", chat);

let mat = fs.readFileSync("src/app/api/notebooks/materials/route.ts", "utf-8");
mat = mat.replace(/catch \(e\)/g, "catch");
fs.writeFileSync("src/app/api/notebooks/materials/route.ts", mat);

let sol = fs.readFileSync("src/app/api/solve/route.ts", "utf-8");
sol = sol.replace(/catch \(err\)/g, "catch");
fs.writeFileSync("src/app/api/solve/route.ts", sol);

