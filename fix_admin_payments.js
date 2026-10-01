
const fs = require("fs");
let code = fs.readFileSync("src/app/api/admin/payments/route.ts", "utf8");

code = "import { PLANS } from \"@/lib/plan-config\";\n" + code;
code = code.replace(/let creditsToAdd = 2000;\n.*?if \(plan === "pro"\) creditsToAdd = 2000;\n.*?if \(plan === "ultra"\) creditsToAdd = 10000;\n.*?if \(plan === "premium"\) creditsToAdd = 999999999;/s, 
"let creditsToAdd = PLANS.free.credits;\n      if (plan === \"pro\") creditsToAdd = PLANS.pro.credits;\n      if (plan === \"premium\" || plan === \"ultra\") creditsToAdd = PLANS.premium.credits;");

code = code.replace(/const newBalance = plan === "premium" \? 999999999 : currentBalance \+ creditsToAdd;/, 
"const newBalance = (plan === \"premium\" || plan === \"ultra\") ? PLANS.premium.credits : currentBalance + creditsToAdd;");

code = code.replace(/cr\uFFFDditos/g, "créditos");
code = code.replace(/usu\uFFFDrio/gi, "usuário");
code = code.replace(/Rejei\uFFFD\uFFFDo/g, "Rejeição");

fs.writeFileSync("src/app/api/admin/payments/route.ts", code);

