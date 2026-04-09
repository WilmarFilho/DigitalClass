import { describe, expect, it } from "vitest";
import {
  buildManualSubjectPayload,
  buildRecommendationSubjectPayload,
  calculateSubjectProgress,
  formatSubjectDeadline,
  getSubjectLocale,
  hasMoreSubjects,
  hasSubjectAlreadyAdded,
} from "./materias.utils";

describe("calculateSubjectProgress", () => {
  it("combina horas e minutos concluídos no progresso", () => {
    expect(
      calculateSubjectProgress({
        completed_hours: 1,
        completed_minutes: 45,
        target_hours: 5,
      }),
    ).toMatchObject({
      completedMinutes: 105,
      completedHoursRounded: 1,
      progress: 35,
      targetMinutes: 300,
    });
  });

  it("limita o progresso a 100%", () => {
    expect(
      calculateSubjectProgress({
        completed_hours: 10,
        completed_minutes: 0,
        target_hours: 4,
      }).progress,
    ).toBe(100);
  });

  it("protege contra carga horária zerada", () => {
    expect(
      calculateSubjectProgress({
        completed_hours: 0,
        completed_minutes: 0,
        target_hours: 0,
      }),
    ).toMatchObject({
      progress: 0,
      targetMinutes: 1,
    });
  });

  it("ignora valores negativos no cálculo", () => {
    expect(
      calculateSubjectProgress({
        completed_hours: -2,
        completed_minutes: -30,
        target_hours: 3,
      }),
    ).toMatchObject({
      completedMinutes: 0,
      progress: 0,
      targetMinutes: 180,
    });
  });

  it("arredonda a quantidade de horas concluídas para baixo", () => {
    expect(
      calculateSubjectProgress({
        completed_hours: 2,
        completed_minutes: 59,
        target_hours: 10,
      }).completedHoursRounded,
    ).toBe(2);
  });
});

describe("hasSubjectAlreadyAdded", () => {
  it("encontra título independentemente de maiúsculas", () => {
    expect(
      hasSubjectAlreadyAdded([{ title: "Matemática" }], "matemática"),
    ).toBe(true);
  });

  it("retorna false quando a matéria não existe", () => {
    expect(hasSubjectAlreadyAdded([{ title: "História" }], "Física")).toBe(
      false,
    );
  });
});

describe("getSubjectLocale", () => {
  it("retorna en-US para English", () => {
    expect(getSubjectLocale("English")).toBe("en-US");
  });

  it("retorna es-ES para Spanish", () => {
    expect(getSubjectLocale("Spanish")).toBe("es-ES");
  });

  it("usa pt-BR como fallback", () => {
    expect(getSubjectLocale("Portuguese")).toBe("pt-BR");
  });
});

describe("formatSubjectDeadline", () => {
  it("formata a data em inglês", () => {
    expect(formatSubjectDeadline("2026-04-09", "English")).toBe("4/9/2026");
  });

  it("formata a data em português por padrão", () => {
    expect(formatSubjectDeadline("2026-04-09", "Portuguese")).toBe(
      "09/04/2026",
    );
  });

  it("retorna null quando não há prazo", () => {
    expect(formatSubjectDeadline(null, "English")).toBeNull();
  });
});

describe("buildManualSubjectPayload", () => {
  it("monta o payload manual completo", () => {
    expect(
      buildManualSubjectPayload({
        title: "Química",
        targetHours: "60",
        deadline: "2026-05-01",
        color: "#44bacc",
      }),
    ).toEqual({
      title: "Química",
      target_hours: 60,
      deadline: "2026-05-01",
      is_custom: true,
      color_code: "#44bacc",
    });
  });

  it("remove deadline vazio do payload manual", () => {
    expect(
      buildManualSubjectPayload({
        title: "Física",
        targetHours: "40",
        deadline: "",
        color: "#000000",
      }).deadline,
    ).toBeUndefined();
  });
});

describe("buildRecommendationSubjectPayload", () => {
  it("monta o payload com os dados da recomendação", () => {
    expect(
      buildRecommendationSubjectPayload(
        {
          title: "Biologia",
          suggested_hours: 35,
          color_code: "#22C55E",
          difficulty_level: 3,
        },
        "2026-06-10",
      ),
    ).toEqual({
      title: "Biologia",
      color_code: "#22C55E",
      target_hours: 35,
      difficulty_level: 3,
      deadline: "2026-06-10",
    });
  });

  it("remove deadline vazio no payload de recomendação", () => {
    expect(
      buildRecommendationSubjectPayload(
        {
          title: "História",
          suggested_hours: 20,
          color_code: "#8B5CF6",
          difficulty_level: 2,
        },
        "",
      ).deadline,
    ).toBeUndefined();
  });
});

describe("hasMoreSubjects", () => {
  it("retorna true quando ainda há páginas", () => {
    expect(hasMoreSubjects({ page: 1, last_page: 3 })).toBe(true);
  });

  it("retorna false na última página", () => {
    expect(hasMoreSubjects({ page: 3, last_page: 3 })).toBe(false);
  });

  it("retorna false quando meta está ausente", () => {
    expect(hasMoreSubjects()).toBe(false);
  });
});
