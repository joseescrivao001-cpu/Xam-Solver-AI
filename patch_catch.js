
const fs = require("fs");
let content = fs.readFileSync("src/app/dashboard/page.tsx", "utf-8");
content = content.replace(/catch \(err\) \{/g, "catch (err: unknown) { if(err){} ");
fs.writeFileSync("src/app/dashboard/page.tsx", content);

