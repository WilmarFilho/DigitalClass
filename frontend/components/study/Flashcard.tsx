"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface FlashcardProps {
  question: string;
  answer: string;
  color?: string;
  index?: number;
}

export function Flashcard({ question, answer, color = "#4F46E5", index = 0 }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="h-[200px] w-full"
      style={{ perspective: "1000px" }}
    >
      <motion.div
        className="relative h-full w-full cursor-pointer"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 100, damping: 20 }}
        onClick={() => setFlipped((f) => !f)}
      >
        {/* Frente */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-6 shadow-lg"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(0deg)",
          }}
        >
          <div
            className="absolute left-0 top-0 h-1.5 w-full rounded-t-xl"
            style={{ backgroundColor: color }}
          />
          <p className="text-center text-slate-800 font-medium leading-relaxed">
            {question}
          </p>
          <p className="mt-2 text-xs text-slate-500">Clique para ver a resposta</p>
        </div>

        {/* Verso */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border-2 p-6 shadow-lg"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            backgroundColor: color,
            borderColor: color,
            color: "white",
          }}
        >
          <p className="text-center font-medium leading-relaxed">{answer}</p>
          <p className="mt-2 text-xs opacity-80">Clique para voltar</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
