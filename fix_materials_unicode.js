
const fs = require("fs");
function fixUnicode(file) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, "utf8");
    code = code.replace(/Extra\uFFFD\uFFFDo/g, "Extração");
    code = code.replace(/P\uFFFDginas/g, "Páginas");
    code = code.replace(/m\uFFFDltiplas/g, "múltiplas");
    code = code.replace(/M\uFFFDltiplas/g, "Múltiplas");
    code = code.replace(/conclu\uFFFDda/g, "concluída");
    code = code.replace(/autom\uFFFDtica/g, "automática");
    fs.writeFileSync(file, code);
  }
}
fixUnicode("src/app/api/notebooks/materials/route.ts");

