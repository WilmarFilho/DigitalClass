"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { apiPost } from "@/lib/api";

interface Message {
    role: "assistant" | "user";
    content: string;
}

export function MemberAreaChat({ teacherAreaId }: { teacherAreaId: string }) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "Olá! Sou o assistente especializado desta área. Posso tirar dúvidas sobre as aulas, PDFs e vídeos subidos pelo professor. Como posso te ajudar hoje?"
        }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        setLoading(true);

        try {
            // Endpoint que criaremos para o RAG da Área de Membros
            const response = await apiPost<{ message: string }>(`/teacher-area/${teacherAreaId}/ai-chat`, {
                question: userMsg,
                history: messages
            });

            setMessages((prev) => [...prev, { role: "assistant", content: response.message }]);
        } catch (error) {
            setMessages((prev) => [...prev, { role: "assistant", content: "Ops, tive um problema ao consultar o material do professor. Tente novamente!" }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[620px] w-full bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            {/* Header do Chat */}
            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#6D44CC] flex items-center justify-center shadow-lg shadow-[#6D44CC]/20">
                        <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 leading-none">Tutor Especialista</h3>
                        <span className="text-[10px] font-bold text-[#6D44CC] uppercase tracking-wider">Baseado no conteúdo do curso</span>
                    </div>
                </div>
                <Sparkles className="h-4 w-4 text-slate-300" />
            </div>

            {/* Área de Mensagens */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                <AnimatePresence initial={false}>
                    {messages.map((msg, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={cn(
                                "flex w-full",
                                msg.role === "user" ? "justify-end" : "justify-start"
                            )}
                        >
                            <div className={cn(
                                "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
                                msg.role === "user"
                                    ? "bg-[#6D44CC] text-white rounded-tr-none shadow-md shadow-[#6D44CC]/10"
                                    : "bg-slate-100 text-slate-700 rounded-tl-none"
                            )}>
                                {msg.content}
                            </div>
                        </motion.div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none">
                                <Loader2 className="h-4 w-4 animate-spin text-[#6D44CC]" />
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Input de Mensagem */}
            <div className="p-4 bg-white border-t border-slate-50">
                <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:border-[#6D44CC] transition-all focus-within:ring-4 focus-within:ring-[#6D44CC]/5">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                        placeholder="Dúvida sobre a aula ou PDF..."
                        className="flex-1 bg-transparent px-4 py-2 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={!input.trim() || loading}
                        size="icon"
                        className="h-10 w-10 rounded-xl bg-[#6D44CC] hover:bg-[#5B39AB] text-white transition-all active:scale-95"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}