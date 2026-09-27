import { GoogleGenAI } from "@google/genai";

const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
const apiKey = process.env.GEMINI_API_KEY ?? process.env.AI_INTEGRATIONS_GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    "[gemini] WARNING: GEMINI_API_KEY (or AI_INTEGRATIONS_GEMINI_API_KEY) is not set. " +
    "AI features will not work until you provide a key in backend/.env.",
  );
}

export const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      ...(baseUrl ? { httpOptions: { apiVersion: "", baseUrl } } : {}),
    })
  : // Stub — so imports don't explode if key is missing during build
    new GoogleGenAI({ apiKey: "stub", httpOptions: { baseUrl: "http://localhost" } });

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
}

export const FALLBACK_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
].filter(Boolean) as string[];

/**
 * Execute generateContent with automatic model fallback across Flash Lite and standard flash models.
 */
export async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
  preferredModel?: string;
}) {
  const modelsToTry = [
    ...(params.preferredModel ? [params.preferredModel] : []),
    ...FALLBACK_MODELS,
  ];
  const uniqueModels = Array.from(new Set(modelsToTry));

  let lastError: unknown;
  for (const model of uniqueModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return { response, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      console.warn(`[gemini] Model '${model}' failed: ${err?.message || err}. Trying next fallback...`);
    }
  }
  throw lastError;
}
