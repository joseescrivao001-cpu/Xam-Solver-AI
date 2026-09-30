
const fs = require("fs");
let code = fs.readFileSync("src/app/api/user/profile/route.ts", "utf-8");
code = code.replace(/credits_balance: isOwner \? 1000000 : 100/g, "credits_balance: isOwner ? 1000000 : 50");
fs.writeFileSync("src/app/api/user/profile/route.ts", code);

let loginCode = fs.readFileSync("src/app/login/page.tsx", "utf-8");
loginCode = loginCode.replace(/100 cr.ditos/g, "50 créditos");
fs.writeFileSync("src/app/login/page.tsx", loginCode);

