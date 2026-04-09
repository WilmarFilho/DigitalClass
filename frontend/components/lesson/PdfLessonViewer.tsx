"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface PdfLessonViewerProps {
  lessonId: string;
  title: string;
  sourceUrl?: string | null;
  className?: string;
}

export function PdfLessonViewer({ lessonId, title, sourceUrl, className }: PdfLessonViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const pdfEndpoint = useMemo(() => `/teachers/lessons/${lessonId}/pdf`, [lessonId]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    setIsMobile(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    setLoading(true);
    setError(null);
    setPdfUrl(null);

    const loadPdf = async () => {
      try {
        let response: Response;

        if (sourceUrl) {
          response = await fetch(sourceUrl, { credentials: "omit" });
        } else {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
          response = await fetch(`${baseUrl}${pdfEndpoint}`, {
            headers: session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : undefined,
          });
        }

        if (!response.ok) {
          throw new Error("PDF fetch failed");
        }

        const blob = await response.blob();
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch {
        if (!active) return;
        setError("Não foi possível carregar este PDF no visualizador.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPdf();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pdfEndpoint, sourceUrl]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          <p className="text-sm font-medium text-slate-300">Carregando PDF...</p>
        </div>
      </div>
    );
  }

  const hasRenderableSource = Boolean(pdfUrl);

  if (error || !hasRenderableSource) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 p-6 text-white">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-amber-400" />
          <div>
            <p className="text-base font-semibold">{error ?? "PDF indisponível."}</p>
            <p className="mt-2 text-sm text-slate-300">
              Você ainda pode abrir o conteúdo em uma nova aba.
            </p>
          </div>
          <Button asChild variant="secondary" className="rounded-xl">
            <a href={sourceUrl ?? pdfEndpoint} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir PDF
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-slate-950">
      <div className="absolute right-4 top-4 z-10">
        <Button asChild variant="secondary" className="rounded-xl shadow-lg">
          <a href={sourceUrl ?? pdfEndpoint} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Abrir PDF
          </a>
        </Button>
      </div>

      {isMobile ? (
        <div className="flex h-full w-full items-center justify-center p-6 text-white">
          <div className="max-w-sm text-center">
            <p className="text-base font-semibold">Abra o PDF no botão acima.</p>
            <p className="mt-2 text-sm text-slate-300">
              No celular, a visualização embutida pode falhar. Mantivemos apenas o atalho que funciona.
            </p>
          </div>
        </div>
      ) : (
        <iframe
          src={pdfUrl ?? undefined}
          className={className ?? "h-full w-full border-none"}
          title={title}
        />
      )}
    </div>
  );
}
