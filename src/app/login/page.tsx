"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Erro no login:", error);
      setIsLoading(false);
    }
  };

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
          <Button 
            className="w-full" 
            variant="default" 
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? "Conectando..." : "Entrar com Google"}
          </Button>
          <Button className="w-full" variant="outline" disabled={isLoading}>
            Entrar com Email
          </Button>
        </div>
      </div>
    </div>
  );
}
