"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, Loader2, Bot, X, Sparkles, ChevronRight, Volume2, VolumeX, PlayCircle, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

interface ChatPanelProps {
  sessionId: string;
  subjectColor?: string;
  subjectTitle?: string;
  autoSpeak?: boolean;
  onAutoSpeakChange?: (value: boolean) => void;
  onAudioUiStateChange?: (state: {
    selectedAssistantMessageId: string | null;
    generatingAudioForId: string | null;
    playingAudioForId: string | null;
  }) => void;
  onPlaySelectedReady?: (handler: () => Promise<void>) => void;
  onStopAudioReady?: (handler: () => void) => void;
}

interface SessionHighlight {
  id: string;
  text: string;
}

interface ChatMessage {
  id?: string;
  role: string;
  content: string;
  created_at?: string;
}

interface ChatAudioPayload {
  content_base64: string;
  mime_type: string;
  voice: string;
}

interface ChatReplySegment {
  id: string;
  order: number;
  text: string;
  audio?: ChatAudioPayload;
}

interface ChatReply {
  message: string;
  message_id: string;
  segments?: ChatReplySegment[];
  audio?: ChatAudioPayload;
}

interface ActiveProgressivePlayback {
  messageId: string;
  segments: ChatReplySegment[];
  renderedSegments: number;
}

export function ChatPanel({
  sessionId,
  subjectColor = "#6D44CC",
  subjectTitle = "este tema",
  autoSpeak: controlledAutoSpeak,
  onAutoSpeakChange,
  onAudioUiStateChange,
  onPlaySelectedReady,
  onStopAudioReady,
}: ChatPanelProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [highlights, setHighlights] = useState<SessionHighlight[]>([]);
  const [input, setInput] = useState("");
  const [loadingIntro, setLoadingIntro] = useState(true);
  const [savingHighlight, setSavingHighlight] = useState(false);
  const [sending, setSending] = useState(false);
  const [internalAutoSpeak, setInternalAutoSpeak] = useState(true);
  const [selectedAssistantMessageId, setSelectedAssistantMessageId] = useState<string | null>(null);
  const [generatingAudioForId, setGeneratingAudioForId] = useState<string | null>(null);
  const [playingAudioForId, setPlayingAudioForId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlCacheRef = useRef<Record<string, string>>({});
  const audioPayloadCacheRef = useRef<Record<string, ChatAudioPayload>>({});
  const segmentAudioPromiseCacheRef = useRef<Record<string, Promise<ChatAudioPayload>>>({});
  const messageSegmentsRef = useRef<Record<string, ChatReplySegment[]>>({});
  const progressivePlaybackTokenRef = useRef(0);
  const activeProgressivePlaybackRef = useRef<ActiveProgressivePlayback | null>(null);
  const introAudioPlayedRef = useRef(false);
  const introSourceTextRef = useRef<string | null>(null);
  const autoSpeak = controlledAutoSpeak ?? internalAutoSpeak;
  const autoSpeakRef = useRef(autoSpeak);
  const previousAutoSpeakRef = useRef(autoSpeak);
  const subjectTitleRef = useRef(subjectTitle);
  const translateRef = useRef(t);
  const loadedSessionRef = useRef<string | null>(null);
  const localMessageCounterRef = useRef(0);
  const setAutoSpeak = useCallback((value: boolean | ((current: boolean) => boolean)) => {
    const nextValue = typeof value === "function" ? value(autoSpeak) : value;
    onAutoSpeakChange?.(nextValue);
    if (controlledAutoSpeak === undefined) {
      setInternalAutoSpeak(nextValue);
    }
  }, [autoSpeak, controlledAutoSpeak, onAutoSpeakChange]);

  const [nextSteps, setNextSteps] = useState<string[]>([]);

  const splitReplyIntoSegments = useCallback((reply: string) => {
    const normalized = reply.replace(/\r/g, "").trim();
    if (!normalized) return [] as string[];

    const rawParagraphs = normalized
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    const sourceParagraphs = rawParagraphs.length > 0
      ? rawParagraphs
      : normalized
        .split(/(?<=[.!?])\s+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

    const segments: string[] = [];

    for (const paragraph of sourceParagraphs) {
      if (paragraph.length <= 320) {
        segments.push(paragraph);
        continue;
      }

      const sentences = paragraph
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);

      let current = "";
      for (const sentence of sentences) {
        const candidate = current ? `${current} ${sentence}` : sentence;
        if (candidate.length <= 320) {
          current = candidate;
          continue;
        }

        if (current) {
          segments.push(current);
        }

        if (sentence.length <= 320) {
          current = sentence;
          continue;
        }

        for (let index = 0; index < sentence.length; index += 320) {
          segments.push(sentence.slice(index, index + 320).trim());
        }

        current = "";
      }

      if (current) {
        segments.push(current);
      }
    }

    return segments.filter(Boolean).slice(0, 8);
  }, []);

  const loadNextSteps = async (currentHistory: any[]) => {
    try {
      const steps = await apiPost<string[]>(`/study/sessions/${sessionId}/chat/next-steps`, {
        history: currentHistory
      });
      setNextSteps(steps);
    } catch (e) {
      setNextSteps([]);
    }
  };

  // Floating reference button state
  const [selectionRange, setSelectionRange] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [quotedText, setQuotedText] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  useEffect(() => {
    const dismissPopup = () => setSelectionRange(null);
    document.addEventListener("mousedown", dismissPopup);
    return () => document.removeEventListener("mousedown", dismissPopup);
  }, []);

  useEffect(() => {
    if (controlledAutoSpeak !== undefined) return;
    const stored = window.localStorage.getItem("study-chat-auto-speak");
    setInternalAutoSpeak(stored === null ? true : stored === "true");
  }, [controlledAutoSpeak]);

  useEffect(() => {
    if (controlledAutoSpeak !== undefined) return;
    window.localStorage.setItem("study-chat-auto-speak", autoSpeak ? "true" : "false");
  }, [autoSpeak, controlledAutoSpeak]);

  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);

  useEffect(() => {
    previousAutoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);

  useEffect(() => {
    subjectTitleRef.current = subjectTitle;
  }, [subjectTitle]);

  useEffect(() => {
    translateRef.current = t;
  }, [t]);

  const createLocalMessageId = useCallback((prefix: string) => {
    localMessageCounterRef.current += 1;
    return `${prefix}-${sessionId}-${Date.now()}-${localMessageCounterRef.current}`;
  }, [sessionId]);

  const completeRemainingSegments = useCallback((messageId: string, segments: ChatReplySegment[], renderedSegments: number) => {
    const remainingText = segments
      .slice(renderedSegments)
      .map((segment) => segment.text)
      .filter(Boolean)
      .join("\n\n");

    if (!remainingText) {
      return;
    }

    setMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId) return message;
        const nextContent = message.content.trim()
          ? `${message.content.trim()}\n\n${remainingText}`
          : remainingText;
        return { ...message, content: nextContent };
      })
    );
  }, []);

  const cancelActivePlayback = useCallback((options?: { flushText?: boolean }) => {
    progressivePlaybackTokenRef.current += 1;
    if (options?.flushText && activeProgressivePlaybackRef.current) {
      const { messageId, segments, renderedSegments } = activeProgressivePlaybackRef.current;
      completeRemainingSegments(messageId, segments, renderedSegments);
    }
    activeProgressivePlaybackRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingAudioForId(null);
  }, [completeRemainingSegments]);

  useEffect(() => {
    if (!autoSpeak) {
      cancelActivePlayback({ flushText: true });
    }
  }, [autoSpeak, cancelActivePlayback]);

  useEffect(() => {
    onAudioUiStateChange?.({
      selectedAssistantMessageId,
      generatingAudioForId,
      playingAudioForId,
    });
  }, [selectedAssistantMessageId, generatingAudioForId, playingAudioForId, onAudioUiStateChange]);

  useEffect(() => {
    return () => {
      Object.values(audioUrlCacheRef.current).forEach((url) => URL.revokeObjectURL(url));
      audioUrlCacheRef.current = {};
      audioPayloadCacheRef.current = {};
      segmentAudioPromiseCacheRef.current = {};
      messageSegmentsRef.current = {};
      progressivePlaybackTokenRef.current += 1;
      activeProgressivePlaybackRef.current = null;
      introAudioPlayedRef.current = false;
      introSourceTextRef.current = null;
      loadedSessionRef.current = null;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!onStopAudioReady) return;
    onStopAudioReady(() => cancelActivePlayback({ flushText: true }));
  }, [onStopAudioReady, cancelActivePlayback]);

  const handleTextSelection = async (e: React.MouseEvent) => {
    e.stopPropagation();

    setTimeout(async () => {
      const selection = window.getSelection();
      if (!selection) return;

      const text = selection.toString().trim();
      if (!text || text.length < 3) return;

      const anchorNode = selection.anchorNode;
      if (anchorNode && anchorNode.parentElement && !anchorNode.parentElement.closest('.assistant-message')) {
        return;
      }

      const exists = highlights.some(h => h.text.includes(text) || text.includes(h.text));
      if (!exists && !savingHighlight) {
        setSavingHighlight(true);
        try {
          const newHighlight = await apiPost<SessionHighlight>(
            `/study/sessions/${sessionId}/chat/highlights`,
            { text }
          );
          setHighlights(prev => [...prev, newHighlight]);
          selection.removeAllRanges();
        } catch (err) {
          console.error("Failed to save highlight:", err);
        } finally {
          setSavingHighlight(false);
        }
      }
    }, 0);
  };

  const handleMouseEnterHighlight = (e: React.MouseEvent, textString: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setSelectionRange({
      text: textString,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };

  const handleSelectStep = async (step: string) => {
    if (sending) return;

    // 1. Limpa sugestões para evitar cliques duplos e dar feedback visual
    setNextSteps([]);

    // 2. Adiciona a mensagem do usuário ao chat visualmente
    const userMsg = { id: createLocalMessageId("user"), role: "user" as const, content: `${t("study.chatStartTopic")} ${step}` };
    setMessages((m) => [...m, userMsg]);
    setSending(true);

    try {
      // 3. Bate no novo endpoint dedicado ou no chat passando o contexto
      const response = await apiPost<ChatReply>(
        `/study/sessions/${sessionId}/chat/suggested-topic`,
        {
          topic: step,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          include_audio: autoSpeak,
        }
      );

      const initialAssistantContent = autoSpeak && response.segments?.length
        ? response.segments[0].text
        : response.message;
      const assistantMsg = { id: response.message_id, role: "assistant" as const, content: initialAssistantContent };
      if (response.segments?.length) {
        messageSegmentsRef.current[response.message_id] = response.segments;
      }
      setMessages((m) => [...m, assistantMsg]);
      setSelectedAssistantMessageId(response.message_id);

      if (autoSpeak && response.segments?.length) {
        startProgressiveAssistantPlayback(response.message_id, response.segments);
      } else if (autoSpeak && response.audio) {
        await playAudioFromPayload(response.message_id, response.audio);
      }

      // 4. Carrega os PRÓXIMOS passos baseados nessa nova explicação
      loadNextSteps([...messages, userMsg, { ...assistantMsg, content: response.message }]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: createLocalMessageId("assistant-error"), role: "assistant", content: t("study.chatError") },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleMouseLeaveHighlight = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setSelectionRange(null);
    }, 150);
  };

  const handleMouseEnterPopup = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const handleMouseLeavePopup = () => {
    handleMouseLeaveHighlight();
  };

  const handleQuoteInChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectionRange) {
      setQuotedText(selectionRange.text);
      setSelectionRange(null);
      window.getSelection()?.removeAllRanges();

      // Focus input
      setTimeout(() => {
        const inputEl = document.getElementById("chat-input");
        if (inputEl) inputEl.focus();
      }, 0);
    }
  };

  const createAudioUrl = (audio: ChatAudioPayload) => {
    const binary = window.atob(audio.content_base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: audio.mime_type || "audio/mpeg" });
    return URL.createObjectURL(blob);
  };

  const appendSegmentToMessage = useCallback((messageId: string, segmentText: string) => {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId) return message;
        const nextContent = message.content.trim()
          ? `${message.content.trim()}\n\n${segmentText}`
          : segmentText;
        return { ...message, content: nextContent };
      })
    );
  }, []);

  const fetchSegmentAudio = useCallback((segment: ChatReplySegment) => {
    const cachedAudio = audioPayloadCacheRef.current[segment.id];
    if (cachedAudio) {
      return Promise.resolve(cachedAudio);
    }

    const inFlight = segmentAudioPromiseCacheRef.current[segment.id];
    if (inFlight) {
      return inFlight;
    }

    const request = (segment.audio
      ? Promise.resolve(segment.audio)
      : apiPost<ChatAudioPayload>(`/study/sessions/${sessionId}/chat/audio`, {
          content: segment.text,
        })
    ).then((audio) => {
      audioPayloadCacheRef.current[segment.id] = audio;
      delete segmentAudioPromiseCacheRef.current[segment.id];
      return audio;
    }).catch((error) => {
      delete segmentAudioPromiseCacheRef.current[segment.id];
      throw error;
    });

    segmentAudioPromiseCacheRef.current[segment.id] = request;
    return request;
  }, [sessionId]);

  const playAudioFromPayload = async (
    messageId: string,
    audio: ChatAudioPayload,
    options?: { cacheKey?: string; waitForEnd?: boolean }
  ) => {
    const cacheKey = options?.cacheKey ?? messageId;
    const cachedUrl = audioUrlCacheRef.current[cacheKey];
    if (cachedUrl) {
      URL.revokeObjectURL(cachedUrl);
    }

    const url = createAudioUrl(audio);
    audioUrlCacheRef.current[cacheKey] = url;
    audioPayloadCacheRef.current[cacheKey] = audio;

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const player = audioRef.current;
    player.onended = null;
    player.onpause = null;
    player.onerror = null;
    player.src = url;
    setPlayingAudioForId(messageId);

    if (!options?.waitForEnd) {
      await player.play().catch(() => {
        setPlayingAudioForId(null);
      });
      player.onended = () => setPlayingAudioForId(null);
      player.onpause = () => setPlayingAudioForId((current) => (current === messageId ? null : current));
      return;
    }

    await new Promise<void>((resolve) => {
      player.onended = () => {
        setPlayingAudioForId(null);
        resolve();
      };
      player.onpause = () => {
        setPlayingAudioForId((current) => (current === messageId ? null : current));
        resolve();
      };
      player.onerror = () => {
        setPlayingAudioForId(null);
        resolve();
      };

      player.play().catch(() => {
        setPlayingAudioForId(null);
        resolve();
      });
    });
  };

  const startProgressiveAssistantPlayback = useCallback((messageId: string, segments: ChatReplySegment[]) => {
    if (segments.length === 0) return;

    messageSegmentsRef.current[messageId] = segments;
    cancelActivePlayback();
    const playbackToken = progressivePlaybackTokenRef.current;
    activeProgressivePlaybackRef.current = {
      messageId,
      segments,
      renderedSegments: 1,
    };

    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, content: segments[0].text } : message
      )
    );

    void (async () => {
      for (let index = 0; index < segments.length; index += 1) {
        if (progressivePlaybackTokenRef.current !== playbackToken) return;

        const currentSegment = segments[index];
        const nextSegment = segments[index + 1];

        if (index > 0) {
          appendSegmentToMessage(messageId, currentSegment.text);
          if (activeProgressivePlaybackRef.current?.messageId === messageId) {
            activeProgressivePlaybackRef.current.renderedSegments = index + 1;
          }
        }

        if (nextSegment) {
          void fetchSegmentAudio(nextSegment).catch(() => undefined);
        }

        try {
          const audio = await fetchSegmentAudio(currentSegment);
          if (progressivePlaybackTokenRef.current !== playbackToken) return;
          await playAudioFromPayload(messageId, audio, {
            cacheKey: currentSegment.id,
            waitForEnd: true,
          });
        } catch {
          continue;
        }
      }
      if (activeProgressivePlaybackRef.current?.messageId === messageId) {
        activeProgressivePlaybackRef.current = null;
      }
    })();
  }, [appendSegmentToMessage, cancelActivePlayback, fetchSegmentAudio]);

  useEffect(() => {
    const justEnabledAutoSpeak = autoSpeak && !previousAutoSpeakRef.current;
    previousAutoSpeakRef.current = autoSpeak;

    if (!justEnabledAutoSpeak || loadingIntro || introAudioPlayedRef.current) {
      return;
    }

    const introMessage = messages[0];
    if (
      messages.length !== 1 ||
      !introMessage ||
      introMessage.role !== "assistant" ||
      typeof introMessage.id !== "string" ||
      !introMessage.id.startsWith("intro-") ||
      !introSourceTextRef.current
    ) {
      return;
    }

    const introSegments = splitReplyIntoSegments(introSourceTextRef.current).map((text, index) => ({
      id: `${introMessage.id}:segment:${index}`,
      order: index,
      text,
    }));

    if (introSegments.length > 0) {
      introAudioPlayedRef.current = true;
      startProgressiveAssistantPlayback(introMessage.id, introSegments);
    }
  }, [autoSpeak, loadingIntro, messages, splitReplyIntoSegments, startProgressiveAssistantPlayback]);

  const replayProgressiveAssistantAudio = useCallback(async (messageId: string, segments: ChatReplySegment[]) => {
    if (segments.length === 0) return;

    cancelActivePlayback();
    const playbackToken = progressivePlaybackTokenRef.current;
    activeProgressivePlaybackRef.current = {
      messageId,
      segments,
      renderedSegments: segments.length,
    };

    for (const segment of segments) {
      if (progressivePlaybackTokenRef.current !== playbackToken) return;

      const needsGeneration = !audioPayloadCacheRef.current[segment.id] && !segment.audio;
      if (needsGeneration) {
        setGeneratingAudioForId(messageId);
      }

      try {
        const audio = await fetchSegmentAudio(segment);
        if (progressivePlaybackTokenRef.current !== playbackToken) return;
        await playAudioFromPayload(messageId, audio, {
          cacheKey: segment.id,
          waitForEnd: true,
        });
      } finally {
        if (needsGeneration) {
          setGeneratingAudioForId((current) => (current === messageId ? null : current));
        }
      }
    }

    if (activeProgressivePlaybackRef.current?.messageId === messageId) {
      activeProgressivePlaybackRef.current = null;
    }
  }, [cancelActivePlayback, fetchSegmentAudio]);

  const handlePlaySelectedMessage = useCallback(async () => {
    const selectedMessage = messages.find((message) => message.id === selectedAssistantMessageId && message.role === "assistant");
    if (!selectedMessage?.id) return;

    if (playingAudioForId === selectedMessage.id && audioRef.current) {
      audioRef.current.pause();
      setPlayingAudioForId(null);
      return;
    }

    const cachedUrl = audioUrlCacheRef.current[selectedMessage.id];
    if (cachedUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.onended = () => setPlayingAudioForId(null);
        audioRef.current.onpause = () => setPlayingAudioForId((current) => (current === selectedMessage.id ? null : current));
      }

      audioRef.current.src = cachedUrl;
      setPlayingAudioForId(selectedMessage.id);
      await audioRef.current.play().catch(() => {
        setPlayingAudioForId(null);
      });
      return;
    }

    const knownSegments = messageSegmentsRef.current[selectedMessage.id];
    if (knownSegments?.length) {
      await replayProgressiveAssistantAudio(selectedMessage.id, knownSegments);
      return;
    }

    setGeneratingAudioForId(selectedMessage.id);
    try {
      const audio = await apiPost<ChatAudioPayload>(`/study/sessions/${sessionId}/chat/audio`, {
        message_id: selectedMessage.id,
      });
      await playAudioFromPayload(selectedMessage.id, audio);
    } finally {
      setGeneratingAudioForId(null);
    }
  }, [messages, selectedAssistantMessageId, playingAudioForId, replayProgressiveAssistantAudio, sessionId]);

  useEffect(() => {
    if (!onPlaySelectedReady) return;
    onPlaySelectedReady(handlePlaySelectedMessage);
  }, [onPlaySelectedReady, handlePlaySelectedMessage]);

  useEffect(() => {
    let cancelled = false;

    async function loadChat() {
      if (loadedSessionRef.current === sessionId) {
        return;
      }

      setLoadingIntro(true);
      introAudioPlayedRef.current = false;
      introSourceTextRef.current = null;
      cancelActivePlayback();

      try {
        const sessionDetailPromise = apiGet<any>("/study/sessions/" + sessionId + "/detail").catch(() => null);
        const detail = await sessionDetailPromise;
        if (cancelled) return;
        if (detail && detail.highlights) {
          setHighlights(detail.highlights);
        }
        if (detail && detail.chat_messages && detail.chat_messages.length > 0) {
          introSourceTextRef.current = null;
          setMessages(detail.chat_messages);
          const lastAssistant = [...detail.chat_messages].reverse().find((message: ChatMessage) => message.role === "assistant" && message.id);
          setSelectedAssistantMessageId(lastAssistant?.id ?? null);
          loadedSessionRef.current = sessionId;
          setLoadingIntro(false);
          return;
        }

        const { message } = await apiGet<{ message: string }>(
          "/study/sessions/" + sessionId + "/chat/intro"
        );
        if (cancelled) return;

        const introId = `intro-${sessionId}`;
        introSourceTextRef.current = message;
        const introSegments = splitReplyIntoSegments(message).map((text, index) => ({
          id: `${introId}:segment:${index}`,
          order: index,
          text,
        }));
        const introMsg = {
          id: introId,
          role: "assistant" as const,
          content: autoSpeakRef.current && introSegments.length ? introSegments[0].text : message,
        };
        if (introSegments.length) {
          messageSegmentsRef.current[introId] = introSegments;
        }

        setMessages([introMsg]);
        setSelectedAssistantMessageId(introId);
        loadNextSteps([introMsg]);
        if (autoSpeakRef.current && introSegments.length && !introAudioPlayedRef.current) {
          introAudioPlayedRef.current = true;
          startProgressiveAssistantPlayback(introId, introSegments);
        }
        loadedSessionRef.current = sessionId;

      } catch {
        if (cancelled) return;
        const fallbackIntro = translateRef.current("study.chatFallbackIntro", { topic: subjectTitleRef.current });
        const introId = `intro-${sessionId}`;
        introSourceTextRef.current = fallbackIntro;
        const introSegments = splitReplyIntoSegments(fallbackIntro).map((text, index) => ({
          id: `${introId}:segment:${index}`,
          order: index,
          text,
        }));
        const introMsg = {
          id: introId,
          role: "assistant" as const,
          content: autoSpeakRef.current && introSegments.length ? introSegments[0].text : fallbackIntro,
        };
        if (introSegments.length) {
          messageSegmentsRef.current[introId] = introSegments;
        }
        setMessages([introMsg]);
        setSelectedAssistantMessageId(introId);
        if (autoSpeakRef.current && introSegments.length && !introAudioPlayedRef.current) {
          introAudioPlayedRef.current = true;
          startProgressiveAssistantPlayback(introId, introSegments);
        }
        loadedSessionRef.current = sessionId;
      } finally {
        if (!cancelled) {
          setLoadingIntro(false);
        }
      }
    }
    loadChat();
    return () => {
      cancelled = true;
    };
  }, [sessionId, splitReplyIntoSegments, startProgressiveAssistantPlayback, cancelActivePlayback]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");

    // Construct the payload with quoted text if present
    const fullText = quotedText ? `> "${quotedText}"\n\n${text}` : text;
    setQuotedText(null);

    const userMsg = { id: createLocalMessageId("user"), role: "user" as const, content: fullText };
    setMessages((m) => [...m, userMsg]);
    setSending(true);

    try {
      const response = await apiPost<ChatReply>(
        "/study/sessions/" + sessionId + "/chat",
        {
          message: fullText,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          include_audio: autoSpeak,
        }
      );

      const initialAssistantContent = autoSpeak && response.segments?.length
        ? response.segments[0].text
        : response.message;
      const assistantMsg = { id: response.message_id, role: "assistant", content: initialAssistantContent };
      if (response.segments?.length) {
        messageSegmentsRef.current[response.message_id] = response.segments;
      }
      setMessages(prev => [...prev, assistantMsg]);
      setSelectedAssistantMessageId(response.message_id);
      if (autoSpeak && response.segments?.length) {
        startProgressiveAssistantPlayback(response.message_id, response.segments);
      } else if (autoSpeak && response.audio) {
        await playAudioFromPayload(response.message_id, response.audio);
      }
      loadNextSteps([...messages, userMsg, { ...assistantMsg, content: response.message }]);


    } catch {
      setMessages((m) => [
        ...m,
        { id: createLocalMessageId("assistant-error"), role: "assistant", content: t("study.chatError") },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex relative h-full min-h-0 flex-col rounded-[24px] border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">

      {/* Pop-up de Citação */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {selectionRange && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="fixed z-50 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-800 p-1.5 shadow-xl pointer-events-auto"
              onMouseEnter={handleMouseEnterPopup}
              onMouseLeave={handleMouseLeavePopup}
              style={{
                left: selectionRange.x,
                top: selectionRange.y - 10,
                transform: 'translateX(-50%)'
              }}
            >
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-3 text-xs font-bold text-white hover:bg-slate-700 hover:text-white"
                onClick={handleQuoteInChat}
              >
                <MessageCircle className="mr-2 h-3.5 w-3.5" />
                {t("study.chatAdd")}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Header com Gradiente Sutil */}
      <div
        className="shrink-0 px-6 py-5 border-b border-slate-100"
        style={{ background: `linear-gradient(135deg, ${subjectColor}05, ${subjectColor}12)` }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white shadow-sm">
                <MessageCircle className="h-5 w-5" style={{ color: subjectColor }} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">
                  {t("study.chatTitle")}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                  {t("study.chatSubtitle")}
                </p>
              </div>
            </div>


          </div>


        </div>
      </div>

      {/* Área de Mensagens */}
      <div
        ref={scrollRef}
        onMouseUp={handleTextSelection}
        className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] [background-position:center]"
      >
        {generatingAudioForId && (
          <div className="sticky top-0 z-10 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/95 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 shadow-sm backdrop-blur">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Preparando audio para reproduzir
            </div>
          </div>
        )}

        {loadingIntro && (
          <div className="flex items-center justify-center py-4 gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-tighter">{t("study.chatLoading")}</span>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            let renderedContent = <>{msg.content}</>;

            if (msg.role === "assistant" && highlights.length > 0) {
              let text = msg.content;
              const substrings: { start: number; end: number; match: string }[] = [];

              highlights.forEach(h => {
                let startIndex = 0;
                let idx;
                while ((idx = text.indexOf(h.text, startIndex)) > -1) {
                  substrings.push({ start: idx, end: idx + h.text.length, match: h.text });
                  startIndex = idx + h.text.length;
                }
              });

              if (substrings.length > 0) {
                substrings.sort((a, b) => a.start - b.start);

                // Merge overlapping or adjacent ranges
                const mergedRanges = [substrings[0]];
                for (let j = 1; j < substrings.length; j++) {
                  const last = mergedRanges[mergedRanges.length - 1];
                  const curr = substrings[j];
                  if (curr.start <= last.end) {
                    last.end = Math.max(last.end, curr.end);
                  } else {
                    mergedRanges.push(curr);
                  }
                }

                const parts = [];
                let lastEnd = 0;
                mergedRanges.forEach((range, rmIdx) => {
                  if (range.start > lastEnd) {
                    parts.push(<span key={`t-${rmIdx}`}>{text.slice(lastEnd, range.start)}</span>);
                  }
                  parts.push(
                    <mark
                      key={`m-${rmIdx}`}
                      className="bg-yellow-200 text-slate-900 rounded-sm px-0.5 shadow-sm cursor-pointer relative transition-colors hover:bg-yellow-300"
                      onMouseEnter={(e) => handleMouseEnterHighlight(e, text.slice(range.start, range.end))}
                      onMouseLeave={handleMouseLeaveHighlight}
                    >
                      {text.slice(range.start, range.end)}
                    </mark>
                  );
                  lastEnd = range.end;
                });

                if (lastEnd < text.length) {
                  parts.push(<span key={`t-end`}>{text.slice(lastEnd)}</span>);
                }

                renderedContent = <>{parts}</>;
              }
            }

            const isAssistant = msg.role === "assistant";
            const isSelected = Boolean(msg.id) && selectedAssistantMessageId === msg.id;

            return (
              <motion.div
                key={msg.id ?? i}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn(
                  "flex gap-3 items-end",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-black text-[10px] shadow-sm mb-1",
                    isAssistant
                      ? "bg-white border border-slate-200 text-slate-400"
                      : "bg-slate-900 text-white"
                  )}
                >
                  {isAssistant ? <Bot className="h-4 w-4 text-[#6D44CC]" /> : t("study.chatUser")}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!isAssistant || !msg.id) return;
                    const messageId = msg.id;
                    setSelectedAssistantMessageId((current) => current === messageId ? null : messageId);
                  }}
                  className={cn(
                    "max-w-[85%] rounded-[20px] px-5 py-3 text-left text-sm leading-relaxed shadow-sm font-medium transition-all",
                    msg.role === "user"
                      ? "bg-[#6D44CC] text-white rounded-br-none cursor-default"
                      : "bg-white border border-slate-100 text-slate-700 rounded-bl-none assistant-message hover:border-indigo-200",
                    isSelected && "border-indigo-500 ring-4 ring-indigo-500/10"
                  )}
                  disabled={!isAssistant}
                >
                  <p className="whitespace-pre-wrap">{renderedContent}</p>
                  {isAssistant && (
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      <span>{isSelected ? "Resposta selecionada" : "Clique para selecionar"}</span>
                      <span className="inline-flex items-center gap-1">
                        <Volume2 className="h-3 w-3" />
                        Áudio
                      </span>
                    </div>
                  )}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {sending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-[#6D44CC]" />
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex flex-wrap md:flex-nowrap gap-3 px-4 py-3 mb-2 w-full justify-between items-stretch">
        <AnimatePresence mode="popLayout">
          {!sending && nextSteps.map((step, idx) => (
            <motion.button
              key={step}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: idx * 0.05 }}
              disabled={sending}
              onClick={() => handleSelectStep(step)}
              className={cn(
                // flex-1 faz com que cada card ocupe o mesmo espaço disponível
                // items-stretch no container pai garante que todos tenham a mesma altura
                "group relative flex flex-1 flex-col items-start gap-1.5 p-3 min-w-[120px]",
                "bg-white border border-slate-200 rounded-xl shadow-sm",
                "hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-500/10",
                "transition-all duration-200 active:scale-95 disabled:opacity-50 text-left"
              )}
            >
              {/* Ícone sutil no topo */}
              <div className="flex items-center justify-between w-full">
                <div className="p-1.5 bg-indigo-50 rounded-lg group-hover:bg-[#6D44CC] transition-colors">
                  <Sparkles className="h-3 w-3 text-[#6D44CC] group-hover:text-white" />
                </div>
                <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-[#6D44CC] transition-colors" />
              </div>

              {/* Texto do Tópico */}
              <div className="mt-1 w-full">
                <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-black mb-0.5 group-hover:text-indigo-400 transition-colors">
                  {t("study.chatSuggestion")}
                </span>
                <p className="text-xs font-bold text-slate-700 leading-tight line-clamp-2 group-hover:text-slate-900">
                  {step}
                </p>
              </div>

              {/* Overlay de brilho no hover */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-[#6D44CC]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Input de Mensagem */}
      <div className="shrink-0 p-4 bg-white border-t border-slate-100 flex flex-col gap-3">
        {quotedText && (
          <div className="relative flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 shadow-sm mx-1">
            <div className="flex-1 min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-yellow-600 mb-1">
                {t("study.chatQuoteResponse")}
              </span>
              <p className="text-xs font-medium text-slate-700 leading-snug line-clamp-2 italic">
                "{quotedText}"
              </p>
            </div>
            <button
              onClick={() => setQuotedText(null)}
              className="mt-0.5 text-yellow-600 hover:text-yellow-800 transition-colors p-1 rounded-md hover:bg-yellow-100/50"
              title={t("perfil.cancel")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:border-[#6D44CC] transition-all focus-within:ring-4 focus-within:ring-[#6D44CC]/5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={t("study.chatPlaceholder")}
            className="flex-1 bg-transparent px-4 py-2 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
            disabled={sending || loadingIntro}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending || loadingIntro}
            size="icon"
            className="h-10 w-10 rounded-xl bg-[#6D44CC] hover:bg-[#5B39AB] text-white transition-all shadow-md active:scale-95 shrink-0"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
