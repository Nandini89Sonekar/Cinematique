import { GoogleGenAI, Type } from "@google/genai";
import { Movie } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getRecommendations(
  allMovies: Movie[],
  userPreferences: string[],
  viewingHistory: string[]
): Promise<string[]> {
  if (!process.env.GEMINI_API_KEY) return [];

  const movieContext = allMovies
    .map((m) => `${m.id}: ${m.title} (${m.genre.join(", ")})`)
    .join("\n");

  const prompt = `
    Based on the following movies available in our database:
    ${movieContext}

    User Preferences: ${userPreferences.join(", ")}
    Viewing History (Movie IDs): ${viewingHistory.join(", ")}

    Please recommend the best 3 movie IDs that the user hasn't seen yet and match their tastes.
    Return ONLY a JSON array of movie ID strings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Recommendation Error:", error);
    return [];
  }
}
