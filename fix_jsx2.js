
const fs = require("fs");
let page = fs.readFileSync("src/app/pricing/page.tsx", "utf8");
page = page.replace("return (\n    {isLoading &&", "return (\n    <>\n      {isLoading &&");
fs.writeFileSync("src/app/pricing/page.tsx", page, "utf8");

