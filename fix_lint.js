
const fs = require("fs");
let content = fs.readFileSync("src/app/pricing/page.tsx", "utf-8");
content = content.replace(/Crown,\s*/g, "");
content = content.replace(/Smartphone,\s*/g, "");
content = content.replace(/HelpCircle\s*/g, "");
content = content.replace(/const accountHolder = [^\n]*\n/g, "");
content = content.replace(/const expressPhone = [^\n]*\n/g, "");
fs.writeFileSync("src/app/pricing/page.tsx", content);

