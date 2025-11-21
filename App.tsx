/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useTransition, useOptimistic, useRef, useEffect } from 'react';
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
  "Mogambo khush hua!",
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
  onImagesChange: (images: string[]) => void;
  uploadedImages: string[];
}> = ({ title, onImagesChange, uploadedImages }) => {
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
      className="bg-surface/50 backdrop-blur-sm border border-glass-border rounded-xl p-6 shadow-lg"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <h3 className="text-xl font-heading text-accent-2 mb-4">{title}</h3>
      
      <div className="space-y-4">
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
          className="w-full border-2 border-dashed border-glass-border rounded-lg p-8 text-center hover:bg-surface/30 transition-colors duration-200"
        >
          <div className="text-3xl mb-2">📁</div>
          <p className="text-text/70">Click to upload images</p>
          <p className="text-sm text-muted mt-1">Supports multiple images</p>
        </button>

        <AnimatePresence>
          {uploadedImages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 gap-2"
            >
              {uploadedImages.map((image, index) => (
                <motion.div
                  key={image}
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="relative group"
                >
                  <img
                    src={image}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    ×
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const ImageCard: React.FC<{
  image: GeneratedImage;
  style: string;
  index: number;
  onRegenerate: (index: number) => void;
  onDownload: (index: number) => void;
  scenario?: string;
}> = ({ image, style, index, onRegenerate, onDownload, scenario }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Safely extract error string
  const errorMsg = typeof image.error === 'string' ? image.error : 'Unknown error occurred';

  return (
    <motion.div
      className="bg-surface/50 backdrop-blur-sm border border-glass-border rounded-xl p-4 shadow-lg"
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="text-center mb-3">
        <h3 className="font-heading text-accent-2 text-lg">{style}</h3>
        <p className="text-xs text-muted mt-1 h-8 line-clamp-2" title={scenario}>
          {scenario || "Pending scenario..."}
        </p>
      </div>

      <div className="relative aspect-[3/4] bg-surface/30 rounded-lg overflow-hidden">
        {image.status === 'pending' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full"
            />
          </div>
        )}

        {image.status === 'done' && image.url && (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 bg-surface/30 animate-pulse" />
            )}
            <motion.img
              src={image.url}
              alt={`Generated ${style}`}
              className="w-full h-full object-cover"
              onLoad={() => setImageLoaded(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: imageLoaded ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            />
          </>
        )}

        {image.status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center text-red-400">
              <div className="text-2xl mb-2">⚠️</div>
              <p className="text-sm line-clamp-3">{errorMsg}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onRegenerate(index)}
          disabled={image.status === 'pending'}
          className="flex-1 bg-surface/50 border border-glass-border rounded px-3 py-2 text-sm hover:bg-surface/70 transition-colors disabled:opacity-50"
        >
          🔄
        </button>
        <button
          onClick={() => onDownload(index)}
          disabled={image.status !== 'done'}
          className="flex-1 bg-accent text-white rounded px-3 py-2 text-sm hover:bg-accent/80 transition-colors disabled:opacity-50"
        >
          📥
        </button>
      </div>
    </motion.div>
  );
};

const MediaGeneratorCard: React.FC<{
  title: string;
  description: string;
  state: MediaState;
  config: VideoConfig | MemeConfig;
  onConfigChange: (config: any) => void;
  onGenerate: () => void;
  onDownload: () => void;
  imageOptions: Array<{ value: number; label: string }>;
  optionItems: string[];
  loadingMessages?: string[];
  type: 'video' | 'meme';
  isApiKeySelected?: boolean;
  onSelectApiKey?: () => void;
}> = ({ title, description, state, config, onConfigChange, onGenerate, onDownload, imageOptions, optionItems, loadingMessages, type, isApiKeySelected, onSelectApiKey }) => {
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(0);

  useEffect(() => {
    if (state.status === 'pending' && loadingMessages) {
      const interval = setInterval(() => {
        setCurrentLoadingMessage(prev => (prev + 1) % loadingMessages.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [state.status, loadingMessages]);

  const hasImages = imageOptions && imageOptions.length > 0;
  const errorString = typeof state.error === 'string' ? state.error : 'An unknown error occurred.';

  if (type === 'video' && !isApiKeySelected) {
    return (
      <motion.div
        className="bg-surface/50 backdrop-blur-sm border border-glass-border rounded-xl p-6 shadow-lg w-80"
        whileHover={{ y: -2 }}
      >
        <div className="text-center mb-4">
          <h3 className="text-xl font-heading text-accent-2">{title}</h3>
          <p className="text-muted text-sm mt-1">{description}</p>
        </div>
        <div className="text-center space-y-4">
          <p className="text-sm text-text/80">Video generation requires an API key.</p>
          <button
            onClick={onSelectApiKey}
            className="w-full bg-accent text-white py-2 rounded font-medium hover:bg-accent/80 transition-colors"
          >
            Select API Key
          </button>
          <p className="text-xs text-muted">
            For more information, see the{' '}
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent-2">
              billing documentation
            </a>.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-surface/50 backdrop-blur-sm border border-glass-border rounded-xl p-6 shadow-lg w-80"
      whileHover={{ y: -2 }}
    >
      <div className="text-center mb-4">
        <h3 className="text-xl font-heading text-accent-2">{title}</h3>
        <p className="text-muted text-sm mt-1">{description}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text/80 mb-1">Select Image</label>
          <select
            value={config.imageIndex}
            onChange={(e) => onConfigChange({ ...config, imageIndex: Number(e.target.value) })}
            className="w-full bg-surface/30 border border-glass-border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50"
            disabled={!hasImages}
          >
            {!hasImages && <option value={0}>Generate images first...</option>}
            {imageOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text/80 mb-1">
            {type === 'video' ? 'Animation Style' : 'Bollywood Scenario'}
          </label>
          <select
            value={type === 'video' ? (config as VideoConfig).prompt : (config as MemeConfig).scenario}
            onChange={(e) => onConfigChange({ 
              ...config, 
              [type === 'video' ? 'prompt' : 'scenario']: e.target.value 
            })}
            className="w-full bg-surface/30 border border-glass-border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            {optionItems.map((item, index) => (
              <option key={index} value={String(item)}>
                {String(item)}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onGenerate}
          disabled={state.status === 'pending' || !hasImages}
          className="w-full bg-accent text-white py-2 rounded font-medium hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.status === 'pending' ? 'Generating...' : !hasImages ? 'Awaiting Images' : `Generate ${type === 'video' ? 'Video' : 'Meme'}`}
        </button>

        {state.status === 'pending' && loadingMessages && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-muted"
          >
            {loadingMessages[currentLoadingMessage]}
          </motion.div>
        )}

        {state.status === 'done' && state.url && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-3"
          >
            <div className="relative rounded-lg overflow-hidden bg-black/20">
              {type === 'video' ? (
                <video
                  src={state.url}
                  controls
                  className="w-full"
                  poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                />
              ) : (
                <img
                  src={state.url}
                  alt="Generated meme"
                  className="w-full h-48 object-cover"
                />
              )}
            </div>
            <button
              onClick={onDownload}
              className="w-full bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 transition-colors"
            >
              Download {type === 'video' ? 'Video' : 'Meme'}
            </button>
          </motion.div>
        )}

        {state.status === 'error' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-red-400 text-sm p-3 bg-red-400/10 rounded"
          >
            {errorString}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Main App Component
const App: React.FC = () => {
  // State
  const [personImages, setPersonImages] = useState<string[]>([]);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [styleImages, setStyleImages] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [appState, setAppState] = useState<AppState>('idle');
  const [sessionScenarios, setSessionScenarios] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [mainPrompt, setMainPrompt] = useState('');
  const [videoState, setVideoState] = useState<MediaState>({ status: 'idle' });
  const [videoConfig, setVideoConfig] = useState<VideoConfig>({ imageIndex: 0, prompt: VIDEO_PROMPTS[0] });
  const [memeState, setMemeState] = useState<MediaState>({ status: 'idle' });
  const [memeConfig, setMemeConfig] = useState<MemeConfig>({ imageIndex: 0, scenario: BOLLYWOOD_MEME_SCENARIOS[0] });
  const [isApiKeySelected, setIsApiKeySelected] = useState(false);

  // Optimistic state for better UX
  const [optimisticImages, setOptimisticImages] = useOptimistic(
    generatedImages,
    (state, newImages: GeneratedImage[]) => newImages
  );

  // Custom hooks
  const { analyzeImages } = useImageAnalysis();
  const { generateMedia, isPending } = useMediaGeneration();

  // Effects
  useEffect(() => {
    const isReady = personImages.length > 0 || productImages.length > 0 || styleImages.length > 0;
    setAppState(isReady ? 'ready' : 'idle');
  }, [personImages, productImages, styleImages]);

  useEffect(() => {
    if (appState === 'ready') {
      setGeneratedImages([]);
      setVideoState({ status: 'idle' });
      setMemeState({ status: 'idle' });
    }
  }, [personImages, productImages, styleImages, appState]);

  useEffect(() => {
    const checkApiKey = async () => {
        if ((window as any).aistudio) {
            const hasKey = await (window as any).aistudio.hasSelectedApiKey();
            setIsApiKeySelected(hasKey);
        } else {
            // Ensure we don't block if not in IDX/AI Studio environment, assuming env var is there.
            // If no env var and not in AI Studio, video gen will fail later with 400/403, which is handled.
            setIsApiKeySelected(true);
        }
    };
    checkApiKey();
  }, []);

  // Handlers
  const generateImageForIndex = async (
    index: number, 
    scenario: string, 
    personUrls: string[], 
    productUrls: string[], 
    styleUrls: string[]
  ) => {
    try {
      const inputs = [];
      if (personUrls.length > 0) {
        inputs.push("- The primary subject is based on the person in the first set of images.");
      }
      if (productUrls.length > 0) {
        inputs.push("- The key element to include is the object from the second set of images.");
      }
      if (styleUrls.length > 0) {
        inputs.push("- The overall mood, color palette, and lighting style should be derived from the third set of images.");
      }

      const technicalRequirements = [
        "- Adhere strictly to the 9:16 vertical aspect ratio.",
        "- Ultra-high definition 4K quality with photorealistic details.",
        "- Professional, cinematic lighting and color grading.",
        "- Ensure the final image is a single, cohesive scene. Do not create a collage."
      ];
      if (personUrls.length > 0) {
        technicalRequirements.splice(3, 0, "- Maintain the person's identity and key features from the source images.");
      }
      if (productUrls.length > 0) {
        technicalRequirements.splice(4, 0, "- Blend the object seamlessly and naturally into the composition.");
      }

      const prompt = `Generate a cinematic, photorealistic vertical portrait (9:16 aspect ratio) based on the following inputs and scene description. If no inputs are provided, be creative based on the scene description.

**Inputs:**
${inputs.length > 0 ? inputs.join('\n') : "- No specific images provided for reference. Use your creativity."}

**Scene Description:**
"${scenario}"

**Technical Requirements:**
${technicalRequirements.join('\n')}`;

      const resultUrl = await generateStyledImage({
        personImages: personUrls,
        productImages: productUrls,
        styleImages: styleUrls,
      }, prompt);

      return resultUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(errorMessage);
    }
  };

  const handleGenerateClick = async () => {
    if (!personImages.length && !productImages.length && !styleImages.length) return;

    setAppState('generating');
    setOptimisticImages(Array(IMAGE_COUNT).fill({ status: 'pending' }));

    await generateMedia(
      async () => {
        // Step 1: Analyze all images to get descriptions
        const { personDesc, objectDesc, styleDesc } = await analyzeImages(personImages, productImages, styleImages);
        
        // Step 2: Generate 5 dynamic scenarios based on the descriptions
        const newSessionScenarios = await generateScenarios(personDesc, objectDesc, styleDesc, mainPrompt);
        // Ensure scenarios are strings
        const safeScenarios = newSessionScenarios.map(s => String(s));
        setSessionScenarios(safeScenarios);

        // Step 3: Generate an image for each scenario
        const results = await Promise.allSettled(
          safeScenarios.map((scenario, index) =>
            generateImageForIndex(index, scenario, personImages, productImages, styleImages)
          )
        );

        const newImages = results.map((result, index) => {
          if (result.status === 'fulfilled') {
            return { status: 'done' as const, url: result.value };
          } else {
            return { 
              status: 'error' as const, 
              error: String(result.reason.message || "Generation Failed"),
              isQuotaError: result.reason instanceof ApiError && result.reason.isQuotaError
            };
          }
        });

        setGeneratedImages(newImages);
        setAppState('results-shown');
      },
      () => {},
      (error) => {
        console.error("Generation failed:", error);
        // STRICTLY ensure error is a string to prevent React Error #31 (Object as child)
        const errorMsg = error instanceof Error ? error.message : String(error);
        setGeneratedImages(Array(IMAGE_COUNT).fill({ 
          status: 'error', 
          error: errorMsg,
          isQuotaError: error instanceof ApiError && error.isQuotaError
        }));
        setAppState('results-shown');
      }
    );
  };

  const handleRegenerateImage = async (index: number) => {
    if (!sessionScenarios[index]) return;

    const newOptimisticImages = [...optimisticImages];
    newOptimisticImages[index] = { status: 'pending' };
    setOptimisticImages(newOptimisticImages);

    await generateMedia(
      async () => {
        const resultUrl = await generateImageForIndex(
          index, 
          sessionScenarios[index], 
          personImages, 
          productImages, 
          styleImages
        );
        
        setGeneratedImages(prev => {
          const newImages = [...prev];
          newImages[index] = { status: 'done', url: resultUrl };
          return newImages;
        });
      },
      () => {},
      (error) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setGeneratedImages(prev => {
          const newImages = [...prev];
          newImages[index] = { 
            status: 'error', 
            error: errorMsg,
            isQuotaError: error instanceof ApiError && error.isQuotaError
          };
          return newImages;
        });
      }
    );
  };

  const handleGenerateCustom = async () => {
    if (!customPrompt.trim()) return;

    const newIndex = generatedImages.length;
    const newScenarios = [...sessionScenarios, customPrompt];
    
    setSessionScenarios(newScenarios);
    setOptimisticImages([...optimisticImages, { status: 'pending' }]);

    await generateMedia(
      async () => {
        const resultUrl = await generateImageForIndex(
          newIndex,
          customPrompt,
          personImages,
          productImages,
          styleImages
        );

        setGeneratedImages(prev => {
          const newImages = [...prev];
          newImages[newIndex] = { status: 'done', url: resultUrl };
          return newImages;
        });
        
        setCustomPrompt('');
      },
      () => {},
      (error) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setGeneratedImages(prev => {
          const newImages = [...prev];
          newImages[newIndex] = { 
            status: 'error', 
            error: errorMsg 
          };
          return newImages;
        });
      }
    );
  };

  const handleSelectApiKey = async () => {
    if ((window as any).aistudio) {
      try {
        await (window as any).aistudio.openSelectKey();
        setIsApiKeySelected(true);
        setVideoState({ status: 'idle' });
      } catch (e) {
        console.error("API Key selection failed", e);
        setVideoState({ status: 'error', error: "API Key selection failed. Please try again." });
      }
    }
  };

  const handleGenerateVideo = async () => {
    const sourceImage = generatedImages[videoConfig.imageIndex];
    if (sourceImage?.status !== 'done' || !sourceImage.url) return;

    setVideoState({ status: 'pending' });

    await generateMedia(
      () => generateStyledVideo(
        sourceImage.url!,
        `A cinematic 4-second video portrait with ${videoConfig.prompt}`
      ),
      (videoUrl) => {
        setVideoState({ status: 'done', url: videoUrl });
      },
      (error) => {
        let errorMessage = String(error.message || error);
        const isQuotaError = error instanceof ApiError && error.isQuotaError;
        if (errorMessage.includes("Requested entity was not found.")) {
            setIsApiKeySelected(false);
            errorMessage = "Your API key may be invalid. Please re-select your API key to continue.";
        }
        setVideoState({
          status: 'error',
          error: errorMessage,
          isQuotaError,
        });
      }
    );
  };

  const handleGenerateMeme = async () => {
    const sourceImage = generatedImages[memeConfig.imageIndex];
    if (sourceImage?.status !== 'done' || !sourceImage.url) return;

    setMemeState({ status: 'pending' });

    await generateMedia(
      () => generateMemeImage(sourceImage.url!, memeConfig.scenario),
      (memeUrl) => {
        setMemeState({ status: 'done', url: memeUrl });
      },
      (error) => {
        setMemeState({ 
          status: 'error', 
          error: String(error.message || error),
          isQuotaError: error instanceof ApiError && error.isQuotaError
        });
      }
    );
  };

  const handleReset = () => {
    setPersonImages([]);
    setProductImages([]);
    setStyleImages([]);
    setGeneratedImages([]);
    setSessionScenarios([]);
    setVideoState({ status: 'idle' });
    setMemeState({ status: 'idle' });
    setAppState('idle');
    setCustomPrompt('');
  };

  const handleDownloadImage = (index: number) => {
    const image = generatedImages[index];
    if (image?.status === 'done' && image.url) {
      const link = document.createElement('a');
      link.href = image.url;
      link.download = `cinematic-portrait-${index + 1}.jpg`;
      link.click();
    }
  };

  const handleDownloadVideo = () => {
    if (videoState.status === 'done' && videoState.url) {
      const link = document.createElement('a');
      link.href = videoState.url;
      link.download = 'animated-cinematic-portrait.mp4';
      link.click();
    }
  };

  const handleDownloadMeme = () => {
    if (memeState.status === 'done' && memeState.url) {
      const link = document.createElement('a');
      link.href = memeState.url;
      link.download = 'bollywood-meme.jpg';
      link.click();
    }
  };

  // Render helpers
  const renderUploadSection = () => (
    <motion.div
      className="flex flex-col items-center justify-center gap-8 px-4 w-full max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="grid md:grid-cols-3 gap-8 w-full">
        <ImageUploadBox
          title="1. Add Portrait (Optional)"
          onImagesChange={setPersonImages}
          uploadedImages={personImages}
        />
        <ImageUploadBox
          title="2. Add Object (Optional)"
          onImagesChange={setProductImages}
          uploadedImages={productImages}
        />
        <ImageUploadBox
          title="3. Define Style (Optional)"
          onImagesChange={setStyleImages}
          uploadedImages={styleImages}
        />
      </div>

      <motion.div
        className="w-full max-w-3xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="text-center mb-4">
            <h3 className="text-xl font-heading text-accent-2">4. Set the Scene (Optional)</h3>
            <p className="text-muted text-sm mt-1">Describe a creative direction to guide the AI.</p>
        </div>
        <textarea
          value={mainPrompt}
          onChange={(e) => setMainPrompt(e.target.value)}
          placeholder="e.g., A mysterious detective in a rainy, neon-lit city street at night..."
          className="w-full bg-surface/50 backdrop-blur-sm border border-glass-border rounded-xl p-4 text-base focus:ring-2 focus:ring-accent focus:border-transparent resize-none h-24"
          rows={2}
        />
      </motion.div>

      <motion.button
        onClick={handleGenerateClick}
        disabled={appState !== 'ready' || isPending}
        className="font-heading text-lg font-semibold text-white bg-accent py-3 px-8 rounded shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        whileHover={appState === 'ready' ? { scale: 1.05 } : {}}
        whileTap={appState === 'ready' ? { scale: 0.95 } : {}}
      >
        {isPending ? 'Creating Cinematic Portraits...' : 'Generate Cinematic Portraits'}
      </motion.button>
    </motion.div>
  );

  const renderResultsSection = () => {
    const imageOptions = generatedImages
      .map((img, index) => ({
        value: index,
        label: STYLES[index] || `Custom ${index - IMAGE_COUNT + 1}`,
        disabled: img.status !== 'done'
      }))
      .filter(opt => !opt.disabled);

    return (
      <div className="w-full h-full flex-grow flex flex-col items-center overflow-auto px-4">
        {/* Gallery */}
        <motion.div
          className="w-full py-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-8">
            <h2 className="text-4xl font-heading text-accent-2">Your Cinematic Portraits</h2>
            <p className="text-muted mt-2">Professional-grade AI-generated portraits with cinematic quality</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
            {optimisticImages.map((image, index) => (
              <ImageCard
                key={index}
                image={image}
                style={STYLES[index] || `Custom ${index - IMAGE_COUNT + 1}`}
                index={index}
                onRegenerate={handleRegenerateImage}
                onDownload={handleDownloadImage}
                scenario={sessionScenarios[index]}
              />
            ))}
          </div>
        </motion.div>

        {/* Custom Prompt */}
        <motion.div
          className="w-full max-w-4xl mx-auto py-8"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-4">
            <h2 className="text-3xl font-heading text-accent-2">Create Your Own Scene</h2>
            <p className="text-muted mt-1">Describe a unique cinematic scenario for a new portrait</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch gap-4">
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., A fantasy warrior portrait in enchanted forest with magical lighting..."
              className="w-full flex-grow bg-surface border border-glass-border rounded p-3 text-base focus:ring-2 focus:ring-accent focus:border-transparent resize-none h-24"
              rows={2}
            />
            <button
              onClick={handleGenerateCustom}
              disabled={!customPrompt.trim() || isPending}
              className="font-heading text-lg font-semibold text-white bg-accent py-3 px-8 rounded shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50 whitespace-nowrap"
            >
              Generate
            </button>
          </div>
        </motion.div>

        {/* Media Generators */}
        <motion.div 
          className="w-full flex flex-wrap items-start justify-center gap-8 md:gap-12 py-8"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <MediaGeneratorCard
            title="Bollywood Meme Maker"
            description="Add iconic Bollywood dialogues to your portraits"
            state={memeState}
            config={memeConfig}
            onConfigChange={setMemeConfig}
            onGenerate={handleGenerateMeme}
            onDownload={handleDownloadMeme}
            imageOptions={imageOptions}
            optionItems={BOLLYWOOD_MEME_SCENARIOS}
            type="meme"
          />

          <MediaGeneratorCard
            title="Animate Your Portrait"
            description="Bring your cinematic portrait to life!"
            state={videoState}
            config={videoConfig}
            onConfigChange={setVideoConfig}
            onGenerate={handleGenerateVideo}
            onDownload={handleDownloadVideo}
            imageOptions={imageOptions}
            optionItems={VIDEO_PROMPTS}
            loadingMessages={VIDEO_LOADING_MESSAGES}
            type="video"
            isApiKeySelected={isApiKeySelected}
            onSelectApiKey={handleSelectApiKey}
          />
        </motion.div>

        <button 
          onClick={handleReset}
          className="font-heading text-lg font-semibold text-text bg-glass border-2 border-glass-border py-3 px-8 rounded shadow-lg transform transition-all duration-200 hover:scale-105 mb-8"
        >
          Start New Session
        </button>
      </div>
    );
  };

  return (
    <div className="bg-background text-text min-h-screen flex flex-col items-center justify-center relative overflow-hidden font-sans pt-20 pb-28 sm:pb-20">
      {/* Background */}
      <div className="absolute inset-0 bg-surface/5 [mask-image:linear-gradient(to_bottom,white_5%,transparent_80%)]" />

      <main className="w-full flex-grow flex flex-col items-center justify-center z-10">
        <div className="text-center mb-10 px-4">
          <motion.h1
            className="text-5xl md:text-7xl font-heading"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            ✨ Past Forward
          </motion.h1>
          <motion.p
            className="text-lg md:text-xl text-muted mt-4 max-w-3xl mx-auto"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Create cinematic portraits with AI - From classic Bollywood memes to animated masterpieces
          </motion.p>
        </div>

        <AnimatePresence mode="wait">
          {appState === 'idle' || appState === 'ready' || appState === 'generating' ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              {appState === 'generating' ? renderResultsSection() : renderUploadSection()}
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              {renderResultsSection()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
