
const fs = require("fs");
let code = fs.readFileSync("src/app/api/checkout/mcx/route.ts", "utf8");
code = code.replace(/const defaultAmount = amount \|\| \(plan_type === .pro. \? . USD : . USD\);/, "const defaultAmount = amount || (plan_type === \"pro\" ? PLANS.pro.priceUsd + \" USD\" : PLANS.premium.priceUsd + \" USD\");");
fs.writeFileSync("src/app/api/checkout/mcx/route.ts", code);

