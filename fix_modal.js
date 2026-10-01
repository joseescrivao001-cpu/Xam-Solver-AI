
const fs = require("fs");
let code = fs.readFileSync("src/components/pricing-modal.tsx", "utf8");

// Change specific texts
code = code.replace(/2\.000/g, "20.000"); // Fix 2.000 credits to 20.000 credits
code = code.replace(/10\.000/g, "Ilimitados"); // Fix 10.000 to Ilimitados

// Rename the plan ID logic from ultra to premium
code = code.replace(/ultra:/g, "premium:");
code = code.replace(/ultraAoaFormatted/g, "premiumAoaFormatted");
code = code.replace(/ultraUsd/g, "premiumUsd");
code = code.replace(/plans\?\.ultra/g, "plans?.premium");
code = code.replace(/selectedPlan === .ultra./g, "selectedPlan === \"premium\"");
code = code.replace(/setSelectedPlan\(.ultra.\)/g, "setSelectedPlan(\"premium\")");
code = code.replace(/value=.ultra./g, "value=\"premium\"");
code = code.replace(/Plano Ultra \(Ilimitados Cr\uFFFDditos\)/g, "Plano Premium VIP (Ilimitado)"); // Since we replaced 10.000 with Ilimitados

// Let.s just fix the third column title
code = code.replace(/PLANO ULTRA \(Mais Popular\)/g, "PLANO PREMIUM VIP (Ilimitado)");

// Remove duplicate definition if any (there shouldn.t be yet because it.s original)
// Wait, the original code had:
// const ultraAoaFormatted = ...
// const ultraUsd = ...
// And:
// const premiumAoaFormatted = ...
// const premiumUsd = ...
// So replacing ultra to premium will cause duplicates!
// Let.s use regex to remove the existing ultra declarations
code = code.replace(/const ultraAoaFormatted.*?\n.*?\n/g, "");

fs.writeFileSync("src/components/pricing-modal.tsx", code);

