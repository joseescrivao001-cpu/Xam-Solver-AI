
const fs = require("fs");
let content = fs.readFileSync("src/app/login/page.tsx", "utf-8");

const fixedBlock = `<div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-white/20">
              <BrainCircuit className="w-8 h-8 text-white" />
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight drop-shadow-lg">
              {isLogin ? "Que bom ver você!" : "Junte-se à Revolução"}
            </h1>
            
            <p className="text-zinc-300 text-sm md:text-base max-w-sm leading-relaxed font-medium mb-10 drop-shadow-md">
              O Exam Solver AI analisa imagens de provas, reconhece equações e fornece resoluções com <strong>Precisão Absoluta</strong>. 
              {isLogin ? " Entre para continuar de onde parou." : " Cadastre-se e ganhe 50 créditos iniciais gratuitos."}
            </p>
          </div>
          
          <div className="absolute bottom-6 text-xs font-medium text-zinc-500 z-10">
            © {new Date().getFullYear()} Exam Solver AI
          </div>`;

content = content.replace(/<div className="relative z-10 flex flex-col items-center">[\s\S]*?Exam Solver AI\s*<\/div>/, fixedBlock);
fs.writeFileSync("src/app/login/page.tsx", content);

