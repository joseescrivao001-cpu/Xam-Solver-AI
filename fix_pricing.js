
const fs = require("fs");

let code = fs.readFileSync("src/app/pricing/page.tsx", "utf8");

code = code.replace(/currentPlan === .ultra./g, "currentPlan === \"premium\"");
code = code.replace(/22\.000.*?ditos/g, "20.000 Créditos");
code = code.replace(/100\.000.*?ditos/g, "Créditos Ilimitados");
code = code.replace(/ultraAoa/g, "premiumAoa");
code = code.replace(/ultraUsd/g, "premiumUsd");
code = code.replace(/plans\?\.ultra/g, "plans?.premium");
code = code.replace(/PLANO ULTRA/g, "PLANO PREMIUM");
code = code.replace(/Plano Ultra/g, "Plano Premium VIP");
code = code.replace(/Upgrade Ultra/g, "Upgrade Premium");
code = code.replace(/e Ultra \(/g, "e Premium (");

// Fix encoding issues in this file while we are at it
code = code.replace(/d\uFFFDvidas/g, "dúvidas");
code = code.replace(/mat\uFFFDrias/g, "matérias");
code = code.replace(/di\uFFFDrios/g, "diários");
code = code.replace(/s\uFFFDo/g, "são");
code = code.replace(/c\uFFFDmbio/g, "câmbio");
code = code.replace(/cota\uFFFD\uFFFDo/g, "cotação");
code = code.replace(/Cr\uFFFDditos/g, "Créditos");
code = code.replace(/cr\uFFFDditos/g, "créditos");
code = code.replace(/Avan\uFFFDo/g, "Avançado");
code = code.replace(/M\uFFFDximo/g, "Máximo");
code = code.replace(/Jos\uFFFD Escriv\uFFFDo/g, "José Escrivão");

fs.writeFileSync("src/app/pricing/page.tsx", code);

