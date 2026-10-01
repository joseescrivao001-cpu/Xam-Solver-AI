
const fs = require("fs");
let modal = fs.readFileSync("src/components/pricing-modal.tsx", "utf8");
modal = modal.replace(/const premiumAoaFormatted = paymentSettings\?\.plans\?\.premium\?\.formatted_aoa \|\| \"37\.050 Kz\";/, "");
modal = modal.replace(/const premiumUsd = paymentSettings\?\.plans\?\.premium\?\.usd \|\| 39;/, "");
fs.writeFileSync("src/components/pricing-modal.tsx", modal, "utf8");

