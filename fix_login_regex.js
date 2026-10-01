const fs = require("fs");
let content = fs.readFileSync("src/app/login/page.tsx", "utf-8");
content = content.replace(/\{isLogin \? "Que bom ver[^"]*" : "Junte-se[^"]*"\}/, "{isLogin ? \"Que bom ver você!\" : \"Junte-se à Revolução\"}");
fs.writeFileSync("src/app/login/page.tsx", content);
