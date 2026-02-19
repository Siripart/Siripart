import { GoogleGenAI, SchemaType, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface MeetingSummary {
  topic: string;
  dateTime: string;
  location: string;
  attendees: string[];
  agenda: string[];
  notes: string;
}

export async function summarizeMeetingInvite(text: string, file?: { data: string; mimeType: string }): Promise<MeetingSummary> {
  const model = "gemini-3-flash-preview";

  const parts: any[] = [];

  // Add file part if exists
  if (file) {
    parts.push({
      inlineData: {
        data: file.data,
        mimeType: file.mimeType
      }
    });
  }

  // Add text prompt
  parts.push({
    text: `Analyze the following meeting invitation (which may be text or an image/file in Thai or English) and extract the key details into a structured JSON format.
    
    ${text ? `Additional Context/Text: "${text}"` : ''}
    
    Please extract:
    1. Topic: The main subject of the meeting.
    2. DateTime: The date and time mentioned. If relative (e.g., "next Tuesday"), keep the text but try to be specific if possible.
    3. Location: Physical location or online link (e.g., Zoom/Meet link).
    4. Attendees: List of people or groups invited.
    5. Agenda: List of key discussion points.
    6. Notes: Any other important instructions (e.g., "Bring laptop").

    Format the output in Thai language.`
  });

  const response = await ai.models.generateContent({
    model: model,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING, description: "หัวข้อการประชุม" },
          dateTime: { type: Type.STRING, description: "วันและเวลา (เช่น 25 ต.ค. 10:00 - 11:00)" },
          location: { type: Type.STRING, description: "สถานที่หรือลิงก์ประชุม" },
          attendees: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "รายชื่อผู้เข้าร่วม" 
          },
          agenda: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "วาระการประชุม" 
          },
          notes: { type: Type.STRING, description: "หมายเหตุเพิ่มเติม" }
        },
        required: ["topic", "dateTime", "location", "attendees", "agenda", "notes"]
      }
    }
  });

  const jsonText = response.text;
  if (!jsonText) {
    throw new Error("No response from AI");
  }

  return JSON.parse(jsonText) as MeetingSummary;
}
