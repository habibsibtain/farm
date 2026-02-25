import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Language, MarketItem } from "../types";

const apiKey = process.env.API_KEY || '';

// Initialize client
const getClient = () => new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION_BASE = `
You are 'Kisan Mitra', an expert agricultural advisor for small and marginal farmers in India.
Your goal is to provide scientific, practical, and low-cost farming advice.
Focus on:
1. Sustainable farming and soil health.
2. Natural and chemical pest control (prefer IPM).
3. Weather-based decision making.
4. Explaining things simply, avoiding complex jargon.
`;

export const generateCropAdvisory = async (
  query: string,
  language: Language,
  location?: string
): Promise<string> => {
  try {
    const ai = getClient();
    const langName = language === Language.HINDI ? 'Hindi' : language === Language.PUNJABI ? 'Punjabi' : language === Language.TELUGU ? 'Telugu' : 'English';
    
    const context = location ? `User Location: ${location}.` : '';
    
    const prompt = `
    ${context}
    User Query: ${query}
    
    Please answer in ${langName}. If the language is not English, provide the answer in the script of that language.
    Keep the answer concise (under 150 words) and actionable for a farmer.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_BASE,
      }
    });

    return response.text || "Sorry, I could not generate advice at this moment.";
  } catch (error) {
    console.error("Advisory Error:", error);
    return "Network error. Please try again.";
  }
};

export const identifyPestFromImage = async (
  base64Image: string,
  language: Language
): Promise<string> => {
  try {
    const ai = getClient();
    const langName = language === Language.HINDI ? 'Hindi' : language === Language.PUNJABI ? 'Punjabi' : 'English';

    // Note: gemini-2.5-flash-image does not support responseSchema, so we use strict text formatting.
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: `Identify the crop and any pest or disease in this image. 
            Provide a diagnosis and 3 practical treatment steps. 
            Answer in ${langName}.
            
            STRICT FORMAT (Do not use Markdown for headers, just the uppercase words):
            DIAGNOSIS: [Name of the issue]
            TREATMENT:
            1. [Step 1]
            2. [Step 2]
            3. [Step 3]`
          }
        ]
      }
    });

    return response.text || "Could not identify image.";
  } catch (error) {
    console.error("Vision Error:", error);
    return "Error analyzing image. Please try again.";
  }
};

export const getMarketInsights = async (language: Language): Promise<MarketItem[]> => {
  try {
    const ai = getClient();
    const langName = language === Language.HINDI ? 'Hindi' : language === Language.PUNJABI ? 'Punjabi' : 'English';
    
    // Using gemini-3-flash-preview which supports JSON Schema
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a realistic market update for major Indian crops (Wheat, Rice, Cotton, Onion, Tomato, Potato) for the current month. 
      Provide the data in ${langName}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              cropName: { type: Type.STRING, description: "Name of the crop" },
              price: { type: Type.STRING, description: "Current price range in INR/Quintal (e.g. ₹2200-2400)" },
              trend: { type: Type.STRING, enum: ["UP", "DOWN", "STABLE"], description: "Price trend compared to last week" },
              advisory: { type: Type.STRING, description: "Short advice (e.g. Sell now, Hold for a week)" }
            },
            required: ["cropName", "price", "trend", "advisory"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as MarketItem[];
    }
    return [];
  } catch (error) {
    console.error("Market Data Error", error);
    return [];
  }
}
