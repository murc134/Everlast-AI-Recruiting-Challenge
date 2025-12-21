export type Chunk = {
  index: number;
  content: string;
};

// Deterministisch, simpel, challenge-sicher:
// - Split nach Leerzeilen (Absätze)
// - Dann zu Blöcken bis maxChars zusammenführen
export function chunkText(raw: string, maxChars = 900): Chunk[] {
  const text = (raw || "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const paragraphs = text
    .split(/\n\s*\n+/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buf = "";

  for (const p of paragraphs) {
    if (!buf) {
      buf = p;
      continue;
    }

    // +2 für Leerzeile
    if (buf.length + 2 + p.length <= maxChars) {
      buf += "\n\n" + p;
    } else {
      chunks.push(buf);
      buf = p;
    }
  }

  if (buf) chunks.push(buf);

  // Fallback: wenn ein Absatz größer als maxChars ist, hart schneiden
  const normalized: string[] = [];
  for (const c of chunks) {
    if (c.length <= maxChars) {
      normalized.push(c);
      continue;
    }
    for (let i = 0; i < c.length; i += maxChars) {
      normalized.push(c.slice(i, i + maxChars));
    }
  }

  return normalized.map((content, index) => ({ index, content }));
}
