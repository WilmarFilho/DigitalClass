"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AuthError } from "@supabase/supabase-js";

interface SignUpFormProps extends React.ComponentPropsWithoutRef<"div"> {
  onSwitch: () => void;
}

export function SignUpForm({ className, onSwitch, ...props }: SignUpFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/onboarding` },
      });
      if (signUpError) throw signUpError;
      alert("Verifique seu e-mail para confirmar o cadastro!");
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Erro ao cadastrar.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-8", className)} {...props}>
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Criar conta</h2>
        <p className="text-sm text-gray-500">Comece sua jornada na Digital Class.</p>
      </div>

      <form onSubmit={handleSignUp} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs uppercase font-bold text-gray-400">E-mail</Label>
          <Input 
            type="email" 
            placeholder="nome@exemplo.com" 
            className="h-12"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase font-bold text-gray-400">Senha</Label>
          <Input 
            type="password" 
            className="h-12"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
        </div>

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

        <Button type="submit" disabled={isLoading} className="w-full h-12 bg-[#6D44CC] hover:bg-[#5a38a8]">
          {isLoading ? "Criando..." : "Cadastrar"}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Já tem uma conta?{" "}
        <button onClick={onSwitch} type="button" className="text-[#F38B4B] font-bold hover:underline">
          Fazer Login
        </button>
      </p>
    </div>
  );
}