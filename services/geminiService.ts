/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image for the ${context}. ` + 
        (textFeedback 
            ? `The model responded with text: "${textFeedback}"`
            : "This can happen due to safety filters or if the request is too complex. Please try rephrasing your prompt to be more direct.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log('Starting generative edit at:', hotspot);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, localized edit on the provided image based on the user's request.
User Request: "${userPrompt}"
Edit Location: Focus on the area around pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}).

Editing Guidelines:
- The edit must be realistic and blend seamlessly with the surrounding area.
- The rest of the image (outside the immediate edit area) must remain identical to the original.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model.', response);

    return handleApiResponse(response, 'edit');
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request. Do not change the composition or content, only apply the style.
Filter Request: "${filterPrompt}"

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- You MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final filtered image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and filter prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request.
User Request: "${adjustmentPrompt}"

Editing Guidelines:
- The adjustment must be applied across the entire image.
- The result must be photorealistic.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final adjusted image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};

/**
 * Generates a three-view orthographic drawing of the main subject in an image.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the generated three-view image.
 */
export const generate3DView = async (
    originalImage: File
): Promise<string> => {
    console.log(`Starting 3D view generation.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert technical illustrator AI. Your task is to generate a three-view orthographic drawing of the main subject in the provided image.
    
Instructions:
1. Identify the primary subject of the image.
2. Use the provided image as the "Front View".
3. Infer and create a "Side View" (from the right) and a "Top-Down View" of the subject.
4. Arrange the three views on a clean, white background in a standard technical drawing layout:
    - Top view should be directly above the front view.
    - Side view should be directly to the right of the front view.
5. The style should be a clean, simple line drawing or a minimally shaded render. Maintain consistent scale across all views.

Output: Return ONLY the final image containing the three views. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and 3D view prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for 3D view.', response);

    return handleApiResponse(response, '3dview');
};


/**
 * Removes the background from an image, leaving the main subject.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the image with a transparent background.
 */
export const removeBackground = async (
    originalImage: File
): Promise<string> => {
    console.log(`Starting background removal.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to accurately identify the main subject(s) in the image and completely remove the background.
    
Instructions:
1. Identify the primary subject(s).
2. Create a clean cutout of the subject(s).
3. The background must be made fully transparent.

Output: Return ONLY the final image with the subject(s) on a transparent background. Do not return text or any other content.`;
    const textPart = { text: prompt };

    console.log('Sending image and background removal prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for background removal.', response);

    return handleApiResponse(response, 'background removal');
};

/**
 * Restores an old or damaged photo.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the restored image.
 */
export const restorePhoto = async (
    originalImage: File
): Promise<string> => {
    console.log(`Starting photo restoration.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are a world-class AI photo restoration expert. Your task is to restore the provided old or damaged photograph to the highest possible quality.

Instructions:
1.  **Analyze Damage:** Carefully identify all forms of damage, including scratches, creases, tears, stains, discoloration, and fading.
2.  **Repair Damage:** Meticulously repair all identified damage, ensuring the repairs are seamless and invisible.
3.  **Color Correction:** If the photo is color, restore the original colors, correcting any fading or color shifts. If it's black and white, improve the tonal range and contrast. Do not colorize a black and white photo unless specifically asked.
4.  **Enhance Details:** Sharpen the image and enhance fine details to create a high-quality, clear result, aiming for a "4K effect" in terms of clarity and definition.
5.  **Preserve Authenticity:** While improving the photo, it is crucial to maintain its original character and authenticity. Do not add or remove significant elements. The goal is restoration, not recreation.

Output: Return ONLY the final, fully restored image. Do not return text or any other content.`;
    const textPart = { text: prompt };

    console.log('Sending image and restoration prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for photo restoration.', response);

    return handleApiResponse(response, 'photo restoration');
};

/**
 * Restores an old or damaged group photo, focusing on individual faces.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the restored image.
 */
export const groupRestorePhoto = async (
    originalImage: File
): Promise<string> => {
    console.log(`Starting group photo restoration.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const originalImagePart = await fileToPart(originalImage);
    const prompt = `请对这张多人合照进行精细化修复和增强，要求如下：

第一步：去除整张照片的折痕、划痕、噪点和模糊，让画面干净自然，同时保持原有照片的真实感和质感。  

第二步：逐一检测并放大每个人的脸部，修复五官细节（眼睛、鼻子、嘴巴、头发），保证自然清晰，不要统一模糊处理，也不要凭空捏造不切合实际的五官。  

第三步：保持每个人的身份一致，不生成陌生人或改变原有面孔，只修复模糊和缺陷，同时保留人物原有特征。  

第四步：在整体修复完成后，将修复的人脸重新合成到照片中，并进行光照、色彩和曝光的统一调整，使照片整体自然、真实、高清。  

最终输出：一张高质量、精细修复的多人合照，每个人的脸都清晰可见，五官细节完整，照片真实自然，没有模糊、虚假或过度美化。`;
    const textPart = { text: prompt };

    console.log('Sending image and group restoration prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for group photo restoration.', response);

    return handleApiResponse(response, 'group photo restoration');
};

/**
 * Generates a video from an image and a text prompt.
 * @param originalImage The original image file to animate.
 * @param userPrompt The text prompt describing the animation.
 * @param onProgress A callback function to update the UI with progress messages.
 * @returns A promise that resolves to the generated video File object.
 */
export const generateVideoFromImage = async (
    originalImage: File,
    userPrompt: string,
    onProgress: (message: string) => void,
): Promise<File> => {
    console.log(`Starting video generation: ${userPrompt}`);
    onProgress('Initializing video generation...');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const { inlineData } = await fileToPart(originalImage);

    onProgress('Sending request to the video model...');
    let operation = await ai.models.generateVideos({
      model: 'veo-2.0-generate-001',
      prompt: userPrompt,
      image: {
        imageBytes: inlineData.data,
        mimeType: inlineData.mimeType,
      },
      config: {
        numberOfVideos: 1
      }
    });
    
    onProgress('AI is creating your video. This may take a few minutes...');
    const pollInterval = 10000; // 10 seconds
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max polling

    while (!operation.done && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      onProgress(`Checking progress (${(attempts + 1) * 10}s elapsed)...`);
      operation = await ai.operations.getVideosOperation({operation: operation});
      attempts++;
    }

    if (!operation.done) {
        throw new Error('Video generation timed out after 5 minutes.');
    }

    if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error('Video generation finished, but no download link was provided.');
    }

    onProgress('Downloading generated video...');
    // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY!}`);
    if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
    }
    const videoBlob = await response.blob();
    onProgress('Video downloaded successfully!');
    
    return new File([videoBlob], `video-${Date.now()}.mp4`, { type: 'video/mp4' });
};