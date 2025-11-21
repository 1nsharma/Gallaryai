/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface MemeState {
    status: 'idle' | 'pending' | 'done' | 'error';
    url?: string;
    error?: string;
    isQuotaError?: boolean;
}

interface MemeConfig {
    imageIndex: number;
    scenario: string;
}

interface MemeCardProps {
    memeState: MemeState;
    memeConfig: MemeConfig;
    onConfigChange: (config: MemeConfig) => void;
    onGenerate: () => void;
    onDownload: () => void;
    imageOptions: { value: number; label: string }[];
    scenarioOptions: string[];
}

const MemeCard: React.FC<MemeCardProps> = ({
    memeState,
    memeConfig,
    onConfigChange,
    onGenerate,
    onDownload,
    imageOptions,
    scenarioOptions,
}) => {

    const handleDownloadClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDownload();
    };

    const commonClasses = "relative aspect-square w-full max-w-xs rounded-lg bg-surface/50 backdrop-blur-sm border border-glass-border p-4 flex flex-col items-center justify-center text-center overflow-hidden transition-all duration-300";
    const buttonClasses = "font-heading font-semibold text-lg text-center text-black bg-accent-2 py-2 px-6 rounded shadow transform transition-transform duration-200 hover:scale-105 hover:-rotate-2 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed";
    const selectClasses = "bg-surface border border-glass-border rounded p-2 w-full text-sm focus:ring-accent-2 focus:border-accent-2";

    const renderContent = () => {
        switch (memeState.status) {
            case 'pending':
                return (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <svg className="animate-spin h-8 w-8 text-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                         <p className="text-muted text-sm">Mixing in the masala...</p>
                    </div>
                );
            case 'done':
                return (
                    <>
                        <img
                            key={memeState.url}
                            src={memeState.url}
                            className="absolute inset-0 w-full h-full object-contain rounded-lg"
                        />
                        <button
                            onClick={handleDownloadClick}
                            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white z-10"
                            aria-label="Download meme"
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
                        <p className="text-sm text-red-300 max-w-xs">{memeState.error || 'An unknown error occurred.'}</p>
                        {memeState.isQuotaError ? (
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
                        <div className="flex flex-col gap-4">
                             <div>
                                <label htmlFor="meme-image-select" className="block text-xs text-muted mb-1">Image to Meme</label>
                                <select
                                    id="meme-image-select"
                                    value={memeConfig.imageIndex}
                                    onChange={(e) => onConfigChange({ ...memeConfig, imageIndex: Number(e.target.value) })}
                                    className={selectClasses}
                                    disabled={imageOptions.length === 0}
                                >
                                    {imageOptions.length > 0 ? (
                                        imageOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)
                                    ) : (
                                        <option>Generate portraits first</option>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="meme-scenario-select" className="block text-xs text-muted mb-1">Bollywood Line</label>
                                <select
                                    id="meme-scenario-select"
                                    value={memeConfig.scenario}
                                    onChange={(e) => onConfigChange({ ...memeConfig, scenario: e.target.value })}
                                    className={selectClasses}
                                >
                                    {scenarioOptions.map(opt => <option key={opt} value={opt}>{opt.length > 30 ? opt.slice(0, 27) + "..." : opt}</option>)}
                                </select>
                            </div>
                        </div>
                        <button onClick={onGenerate} className={buttonClasses} disabled={imageOptions.length === 0}>
                            Generate Meme
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

export default MemeCard;