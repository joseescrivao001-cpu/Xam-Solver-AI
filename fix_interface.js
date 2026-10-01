
const fs = require("fs");
let content = fs.readFileSync("src/app/pricing/page.tsx", "utf-8");
content = content.replace(/plans: \{/, "plans: {\n    pro: { usd: number; aoa: number; formatted_aoa: string; credits?: string };");
fs.writeFileSync("src/app/pricing/page.tsx", content);

