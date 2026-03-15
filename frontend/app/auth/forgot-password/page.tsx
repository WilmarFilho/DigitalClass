import { ForgotPasswordForm } from "@/components/formulario-esqueci-senha";

export default function Page() {
  return (
    <main className="min-h-screen w-full bg-white flex items-center justify-center px-4 py-6 sm:p-6 md:p-10">
      <div className="w-full max-w-[400px] flex flex-col gap-4 md:gap-8">
        {/* Logo */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#6D44CC] rounded flex items-center justify-center text-white font-bold text-xs sm:text-base">D</div>
          <span className="text-base sm:text-xl md:text-2xl font-bold text-[#1A1A1A] tracking-tight">Digital Class</span>
        </div>

        {/* Formulário */}
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
