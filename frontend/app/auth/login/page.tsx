import { LoginForm } from "@/components/formulario-login";

export default function Page() {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2 bg-white">
      {/* Coluna da Esquerda: Branding e Ilustração */}
      <div className="hidden md:flex flex-col justify-between p-12 bg-[#E6E0F8] relative overflow-hidden">
        <div className="z-10">
          <div className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 bg-[#6D44CC] rounded flex items-center justify-center text-white font-bold">
              D
            </div>
            <span className="text-2xl font-bold text-[#1A1A1A] tracking-tight">Digital Class</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-extrabold text-[#4A4A4A] leading-tight max-w-md">
            Aprendizado sem limites, onde você estiver com a <span className="text-[#F38B4B]">Digital Class</span>
          </h1>
        </div>

        {/* Espaço para a Ilustração similar à referência */}
        <div className="relative z-10 mt-auto">
          {/* Aqui você pode inserir o componente de imagem ou SVG da ilustração */}
          <div className="w-full max-w-md aspect-square bg-transparent rounded-lg flex items-end">
             <p className="text-sm text-[#6D44CC] font-semibold italic">
               Capacitando mentes através da tecnologia aplicada à educação.
             </p>
          </div>
        </div>
        
        {/* Elemento Decorativo (Opcional - Círculo de fundo) */}
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#DCD4F5] rounded-full blur-3xl opacity-50" />
      </div>

      {/* Coluna da Direita: Formulário */}
      <div className="flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-[400px]">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}


