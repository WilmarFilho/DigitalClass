"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoginForm } from "@/components/formulario-login";
import { SignUpForm } from "@/components/formulario-cadastro";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <main className="relative min-h-screen w-full bg-white overflow-hidden">

      {/* =============================================
          DESKTOP (md+): Layout horizontal original
          ============================================= */}
      <div className="hidden md:flex min-h-screen w-full">
        {/* Área para o Cadastro (esquerda) */}
        <div className="flex w-1/2 items-center justify-center p-8 lg:p-12">
          {!isLogin && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-[400px]"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex gap-2">
                  <div className="w-8 h-1 bg-[#6D44CC] rounded" />
                  <div className="w-8 h-1 bg-gray-100 rounded" />
                  <div className="w-8 h-1 bg-gray-100 rounded" />
                  <div className="w-8 h-1 bg-gray-100 rounded" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Passo 1 de 4</span>
              </div>
              <SignUpForm onSwitch={() => setIsLogin(true)} />
            </motion.div>
          )}
        </div>

        {/* Área para o Login (direita) */}
        <div className="flex w-1/2 items-center justify-center p-8 lg:p-12">
          {isLogin && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-[400px]"
            >
              <LoginForm onSwitch={() => setIsLogin(false)} />
            </motion.div>
          )}
        </div>
      </div>

      {/* Desktop: Branding desliza horizontalmente */}
      <motion.div
        initial={false}
        animate={{ x: isLogin ? "0%" : "100%" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 left-0 z-20 hidden md:flex md:w-1/2 h-full flex-col justify-between p-6 md:p-8 lg:p-12 bg-[#E6E0F8] shadow-2xl pointer-events-none"
      >
        <div className="z-10 pointer-events-auto">
          <div className="flex items-center gap-2 mb-6 md:mb-8 lg:mb-12">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-[#6D44CC] rounded flex items-center justify-center text-white font-bold text-sm md:text-base">D</div>
            <span className="text-lg md:text-xl lg:text-2xl font-bold text-[#1A1A1A] tracking-tight">Digital Class</span>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-5xl font-extrabold text-[#4A4A4A] leading-tight max-w-md">
            Aprendizado sem limites, onde você estiver com a <span className="text-[#F38B4B]">Digital Class</span>
          </h1>
        </div>

        <div className="relative z-10 mt-auto pointer-events-auto">
          <AnimatePresence mode="wait">
            <motion.p
              key={isLogin ? "txt-login" : "txt-signup"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-xs md:text-sm text-[#6D44CC] font-semibold italic max-w-xs"
            >
              {isLogin
                ? "Bom te ver novamente! Continue sua jornada de conhecimento."
                : "Comece algo novo hoje. Junte-se à nossa comunidade de alunos."}
            </motion.p>
          </AnimatePresence>
        </div>

        <motion.div
          animate={{ rotate: isLogin ? 0 : 180 }}
          className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#DCD4F5] rounded-full blur-3xl opacity-50"
        />
      </motion.div>

      {/* =============================================
          MOBILE (<768px): Layout vertical com animação
          ============================================= */}
      <div className="md:hidden relative h-screen w-full">
        {/* Formulário de Login (metade inferior — visível quando branding está no topo) */}
        <div className={`absolute bottom-16 left-0 w-full h-[50%] flex items-start justify-start px-4 py-2 sm:p-6 [@media(max-height:700px)]:relative [@media(max-height:700px)]:bottom-auto [@media(max-height:700px)]:h-full [@media(max-height:700px)]:items-center [@media(max-height:700px)]:justify-center ${!isLogin ? '[@media(max-height:700px)]:hidden' : ''}`}>
          <AnimatePresence mode="wait">
            {isLogin && (
              <motion.div
                key="mobile-login"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.3 }}
                className="w-full max-w-[400px]"
              >
                <LoginForm onSwitch={() => setIsLogin(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Formulário de Cadastro (metade superior — visível quando branding desce) */}
        <div className={`absolute top-10 left-0 w-full h-1/3 flex items-start justify-start px-4 py-2 sm:p-6 [@media(max-height:700px)]:relative [@media(max-height:700px)]:top-auto [@media(max-height:700px)]:h-full [@media(max-height:700px)]:items-center [@media(max-height:700px)]:justify-center ${isLogin ? '[@media(max-height:700px)]:hidden' : ''}`}>
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                key="mobile-signup"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.3 }}
                className="w-full max-w-[400px]"
              >
                <div className="flex justify-between items-center mb-2 sm:mb-4">
                  <div className="flex gap-1.5 sm:gap-2">
                    <div className="w-6 sm:w-8 h-1 bg-[#6D44CC] rounded" />
                    <div className="w-6 sm:w-8 h-1 bg-gray-100 rounded" />
                    <div className="w-6 sm:w-8 h-1 bg-gray-100 rounded" />
                    <div className="w-6 sm:w-8 h-1 bg-gray-100 rounded" />
                  </div>
                  <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase">Passo 1 de 4</span>
                </div>
                <SignUpForm onSwitch={() => setIsLogin(true)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile: Branding desliza verticalmente (top ↔ bottom) */}
        <motion.div
          initial={false}
          animate={{ y: isLogin ? "0%" : "200%" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-0 left-0 z-20 w-full h-1/3 flex flex-col justify-between p-4 sm:p-6 bg-[#E6E0F8] shadow-2xl pointer-events-none [@media(max-height:700px)]:hidden"
        >
          <div className="z-10 pointer-events-auto">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#6D44CC] rounded flex items-center justify-center text-white font-bold text-xs sm:text-base">D</div>
              <span className="text-base sm:text-xl font-bold text-[#1A1A1A] tracking-tight">Digital Class</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-[#4A4A4A] leading-tight max-w-xs">
              Aprendizado sem limites, onde você estiver com a <span className="text-[#F38B4B]">Digital Class</span>
            </h1>
          </div>

          <div className="relative z-10 mt-auto pointer-events-auto">
            <AnimatePresence mode="wait">
              <motion.p
                key={isLogin ? "mob-txt-login" : "mob-txt-signup"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-xs sm:text-sm text-[#6D44CC] font-semibold italic max-w-xs"
              >
                {isLogin
                  ? "Bom te ver novamente! Continue sua jornada de conhecimento."
                  : "Comece algo novo hoje. Junte-se à nossa comunidade de alunos."}
              </motion.p>
            </AnimatePresence>
          </div>

          <motion.div
            animate={{ rotate: isLogin ? 0 : 180 }}
            className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#DCD4F5] rounded-full blur-3xl opacity-50"
          />
        </motion.div>
      </div>

    </main>
  );
}