import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-50 p-4">
      <h1 className="text-2xl font-bold text-slate-900">Página não encontrada</h1>
      <p className="text-slate-600">A página que você procura não existe.</p>
      <Link
        href="/auth"
        className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
      >
        Ir para o login
      </Link>
    </div>
  );
}
