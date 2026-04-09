export type SubjectProgressInput = {
  completed_hours: number;
  completed_minutes?: number;
  target_hours: number;
};

export type SubjectListItem = {
  title: string;
};

export type SubjectLanguage = "English" | "Spanish" | string;

export type RecommendedSubjectInput = {
  title: string;
  suggested_hours: number;
  color_code: string;
  difficulty_level: number;
};

export type ManualSubjectFormInput = {
  title: string;
  targetHours: string;
  deadline: string;
  color: string;
};

export function calculateSubjectProgress(subject: SubjectProgressInput) {
  const completedMinutes = Math.max(
    0,
    Number(subject.completed_minutes ?? 0) + Number(subject.completed_hours ?? 0) * 60,
  );
  const targetMinutes = Math.max(Number(subject.target_hours ?? 0) * 60, 1);
  const progress = Math.min(Math.round((completedMinutes / targetMinutes) * 100), 100);

  return {
    completedMinutes,
    completedHoursRounded: Math.floor(completedMinutes / 60),
    targetMinutes,
    progress,
  };
}

export function hasSubjectAlreadyAdded(subjects: SubjectListItem[], title: string) {
  return subjects.some((subject) => subject.title.toLowerCase() === title.toLowerCase());
}

export function getSubjectLocale(language: SubjectLanguage) {
  if (language === "English") return "en-US";
  if (language === "Spanish") return "es-ES";
  return "pt-BR";
}

export function formatSubjectDeadline(deadline: string | null, language: SubjectLanguage) {
  if (!deadline) return null;
  return new Date(deadline).toLocaleDateString(getSubjectLocale(language));
}

export function buildManualSubjectPayload(input: ManualSubjectFormInput) {
  return {
    title: input.title,
    target_hours: parseInt(input.targetHours, 10),
    deadline: input.deadline || undefined,
    is_custom: true,
    color_code: input.color,
  };
}

export function buildRecommendationSubjectPayload(
  recommendation: RecommendedSubjectInput,
  deadline: string,
) {
  return {
    title: recommendation.title,
    color_code: recommendation.color_code,
    target_hours: recommendation.suggested_hours,
    difficulty_level: recommendation.difficulty_level,
    deadline: deadline || undefined,
  };
}

export function hasMoreSubjects(meta?: { page?: number; last_page?: number }) {
  if (!meta?.page || !meta?.last_page) return false;
  return meta.page < meta.last_page;
}
