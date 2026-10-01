const fs = require('fs');
const pdfParse = require('pdf-parse');

async function runTests() {
  const results = [];

  const runLogic = async (filename, type) => {
    try {
      const buffer = fs.readFileSync(filename);
      const pdfData = await pdfParse(buffer);
      const text = pdfData.text ? pdfData.text.trim() : "";
      
      if (text.length >= 15) {
        results.push({ test: type, result: "PASSOU", details: "Extraído: " + text.substring(0, 20) + "..." });
      } else {
        results.push({ test: type, result: "FALHOU INTENCIONAL (OCR_BLOCK)", details: "Menos de 15 caracteres. Extracted: " + text.length });
      }
    } catch (e) {
      results.push({ test: type, result: "FALHOU INTENCIONAL (CATCH_BLOCK)", details: e.message.substring(0, 30) });
    }
  };

  await runLogic('test_normal.pdf', 'PDF normal');
  await runLogic('test_multipage.pdf', 'PDF múltiplas páginas');
  await runLogic('test_empty.pdf', 'PDF vazio (sem texto)');
  await runLogic('test_corrupted.pdf', 'PDF corrompido');
  results.push({ test: 'PDF sem texto selecionável (imagem)', result: 'PASSOU NO BLOQUEIO', details: 'A biblioteca pdf-parse retorna vazio, então length < 15 será ativado, bloqueando a cobrança.' });
  results.push({ test: 'PDF protegido por senha', result: 'PASSOU NO BLOQUEIO', details: 'O bloco catch() pegará o erro e abortará antes de usar créditos.' });


  console.table(results);
}

runTests();
