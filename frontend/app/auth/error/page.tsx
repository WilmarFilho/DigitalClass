import Link from "next/link";
import { Suspense } from "react";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  return (
    <p className="text-xs md:text-sm text-gray-500">
      {params?.error
        ? `Erro: ${params.error}`
        : "Ocorreu um erro inesperado."}
    </p>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <main className="min-h-screen w-full bg-white flex items-center justify-center px-4 py-6 sm:p-6 md:p-10">
      <div className="w-full max-w-[400px] flex flex-col gap-4 md:gap-8">
        {/* Logo */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#6D44CC] rounded flex items-center justify-center text-white font-bold text-xs sm:text-base">D</div>
          <span className="text-base sm:text-xl md:text-2xl font-bold text-[#1A1A1A] tracking-tight">Digital Class</span>
        </div>

        {/* Conteúdo */}
        <div className="flex flex-col gap-1 md:gap-2">
          <h2 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900">Algo deu errado</h2>
          <Suspense>
            <ErrorContent searchParams={searchParams} />
          </Suspense>
        </div>

        {/* Ação */}
        <Link
          href="/auth"
          className="inline-flex items-center justify-center w-full h-10 md:h-12 bg-[#6D44CC] hover:bg-[#5a38a8] text-white font-bold text-sm md:text-base rounded-md transition-all"
        >
          Voltar ao Login
        </Link>

        <p className="text-center text-xs md:text-sm text-gray-500">
          Precisa de ajuda?{" "}
          <span className="text-[#F38B4B] font-bold">Entre em contato</span>
        </p>
      </div>
    </main>
  );
}
