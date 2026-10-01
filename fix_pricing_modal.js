
const fs = require("fs");
let code = fs.readFileSync("src/components/pricing-modal.tsx", "utf8");

// Business rules enforcement
code = code.replace(/2\.000/g, "20.000"); // Pro
code = code.replace(/10\.000/g, "Ilimitados"); // Was Ultra in modal text

// Rename ultra references to premium
code = code.replace(/ultra:/g, "premium:");
code = code.replace(/selectedPlan === .ultra./g, "selectedPlan === \"premium\"");
code = code.replace(/setSelectedPlan\(.ultra.\)/g, "setSelectedPlan(\"premium\")");
code = code.replace(/value=.ultra./g, "value=\"premium\"");
code = code.replace(/ultraAoa/g, "premiumAoa");
code = code.replace(/ultraUsd/g, "premiumUsd");
code = code.replace(/plans\?\.ultra/g, "plans?.premium");
code = code.replace(/Plano Ultra.*?ditos\)/g, "Plano Premium (Ilimitado)");

// Fix Encoding
code = code.replace(/Cr\uFFFDditos/g, "Créditos");
code = code.replace(/cr\uFFFDditos/g, "créditos");
code = code.replace(/resolu\uFFFD\uFFFDo/g, "resolução");
code = code.replace(/F\uFFFDrmulas/g, "Fórmulas");
code = code.replace(/Jos\uFFFD/g, "José");
code = code.replace(/Escriv\uFFFDo/g, "Escrivão");
code = code.replace(/ser\uFFFDo/g, "serão");
code = code.replace(/Avan\uFFFDada/g, "Avançada");

fs.writeFileSync("src/components/pricing-modal.tsx", code);

