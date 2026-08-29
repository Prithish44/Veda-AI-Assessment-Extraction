import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-2.5-flash";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your environment variables (see README)."
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

export interface ImagePart {
  mimeType: string;
  base64: string;
}

/**
 * Strips markdown code fences that models sometimes wrap JSON in, even when
 * responseMimeType is requested as application/json.
 */
function cleanJson(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  }
  return t;
}

/**
 * Sends a text prompt plus zero or more images to Gemini and parses the
 * response as JSON. Throws if the model does not return valid JSON.
 */
export async function callGeminiJson<T = unknown>(
  prompt: string,
  images: ImagePart[] = []
): Promise<T> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const parts: any[] = [{ text: prompt }];
  for (const img of images) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
  }

  const result = await model.generateContent(parts);
  const text = result.response.text();

  try {
    return JSON.parse(cleanJson(text)) as T;
  } catch (err) {
    throw new Error(
      `Gemini returned non-JSON output. Raw response (truncated): ${text.slice(0, 500)}`
    );
  }
}
