"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UploadCloud, BrainCircuit, AlertCircle, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";

export default function DashboardPage() {
  const [mode, setMode] = useState("estudo");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [isSolving, setIsSolving] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSolve = async () => {
    if (!imageFile && !questionText) return;
    
    setIsSolving(true);
    setError(null);
    setResponse(null);

    const formData = new FormData();
    formData.append("mode", mode);
    if (questionText) formData.append("text", questionText);
    if (imageFile) formData.append("file", imageFile);

    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errText = "Erro na resposta do servidor.";
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errData = await res.json();
          errText = errData.error || errText;
        } else {
          errText = await res.text();
        }
        throw new Error(errText || "Ocorreu um erro na conexão (Timeout ou Falha no Edge).");
      }

      setIsSolving(false);
      setIsStreaming(true);
      setResponse("");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Erro ao iniciar o stream.");

      const decoder = new TextDecoder();
      let streamedData = "";
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          streamedData += decoder.decode(value, { stream: true });
          setResponse(streamedData);
        }
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro inesperado.");
    } finally {
      setIsSolving(false);
      setIsStreaming(false);
    }
  };

  return (
    <div className="grid gap-8 md:grid-cols-2 relative z-10">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="space-y-6"
      >
        <Card className="bg-zinc-900/40 backdrop-blur-md border-zinc-800 rounded-2xl shadow-xl overflow-hidden hover:-translate-y-1 transition-transform duration-500">
          <CardHeader className="border-b border-zinc-800/50 bg-zinc-900/20">
            <CardTitle className="text-zinc-100 font-sans tracking-tight">Análise Estratégica</CardTitle>
            <CardDescription className="text-zinc-400">
              Forneça os dados da questão para processamento neural.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            
            <div className="space-y-3">
              <Label className="text-zinc-300 font-medium">Input Visual</Label>
              <div 
                className="flex w-full items-center justify-center relative"
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setImageFile(e.dataTransfer.files[0]);
                  }
                }}
              >
                <label
                  htmlFor="dropzone-file"
                  className={`flex h-44 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 ${isDragging ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]' : 'border-zinc-700 bg-zinc-950/50 hover:bg-zinc-900 hover:border-zinc-600'}`}
                >
                  <div className="flex flex-col items-center justify-center pb-6 pt-5">
                    <UploadCloud className={`mb-3 h-10 w-10 transition-colors ${isDragging ? 'text-indigo-400' : 'text-zinc-500'}`} />
                    <p className="mb-2 text-sm text-zinc-400 text-center px-4">
                      <span className="font-semibold text-zinc-200">Clique para selecionar</span> ou arraste a imagem aqui
                    </p>
                    <p className="text-xs text-zinc-500">Alta resolução recomendada (PNG, JPG)</p>
                  </div>
                  <Input
                    id="dropzone-file"
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              <AnimatePresence>
                {imageFile && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm font-medium text-indigo-400 flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {imageFile.name}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-3">
              <Label className="text-zinc-300 font-medium">Contexto Adicional (Opcional)</Label>
              <Textarea 
                placeholder="Insira diretrizes ou o texto da questão se a imagem estiver ilegível..." 
                className="resize-none bg-zinc-950/50 border-zinc-800 focus:border-indigo-500 rounded-xl transition-all"
                rows={3}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-zinc-300 font-medium">Arquitetura de Resolução</Label>
              <Select value={mode} onValueChange={(val) => setMode(val || "estudo")}>
                <SelectTrigger className="bg-zinc-950/50 border-zinc-800 rounded-xl focus:ring-indigo-500">
                  <SelectValue placeholder="Selecione o framework" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 rounded-xl">
                  <SelectItem value="prova">Padrão Prova (Direto ao ponto)</SelectItem>
                  <SelectItem value="estudo">Padrão Estudo (Desconstrução Didática)</SelectItem>
                  <SelectItem value="dificil">Padrão Alta Complexidade (Deep Analysis)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/20 border-0 transition-all duration-300 group" 
              size="lg" 
              onClick={handleSolve}
              disabled={isSolving || isStreaming || (!imageFile && !questionText)}
            >
              {isSolving ? (
                <>
                  <BrainCircuit className="mr-2 h-5 w-5 animate-pulse" />
                  Sintetizando...
                </>
              ) : isStreaming ? (
                <>
                  <div className="mr-3 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Stream Ativo...
                </>
              ) : (
                <span className="flex items-center gap-2">
                  Iniciar Processamento <span className="opacity-70 text-xs font-normal border border-white/20 px-2 py-0.5 rounded-md">- 1 Crédito</span>
                </span>
              )}
            </Button>
            
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-3 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400 shadow-inner"
                >
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

          </CardContent>
        </Card>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        className="space-y-6"
      >
        <Card className="h-full min-h-[500px] bg-zinc-900/40 backdrop-blur-md border-zinc-800 rounded-2xl shadow-xl overflow-hidden flex flex-col hover:-translate-y-1 transition-transform duration-500">
          <CardHeader className="border-b border-zinc-800/50 bg-zinc-900/20 flex flex-row items-center justify-between py-4">
            <div>
              <CardTitle className="text-zinc-100 font-sans tracking-tight">Output Neural</CardTitle>
              <CardDescription className="text-zinc-400">Canal de resposta em tempo real.</CardDescription>
            </div>
            
            <AnimatePresence>
              {(isStreaming || response) && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full"
                >
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                    {isStreaming ? "Calculando" : "Finalizado"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

          </CardHeader>
          <CardContent className="flex-1 p-6 overflow-auto">
            {isSolving ? (
              <div className="flex h-full flex-col items-center justify-center space-y-6 text-zinc-500">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full blur-xl bg-indigo-500/20 animate-pulse" />
                  <BrainCircuit className="h-16 w-16 relative z-10 text-indigo-400 animate-[spin_4s_linear_infinite]" />
                </div>
                <p className="font-sans text-sm tracking-widest uppercase">Estabelecendo Conexão...</p>
              </div>
            ) : response !== null ? (
              <div className="prose prose-invert prose-sm max-w-none font-serif leading-relaxed text-zinc-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {response}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-zinc-600 font-sans text-sm border-2 border-dashed border-zinc-800/50 rounded-xl p-8 text-center">
                <BrainCircuit className="h-8 w-8 mb-4 opacity-50" />
                <p>Aguardando submissão de dados.</p>
                <p className="text-xs mt-2 opacity-60">Os resultados aparecerão aqui estruturados.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
