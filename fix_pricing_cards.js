const fs = require('fs');
let content = fs.readFileSync('src/app/pricing/page.tsx', 'utf-8');

const regex = /\{\/\* 3 Monumental Cards \*\/\}[\s\S]*?<\/main>/;

const newCards = `{/* 3 Monumental Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-20">
          
          {/* 1. PLANO FREE */}
          <div className="relative rounded-3xl p-8 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 flex flex-col justify-between hover:border-zinc-700 transition-all duration-300 group hover:shadow-xl hover:shadow-black/40">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Iniciante</span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-300">
                  {currentPlan === 'free' ? 'Seu Plano Atual' : 'Base'}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">Plano Free</h3>
              <p className="text-xs text-zinc-400 mb-6">Ideal para testar a plataforma e resoluções básicas.</p>
              
              <div className="flex items-baseline gap-1.5 mb-8">
                <span className="text-4xl font-extrabold text-white">0 Kz</span>
                <span className="text-xs text-zinc-500">/ grátis inicial</span>
              </div>

              <div className="space-y-3.5 border-t border-zinc-800/80 pt-6 text-sm text-zinc-300">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-zinc-400" />
                  </div>
                  <span className="font-semibold text-white">50 Créditos Iniciais</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-zinc-400" />
                  </div>
                  <span>Cerebras LLaMA 3.1 8B</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-zinc-400" />
                  </div>
                  <span>Upload de Imagens</span>
                </div>
              </div>
            </div>

            <Button 
              disabled={currentPlan === 'free'}
              onClick={() => setIsPricingModalOpen(true)}
              variant="outline" 
              className="w-full mt-8 border-zinc-800 text-zinc-400 hover:text-white rounded-2xl h-12"
            >
              {currentPlan === 'free' ? 'Plano Ativo' : 'Grátis'}
            </Button>
          </div>

          {/* 2. PLANO PRO */}
          <div className="relative rounded-3xl p-8 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 flex flex-col justify-between hover:border-zinc-700 transition-all duration-300 group hover:shadow-xl hover:shadow-black/40">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Intermédio</span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-300">
                  {currentPlan === 'pro' ? 'Seu Plano Atual' : 'Popular'}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">Plano Pro</h3>
              <p className="text-xs text-zinc-400 mb-6">Ideal para estudos diários e dúvidas de matérias.</p>
              
              <div className="flex items-baseline gap-1.5 mb-8">
                <span className="text-4xl font-extrabold text-white">{proAoa}</span>
                <span className="text-xs text-zinc-500">/ \${proUsd} USD</span>
              </div>

              <div className="space-y-3.5 border-t border-zinc-800/80 pt-6 text-sm text-zinc-300">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-zinc-400" />
                  </div>
                  <span className="font-semibold text-white">22.000 Créditos</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-zinc-400" />
                  </div>
                  <span>Cerebras LLaMA 3.1 70B</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-zinc-400" />
                  </div>
                  <span>Leitura de Provas (OCR via IA)</span>
                </div>
              </div>
            </div>

            <Button 
              disabled={currentPlan === 'pro'}
              onClick={() => setIsPricingModalOpen(true)}
              variant="outline" 
              className="w-full mt-8 border-zinc-800 text-zinc-400 hover:text-white rounded-2xl h-12"
            >
              {currentPlan === 'pro' ? 'Plano Ativo' : 'Selecionar'}
            </Button>
          </div>

          {/* 3. PLANO ULTRA (Mais Popular) */}
          <div className="relative rounded-3xl p-8 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border-2 border-violet-500/80 flex flex-col justify-between shadow-2xl shadow-violet-500/20 transform md:-translate-y-4 hover:scale-[1.02] transition-all duration-300">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-md flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Máximo Poder
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-400">Avançado</span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {currentPlan === 'ultra' ? 'Seu Plano Atual' : 'Elite'}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">Plano Ultra</h3>
              <p className="text-xs text-zinc-400 mb-6">Para vestibulandos, concurseiros e universitários.</p>
              
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-4xl font-extrabold text-white">{ultraAoa}</span>
                <span className="text-xs text-zinc-400 font-medium">/ \${ultraUsd} USD</span>
              </div>

              <div className="space-y-3.5 border-t border-zinc-800 pt-6 text-sm text-zinc-200">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-400" />
                  </div>
                  <span className="font-bold text-white text-base">100.000 Créditos</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-400" />
                  </div>
                  <span className="font-semibold text-violet-300">Cerebras LLaMA 3.1 70B</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-400" />
                  </div>
                  <span>Upload Ilimitado de PDFs</span>
                </div>
              </div>
            </div>

            <Button 
              disabled={currentPlan === 'ultra'}
              onClick={() => setIsPricingModalOpen(true)}
              className="w-full mt-8 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl h-12 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all font-semibold"
            >
              {currentPlan === 'ultra' ? 'Plano Ativo' : 'Fazer Upgrade Ultra'}
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-12 items-start md:items-center justify-between">
          <div className="max-w-xl">
            <h4 className="font-semibold text-white text-base mb-1.5">Como é calculada a cotação em Kwanzas (Kz)?</h4>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Os valores dos planos Pro (\${proUsd} USD) e Ultra (\${ultraUsd} USD) são convertidos automaticamente utilizando a taxa de câmbio comercial da internet em tempo real.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium">
            <div className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-zinc-400" /> Pagamento Seguro</div>
            <div className="flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-zinc-400" /> Aceitamos Express</div>
          </div>
        </div>
      </main>`;

content = content.replace(regex, newCards);

// Also remove `premiumAoa` and `premiumUsd` from top level if I'm not using them, to fix linting.
content = content.replace(/const premiumAoa = [^\n]*\n/, "");
content = content.replace(/const premiumUsd = [^\n]*\n/, "");

fs.writeFileSync('src/app/pricing/page.tsx', content);
