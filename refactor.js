
const fs = require("fs");
let code = fs.readFileSync("src/app/dashboard/page.tsx", "utf-8");

// 1. Find the start and end of the Floating Input Area
const startMarker = "{/* ---------------- FLOATING INPUT AREA ---------------- */}";
const endMarker = "A IA pode cometer erros. Ao usar o ExamSolver, você concorda com nossos Termos e Política de privacidade.";

const startIndex = code.indexOf(startMarker);
const endIndexTemp = code.indexOf(endMarker, startIndex);
// Find the closing tags for the floating input area
const endIndex = code.indexOf("</div>", code.indexOf("</div>", endIndexTemp) + 5) + 6;

const floatingArea = code.substring(startIndex, endIndex);

// 2. Wrap it in a renderComposer function
const renderComposerFunc = `
  const renderComposer = (isFloating: boolean) => (
    <>
      ` + startMarker + `
      <div className={\`\${isFloating ? "absolute bottom-0 left-0 right-0 z-30 pb-8 bg-gradient-to-t from-white via-white/80 dark:from-[#0A0A0A] dark:via-[#0A0A0A]/80 to-transparent flex flex-col items-center pointer-events-none px-4 md:px-12" : "w-full flex flex-col items-center pointer-events-none z-30"}\`}>
        <div className="max-w-3xl w-full pointer-events-auto">
          {/* Input Container */}
          <div className="relative bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800/80 rounded-[28px] transition-all focus-within:border-zinc-300 dark:focus-within:border-zinc-700 flex flex-col shadow-lg">
` + floatingArea.substring(floatingArea.indexOf("{/* Image Preview Area */}"), floatingArea.indexOf("{messages.length === 0 && (")) + `
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-6"
            >
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition">
                <Paperclip className="w-4 h-4" /> Anexar arquivo
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition">
                <ImageIcon className="w-4 h-4" /> Enviar imagem
              </button>
              <button onClick={handleDrivePicker} className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition">
                <Cloud className="w-4 h-4" /> Google Drive
              </button>
              <button onClick={startRecording} className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition">
                <Mic className="w-4 h-4" /> Usar voz
              </button>
            </motion.div>
          )}

          <p className={\`text-center text-[11px] text-zinc-400 transition-all \${messages.length === 0 ? "mt-8" : "mt-2"}\`}>
            ` + endMarker + `
          </p>
        </div>
      </div>
    </>
  );
`;

// Insert the function before the return statement
const returnIndex = code.indexOf("return (", code.indexOf("const handleThemeToggle = () => {"));
code = code.substring(0, returnIndex) + renderComposerFunc + "\n  " + code.substring(returnIndex);

// 3. Replace the original floating area with the conditional calls
const replacement = `
            {messages.length > 0 && renderComposer(true)}
`;

code = code.substring(0, code.indexOf(startMarker)) + replacement + code.substring(code.indexOf("</div>", code.indexOf("</div>", endIndexTemp) + 5) + 6);

fs.writeFileSync("src/app/dashboard/page.tsx", code);

