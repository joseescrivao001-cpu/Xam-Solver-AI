
const fs = require("fs");
let code = fs.readFileSync("src/app/dashboard/page.tsx", "utf8");

// Change the Dropdown labels in the chat
code = code.replace(/Flash \(DeepSeek\)/g, "Fast (LPU)");
code = code.replace(/Pro \(GPT-5\.6\)/g, "Core (GPT-OSS)");
code = code.replace(/Ultra \(Claude 5\)/g, "Vision (QWEN)");

code = code.replace(/R\uFFFDpido e Preciso/g, "Rápido e Eficiente");
code = code.replace(/Para quest\uFFFDes complexas/g, "Raciocínio Lógico");
code = code.replace(/Intelig\uFFFDncia M\uFFFDxima/g, "Multimodal Visual");

// Fix model Modes (which are still referenced as string literals deepseek-v4-flash, gpt-5.6-sol, claude-opus-5 in UI state)
// Let.s rename the state values if possible, but actually `models.ts` resolves them anyway.
// It is safer to keep the state values or rename them everywhere.
// But the user specifically asked to "Eliminar referências obsoletas ou falsas da interface". 
// Showing them in the UI is false. The code strings "deepseek-v4-flash" etc are just IDs, but they can also be cleaned.
// Let.s just clean the UI texts for now.
code = code.replace(/modelMode === "claude-opus-5" \|\| modelMode === "gpt-6-astra" \? "Ultra" : modelMode === "gpt-5.6-sol" \? "Pro" : "Flash"/g, "modelMode === \"claude-opus-5\" || modelMode === \"gpt-6-astra\" ? \"Vision\" : modelMode === \"gpt-5.6-sol\" ? \"Core\" : \"Fast\"");

// Visitor bug fix: Click Planos opens modal instead of /login
code = code.replace(/onClick=\{\(\) => setIsPricingOpen\(true\)\}/g, "onClick={() => user ? setIsPricingOpen(true) : router.push(\"/login\")}");

fs.writeFileSync("src/app/dashboard/page.tsx", code);

