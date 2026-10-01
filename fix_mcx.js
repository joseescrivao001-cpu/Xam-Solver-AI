const fs = require("fs");
let content = fs.readFileSync("src/app/api/checkout/mcx/route.ts", "utf-8");
content = content.replace(/const defaultAmount = plan_type === 'pro' \? '9\.500 Kz' : plan_type === 'ultra' \? '19\.000 Kz' : '39\.000 Kz';/g, "const defaultAmount = amount || (plan_type === 'pro' ? '5 USD' : plan_type === 'ultra' ? '10 USD' : '39 USD');");
fs.writeFileSync("src/app/api/checkout/mcx/route.ts", content);
