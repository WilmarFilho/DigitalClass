import Link from "next/link";

export default function Page() {
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
          <h2 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900">Obrigado por se cadastrar!</h2>
          <p className="text-xs md:text-sm text-gray-500">Confira seu e-mail para confirmar sua conta antes de entrar.</p>
        </div>

        {/* Destaque */}
        <div className="bg-[#E6E0F8] rounded-lg p-4 md:p-6">
          <p className="text-xs md:text-sm text-[#6D44CC] font-semibold">
            📧 Enviamos um link de confirmação para o seu e-mail. Verifique também sua caixa de spam.
          </p>
        </div>

        {/* Ação */}
        <Link
          href="/auth"
          className="inline-flex items-center justify-center w-full h-10 md:h-12 bg-[#6D44CC] hover:bg-[#5a38a8] text-white font-bold text-sm md:text-base rounded-md transition-all"
        >
          Ir para o Login
        </Link>

        <p className="text-center text-xs md:text-sm text-gray-500">
          Não recebeu o e-mail?{" "}
          <button className="text-[#F38B4B] font-bold hover:underline">Reenviar</button>
        </p>
      </div>
    </main>
  );
}
