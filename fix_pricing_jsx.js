
const fs = require("fs");
let content = fs.readFileSync("src/app/pricing/page.tsx", "utf-8");
content = content.replace(/\$\{proAoa\}/g, "{proAoa}");
content = content.replace(/\$\{proUsd\}/g, "{proUsd}");
content = content.replace(/\$\{ultraAoa\}/g, "{ultraAoa}");
content = content.replace(/\$\{ultraUsd\}/g, "{ultraUsd}");
content = content.replace(/\$\{premiumAoa\}/g, "{premiumAoa}");
content = content.replace(/\$\{premiumUsd\}/g, "{premiumUsd}");
fs.writeFileSync("src/app/pricing/page.tsx", content);

