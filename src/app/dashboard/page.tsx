"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UploadCloud, BrainCircuit } from "lucide-react";

export default function DashboardPage() {
  const [mode, setMode] = useState("estudo");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [isSolving, setIsSolving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSolve = async () => {
    if (!imageFile && !questionText) return;
    setIsSolving(true);
    // Aqui virá a lógica de Upload para Supabase e chamada da API do Gemini (Fase 3)
    setTimeout(() => {
      setIsSolving(false);
      alert("Integração da API virá na próxima fase!");
    }, 2000);
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
                    accept="image/*"
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
              disabled={isSolving || (!imageFile && !questionText)}
            >
              {isSolving ? (
                <>
                  <BrainCircuit className="mr-2 h-5 w-5 animate-pulse" />
                  Processando Raciocínio...
                </>
              ) : (
                "Resolver Agora"
              )}
            </Button>

          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="h-full min-h-[400px]">
          <CardHeader>
            <CardTitle>Resposta da IA</CardTitle>
            <CardDescription>A solução aparecerá aqui estruturada.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-sm">
            Nenhuma questão resolvida ainda.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
