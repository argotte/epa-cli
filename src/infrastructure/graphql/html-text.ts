const COMMON_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&nbsp;": " ",
  "&quot;": '"',
  "&#039;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

/**
 * Stripper mínimo, no un parser HTML completo: alcanza para las
 * descripciones de Magento (bloques <style>/<script> de PageBuilder +
 * <p>/<br>/<div> normales). No intenta manejar HTML arbitrario.
 */
export function stripHtml(html: string): string {
  let text = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "");

  for (const [entity, replacement] of Object.entries(COMMON_ENTITIES)) {
    text = text.split(entity).join(replacement);
  }

  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line, index, lines) => line.length > 0 || (index > 0 && lines[index - 1]?.length !== 0))
    .join("\n")
    .trim();
}
