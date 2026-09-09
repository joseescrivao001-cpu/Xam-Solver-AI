"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UploadCloud, BrainCircuit, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function DashboardPage() {
  const [mode, setMode] = useState("estudo");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [isSolving, setIsSolving] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      
      // Quando o stream acaba, recarrega para atualizar os créditos
      if (typeof window !== "undefined") {
        setTimeout(() => window.location.reload(), 3000);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro inesperado.");
    } finally {
      setIsSolving(false);
      setIsStreaming(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Nova Resolução</CardTitle>
            <CardDescription>
              Faça upload da foto da prova ou cole o texto da questão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-2">
              <Label>Imagem da Questão</Label>
              <div className="flex w-full items-center justify-center">
                <label
                  htmlFor="dropzone-file"
                  className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 hover:bg-muted"
                >
                  <div className="flex flex-col items-center justify-center pb-6 pt-5">
                    <UploadCloud className="mb-3 h-8 w-8 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Clique para fazer upload</span> ou arraste a imagem
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG ou JPEG</p>
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
              {imageFile && (
                <p className="text-sm font-medium text-primary">
                  Arquivo selecionado: {imageFile.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Texto da Questão (Opcional se enviou imagem)</Label>
              <Textarea 
                placeholder="Cole o texto aqui se a imagem estiver difícil de ler..." 
                className="resize-none"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Modo do Especialista</Label>
              <Select value={mode} onValueChange={(val) => setMode(val || "estudo")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prova">Modo Prova (Apenas Resposta Direta)</SelectItem>
                  <SelectItem value="estudo">Modo Estudo (Passo a Passo + Explicação)</SelectItem>
                  <SelectItem value="dificil">Modo Questão Difícil (Análise Profunda)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full" 
              size="lg" 
              onClick={handleSolve}
              disabled={isSolving || isStreaming || (!imageFile && !questionText)}
            >
              {isSolving ? (
                <>
                  <BrainCircuit className="mr-2 h-5 w-5 animate-pulse" />
                  Raciocinando...
                </>
              ) : isStreaming ? (
                <>
                  <BrainCircuit className="mr-2 h-5 w-5 text-green-500 animate-pulse" />
                  Escrevendo a Resposta...
                </>
              ) : (
                "Resolver Agora (Custa 1 Crédito)"
              )}
            </Button>
            
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="h-full min-h-[400px]">
          <CardHeader>
            <CardTitle>Resposta da IA</CardTitle>
            <CardDescription>A solução aparecerá aqui estruturada.</CardDescription>
          </CardHeader>
          <CardContent className="h-full">
            {isSolving ? (
              <div className="flex h-[300px] flex-col items-center justify-center space-y-4 text-muted-foreground">
                <BrainCircuit className="h-10 w-10 animate-pulse text-primary" />
                <p>O Especialista está analisando a questão...</p>
              </div>
            ) : response !== null ? (
              <div className="prose prose-sm dark:prose-invert max-w-none pb-8">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {response}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground text-sm">
                Nenhuma questão resolvida ainda.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
