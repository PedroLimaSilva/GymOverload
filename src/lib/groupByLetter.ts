const LETTER_OTHER = "#";

function firstCharKey(name: string): string {
  const t = name.trim();
  if (!t) return LETTER_OTHER;
  const ch = t[0].toUpperCase();
  if (ch >= "0" && ch <= "9") return ch;
  if (ch >= "A" && ch <= "Z") return ch;
  return LETTER_OTHER;
}

export function groupByFirstLetter<T extends { name: string }>(items: T[]): { key: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = firstCharKey(item.name);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  const keys = [...map.keys()].sort((a, b) => {
    const aNum = a >= "0" && a <= "9";
    const bNum = b >= "0" && b <= "9";
    if (aNum && !bNum) return -1;
    if (!aNum && bNum) return 1;
    if (a === LETTER_OTHER && b !== LETTER_OTHER) return 1;
    if (b === LETTER_OTHER && a !== LETTER_OTHER) return -1;
    return a.localeCompare(b);
  });
  return keys.map((key) => ({ key, items: map.get(key)! }));
}
