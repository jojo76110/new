import React, { useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import saveAs from 'file-saver';

import { FileUpload } from './components/FileUpload';
import { ExpressionSelector } from './components/ExpressionSelector';
import { ImageGrid } from './components/ImageGrid';
import { Spinner } from './components/Spinner';
import { DownloadIcon, GenerateIcon } from './components/Icons';
import { DEFAULT_STYLES, BACKGROUND_STYLES } from './constants';
import { type GeneratedImage } from './types';

// FIX: Per coding guidelines, the API key must be obtained from `process.env.API_KEY`.
// The execution environment is assumed to make this variable available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const App: React.FC = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageType, setUploadedImageType] = useState<string | null>(null);
  const [selectedExpressions, setSelectedExpressions] = useState<Set<string>>(new Set());
  const [customExpressions, setCustomExpressions] = useState<string[]>(Array(6).fill(''));
  const [selectedStyle, setSelectedStyle] = useState<string>(DEFAULT_STYLES[0].name);
  const [backgroundStyle, setBackgroundStyle] = useState<string>(BACKGROUND_STYLES[0].id);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedForDownload, setSelectedForDownload] = useState<Set<string>>(new Set());

  const handleImageUpload = (base64: string, mimeType: string) => {
    setUploadedImage(base64);
    setUploadedImageType(mimeType);
  };

  const handleCustomExpressionChange = (index: number, value: string) => {
    const newExpressions = [...customExpressions];
    newExpressions[index] = value;
    setCustomExpressions(newExpressions);
  };

  const handleGenerate = async () => {
    const expressionsToGenerate = new Set(selectedExpressions);
    customExpressions.forEach(expr => {
      if (expr.trim()) {
        expressionsToGenerate.add(expr.trim());
      }
    });

    if (!uploadedImage || !uploadedImageType) {
        setError('请先上传一张图片。');
        return;
    }

    if (expressionsToGenerate.size === 0) {
      setError('请至少选择或输入一个表情。');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);
    setSelectedForDownload(new Set());
    let anyImagesGenerated = false;

    const base64Data = uploadedImage.split(',')[1];
    
    for (const expression of expressionsToGenerate) {
        try {
            const backgroundRequirement = backgroundStyle === 'white-border'
                ? '3.  **格式一致性**：最终输出必须是方形图片，呈现为带有干净白色轮廓边框的贴纸样式。构图应聚焦于人物的胸像（头部和肩膀）。所有图片的尺寸、构图和贴纸边框样式必须保持一致。'
                : '3.  **格式与背景**：最终输出必须是带有透明背景的贴纸样式，以便可以叠加在任何背景上。请确保人物主体周围没有白色或其他颜色的边框。构图应聚焦于人物的胸像（头部和肩膀）。';
            
            const prompt = `任务：根据上传的图片，生成一张人物表情包贴纸。
要求：
1.  **人物一致性 (最高优先级)**：必须严格保持人物的核心特征与原图高度一致，特别是脸型、发型和五官。人物必须能被清晰地认出是同一个人，绝不能变成另一个人。
2.  **风格一致性**：所有生成的图片必须严格、统一地采用“${selectedStyle}”风格。
${backgroundRequirement}
4.  **表情**：这张贴纸的表情应为“${expression}”。
5.  **纯净输出**：图片中不能包含任何文字、字母或水印。`;
            
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: [{
                parts: [
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType: uploadedImageType,
                    },
                  },
                  { text: prompt },
                ],
              }],
              config: {
                responseModalities: [Modality.IMAGE],
              },
            });
            
            let imageGeneratedInLoop = false;
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
                    const newImage = {
                        id: `${expression}-${Date.now()}`,
                        url: imageUrl,
                        prompt: expression,
                    };
                    setGeneratedImages(prev => [...prev, newImage]);
                    imageGeneratedInLoop = true;
                    anyImagesGenerated = true;
                    break; 
                }
            }
            if (!imageGeneratedInLoop) {
              console.warn(`No image data returned for expression: "${expression}"`);
            }
        } catch (individualError: any) {
            console.error(`Failed to generate image for expression "${expression}":`, individualError);
            let detailedError = `生成 "${expression}" 时出错，请重试或检查图片。`;
            const errorMessage = JSON.stringify(individualError);
            if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
                detailedError = '请求过于频繁，已触发API速率限制。请减少选择的表情数量或稍后再试。';
            } else if (errorMessage.includes('prompt was blocked')) {
                detailedError = `生成 "${expression}" 的请求因安全设置被拦截。请尝试使用不同的表情或风格。`;
            } else if (individualError?.message) {
                 detailedError = `生成 "${expression}" 时出错: ${individualError.message}`;
            }
            
            setError(detailedError);
            break;
        }
        await sleep(10000);
    }
    
    if (!anyImagesGenerated && !error) {
      setError("无法生成图片。这可能是因为网络问题或输入图片不兼容。请稍后重试。");
    }

    setIsLoading(false);
  };

  const handleToggleSelect = (imageUrl: string) => {
    setSelectedForDownload(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageUrl)) {
        newSet.delete(imageUrl);
      } else {
        newSet.add(imageUrl);
      }
      return newSet;
    });
  };

  const handleDownload = () => {
    if (selectedForDownload.size === 0) return;

    Array.from(selectedForDownload).forEach((url, index) => {
        saveAs(url, `emoji-${index + 1}.png`);
    });
  };

  const isAllSelected = generatedImages.length > 0 && selectedForDownload.size === generatedImages.length;

  const handleSelectAllToggle = () => {
      if (isAllSelected) {
          setSelectedForDownload(new Set());
      } else {
          const allImageUrls = new Set(generatedImages.map(img => img.url));
          setSelectedForDownload(allImageUrls);
      }
  };

  const isGenerateDisabled = isLoading ||
    !uploadedImage ||
    (selectedExpressions.size === 0 && customExpressions.every(expr => expr.trim() === ''));

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent">AI 表情包生成器</h1>
          <p className="text-gray-400 mt-2">上传你的照片，一键生成专属魔性表情包</p>
        </header>
        
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel: Controls */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-3 bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent">1. 上传你的照片</h2>
              <FileUpload onImageUpload={handleImageUpload} uploadedImage={uploadedImage} />
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3 bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent">2. 选择表情</h2>
              <ExpressionSelector 
                selectedExpressions={selectedExpressions}
                setSelectedExpressions={setSelectedExpressions}
                customExpressions={customExpressions}
                onCustomExpressionChange={handleCustomExpressionChange}
              />
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-3 bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent">3. 选择风格</h2>
               <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {DEFAULT_STYLES.map(style => (
                  <button
                    key={style.name}
                    title={style.description}
                    onClick={() => setSelectedStyle(style.name)}
                    className={`flex flex-col items-center justify-start p-2 text-center rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-400 aspect-square ${
                      selectedStyle === style.name
                        ? 'bg-cyan-900/50 border-cyan-500'
                        : 'bg-gray-700 border-gray-600 hover:border-cyan-600 hover:bg-gray-700/80'
                    }`}
                  >
                    <div className="w-full h-2/3 flex items-center justify-center p-1">
                        <img 
                            src={style.previewImage} 
                            alt={`${style.name} preview`} 
                            className="max-w-full max-h-full object-contain" 
                        />
                    </div>
                    <p className="font-semibold text-white text-xs mt-auto leading-tight">{style.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3 bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent">4. 选择背景</h2>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {BACKGROUND_STYLES.map(style => (
                  <button
                    key={style.id}
                    title={style.name}
                    onClick={() => setBackgroundStyle(style.id)}
                    className={`flex flex-col items-center justify-start p-2 text-center rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-400 aspect-square ${
                      backgroundStyle === style.id
                        ? 'bg-cyan-900/50 border-cyan-500'
                        : 'bg-gray-700 border-gray-600 hover:border-cyan-600 hover:bg-gray-700/80'
                    }`}
                  >
                    <div className="w-full h-2/3 flex items-center justify-center p-1">
                        <img 
                            src={style.previewImage} 
                            alt={`${style.name} preview`} 
                            className="max-w-full max-h-full object-contain" 
                        />
                    </div>
                    <p className="font-semibold text-white text-xs mt-auto leading-tight">{style.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={handleGenerate}
              disabled={isGenerateDisabled}
              className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-cyan-500/50 mt-auto"
            >
              {isLoading ? (
                <>
                  <Spinner />
                  生成中...
                </>
              ) : (
                <>
                  <GenerateIcon />
                  <span className="ml-2">一键生成</span>
                </>
              )}
            </button>
          </div>

          {/* Right Panel: Image Grid */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent">5. 挑选心仪表情包</h2>
                    {generatedImages.length > 0 && (
                        <button
                            onClick={handleSelectAllToggle}
                            className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                            {isAllSelected ? '取消全选' : '全选'}
                        </button>
                    )}
                </div>
                {generatedImages.length > 0 && (
                    <button
                        onClick={handleDownload}
                        disabled={selectedForDownload.size === 0}
                        className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600/50 disabled:cursor-not-allowed disabled:text-gray-500 text-gray-200 font-semibold py-2 px-4 rounded-lg flex items-center transition-colors"
                    >
                        <DownloadIcon />
                        <span className="ml-2">下载选中 ({selectedForDownload.size})</span>
                    </button>
                )}
            </div>
            <div className="flex-grow">
                <ImageGrid 
                    images={generatedImages}
                    selectedForDownload={selectedForDownload}
                    onToggleSelect={handleToggleSelect}
                    isLoading={isLoading}
                />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
