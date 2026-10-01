
const fs = require("fs");
let content = fs.readFileSync("src/components/pricing-modal.tsx", "utf-8");
content = content.replace(/2\.000 Cr?ditos/g, "20.000 Cr?ditos");
content = content.replace(/Plano Pro \(2.000 Cr?ditos\)/g, "Plano Pro (20.000 Cr?ditos)");
content = content.replace(/Recarregar \+2\.000 Cr?ditos/g, "Recarregar +20.000 Cr?ditos");
content = content.replace(/10\.000 Cr?ditos/g, "100.000 Cr?ditos"); // wait, what is Ultra/Premium?
fs.writeFileSync("src/components/pricing-modal.tsx", content);

