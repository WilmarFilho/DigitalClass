import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card className="bg-white border-slate-200 shadow-lg shadow-slate-200/50">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-900">
                Obrigado por se cadastrar!
              </CardTitle>
              <CardDescription className="text-slate-600">Confira seu e-mail</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Cadastro realizado com sucesso. Confira seu e-mail para confirmar sua conta antes de entrar.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
