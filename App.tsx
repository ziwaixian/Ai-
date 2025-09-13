/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, generate3DView, generateVideoFromImage, removeBackground, restorePhoto, groupRestorePhoto } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import ThreeDViewPanel from './components/ThreeDViewPanel';
import { UndoIcon, RedoIcon, EyeIcon } from './components/icons';
import StartScreen from './components/StartScreen';
import AnimatePanel from './components/AnimatePanel';
import RemoveBgPanel from './components/RemoveBgPanel';
import RestorePanel from './components/RestorePanel';
import GroupRestorePanel from './components/GroupRestorePanel';

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

type Tab = 'retouch' | 'adjust' | 'filters' | 'crop' | 'threeD' | 'animate' | 'removeBg' | 'restore' | 'groupRestore';

const App: React.FC = () => {
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [animatePrompt, setAnimatePrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('AI is working its magic...');
  const [error, setError] = useState<string | null>(null);
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('retouch');
  
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  const isCurrentItemVideo = currentImage?.type.startsWith('video/');

  // Effect to create and revoke object URLs safely for the current image
  useEffect(() => {
    if (currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  
  // Effect to create and revoke object URLs safely for the original image
  useEffect(() => {
    if (originalImage) {
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage]);


  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const addImageToHistory = useCallback((newImageFile: File) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    // Reset transient states after an action
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, [history, historyIndex]);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setEditHotspot(null);
    setDisplayHotspot(null);
    setActiveTab('retouch');
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!currentImage || isCurrentItemVideo) {
      setError('No image loaded to edit.');
      return;
    }
    
    if (!prompt.trim()) {
        setError('Please enter a description for your edit.');
        return;
    }

    if (!editHotspot) {
        setError('Please click on the image to select an area to edit.');
        return;
    }

    setIsLoading(true);
    setLoadingMessage('AI is working its magic...');
    setError(null);
    
    try {
        const editedImageUrl = await generateEditedImage(currentImage, prompt, editHotspot);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setEditHotspot(null);
        setDisplayHotspot(null);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, prompt, editHotspot, addImageToHistory, isCurrentItemVideo]);
  
  const handleApplyFilter = useCallback(async (filterPrompt: string) => {
    if (!currentImage || isCurrentItemVideo) {
      setError('No image loaded to apply a filter to.');
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('AI is working its magic...');
    setError(null);
    
    try {
        const filteredImageUrl = await generateFilteredImage(currentImage, filterPrompt);
        const newImageFile = dataURLtoFile(filteredImageUrl, `filtered-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the filter. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory, isCurrentItemVideo]);
  
  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
    if (!currentImage || isCurrentItemVideo) {
      setError('No image loaded to apply an adjustment to.');
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('AI is working its magic...');
    setError(null);
    
    try {
        const adjustedImageUrl = await generateAdjustedImage(currentImage, adjustmentPrompt);
        const newImageFile = dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the adjustment. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory, isCurrentItemVideo]);

  const handleGenerate3DView = useCallback(async () => {
    if (!currentImage || isCurrentItemVideo) {
      setError('No image loaded to generate a 3D view from.');
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('AI is working its magic...');
    setError(null);
    
    try {
        const imageUrl = await generate3DView(currentImage);
        const newImageFile = dataURLtoFile(imageUrl, `3dview-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the 3D view. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory, isCurrentItemVideo]);

  const handleGenerateVideo = useCallback(async (prompt: string) => {
    if (!currentImage || isCurrentItemVideo) {
      setError('No image loaded to animate.');
      return;
    }
    if (!prompt.trim()) {
        setError('Please enter a description for the animation.');
        return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
        const onProgress = (message: string) => {
            setLoadingMessage(message);
        };
        const videoFile = await generateVideoFromImage(currentImage, prompt, onProgress);
        addImageToHistory(videoFile);
        setAnimatePrompt('');
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the video. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
        setLoadingMessage('AI is working its magic...'); // Reset message
    }
  }, [currentImage, addImageToHistory, isCurrentItemVideo]);

  const handleRemoveBackground = useCallback(async () => {
    if (!currentImage || isCurrentItemVideo) {
      setError('No image loaded to remove background from.');
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('AI is removing the background...');
    setError(null);
    
    try {
        const resultUrl = await removeBackground(currentImage);
        const newImageFile = dataURLtoFile(resultUrl, `bg-removed-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to remove background. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
        setLoadingMessage('AI is working its magic...'); // Reset
    }
  }, [currentImage, addImageToHistory, isCurrentItemVideo]);

  const handleRestorePhoto = useCallback(async () => {
    if (!currentImage || isCurrentItemVideo) {
      setError('No image loaded to restore.');
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('AI is restoring your photo...');
    setError(null);
    
    try {
        const resultUrl = await restorePhoto(currentImage);
        const newImageFile = dataURLtoFile(resultUrl, `restored-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to restore photo. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
        setLoadingMessage('AI is working its magic...'); // Reset
    }
  }, [currentImage, addImageToHistory, isCurrentItemVideo]);
  
  const handleGroupRestorePhoto = useCallback(async () => {
    if (!currentImage || isCurrentItemVideo) {
      setError('No image loaded to restore.');
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('AI is restoring your group photo...');
    setError(null);
    
    try {
        const resultUrl = await groupRestorePhoto(currentImage);
        const newImageFile = dataURLtoFile(resultUrl, `restored-group-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to restore group photo. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
        setLoadingMessage('AI is working its magic...'); // Reset
    }
  }, [currentImage, addImageToHistory, isCurrentItemVideo]);

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) {
        setError('Please select an area to crop.');
        return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        setError('Could not process the crop.');
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );
    
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile);

  }, [completedCrop, addImageToHistory]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(historyIndex - 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [canUndo, historyIndex]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(historyIndex + 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [canRedo, historyIndex]);

  const handleReset = useCallback(() => {
    if (history.length > 0) {
      setHistoryIndex(0);
      setError(null);
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [history]);

  const handleUploadNew = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
      setError(null);
      setPrompt('');
      setEditHotspot(null);
      setDisplayHotspot(null);
  }, []);

  const handleDownload = useCallback(() => {
      if (currentImage) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          const extension = isCurrentItemVideo ? 'mp4' : 'png';
          link.download = `pixshop-result-${Date.now()}.${extension}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
  }, [currentImage, isCurrentItemVideo]);
  
  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTab !== 'retouch' || isCurrentItemVideo) return;
    
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDisplayHotspot({ x: offsetX, y: offsetY });

    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    const scaleX = naturalWidth / clientWidth;
    const scaleY = naturalHeight / clientHeight;

    const originalX = Math.round(offsetX * scaleX);
    const originalY = Math.round(offsetY * scaleY);

    setEditHotspot({ x: originalX, y: originalY });
};

  const renderContent = () => {
    if (error) {
       return (
           <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
            <p className="text-md text-red-400">{error}</p>
            <button
                onClick={() => setError(null)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
              >
                Try Again
            </button>
          </div>
        );
    }
    
    if (!currentImageUrl) {
      return <StartScreen onFileSelect={handleFileSelect} />;
    }

    const mediaElement = (
      <>
        {/* Base image is the original, always at the bottom */}
        {originalImageUrl && (
          originalImage?.type.startsWith('video/') ? (
            <video key={`original-${originalImageUrl}`} src={originalImageUrl} muted autoPlay loop className="w-full h-auto object-contain max-h-[60vh] rounded-xl pointer-events-none" />
          ) : (
            <img key={`original-${originalImageUrl}`} src={originalImageUrl} alt="Original" className="w-full h-auto object-contain max-h-[60vh] rounded-xl pointer-events-none" />
          )
        )}
        {/* The current image is an overlay that fades in/out for comparison */}
        {currentImageUrl && (
            isCurrentItemVideo ? (
              <video key={`current-${currentImageUrl}`} src={currentImageUrl} muted autoPlay loop className={`absolute top-0 left-0 w-full h-auto object-contain max-h-[60vh] rounded-xl transition-opacity duration-200 ease-in-out ${isComparing ? 'opacity-0' : 'opacity-100'}`} />
            ) : (
              <img ref={imgRef} key={`current-${currentImageUrl}`} src={currentImageUrl} alt="Current" onClick={handleImageClick} className={`absolute top-0 left-0 w-full h-auto object-contain max-h-[60vh] rounded-xl transition-opacity duration-200 ease-in-out ${isComparing ? 'opacity-0' : 'opacity-100'} ${activeTab === 'retouch' ? 'cursor-crosshair' : ''}`} />
            )
        )}
      </>
    );

    const cropImageElement = (
      <img 
        ref={imgRef}
        key={`crop-${currentImageUrl}`}
        src={currentImageUrl} 
        alt="Crop this image"
        className="w-full h-auto object-contain max-h-[60vh] rounded-xl"
      />
    );


    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-black/20">
            {isLoading && (
                <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                    <Spinner />
                    <p className="text-gray-300 text-center">{loadingMessage}</p>
                </div>
            )}
            
            {activeTab === 'crop' && !isCurrentItemVideo ? (
              <ReactCrop 
                crop={crop} 
                onChange={c => setCrop(c)} 
                onComplete={c => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-[60vh]"
              >
                {cropImageElement}
              </ReactCrop>
            ) : <div className="relative">{mediaElement}</div> }

            {displayHotspot && !isLoading && activeTab === 'retouch' && !isCurrentItemVideo && (
                <div 
                    className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}
                >
                    <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div>
                </div>
            )}
        </div>
        
        {!isCurrentItemVideo ? (
          <>
            <div className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg p-2 flex items-center justify-center gap-2 backdrop-blur-sm flex-wrap">
                {(['retouch', 'crop', 'adjust', 'filters', 'removeBg', 'restore', 'groupRestore', 'threeD', 'animate'] as Tab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`grow capitalize font-semibold py-3 px-5 rounded-md transition-all duration-200 text-base ${
                            activeTab === tab 
                            ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' 
                            : 'text-gray-300 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        {tab === 'threeD' ? '3D View' : tab === 'removeBg' ? 'Remove BG' : tab === 'groupRestore' ? 'Group Restore' : tab}
                    </button>
                ))}
            </div>
            
            <div className="w-full">
                {activeTab === 'retouch' && (
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-md text-gray-400">
                            {editHotspot ? 'Great! Now describe your localized edit below.' : 'Click an area on the image to make a precise edit.'}
                        </p>
                        <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-2">
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={editHotspot ? "e.g., 'change my shirt color to blue'" : "First click a point on the image"}
                                className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-5 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isLoading || !editHotspot}
                            />
                            <button 
                                type="submit"
                                className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-5 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                                disabled={isLoading || !prompt.trim() || !editHotspot}
                            >
                                Generate
                            </button>
                        </form>
                    </div>
                )}
                {activeTab === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />}
                {activeTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} />}
                {activeTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} />}
                {activeTab === 'threeD' && <ThreeDViewPanel onGenerate={handleGenerate3DView} isLoading={isLoading} />}
                {activeTab === 'animate' && <AnimatePanel onGenerate={handleGenerateVideo} isLoading={isLoading} prompt={animatePrompt} setPrompt={setAnimatePrompt} />}
                {activeTab === 'removeBg' && <RemoveBgPanel onRemove={handleRemoveBackground} isLoading={isLoading} />}
                {activeTab === 'restore' && <RestorePanel onRestore={handleRestorePhoto} isLoading={isLoading} />}
                {activeTab === 'groupRestore' && <GroupRestorePanel onRestore={handleGroupRestorePhoto} isLoading={isLoading} />}
            </div>
          </>
        ) : (
          <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm text-center">
            <h3 className="text-xl font-bold text-gray-200">Video Generated</h3>
            <p className="text-md text-gray-400 max-w-md">
                You can now download your video or use "Undo" to continue editing the source image.
            </p>
          </div>
        )}
        
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button 
                onClick={handleUndo}
                disabled={!canUndo}
                className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5"
                aria-label="Undo last action"
            >
                <UndoIcon className="w-5 h-5 mr-2" />
                Undo
            </button>
            <button 
                onClick={handleRedo}
                disabled={!canRedo}
                className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5"
                aria-label="Redo last action"
            >
                <RedoIcon className="w-5 h-5 mr-2" />
                Redo
            </button>
            
            <div className="h-6 w-px bg-gray-600 mx-1 hidden sm:block"></div>

            {canUndo && (
              <button 
                  onMouseDown={() => setIsComparing(true)}
                  onMouseUp={() => setIsComparing(false)}
                  onMouseLeave={() => setIsComparing(false)}
                  onTouchStart={() => setIsComparing(true)}
                  onTouchEnd={() => setIsComparing(false)}
                  className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base"
                  aria-label="Press and hold to see original image"
              >
                  <EyeIcon className="w-5 h-5 mr-2" />
                  Compare
              </button>
            )}

            <button 
                onClick={handleReset}
                disabled={!canUndo}
                className="text-center bg-transparent border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent"
              >
                Reset
            </button>
            <button 
                onClick={handleUploadNew}
                className="text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base"
            >
                Upload New
            </button>

            <button 
                onClick={handleDownload}
                className="flex-grow sm:flex-grow-0 ml-auto bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base"
            >
                Download {isCurrentItemVideo ? 'Video' : 'Image'}
            </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <Header />
      <main className={`flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex justify-center ${currentImage ? 'items-start' : 'items-center'}`}>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;