
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useTransition, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ApiError,
  analyzeImageContent,
  generateStyledImage,
  generateStyledVideo,
  generateMemeImage,
  generateScenarios,
} from './services/geminiService';


// Types
type ImageStatus = 'idle' | 'pending' | 'done' | 'error';
type AppState = 'idle' | 'ready' | 'generating' | 'results-shown';

interface GeneratedImage {
  status: ImageStatus;
  url?: string;
  error?: string;
  isQuotaError?: boolean;
}

interface MediaState {
  status: 'idle' | 'pending' | 'done' | 'error';
  url?: string;
  error?: string;
  isQuotaError?: boolean;
}

interface VideoConfig {
  imageIndex: number;
  prompt: string;
}

interface MemeConfig {
  imageIndex: number;
  scenario: string;
}

// Enhanced Constants - UPGRADED SCENARIOS
const IMAGE_COUNT = 5;
const STYLES = ["Variation 1", "Variation 2", "Variation 3", "Variation 4", "Variation 5"] as const;

// UPGRADED: Top Bollywood Meme Scenarios - Most Iconic Dialogues
const BOLLYWOOD_MEME_SCENARIOS = [
  "Mogambo khush hua!",
  "Kitne aadmi the?",
  "Rishte mein to hum tumhare baap lagte hain... Naam hai Shahenshah!",
  "Pushpa, I hate tears...",
  "Don ko pakadna mushkil hi nahi... namumkin hai!",
  "Aata majhi satakli!",
  "Bade bade deshon mein aisi choti choti baatein hoti rehti hai...",
  "Mere paas maa hai!",
  "Palat... Palat... Palat!",
  "Thappad se darr nahi lagta sahab... pyaar se lagta hai!",
  "Apun ka naam Hera Pheri!",
  "Kya aapke toothpaste mein namak hai?",
  "All izz well!",
  "Zindagi badi honi chahiye... lambi nahi!",
  "Picture abhi baaki hai mere dost!",
  "Bhaiyya... main aapka fan hoon!",
  "Itna sannata kyun hai bhai?",
  "Yeh dosti hum nahi todenge!",
  "Khamosh!",
  "Jaa Simran jaa... jee le apni zindagi!",
  "Mere khwabon mein aana mat!",
  "Tension lene ka nahi... dene ka!",
  "Mumbai ka king kaun? Bhai!"
];

// Enhanced Video Prompts
const VIDEO_PROMPTS = [
  "a subtle, confident smirk turning into a mysterious smile.",
  "a slow dramatic turn towards camera with intense eye contact.",
  "a thoughtful gaze breaking into genuine laughter.",
  "eyes slowly closing and opening with renewed focus.",
  "a slight head tilt with playful eyebrow raise.",
  "a dramatic hair flip with cinematic slow motion.",
  "a pensive look turning into determined expression.",
  "a soft smile gradually building into full laughter.",
  "a mysterious glance over the shoulder.",
  "a cinematic slow-motion walk towards camera."
];

const VIDEO_LOADING_MESSAGES = [
  "Warming up the cameras...",
  "The director is reviewing the script...",
  "Animating the scene, this can take a few minutes...",
  "Adding some cinematic magic...",
  "Rendering the final cut...",
  "Almost there, polishing the pixels...",
];

// Custom Hooks
const useImageAnalysis = () => {
  const [personDescription, setPersonDescription] = useState('');
  const [objectDescription, setObjectDescription] = useState('');
  const [styleDescription, setStyleDescription] = useState('');

  const analyzeImages = async (personImages: string[], productImages: string[], styleImages: string[]) => {
    const [personDesc, objectDesc, styleDesc] = await Promise.all([
      analyzeImageContent(personImages, "Describe the person in this portrait, including their key features, clothing, and expression."),
      analyzeImageContent(productImages, "Describe the primary object in this image, including its color, shape, and type."),
      analyzeImageContent(styleImages, "Describe the artistic style of this image, including its mood, lighting, color palette, and composition.")
    ]);
    
    setPersonDescription(personDesc);
    setObjectDescription(objectDesc);
    setStyleDescription(styleDesc);
    
    return { personDesc, objectDesc, styleDesc };
  };

  return { personDescription, objectDescription, styleDescription, analyzeImages };
};

const useMediaGeneration = () => {
  const [isPending, startTransition] = useTransition();

  const generateMedia = async <T,>(
    generator: () => Promise<T>,
    onSuccess: (result: T) => void,
    onError: (error: Error) => void
  ) => {
    startTransition(async () => {
      try {
        const result = await generator();
        onSuccess(result);
      } catch (error) {
        // Ensure we always pass an Error object
        const safeError = error instanceof Error ? error : new Error(String(error));
        onError(safeError);
      }
    });
  };

  return { generateMedia, isPending };
};

// Components
const ImageUploadBox: React.FC<{
  title: string;
  subtitle: string;
  onImagesChange: (images: string[]) => void;
  uploadedImages: string[];
  stepNumber: number;
}> = ({ title, subtitle, onImagesChange, uploadedImages, stepNumber }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    
    const newImageUrls: string[] = [];
    let filesProcessed = 0;

    files.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                newImageUrls.push(reader.result);
            }
            filesProcessed++;
            if (filesProcessed === files.length) {
                onImagesChange([...uploadedImages, ...newImageUrls]);
            }
        };
        reader.onerror = () => {
            console.error(`Failed to read file: ${file.name}`);
            filesProcessed++;
             if (filesProcessed === files.length) {
                onImagesChange([...uploadedImages, ...newImageUrls]);
            }
        }
        reader.readAsDataURL(file);
    });
    
    if(event.target) {
        event.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <motion.div
      className="glass-panel rounded-2xl p-1 flex flex-col h-full"
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <div className="bg-surface/50 rounded-xl p-6 flex-1 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-white font-bold text-sm shadow-md">
            {stepNumber}
          </span>
          <div>
             <h3 className="text-lg font-heading font-semibold text-text">{title}</h3>
             <p className="text-xs text-muted">{subtitle}</p>
          </div>
        </div>
        
        <div className="space-y-4 flex-1 flex flex-col">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept="image/*"
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 w-full border-2 border-dashed border-glass-border hover:border-accent rounded-xl p-8 text-center hover:bg-surface-highlight transition-all duration-200 flex flex-col items-center justify-center group"
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📁</div>
            <p className="text-sm font-medium text-text/80">Click to upload</p>
            <p className="text-xs text-muted mt-1">Drag & drop supported</p>
          </button>

          <AnimatePresence>
            {uploadedImages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-3 gap-2"
              >
                {uploadedImages.map((image, index) => (
                  <motion.div
                    key={`${image}-${index}`}
                    layout
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="relative group aspect-square"
                  >
                    <img
                      src={image}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-glass-border"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      ×
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

const ImageCard