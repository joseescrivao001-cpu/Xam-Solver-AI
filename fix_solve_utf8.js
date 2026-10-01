
const fs = require("fs");
let code = fs.readFileSync("src/app/api/solve/route.ts", "utf8");

code = code.replace(/resolu\uFFFD\uFFFDo/g, "resolução");
code = code.replace(/quest\uFFFDes/g, "questões");
code = code.replace(/acad\uFFFDmicas/g, "acadêmicas");
code = code.replace(/OBRIGAT\uFFFD"RIO/g, "OBRIGATÓRIO");
code = code.replace(/Portugu\uFFFDs/g, "Português");
code = code.replace(/conte\uFFFDdo/g, "conteúdo");
code = code.replace(/F\uFFFDrmulas/g, "Fórmulas");
code = code.replace(/Equa\uFFFDes/g, "Equações");
code = code.replace(/FORMATA\uFFFD\uFFFDo/g, "FORMATAÇÃO");
code = code.replace(/EXPLICA\uFFFD\uFFFDO/g, "EXPLICAÇÃO");
code = code.replace(/Racioc\uFFFDnio/g, "Raciocínio");
code = code.replace(/VERIFICA\uFFFD\uFFFDO/g, "VERIFICAÇÃO");
code = code.replace(/est\uFFFDo/g, "estão");
code = code.replace(/CONFIAN\uFFFDA/g, "CONFIANÇA");
code = code.replace(/N\uFFFD\uFFFDo/g, "Não");
code = code.replace(/N\uFFFDo/g, "Não");
code = code.replace(/Cr\uFFFDditos/g, "Créditos");
code = code.replace(/cr\uFFFDdito/g, "crédito");
code = code.replace(/Fa\uFFFDa/g, "Faça");
code = code.replace(/Dif\uFFFDcil/g, "Difícil");
code = code.replace(/\uFFFD exclusivo/g, "é exclusivo");
code = code.replace(/Forne\uFFFDa/g, "Forneça");
code = code.replace(/Configura\uFFFD\uFFFDo/g, "Configuração");
code = code.replace(/inv\uFFFDlido/g, "inválido");
code = code.replace(/Quest\uFFFDo/g, "Questão");
code = code.replace(/CONTE\uFFFDsDO/g, "CONTEÚDO");
code = code.replace(/EXTRA\uFFFD\?DO/g, "EXTRAÍDO");
code = code.replace(/\uFFFD o Exam Solver/g, "é o Exam Solver");
code = code.replace(/Y-\? PROCESSAMENTO/g, "🖼️ PROCESSAMENTO");
code = code.replace(/Y"\? FORMATA/g, "📐 FORMATA");
code = code.replace(/o\?\? ESTRUTURA/g, "📝 ESTRUTURA");
code = code.replace(/YO\? IDIOMA/g, "🌍 IDIOMA");
fs.writeFileSync("src/app/api/solve/route.ts", code);

