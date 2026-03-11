import { LoginForm } from "@/components/formulario-login";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-slate-50">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
