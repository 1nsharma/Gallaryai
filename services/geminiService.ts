/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });


// --- Custom Error ---
export class ApiError extends Error {
    public readonly isQuotaError: boolean;
    constructor(message: string, isQuotaError: boolean = false) {
        super(message);
        this.name = 'ApiError';
        this.isQuotaError = isQuotaError;
    }
}


// --- Helper Functions ---

/**
 * Converts a data URL to a GoogleGenerativeAI.Part object using robust string manipulation.
 * @param imageDataUrl The data URL of the image.
 * @param errorContext A string to provide context in error messages.
 * @returns A Part object for the Gemini API.
 */
function dataUrlToGenaiPart(imageDataUrl: string, errorContext: string) {
    const base64Marker = ';base64,';
    const base64MarkerIndex = imageDataUrl.indexOf(base64Marker);
    
    if (base64MarkerIndex === -1 || !imageDataUrl.startsWith('data:image/')) {
        throw new Error(`Invalid image data URL format for ${errorContext}. Expected 'data:image/...;base64,...'`);
    }

    const mimeType = imageDataUrl.substring(5, base64MarkerIndex);
    const base64Data = imageDataUrl.substring(base64MarkerIndex + base64Marker.length);

    return { inlineData: { mimeType, data: base64Data } };
}


/**
 * Processes the Gemini API response, extracting the image or throwing an error if none is found.
 * @param response The response from the generateContent call.
 * @returns A data URL string for the generated image.
 */
function processGeminiResponse(response: GenerateContentResponse): string {
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        return `data:${mimeType};base64,${data}`;
    }

    const textResponse = response.text;
    console.error("API did not return an image. Response:", textResponse);
    throw new Error(`The AI model responded with text instead of an image: "${textResponse || 'No text response received.'}"`);
}

/**
 * A wrapper for the Gemini API call that includes a retry mechanism for internal server errors.
 * @param imageParts The image parts of the request payload.
 * @param textPart The text part of the request payload.
 * @returns The GenerateContentResponse from the API.
 */
async function callGeminiWithRetry(imageParts: object[], textPart: object): Promise<GenerateContentResponse> {
    const maxRetries = 3;
    const initialDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [...imageParts, textPart] },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });
        } catch (error) {
            console.error(`Error calling Gemini API (Attempt ${attempt}/${maxRetries}):`, error);
            const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
            const isInternalError = errorMessage.includes('"code":500') || errorMessage.includes('INTERNAL');

            if (isInternalError && attempt < maxRetries) {
                const delay = initialDelay * Math.pow(2, attempt - 1);
                console.log(`Internal error detected. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error; // Re-throw if not a retriable error or if max retries are reached.
        }
    }
    // This should be unreachable due to the loop and throw logic above.
    throw new Error("Gemini API call failed after all retries.");
}


/**
 * Generates a list of creative scenarios based on descriptions of a person, object, and style.
 * @param personDesc Description of the person.
 * @param objectDesc Description of the object.
 * @param styleDesc Description of the desired style/mood.
 * @param userPrompt An optional prompt from the user to guide scenario generation.
 * @returns A promise that resolves to an array of 5 scenario strings.
 */
export async function generateScenarios(
    personDesc: string,
    objectDesc: string,
    styleDesc: string,
    userPrompt?: string
): Promise<string[]> {
    const inputs = [];
    if (personDesc) inputs.push(`- Person Description: "${personDesc}"`);
    if (objectDesc) inputs.push(`- Object Description: "${objectDesc}"`);
    if (styleDesc) inputs.push(`- Style Description: "${styleDesc}"`);

    const hasUserPrompt = userPrompt && userPrompt.trim().length > 0;

    if (inputs.length === 0 && !hasUserPrompt) {
        return [
            "A mysterious figure in a neon-lit alley at midnight.",
            "A surreal portrait of an artist lost in their creative process.",
            "A whimsical character discovering a hidden, enchanted forest.",
            "A vintage-style photograph of a lone traveler at a forgotten train station.",
            "A high-fashion concept shot with dramatic, colorful lighting and abstract shapes."
        ];
    }

    let prompt: string;

    if (hasUserPrompt) {
        inputs.push(`- User's Core Idea: "${userPrompt}"`);
        prompt = `You are a creative director for a photoshoot. You will be given descriptions for a photoshoot. Your task is to expand on the user's idea and generate 5 distinct, creative, and cinematic scene descriptions for a portrait.

**Inputs:**
${inputs.join('\n')}

**Instructions:**
1. Use the "User's Core Idea" as the primary theme for all scenes.
2. Weave in the other provided descriptions to create 5 cohesive variations of the user's idea.
3. If a person description is provided, their identity and core features should be the main focus.
4. If an object is described, it should be integrated naturally into each scene.
5. If a style is described, the overall style, lighting, and mood should be consistent with it.
6. Generate exactly 5 variations. Each variation should describe a slightly different composition, angle, or interaction related to the user's core idea.
7. Output the 5 scene descriptions as a JSON array of strings. Do not include any other text, explanation, or markdown formatting.

**Example Output Format:**
["Variation 1 based on user idea...","Variation 2 based on user idea...","Variation 3 based on user idea...","Variation 4 based on user idea...","Variation 5 based on user idea..."]`;
    } else {
        prompt = `You are a creative director for a photoshoot. You will be given descriptions for a photoshoot. Your task is to generate 5 distinct, creative, and cinematic scene descriptions for a portrait.

**Inputs:**
${inputs.join('\n')}

**Instructions:**
1. Combine all provided inputs logically to create a cohesive scene.
2. If a person description is provided, their identity and core features should be the main focus.
3. If an object is described, it should be integrated naturally into the scene.
4. If a style is described, the overall style, lighting, and mood should be consistent with it.
5. Generate exactly 5 variations. Each variation should describe a slightly different composition, angle, or interaction.
6. Output the 5 scene descriptions as a JSON array of strings. Do not include any other text, explanation, or markdown formatting.

**Example Output Format:**
["A scene of the person leaning on the object, with a city background at dusk, reflecting the moody lighting.","A close-up of the person interacting with the object, with dramatic side-lighting.","A full-body shot of the person standing near the object in a grand, opulent room.","An action shot of the person using the object, with motion blur and dynamic angles.","A candid moment of the person looking away from the camera, with the object subtly in the background."]`
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
            }
        });

        let jsonText = response.text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.substring(7, jsonText.length - 3).trim();
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.substring(3, jsonText.length - 3).trim();
        }

        const scenarios = JSON.parse(jsonText);
        
        if (!Array.isArray(scenarios) || scenarios.length === 0 || !scenarios.every(s => typeof s === 'string')) {
            throw new Error("AI did not return a valid array of scenario strings.");
        }
        
        return scenarios.slice(0, 5); // Ensure exactly 5 are returned
    } catch (error) {
        console.error("Error generating scenarios:", error);
        const rawErrorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        if (rawErrorMessage.includes('429') || rawErrorMessage.includes('RESOURCE_EXHAUSTED')) {
            throw new ApiError("Failed to generate creative ideas due to API usage limits.", true);
        }
        throw new ApiError(`The AI failed to generate creative ideas. Details: ${rawErrorMessage}`);
    }
}

/**
 * Generates a styled image from a source image and a prompt.
 * @param images An object containing data URL strings for the person, product, and style images.
 * @param prompt The prompt to guide the image generation.
 * @returns A promise that resolves to a base64-encoded image data URL of the generated image.
 */
export async function generateStyledImage(
    images: { personImages: string[]; productImages: string[]; styleImages: string[]; },
    prompt: string
): Promise<string> {
  
    const personParts = images.personImages.map(url => dataUrlToGenaiPart(url, "Person Image"));
    const productParts = images.productImages.map(url => dataUrlToGenaiPart(url, "Product Image"));
    const styleParts = images.styleImages.map(url => dataUrlToGenaiPart(url, "Style Image"));
    
    const allImageParts = [...personParts, ...productParts, ...styleParts];
    const textPart = { text: prompt };

    try {
        const response = await callGeminiWithRetry(allImageParts, textPart);
        return processGeminiResponse(response);
    } catch (error) {
        let userFriendlyMessage: string;
        const rawErrorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        console.error("An unrecoverable error occurred during image generation.", error);

        if (rawErrorMessage.includes('429') || rawErrorMessage.includes('RESOURCE_EXHAUSTED')) {
            userFriendlyMessage = "Image generation failed due to API usage limits. Please check your quota in Google AI Studio.";
            throw new ApiError(userFriendlyMessage, true);
        } else {
             userFriendlyMessage = `The AI model failed to generate an image. Details: ${rawErrorMessage}`;
        }
        
        throw new ApiError(userFriendlyMessage);
    }
}

/**
 * Creates a meme by adding text to an image.
 * @param imageDataUrl The data URL of the source image.
 * @param memeText The text to add to the meme.
 * @returns A promise resolving to the data URL of the generated meme image.
 */
export async function generateMemeImage(imageDataUrl: string, memeText: string): Promise<string> {
    const imagePart = dataUrlToGenaiPart(imageDataUrl, "Meme Source Image");
    const textPart = { 
        text: `A meme of the person in the image. Add the text "${memeText}" to the bottom of the image in a bold, white font with a black outline, similar to the Impact font used in classic memes. Do not alter the original image in any other way. Output the final image.`
    };

    try {
        const response = await callGeminiWithRetry([imagePart], textPart);
        return processGeminiResponse(response);
    } catch (error) {
        const rawErrorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        console.error("An error occurred during meme generation:", error);

        if (rawErrorMessage.includes('429') || rawErrorMessage.includes('RESOURCE_EXHAUSTED')) {
            throw new ApiError("Meme generation failed due to API usage limits.", true);
        }
        
        throw new ApiError(`The AI model failed to generate the meme. Details: ${rawErrorMessage}`);
    }
}


/**
 * Analyzes the content of images and returns a text description.
 * @param imageDataUrls An array of data URL strings for the images to analyze.
 * @param prompt The prompt to guide the analysis.
 * @returns A promise that resolves to a text description of the image content.
 */
export async function analyzeImageContent(imageDataUrls: string[], prompt: string): Promise<string> {
    if (imageDataUrls.length === 0) {
        return ""; // Return empty string if no images are provided
    }

    const imageParts = imageDataUrls.map(url => dataUrlToGenaiPart(url, "Image for analysis"));
    const textPart = { text: prompt };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [...imageParts, textPart] },
        });
        return response.text.trim();
    } catch (error) {
        console.error("An error occurred during image content analysis:", error);
        const rawErrorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        
        if (rawErrorMessage.includes('429') || rawErrorMessage.includes('RESOURCE_EXHAUSTED')) {
            throw new ApiError("Image analysis failed due to API usage limits.", true);
        }
        
        throw new ApiError(`The AI model failed to analyze the image content. Details: ${rawErrorMessage}`);
    }
}


/**
 * Generates a short video from a source image and a prompt.
 * @param imageDataUrl A data URL string of the source image.
 * @param prompt The prompt to guide the video generation.
 * @returns A promise that resolves to a blob URL of the generated video.
 */
export async function generateStyledVideo(imageDataUrl: string, prompt: string): Promise<string> {
    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
        throw new Error("Invalid image data URL format for video generation.");
    }
    const [, mimeType, base64Data] = match;

    try {
        const videoAi = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        console.log("Starting video generation...");
        let operation = await videoAi.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            image: {
                imageBytes: base64Data,
                mimeType: mimeType,
            },
            config: {
                numberOfVideos: 1,
                aspectRatio: '9:16',
                resolution: '720p',
            }
        });

        console.log("Polling for video operation status...");
        while (!operation.done) {
            // Wait for 10 seconds before checking the status again.
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await videoAi.operations.getVideosOperation({ operation: operation });
            console.log("Current operation status:", operation.done);
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error("Video generation completed, but no download link was provided.");
        }

        console.log("Fetching video from download link:", downloadLink);
        // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);

        if (!response.ok) {
            throw new Error(`Failed to download video file. Status: ${response.statusText}`);
        }

        const videoBlob = await response.blob();
        console.log("Video downloaded successfully. Creating blob URL.");
        return URL.createObjectURL(videoBlob);

    } catch (error) {
        let userFriendlyMessage: string;
        const rawErrorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        console.error("An error occurred during video generation:", error);

        if (rawErrorMessage.includes('429') || rawErrorMessage.includes('RESOURCE_EXHAUSTED')) {
            userFriendlyMessage = "Video generation failed due to API usage limits. Please check your quota in Google AI Studio.";
             throw new ApiError(userFriendlyMessage, true);
        } else {
            userFriendlyMessage = `The AI model failed to generate a video. Details: ${rawErrorMessage}`;
        }

        throw new ApiError(userFriendlyMessage);
    }
}