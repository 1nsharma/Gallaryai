/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, ChangeEvent } from 'react';

interface MultiImageUploadBoxProps {
    title: string;
    onImagesChange: (urls: string[]) => void;
    uploadedImages: string[];
}

const MultiImageUploadBox: React.FC<MultiImageUploadBoxProps> = ({ title, onImagesChange, uploadedImages }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newImageUrls: string[] = [];
            let filesProcessed = 0;

            if (files.length === 0) return;

            // FIX: Explicitly type 'file' as 'File' to resolve TypeScript inference error.
            files.forEach((file: File) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    newImageUrls.push(reader.result as string);
                    filesProcessed++;
                    if (filesProcessed === files.length) {
                        onImagesChange([...uploadedImages, ...newImageUrls]);
                    }
                };
                reader.readAsDataURL(file);
            });
            // Reset file input value to allow re-uploading the same file
            e.target.value = '';
        }
    };

    const handleRemoveImage = (index: number) => {
        const newImages = [...uploadedImages];
        newImages.splice(index, 1);
        onImagesChange(newImages);
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <h2 className="font-heading text-2xl text-accent-2">{title}</h2>
            <div
                className="relative w-full min-h-64 glass-card border-2 border-dashed border-glass-border flex items-center justify-center transition-colors duration-300"
            >
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    ref={inputRef}
                />
                {uploadedImages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-muted hover:text-accent-2 transition-colors duration-300 cursor-pointer group w-full h-full min-h-[18rem]" onClick={() => inputRef.current?.click()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4m0 0l4-4m-4 4L8 8" />
                        </svg>
                        <span className="font-sans text-lg">Click to upload</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-4 w-full">
                        {uploadedImages.map((image, index) => (
                            <div key={index} className="relative group aspect-square">
                                <img src={image} alt={`Uploaded ${index + 1}`} className="w-full h-full object-cover rounded" />
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(index); }}
                                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 leading-none opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    aria-label="Remove image"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => inputRef.current?.click()}
                            className="aspect-square bg-surface rounded border-2 border-dashed border-glass-border flex flex-col items-center justify-center text-muted hover:border-accent-2 hover:text-accent-2 transition-colors"
                            aria-label="Add more images"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MultiImageUploadBox;
