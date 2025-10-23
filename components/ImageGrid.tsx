import React from 'react';
import { type GeneratedImage } from '../types';

interface ImageGridProps {
  images: GeneratedImage[];
  selectedForDownload: Set<string>;
  onToggleSelect: (imageUrl: string) => void;
  isLoading: boolean;
}

export const ImageGrid: React.FC<ImageGridProps> = ({ images, selectedForDownload, onToggleSelect, isLoading }) => {
  if (isLoading) {
    return null; // The loading state is handled by the main button spinner
  }
  
  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center text-gray-500">
        <p>上传图片后，在左边选择表情，<br/>然后点击“一键生成”吧！</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto max-h-[calc(100vh-350px)] lg:max-h-full pr-2">
      {images.map(image => (
        <div
          key={image.id}
          onClick={() => onToggleSelect(image.url)}
          className="relative group cursor-pointer aspect-square"
        >
          <img
            src={image.url}
            alt={image.prompt}
            className="w-full h-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
          />
          <div
            className={`absolute inset-0 bg-black transition-opacity duration-300 rounded-lg ${
              selectedForDownload.has(image.url) ? 'opacity-40' : 'opacity-0 group-hover:opacity-30'
            }`}
          ></div>
           <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 border-white transition-all duration-300 flex items-center justify-center ${
                selectedForDownload.has(image.url) ? 'bg-cyan-600 border-cyan-400' : 'bg-black/30'
           }`}>
                {selectedForDownload.has(image.url) && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>}
           </div>
        </div>
      ))}
    </div>
  );
};