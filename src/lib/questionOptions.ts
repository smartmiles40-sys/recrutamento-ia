// Opções de uma pergunta de "Múltipla escolha".
//
// No banco a coluna `options` é jsonb e nasceu com listas (["Sim","Não"]), mas
// quem edita pelo sistema escreve as opções numa linha só. Estas funções são a
// ponte entre os dois formatos — e evitam que uma pergunta de múltipla escolha
// sem opções vire, em silêncio, um campo de texto no formulário do candidato.

/** Lê o que estiver gravado (lista, texto JSON ou "a, b, c") e devolve a lista. */
export function parseOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((o) => String(o).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return [];
    if (text.startsWith("[")) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed.map((o) => String(o).trim()).filter(Boolean);
      } catch {
        // Não era JSON válido: cai na leitura por vírgulas abaixo.
      }
    }
    return text.split(",").map((o) => o.trim()).filter(Boolean);
  }
  return [];
}

/** Como as opções aparecem no campo de edição. */
export function formatOptions(raw: unknown): string {
  return parseOptions(raw).join(", ");
}

/** O que vai para o banco: lista limpa, ou null quando não sobrou nada. */
export function toStoredOptions(text: string): string[] | null {
  const list = parseOptions(text);
  return list.length > 0 ? list : null;
}
