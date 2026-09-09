import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="mx-auto max-w-3xl space-y-8 px-6 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
          A IA que resolve suas provas com <span className="text-primary">Precisão Absoluta</span>.
        </h1>
        <p className="text-xl text-muted-foreground">
          Envie fotos de questões difíceis e receba a resolução passo a passo em segundos, operando com protocolo rigoroso de zero alucinação.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button asChild size="lg" className="h-12 px-8 text-lg">
            <Link href="/login">Testar Gratuitamente</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-8 text-lg">
            <Link href="/dashboard">Ir para o Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
