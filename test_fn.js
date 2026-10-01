const fs = require('fs');
const pdf = require('pdf-parse');
async function test() {
  const buf = fs.readFileSync('test_normal.pdf');
  const pdfParseFn = typeof pdf === 'function' ? pdf : pdf.PDFParse;
  try {
    const data = await pdfParseFn(buf);
    console.log(data.text);
  } catch (e) {
    console.error("Error inside", e);
  }
}
test();
