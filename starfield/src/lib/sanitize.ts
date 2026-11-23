const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /system\s+prompt/i,
  /you\s+are\s+now/i,
  /覆盖(系统)?指令/,
  /忽略(以上|之前|全部)(的)?(指令|提示)/,
  /jailbreak/i,
  /developer\s+mode/i,
];

export function looksLikePromptInjection(text: string) {
  return INJECTION_PATTERNS.some((re) => re.test(text));
}

export function sanitizeUserText(text: string, max = 4000) {
  return text
    .replace(/\u0000/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .trim()
    .slice(0, max);
}

export function sanitizeHtmlSnippet(input: string) {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+=["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim()
    .slice(0, 2000);
}

export function wrapUserContent(text: string) {
  return `<user_input>\n${sanitizeUserText(text)}\n</user_input>`;
}
