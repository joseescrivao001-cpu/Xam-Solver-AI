
const fs = require("fs");
let code = fs.readFileSync("src/app/api/payment-settings/route.ts", "utf-8");

code = code.replace(/credits: "2\.000 Cr.*?ditos"/g, `credits: "22.000 Créditos"`);
code = code.replace(/credits: "10\.000 Cr.*?ditos"/g, `credits: "100.000 Créditos"`);

fs.writeFileSync("src/app/api/payment-settings/route.ts", code);

let profileCode = fs.readFileSync("src/app/api/user/profile/route.ts", "utf-8");
profileCode = profileCode.replace(/credits_balance: isOwner \? 1000000 : 50/g, "credits_balance: isOwner ? 1000000 : 100");
fs.writeFileSync("src/app/api/user/profile/route.ts", profileCode);

