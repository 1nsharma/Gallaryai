/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';

interface VideoState {
    status: 'idle' | 'pending' | 'done' | 'error';
    url?: string;
    error?: string;
    isQuotaError?: boolean;
}

interface VideoConfig {
    imageIndex: number;
    prompt: string;
}

interface VideoCardProps {
    videoState: VideoState;
    videoConfig: VideoConfig;
    onConfigChange: (config: VideoConfig) => void;
    onGenerate: () => void;
    onDownload: () => void;
    imageOptions: { value: number; label: string }[];
    promptOptions: string[];
    loadingMessages: string[];
}

const VideoCard: React.FC<VideoCardProps> = ({
    videoState,
    videoConfig,
    onConfigChange,
    onGenerate,
    onDownload,
    imageOptions,
    promptOptions,
    loadingMessages,
}) => {
    const [currentLoadingMessage, setCurrentLoadingMessage] = useState(loadingMessages[0]);

    useEffect(() => {
        if (videoState.status === 'pending') {
            const interval = setInterval(() => {
                setCurrentLoadingMessage(prev => {
                    const currentIndex = loadingMessages.indexOf(prev);
                    const nextIndex = (currentIndex + 1) % loadingMessages.length;
                    return loadingMessages[nextIndex];
                });
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [videoState.status, loadingMessages]);

    const handleDownloadClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDownload();
    };

    const commonClasses = "relative aspect-[9/16] w-full max-w-xs rounded-lg bg-surface/50 backdrop-blur-sm border border-glass-border p-4 flex flex-col items-center justify-center text-center overflow-hidden transition-all duration-300";
    const buttonClasses = "font-heading font-semibold text-lg text-center text-black bg-accent-2 py-2 px-6 rounded shadow transform transition-transform duration-200 hover:scale-105 hover:-rotate-2 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed";
    const selectClasses = "bg-surface border border-glass-border rounded p-2 w-full text-sm focus:ring-accent-2 focus:border-accent-2";

    const renderContent = () => {
        switch (videoState.status) {
            case 'pending':
                return (
                    <>
                        <div className="flex items-center justify-center h-full">
                            <svg className="animate-spin h-8 w-8 text-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                        <p className="absolute bottom-4 text-muted text-sm">{currentLoadingMessage}</p>
                    </>
                );
            case 'done':
                return (
                    <>
                        <video
                            key={videoState.url}
                            src={videoState.url}
                            className="absolute inset-0 w-full h-full object-cover rounded-lg"
                            autoPlay
                            loop
                            muted
                            playsInline
                        />
                        <button
                            onClick={handleDownloadClick}
                            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white z-10"
                            aria-label="Download video"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </button>
                    </>
                );
            case 'error':
                 return (
                    <div className="flex flex-col items-center justify-center gap-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-red-300 max-w-xs">{videoState.error || 'An unknown error occurred.'}</p>
                        {videoState.isQuotaError ? (
                             <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${buttonClasses} bg-blue-500 hover:bg-blue-400 !text-white`}
                            >
                                Check API Key / Quota
                            </a>
                        ) : (
                            <button onClick={onGenerate} className={buttonClasses}>Retry</button>
                        )}
                    </div>
                );
            case 'idle':
            default:
                return (
                    <div className="w-full max-w-sm flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                             <div className="flex-1">
                                <label htmlFor="image-select" className="block text-xs text-muted mb-1">Style to Animate</label>
                                <select
                                    id="image-select"
                                    value={videoConfig.imageIndex}
                                    onChange={(e) => onConfigChange({ ...videoConfig, imageIndex: Number(e.target.value) })}
                                    className={selectClasses}
                                    disabled={imageOptions.length === 0}
                                >
                                    {imageOptions.length > 0 ? (
                                        imageOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)
                                    ) : (
                                        <option>No styles available</option>
                                    )}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label htmlFor="prompt-select" className="block text-xs text-muted mb-1">Action</label>
                                <select
                                    id="prompt-select"
                                    value={videoConfig.prompt}
                                    onChange={(e) => onConfigChange({ ...videoConfig, prompt: e.target.value })}
                                    className={selectClasses}
                                >
                                    {promptOptions.map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1, 30)}</option>)}
                                </select>
                            </div>
                        </div>
                        <button onClick={onGenerate} className={buttonClasses} disabled={imageOptions.length === 0}>
                            Generate Video
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className={commonClasses}>
            {renderContent()}
        </div>
    );
};

export default VideoCard;