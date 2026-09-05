export function wordCount(s: string) { return (s.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || []).length; }
export function normalize(s: string) { return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase(); }
export function splitText(s: string) { const parts: string[] = []; let start = 0; while (start < s.length) {
    let end = Math.min(start + 1800, s.length);
    if (end < s.length) {
        const cut = s.lastIndexOf(' ', end);
        if (cut > start + 900)
            end = cut;
    }
    parts.push(s.slice(start, end).trim());
    if (end === s.length)
        break;
    start = Math.max(start + 1, end - 160);
} return parts.filter(Boolean); }
export function analyze(s: string) { const words = wordCount(s), sentences = s.split(/[.!?]+(?:\s|$)/).filter(x => x.trim()).length, paragraphs = s.split(/\n\s*\n/).filter(x => x.trim()).length; const tokens = (normalize(s).match(/[\p{L}]+/gu) || []).filter(x => x.length > 4); const counts = new Map<string, number>(); for (const token of tokens)
    counts.set(token, (counts.get(token) || 0) + 1); return { words, sentences, paragraphs, average: sentences ? Math.round(words / sentences) : 0, readingMinutes: Math.ceil(words / 200), frequent: [...counts].sort((a, b) => b[1] - a[1]).slice(0, 6) }; }
