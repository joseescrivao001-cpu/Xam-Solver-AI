const fs = require("fs");
let content = fs.readFileSync("src/components/pricing-modal.tsx", "utf-8");

content = content.replace(/const proAoaFormatted = paymentSettings\?\.plans\?\.pro\?\.formatted_aoa \|\| "9\.500 Kz";/g, "const proAoaFormatted = paymentSettings?.plans?.pro?.formatted_aoa || \"4.750 Kz\";\n  const proUsd = paymentSettings?.plans?.pro?.usd || 5;");
content = content.replace(/const ultraAoaFormatted = paymentSettings\?\.plans\?\.ultra\?\.formatted_aoa \|\| "19\.000 Kz";/g, "const ultraAoaFormatted = paymentSettings?.plans?.ultra?.formatted_aoa || \"9.500 Kz\";\n  const ultraUsd = paymentSettings?.plans?.ultra?.usd || 10;");
content = content.replace(/const premiumAoaFormatted = paymentSettings\?\.plans\?\.premium\?\.formatted_aoa \|\| "39\.000 Kz";/g, "const premiumAoaFormatted = paymentSettings?.plans?.premium?.formatted_aoa || \"37.050 Kz\";\n  const premiumUsd = paymentSettings?.plans?.premium?.usd || 39;");

content = content.replace(/\{selectedPlan === 'pro' \? `\$\{proAoaFormatted\} \(\$10 USD\)` : selectedPlan === 'ultra' \? `\$\{ultraAoaFormatted\} \(\$19 USD\)` : `\$\{premiumAoaFormatted\} \(\$39 USD\)`\}/g, "{selectedPlan === 'pro' ? `${proAoaFormatted} ($${proUsd} USD)` : selectedPlan === 'ultra' ? `${ultraAoaFormatted} ($${ultraUsd} USD)` : `${premiumAoaFormatted} ($${premiumUsd} USD)`}");

fs.writeFileSync("src/components/pricing-modal.tsx", content);
