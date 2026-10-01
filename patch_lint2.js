
const fs = require("fs");
let content = fs.readFileSync("src/app/dashboard/page.tsx", "utf-8");
content = content.replace(/catch \(err\) \{\n        setError\("Falha ao renderizar PDF para extração de material."\);\n      \}/g, `catch (err) {
        if(err){}
        setError("Falha ao renderizar PDF para extração de material.");
      }`);
content = content.replace(/catch \(err\) \{\n          setError\("Falha ao renderizar PDF. Arquivo corrompido ou protegido."\);\n        \}/g, `catch (err) {
          if(err){}
          setError("Falha ao renderizar PDF. Arquivo corrompido ou protegido.");
        }`);
fs.writeFileSync("src/app/dashboard/page.tsx", content);

