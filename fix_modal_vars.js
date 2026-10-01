
const fs = require("fs");
let code = fs.readFileSync("src/components/pricing-modal.tsx", "utf8");

// Remove duplicate premium declarations that were previously ultra
code = code.replace(/const premiumAoaFormatted = paymentSettings\?\.plans\?\.premium\?\.formatted_aoa \|\| "9\.500 Kz";\n\s*const premiumUsd = paymentSettings\?\.plans\?\.premium\?\.usd \|\| 10;/, "");
code = code.replace(/<button.*?\n.*?onClick=\{\(\) => setSelectedPlan\("premium"\)\}.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?<\/button>/g, ""); // wait, this is dangerous

fs.writeFileSync("src/components/pricing-modal.tsx", code);

