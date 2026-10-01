
const fs = require("fs");
let code = fs.readFileSync("src/app/api/notebooks/ai-tool/route.ts", "utf8");

code = code.replace(/N\uFFFD\uFFFDo autenticado./g, "Não autenticado.");
code = code.replace(/N\uFFFDo autenticado./g, "Não autenticado.");
code = code.replace(/s\uFFFDo obrigat\uFFFDrios./g, "são obrigatórios.");
code = code.replace(/hist\uFFFDrico/g, "histórico");
code = code.replace(/Anota\uFFFD\uFFFDo/g, "Anotação");
code = code.replace(/dispon\uFFFDvel/g, "disponível");
code = code.replace(/A\uFFFD\uFFFDO:/g, "AÇÃO:");
code = code.replace(/MAT\uFFFD%RIA/g, "MATÉRIA");
code = code.replace(/Acad\uFFFDmico/g, "Acadêmico");
code = code.replace(/N\uFFFDvel/g, "Nível");
code = code.replace(/Defini\uFFFDes/g, "Definições");
code = code.replace(/F\uFFFDrmulas/g, "Fórmulas");
code = code.replace(/Pr\uFFFDticas/g, "Práticas");
code = code.replace(/Cr\uFFFDticos/g, "Críticos");
code = code.replace(/EXERC\uFFFD\?CIOS/g, "EXERCÍCIOS");
code = code.replace(/t\uFFFDpicos/g, "tópicos");
code = code.replace(/quest\uFFFDes/g, "questões");
code = code.replace(/in\uFFFDditas/g, "inéditas");
code = code.replace(/M\uFFFDltipla/g, "Múltipla");
code = code.replace(/C\uFFFDlculo/g, "Cálculo");
code = code.replace(/quest\uFFFDo/g, "questão");
code = code.replace(/aplic\uFFFDvel/g, "aplicável");
code = code.replace(/Resolu\uFFFD\uFFFDo/g, "Resolução");
code = code.replace(/REVIS\uFFFD\uFFFDO/g, "REVISÃO");
code = code.replace(/R\uFFFDpido/g, "Rápido");
code = code.replace(/op\uFFFDes/g, "opções");
code = code.replace(/voc\uFFFD/g, "você");
code = code.replace(/d\uFFFDvidas/g, "dúvidas");
code = code.replace(/hesita\uFFFDes/g, "hesitações");
code = code.replace(/matem\uFFFDticos/g, "matemáticos");
code = code.replace(/confus\uFFFDo/g, "confusão");
code = code.replace(/frequ\uFFFDncia/g, "frequência");
code = code.replace(/m\uFFFDtodo/g, "método");
code = code.replace(/infal\uFFFDvel/g, "infalível");
code = code.replace(/HIST\uFFFD"RICO/g, "HISTÓRICO");
code = code.replace(/ESPEC\uFFFD\?FICA/g, "ESPECÍFICA");
code = code.replace(/n\uFFFDo configurada/g, "não configurada");
code = code.replace(/Voc\uFFFD \uFFFD/g, "Você é");
code = code.replace(/formata\uFFFD\uFFFDo/g, "formatação");
code = code.replace(/impec\uFFFDvel/g, "impecável");
code = code.replace(/indispon\uFFFDvel/g, "indisponível");

// Also replace gpt-oss-120b with llama3.1-70b as standard cerebras fallback
code = code.replace(/resolveModelId\("gpt-oss-120b"\)/g, "\"llama3.1-70b\"");

fs.writeFileSync("src/app/api/notebooks/ai-tool/route.ts", code);

