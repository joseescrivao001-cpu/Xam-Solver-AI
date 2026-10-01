
const fs = require("fs");
let code = fs.readFileSync("src/app/api/notebooks/analytics/route.ts", "utf8");

code = code.replace(/N\uFFFDo autenticado./g, "Não autenticado.");
code = code.replace(/N\uFFFD\uFFFDo autenticado./g, "Não autenticado.");
code = code.replace(/obrigat\uFFFDrio/g, "obrigatório");
code = code.replace(/Voc\uFFFD \uFFFD/g, "Você é");
code = code.replace(/Pedag\uFFFDgico/g, "Pedagógico");
code = code.replace(/miss\uFFFDo \uFFFD/g, "missão é");
code = code.replace(/hist\uFFFDrico/g, "histórico");
code = code.replace(/DIAGN\uFFFD"STICO/g, "DIAGNÓSTICO");
code = code.replace(/DOM\uFFFD\?NIO/g, "DOMÍNIO");
code = code.replace(/T\uFFFDpico/g, "Tópico");
code = code.replace(/n\uFFFDo configurada/g, "não configurada");

code = code.replace(/resolveModelId\("gpt-oss-120b"\)/g, "\"llama3.1-70b\"");

fs.writeFileSync("src/app/api/notebooks/analytics/route.ts", code);

