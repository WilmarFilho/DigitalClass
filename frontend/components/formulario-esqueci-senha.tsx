"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ocorreu um erro.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <Card className="bg-white border-slate-200 shadow-lg shadow-slate-200/50">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-900">Verifique seu e-mail</CardTitle>
            <CardDescription className="text-slate-600">
              Instruções para redefinir a senha foram enviadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Se você se cadastrou com e-mail e senha, receberá um e-mail com o link para redefinir sua senha.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white border-slate-200 shadow-lg shadow-slate-200/50">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-900">Redefinir senha</CardTitle>
            <CardDescription className="text-slate-600">
              Digite seu e-mail e enviaremos um link para redefinir sua senha
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-slate-700">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Enviando..." : "Enviar link de redefinição"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm text-slate-600">
                Já tem uma conta?{" "}
                <Link
                  href="/auth"
                  className="text-slate-900 underline underline-offset-4 hover:text-slate-700"
                >
                  Entrar
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
