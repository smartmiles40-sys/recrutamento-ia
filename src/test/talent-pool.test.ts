import { describe, it, expect } from "vitest";
import { stageMatchesArea, weightByArea } from "@/lib/talentPool";

const comercial = { area: "Comercial", is_enabled: true, weight: 50 };
const tecnologia = { area: "Tecnologia", is_enabled: true, weight: 50 };
const comum = { area: null, is_enabled: true, weight: 50 };

describe("stageMatchesArea", () => {
  it("mostra todos os blocos numa vaga comum, mesmo os marcados com área", () => {
    const opts = { isTalentPool: false, chosenArea: "" };
    expect(stageMatchesArea(comercial, opts)).toBe(true);
    expect(stageMatchesArea(comum, opts)).toBe(true);
  });

  it("no banco de talentos, mostra só a área escolhida mais os blocos comuns", () => {
    const opts = { isTalentPool: true, chosenArea: "Comercial" };
    expect(stageMatchesArea(comercial, opts)).toBe(true);
    expect(stageMatchesArea(comum, opts)).toBe(true);
    expect(stageMatchesArea(tecnologia, opts)).toBe(false);
  });

  it("antes de escolher a área, só os blocos comuns aparecem", () => {
    const opts = { isTalentPool: true, chosenArea: "" };
    expect(stageMatchesArea(comum, opts)).toBe(true);
    expect(stageMatchesArea(comercial, opts)).toBe(false);
    expect(stageMatchesArea(tecnologia, opts)).toBe(false);
  });

  it("trocar de área troca o conjunto de blocos (nada da área antiga sobrevive)", () => {
    const antes = [comercial, tecnologia, comum].filter((s) =>
      stageMatchesArea(s, { isTalentPool: true, chosenArea: "Comercial" })
    );
    const depois = [comercial, tecnologia, comum].filter((s) =>
      stageMatchesArea(s, { isTalentPool: true, chosenArea: "Tecnologia" })
    );
    expect(antes).toEqual([comercial, comum]);
    expect(depois).toEqual([tecnologia, comum]);
    expect(depois).not.toContain(comercial);
  });

  it("trata área vazia do bloco como bloco comum", () => {
    const opts = { isTalentPool: true, chosenArea: "Comercial" };
    expect(stageMatchesArea({ area: undefined }, opts)).toBe(true);
    expect(stageMatchesArea({}, opts)).toBe(true);
  });
});

describe("weightByArea", () => {
  it("soma os blocos comuns ao peso de cada área", () => {
    expect(weightByArea([comum, comercial, tecnologia], ["Comercial", "Tecnologia"])).toEqual([
      { area: "Comercial", weight: 100 },
      { area: "Tecnologia", weight: 100 },
    ]);
  });

  it("ignora blocos desativados", () => {
    const desativado = { area: "Comercial", is_enabled: false, weight: 30 };
    expect(weightByArea([comum, comercial, desativado], ["Comercial"])).toEqual([
      { area: "Comercial", weight: 100 },
    ]);
  });

  it("aponta a área que não fecha 100%", () => {
    const magro = { area: "Marketing", is_enabled: true, weight: 10 };
    const [marketing] = weightByArea([comum, magro], ["Marketing"]);
    expect(marketing.weight).toBe(60);
    expect(marketing.weight).not.toBe(100);
  });

  it("uma área sem bloco próprio fica só com o peso dos blocos comuns", () => {
    expect(weightByArea([comum, comercial], ["Financeiro"])).toEqual([
      { area: "Financeiro", weight: 50 },
    ]);
  });
});
