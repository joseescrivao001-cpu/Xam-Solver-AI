
const fs = require("fs");
let content = fs.readFileSync("src/app/api/user/profile/route.ts", "utf-8");
content = content.replace("credits_balance: isOwner ? 1000000 : 50,", "credits_balance: isOwner ? PLANS.premium.credits : PLANS.free.credits,");
content = content.replace("plan_type: isOwner ? \"premium\" : \"free\",", "plan_type: isOwner ? PLANS.premium.id : PLANS.free.id,");
content = content.replace("import { createClient", "import { PLANS } from \"@/lib/plan-config\";\nimport { createClient");
fs.writeFileSync("src/app/api/user/profile/route.ts", content);

