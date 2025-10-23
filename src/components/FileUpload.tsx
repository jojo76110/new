import React, { useState } from 'react';
import { UploadIcon } from './Icons';

interface FileUploadProps {
  onImageUpload: (base64: string, mimeType: string) => void;
  uploadedImage: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onImageUpload, uploadedImage }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        onImageUpload(reader.result as string, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileChange(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <label htmlFor="file-upload" className="cursor-pointer">
        <div
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          className={`relative w-full h-48 border-2 border-dashed rounded-lg flex flex-col justify-center items-center transition-colors duration-300 ${
            isDragging ? 'border-cyan-500 bg-gray-700/50' : 'border-gray-600 hover:border-cyan-400'
          }`}
        >
          {uploadedImage ? (
            <img src={uploadedImage} alt="Uploaded preview" className="object-contain h-full w-full rounded-lg" />
          ) : (
            <div className="text-center text-gray-400">
              <UploadIcon />
              <p className="mt-2 font-semibold">点击或拖拽图片到此处</p>
              <p className="text-sm">建议使用正面清晰人像照</p>
            </div>
          )}
        </div>
      </label>
      <input
        id="file-upload"
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={onFileInputChange}
      />
    </div>
  );
};
