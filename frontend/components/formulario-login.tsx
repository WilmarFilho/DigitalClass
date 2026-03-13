"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AuthError } from "@supabase/supabase-js";

// Definindo a interface para aceitar onSwitch e props de div
interface LoginFormProps extends React.ComponentPropsWithoutRef<"div"> {
  onSwitch: () => void;
}

export function LoginForm({ className, onSwitch, ...props }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError) throw authError;
      
      router.push("/protected");
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message);
      } else {
        setError("Ocorreu um erro inesperado ao entrar.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-8", className)} {...props}>
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Bem-vindo de volta</h2>
        <p className="text-sm text-gray-500">Acesse sua plataforma de estudos agora.</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs uppercase font-bold text-gray-400 tracking-wider">
            Endereço de E-mail
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="nome@exemplo.com"
            className="h-12 border-gray-200 focus:ring-[#6D44CC] focus:border-[#6D44CC]"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs uppercase font-bold text-gray-400 tracking-wider">
              Senha
            </Label>
            {/* Link para recuperação de senha - Ajustado para não recarregar a página desnecessariamente */}
            <button 
              type="button"
              onClick={() => router.push("/auth/forgot-password")}
              className="text-xs font-semibold text-[#F38B4B] hover:opacity-80"
            >
              Esqueceu a senha?
            </button>
          </div>
          <Input
            id="password"
            type="password"
            className="h-12 border-gray-200 focus:ring-[#6D44CC] focus:border-[#6D44CC]"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full h-12 bg-[#6D44CC] hover:bg-[#5a38a8] text-white font-bold text-base rounded-md transition-all"
        >
          {isLoading ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-100" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-4 text-gray-400 font-medium">Ou</span>
        </div>
      </div>

      <Button 
        variant="outline" 
        type="button"
        onClick={() => {}} 
        className="w-full h-12 border-gray-100 bg-gray-50/50 hover:bg-gray-100 text-gray-600 font-semibold"
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continuar com Google
      </Button>

      <p className="text-center text-sm text-gray-500">
        Novo por aqui?{" "}
        <button 
          type="button" 
          onClick={onSwitch} 
          className="text-[#F38B4B] font-bold hover:underline"
        >
          Cadastre-se
        </button>
      </p>
    </div>
  );
}