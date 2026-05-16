import { GoogleGenAI } from "@google/genai";

const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;

if (!baseUrl || !apiKey) {
  console.warn(
    "[gemini] WARNING: AI_INTEGRATIONS_GEMINI_BASE_URL / AI_INTEGRATIONS_GEMINI_API_KEY (or GEMINI_API_KEY) not set. " +
    "AI features will not work. Set them in backend/.env to enable.",
  );
}

export const ai = baseUrl && apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        apiVersion: "",
        baseUrl,
      },
    })
  : // Stub — so imports don't explode at startup
    new GoogleGenAI({ apiKey: "stub", httpOptions: { baseUrl: "http://localhost" } });
