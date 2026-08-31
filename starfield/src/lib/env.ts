export function maskSecret(value: string | undefined | null) {
  if (!value) return "";
  if (value.length <= 6) return "***";
  return `${value.slice(0, 3)}…${value.slice(-2)}`;
}

export function hasApolloKey() {
  return Boolean(process.env.APOLLO_API_KEY?.trim());
}

export function hasAiKey() {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim(),
  );
}

export function hasQccKey() {
  return Boolean(
    process.env.QCC_APP_KEY?.trim() && process.env.QCC_SECRET_KEY?.trim(),
  );
}

export function isDemoMode() {
  return !hasApolloKey() || !hasAiKey();
}

export function getAiModel() {
  return process.env.AI_MODEL?.trim() || "openai/gpt-4.1-mini";
}

export function getScanRateLimit() {
  const n = Number(process.env.SCAN_RATE_LIMIT_PER_MINUTE);
  return Number.isFinite(n) && n > 0 ? n : 8;
}

export function getScanMaxSignals() {
  const n = Number(process.env.SCAN_MAX_SIGNALS);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

export function publicRuntimeFlags() {
  return {
    demoMode: isDemoMode(),
    apolloConfigured: hasApolloKey(),
    aiConfigured: hasAiKey(),
    qccConfigured: hasQccKey(),
    aiModel: hasAiKey() ? getAiModel() : "demo-engine",
  };
}
