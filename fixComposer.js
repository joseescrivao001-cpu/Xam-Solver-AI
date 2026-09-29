
const fs = require("fs");
let code = fs.readFileSync("src/app/dashboard/page.tsx", "utf-8");

const startMarker = "{/* ---------------- FLOATING INPUT AREA ---------------- */}";
const startIndex = code.indexOf(startMarker);
if (startIndex === -1) throw new Error("Could not find FLOATING INPUT AREA");

const endMarker = "A IA pode cometer erros. Ao usar o ExamSolver";
const endIndexTemp = code.indexOf(endMarker, startIndex);
const endIndex = code.indexOf("</div>", code.indexOf("</div>", endIndexTemp) + 5) + 6;

const floatingArea = code.substring(startIndex, endIndex);
code = code.substring(0, startIndex) + "{messages.length > 0 && composerNode}" + code.substring(endIndex);

const returnRegex = /  return \([\r\n\s]+<div className="flex h-\[100dvh\]/;
const match = code.match(returnRegex);
if (!match) throw new Error("Could not find main return");

const returnIndex = match.index;

const newFloatingArea = floatingArea
  .replace(/className={\`left-0 right-0 w-full px-4 md:px-12 transition-all duration-700 z-30 flex flex-col items-center [^`]*\`}/, `className={\`\${messages.length === 0 ? "w-full flex flex-col items-center justify-center z-30 pointer-events-none mt-8" : "left-0 right-0 w-full px-4 md:px-12 transition-all duration-700 z-30 flex flex-col items-center justify-end pointer-events-none absolute bottom-0 pb-8 bg-gradient-to-t from-white via-white/80 dark:from-[#0A0A0A] dark:via-[#0A0A0A]/80 to-transparent"}\`}`)
  .replace(/bg-\[\#1A1A1A\]/, "bg-white")
  .replace(/<\/div>[\r\n\s]+<\/div>[\r\n\s]+<p className="text-center/, `
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
              </div>
            </div>
            <p className="text-center`);

const composerDef = `
  const composerNode = (
    <>
      ` + newFloatingArea + `
    </>
  );

`;

code = code.substring(0, returnIndex) + composerDef + code.substring(returnIndex);

fs.writeFileSync("src/app/dashboard/page.tsx", code);

