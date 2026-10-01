
const fs = require("fs");
let code = fs.readFileSync("src/app/api/user/profile/route.ts", "utf8");
code = "import { PLANS } from \"@/lib/plan-config\";\n" + code;
code = code.replace(/credits_balance: isOwner \? 1000000 : 50,/, "credits_balance: isOwner ? PLANS.premium.credits : PLANS.free.credits,");
code = code.replace(/plan_type: isOwner \? "premium" : "free",/, "plan_type: isOwner ? PLANS.premium.id : PLANS.free.id,");
code = code.replace(/if \(\(finalProfile\.credits_balance \|\| 0\) \< 1000\) updates\.credits_balance = 1000000;/, "if ((finalProfile.credits_balance || 0) < 1000) updates.credits_balance = PLANS.premium.credits;");

// fix Unicode in this file
code = code.replace(/N\uFFFD\uFFFDo/g, "Não");
code = code.replace(/N\uFFFDo/g, "Não"); // in case

fs.writeFileSync("src/app/api/user/profile/route.ts", code);

