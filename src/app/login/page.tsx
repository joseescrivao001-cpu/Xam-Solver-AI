import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Exam Solver AI</h1>
          <p className="text-muted-foreground">
            Faça login para resolver suas provas com precisão absoluta.
          </p>
        </div>
        <div className="space-y-4">
          <Button className="w-full" variant="default">
            Entrar com Google
          </Button>
          <Button className="w-full" variant="outline">
            Entrar com Email
          </Button>
        </div>
      </div>
    </div>
  );
}
