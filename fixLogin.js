
const fs = require("fs");
let code = fs.readFileSync("src/app/login/page.tsx", "utf-8");

const rightSideReplacement = `        {/* Right Side: Animated Student Grid Branding */}
        <div className="hidden lg:flex w-[55%] relative overflow-hidden bg-black flex-col justify-center items-center p-12 text-center">
          
          {/* Animated Image Grid Background */}
          <div className="absolute inset-0 opacity-40">
            <div className="grid grid-cols-3 gap-2 w-[150%] h-[150%] -ml-[25%] -mt-[25%] animate-[spin_60s_linear_infinite]">
              {[
                "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=600", // students
                "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=600", // black student
                "https://images.unsplash.com/photo-1515161318750-781d6122e367?auto=format&fit=crop&q=80&w=600", // asian student
                "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=600", // studying
                "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=600", // diverse group
                "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=600", // writing
                "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=600", // female student
                "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=600", // group laughing
                "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&q=80&w=600", // library
              ].map((src, i) => (
                <div key={i} className="relative w-full h-full overflow-hidden rounded-xl">
                  <img src={src} alt="Student" className="object-cover w-full h-full" />
                </div>
              ))}
            </div>
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-white/20">
              <BrainCircuit className="w-8 h-8 text-white" />
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight drop-shadow-lg">
              {isLogin ? "Que bom ver você!" : "Junte-se à Revolução"}
            </h1>
            
            <p className="text-zinc-300 text-sm md:text-base max-w-sm leading-relaxed font-medium mb-10 drop-shadow-md">
              O Exam Solver AI analisa imagens de provas, reconhece equações e fornece resoluções com <strong>Precisão Absoluta</strong>. 
              {isLogin ? " Entre para continuar de onde parou." : " Cadastre-se e ganhe 100 créditos iniciais gratuitos."}
            </p>
          </div>
          
          <div className="absolute bottom-6 text-xs font-medium text-zinc-500 z-10">
            © {new Date().getFullYear()} Exam Solver AI
          </div>
        </div>`;

code = code.replace(/\{\/\* Right Side: Branding[\s\S]*?<\/div>[\s\r\n]*<\/div>[\s\r\n]*<\/div>[\s\r\n]*\);[\s\r\n]*\}/, rightSideReplacement + "\n\n      </div>\n    </div>\n  );\n}");

fs.writeFileSync("src/app/login/page.tsx", code);

