import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  const apiKey = "AIzaSyBDnXDboZ-LgzBv1_QVXvGSOu70s8jTF7o";
  const genAI = new GoogleGenAI({ apiKey });
  
  const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-2.0-flash-exp", "gemini-2.5-flash", "gemini-3-flash-preview"];
  
  for (const model of models) {
    try {
      console.log(`Testing model: ${model}`);
      const response = await genAI.models.generateContent({
        model,
        contents: "Olá, você está funcionando?"
      });
      console.log(`Success with ${model}: ${response.text}`);
      break;
    } catch (e: any) {
      console.error(`Failed with ${model}: ${e.message}`);
    }
  }
}

test();
