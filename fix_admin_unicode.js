
const fs = require("fs");

function fixUnicode(file) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, "utf8");
    code = code.replace(/Usu\uFFFDrios/g, "Usuários");
    code = code.replace(/usu\uFFFDrios/g, "usuários");
    code = code.replace(/Op\uFFFDes/g, "Opções");
    code = code.replace(/Cr\uFFFDditos/g, "Créditos");
    code = code.replace(/cr\uFFFDditos/g, "créditos");
    code = code.replace(/Distribui\uFFFD\uFFFDo/g, "Distribuição");
    code = code.replace(/C\uFFFDmbio/g, "Câmbio");
    code = code.replace(/Inform\uFFFD\uFFFDo/g, "Informação");
    code = code.replace(/Inform\uFFFD\uFFFD/g, "Informações"); // Sometimes plural
    code = code.replace(/Racioc\uFFFDnio/g, "Raciocínio");
    code = code.replace(/Infer\uFFFDncia/g, "Inferência");
    code = code.replace(/Estat\uFFFDsticas/g, "Estatísticas");
    code = code.replace(/Vis\uFFFDo/g, "Visão");
    code = code.replace(/Opera\uFFFDes/g, "Operações");
    code = code.replace(/A\uFFFDes/g, "Ações");
    fs.writeFileSync(file, code);
  }
}

fixUnicode("src/components/admin/admin-command-center.tsx");
fixUnicode("src/app/api/admin/stats/route.ts");

