import { describe, it, expect } from "vitest";
import { parseOptions, formatOptions, toStoredOptions } from "@/lib/questionOptions";

describe("parseOptions", () => {
  it("lê a lista que o banco já grava", () => {
    expect(parseOptions(["Sim", "Não"])).toEqual(["Sim", "Não"]);
  });

  it("lê uma lista gravada como texto JSON", () => {
    expect(parseOptions('["Sim", "Não"]')).toEqual(["Sim", "Não"]);
  });

  it("lê o que a pessoa escreve separado por vírgula", () => {
    expect(parseOptions(" Sim , Não ,  ")).toEqual(["Sim", "Não"]);
  });

  it("devolve lista vazia quando não há opção nenhuma", () => {
    expect(parseOptions(null)).toEqual([]);
    expect(parseOptions("")).toEqual([]);
    expect(parseOptions([])).toEqual([]);
  });
});

describe("formatOptions", () => {
  it("mostra as opções numa linha só, para edição", () => {
    expect(formatOptions(["Sim", "Não"])).toBe("Sim, Não");
    expect(formatOptions(null)).toBe("");
  });
});

describe("toStoredOptions", () => {
  it("guarda a lista limpa", () => {
    expect(toStoredOptions("Sim, Não")).toEqual(["Sim", "Não"]);
  });

  it("guarda null quando a pessoa apaga tudo — a pergunta volta a ser texto livre", () => {
    expect(toStoredOptions("   ")).toBeNull();
    expect(toStoredOptions(" , , ")).toBeNull();
  });
});
