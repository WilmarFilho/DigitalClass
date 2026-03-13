"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoginForm } from "@/components/formulario-login";
import { SignUpForm } from "@/components/formulario-cadastro";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <main className="relative min-h-screen w-full bg-white overflow-hidden">
      {/* CAMADA 1: Formulários (Fundo)
        Usamos flex-row para colocar as duas áreas de formulário lado a lado.
      */}
      <div className="flex min-h-screen w-full">
        {/* Área para o Cadastro (aparece na esquerda quando isLogin é false) */}
        <div className="hidden md:flex w-1/2 items-center justify-center p-8 lg:p-12">
          {!isLogin && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-[400px]"
            >
               {/* Barra de Progresso conforme referência */}
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

        {/* Área para o Login (aparece na direita quando isLogin é true) */}
        <div className="flex w-full md:w-1/2 items-center justify-center p-8 lg:p-12">
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

      {/* CAMADA 2: Branding (Sobreposição)
        Esta coluna desliza sobre os formulários.
      */}
      <motion.div 
        initial={false}
        animate={{ 
          x: isLogin ? "0%" : "100%", 
        }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 left-0 z-20 hidden md:flex md:w-1/2 h-full flex-col justify-between p-12 bg-[#E6E0F8] shadow-2xl pointer-events-none"
      >
        <div className="z-10 pointer-events-auto">
          <div className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 bg-[#6D44CC] rounded flex items-center justify-center text-white font-bold">D</div>
            <span className="text-2xl font-bold text-[#1A1A1A] tracking-tight">Digital Class</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-extrabold text-[#4A4A4A] leading-tight max-w-md">
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
              className="text-sm text-[#6D44CC] font-semibold italic max-w-xs"
            >
              {isLogin 
                ? "Bom te ver novamente! Continue sua jornada de conhecimento." 
                : "Comece algo novo hoje. Junte-se à nossa comunidade de alunos."}
            </motion.p>
          </AnimatePresence>
        </div>
        
        {/* Elemento Decorativo */}
        <motion.div 
          animate={{ rotate: isLogin ? 0 : 180 }}
          className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#DCD4F5] rounded-full blur-3xl opacity-50" 
        />
      </motion.div>

      {/* Mobile: Apenas o formulário ativo */}
      <div className="md:hidden flex min-h-screen items-center justify-center p-6">
         {isLogin ? <LoginForm onSwitch={() => setIsLogin(false)} /> : <SignUpForm onSwitch={() => setIsLogin(true)} />}
      </div>
    </main>
  );
}