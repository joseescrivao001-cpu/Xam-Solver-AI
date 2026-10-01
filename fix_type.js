
const fs = require("fs");
let page = fs.readFileSync("src/app/pricing/page.tsx", "utf8");
page = page.replace(/premium: \{ usd: number; aoa: number; formatted_aoa: string \};\n\s*premium: \{ usd: number; aoa: number; formatted_aoa: string \};/, "premium: { usd: number; aoa: number; formatted_aoa: string };");
fs.writeFileSync("src/app/pricing/page.tsx", page, "utf8");

