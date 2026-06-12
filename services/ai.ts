// Google Translate Service (unofficial free endpoint)
// This replaces the static dictionary with dynamic fetching.
import { GoogleGenAI, Type } from "@google/genai";

let aiClient: any = null;

export const getGeminiClient = () => {
    if (!aiClient) {
        const apiKey = process.env.GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("Gemini API Key is not configured. Please add GEMINI_API_KEY to your Secrets panel under Settings.");
        }
        aiClient = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: {
                headers: {
                    'User-Agent': 'aistudio-build'
                }
            }
        });
    }
    return aiClient;
};

export interface ExtractedStudent {
    name: string;
    email: string;
    password?: string;
    grade: string;
}

/**
 * Scans a base64 encoded document image and extracts structured students
 */
export const scanDocumentWithGemini = async (base64Image: string, mimeType: string): Promise<ExtractedStudent[]> => {
    const client = getGeminiClient();
    
    // Clean up base64 prefix if found
    let cleanBase64 = base64Image;
    if (base64Image.includes(";base64,")) {
        cleanBase64 = base64Image.split(";base64,")[1];
    }

    const imagePart = {
        inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
        },
    };

    const textPart = {
        text: `Analyze this document. It is a class roster, list of students, or school document. 
Perform Optical Character Recognition (OCR) to extract all student/member entries. 
For each student found:
1. Extract their proper Full Name (e.g. "Ahmed El Mansouri").
2. Construct or extract a school email address. If they don't have one written on the document, auto-generate a valid unique institutional email based on their name in lowercase, e.g. "a.elmansouri@bniyekhlef.edu" (remove accents, space replaced by dot).
3. Assign a temporary secure password of 6+ characters (e.g., "Pass123!").
4. Extract or infer their grade level. Map this class/grade to one of the following exact labels if relevant: 'TC', '1 Bac', '2 Bac'. If not clear, guess based on context or set to "TC".

Return the full array of students in a structured JSON schema.`,
    };

    try {
        const response = await client.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [imagePart, textPart],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    description: "List of students extracted from the document",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: {
                                type: Type.STRING,
                                description: "The full name of the student"
                            },
                            email: {
                                type: Type.STRING,
                                description: "Institional email address, generated if missing"
                            },
                            password: {
                                type: Type.STRING,
                                description: "Secure default password"
                            },
                            grade: {
                                type: Type.STRING,
                                description: "Grade level of the student (TC, 1 Bac, 2 Bac)"
                            }
                        },
                        required: ["name", "email", "password", "grade"]
                    }
                }
            }
        });

        const rawText = response.text;
        if (!rawText) {
            throw new Error("No text response received from Gemini OCR.");
        }

        const data = JSON.parse(rawText.trim());
        if (Array.isArray(data)) {
            return data as ExtractedStudent[];
        } else if (data && typeof data === 'object') {
            // Self-repair: check if it's nested
            const keys = Object.keys(data);
            for (const key of keys) {
                if (Array.isArray((data as any)[key])) {
                    return (data as any)[key] as ExtractedStudent[];
                }
            }
        }
        throw new Error("Parsed data was not structured as a list.");
    } catch (err: any) {
        console.error("Gemini OCR Scan failed:", err);
        throw err;
    }
};

const fetchTranslation = async (text: string, targetLang: string): Promise<string> => {
    if (!text) return "";
    
    try {
        // Use the 'gtx' client endpoint which is commonly used for free translation in browser extensions
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // The API returns a complex array structure. 
        // data[0] contains the translated segments.
        // We map over them and join to get the full translated string.
        if (data && data[0]) {
            return data[0].map((chunk: any) => chunk[0]).join('');
        }
        
        return text;
    } catch (error) {
        console.warn(`Translation to ${targetLang} failed (CORS or Network error):`, error);
        // Fallback to original text so the UI doesn't break
        return text;
    }
};

export const translateAnnouncement = async (title: string, content: string) => {
    // Execute translations in parallel for better performance
    const [titleFr, contentFr, titleAr, contentAr] = await Promise.all([
        fetchTranslation(title, 'fr'),
        fetchTranslation(content, 'fr'),
        fetchTranslation(title, 'ar'),
        fetchTranslation(content, 'ar')
    ]);

    return {
        en: { 
            title: title, 
            content: content 
        },
        fr: { 
            title: titleFr, 
            content: contentFr 
        },
        ar: { 
            title: titleAr, 
            content: contentAr 
        }
    };
};