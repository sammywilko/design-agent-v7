
import React, { useState, useRef, useEffect, memo } from 'react';
import { GeneratedImage, StoryboardFrame, SavedEntity, Project, Beat, QualityScore } from '../types';
import { Plus, Trash2, FileDown, Wand2, ArrowRight, Layout, MonitorPlay, Upload, X, Link, GripVertical, FileSpreadsheet, Film, Loader2, Video, Ghost, ChevronUp, ChevronDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { generateImageCaption, generateTransitionPrompt } from '../services/gemini';

// Quality Badge Component - shows color-coded quality score (memoized)
const QualityBadge = memo(({ score }: { score?: QualityScore }) => {
    if (!score) return null;

    const getColorClass = (overall: number) => {
        if (overall >= 8) return 'bg-green-500 text-white';
        if (overall >= 6) return 'bg-yellow-500 text-black';
        return 'bg-red-500 text-white';
    };

    const getIcon = (overall: number) => {
        if (overall >= 8) return <CheckCircle className="w-2.5 h-2.5" />;
        return <AlertTriangle className="w-2.5 h-2.5" />;
    };

    return (
        <div
            className={`absolute bottom-2 left-2 ${getColorClass(score.overall)} text-[9px] px-1.5 py-0.5 rounded font-bold backdrop-blur-sm flex items-center gap-1 print:hidden cursor-help`}
            title={`Adherence: ${score.adherence}/10 | Technical: ${score.technical}/10${score.issues?.length ? '\nIssues: ' + score.issues.join(', ') : ''}`}
        >
            {getIcon(score.overall)}
            {score.overall}/10
        </div>
    );
});

interface StageThreeProps {
  globalAssets: GeneratedImage[];
  libraryAssets: SavedEntity[];
  showNotification: (msg: string) => void;
  onImportAsset: (image: GeneratedImage) => void;
  onRemoveAsset?: (imageId: string) => void; // Remove from asset pool
  currentProject: Project;
  onSendToVideo: (start: GeneratedImage, end?: GeneratedImage, prompt?: string) => void;
  incomingBeats?: Beat[] | null; // New Prop
  onClearIncomingBeats?: () => void;
}

const TRANSITIONS = ['CUT TO', 'DISSOLVE TO', 'FADE TO', 'WIPE TO', 'SMASH CUT'];
const SHOT_TYPES = ['WIDE', 'MED', 'CLOSE', 'EXTREME CLOSE', 'AERIAL'];

const StageThree: React.FC<StageThreeProps> = ({ 
    globalAssets, 
    libraryAssets, 
    showNotification, 
    onImportAsset,
    onRemoveAsset, 
    currentProject, 
    onSendToVideo,
    incomingBeats,
    onClearIncomingBeats
}) => {
  const [frames, setFrames] = useState<StoryboardFrame[]>([]);
  const [draggedImage, setDraggedImage] = useState<GeneratedImage | null>(null);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const [draggedFrameIndex, setDraggedFrameIndex] = useState<number | null>(null);
  
  const sidebarFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (incomingBeats && incomingBeats.length > 0) {
          // Convert Beats to Ghost Frames
          const ghostFrames: StoryboardFrame[] = incomingBeats.map((beat, i) => ({
              id: crypto.randomUUID(),
              sequenceOrder: i + 1,
              images: { start: { id: 'ghost', projectId: currentProject.id, url: '', prompt: 'Ghost', aspectRatio: '16:9' } }, // Ghost Image
              caption: beat.visualSummary,
              notes: `Mood: ${beat.mood}`,
              transition: 'CUT TO',
              shotType: (beat.shotType as any) || 'MED',
              duration: beat.duration
          }));
          setFrames(ghostFrames);
          if (onClearIncomingBeats) onClearIncomingBeats();
      }
  }, [incomingBeats]);

  // --- Drag and Drop Logic ---

  const handleDragStart = (e: React.DragEvent, image: GeneratedImage) => {
    setDraggedImage(image);
    e.dataTransfer.setData('application/json', JSON.stringify(image));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDropOnBoard = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedImage) return;

    const newFrame: StoryboardFrame = {
        id: crypto.randomUUID(),
        sequenceOrder: frames.length + 1,
        images: { start: draggedImage },
        caption: '',
        notes: '',
        transition: 'CUT TO',
        shotType: 'MED',
        duration: '2s'
    };

    setFrames(prev => [...prev, newFrame]);
    setDraggedImage(null);
  };

  const handleDropOnFrame = (e: React.DragEvent, frameId: string, slot: 'start' | 'end') => {
      e.preventDefault();
      e.stopPropagation();
      if (!draggedImage) return;

      setFrames(prev => prev.map(f => {
          if (f.id !== frameId) return f;
          
          if (slot === 'end') {
              return { ...f, images: { ...f.images, end: draggedImage } };
          } else {
              return { ...f, images: { ...f.images, start: draggedImage } };
          }
      }));
      setDraggedImage(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // --- Panel Sorting Logic ---
  const handlePanelDragStart = (e: React.DragEvent, index: number) => {
      setDraggedFrameIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString()); // Required for Firefox
  };

  const handlePanelDrop = (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      e.stopPropagation();

      if (draggedFrameIndex === null || draggedFrameIndex === dropIndex) return;
      
      const newFrames = [...frames];
      const [movedFrame] = newFrames.splice(draggedFrameIndex, 1);
      newFrames.splice(dropIndex, 0, movedFrame);
      
      // Update sequence order
      const reordered = newFrames.map((f, i) => ({ ...f, sequenceOrder: i + 1 }));
      setFrames(reordered);
      setDraggedFrameIndex(null);
  };

  // Simple up/down panel reordering
  const movePanelUp = (index: number) => {
    if (index === 0) return; // Already at top
    const newFrames = [...frames];
    [newFrames[index - 1], newFrames[index]] = [newFrames[index], newFrames[index - 1]];
    const reordered = newFrames.map((f, i) => ({ ...f, sequenceOrder: i + 1 }));
    setFrames(reordered);
  };

  const movePanelDown = (index: number) => {
    if (index >= frames.length - 1) return; // Already at bottom
    const newFrames = [...frames];
    [newFrames[index], newFrames[index + 1]] = [newFrames[index + 1], newFrames[index]];
    const reordered = newFrames.map((f, i) => ({ ...f, sequenceOrder: i + 1 }));
    setFrames(reordered);
  };

  // --- Sidebar File Import Logic ---

  const handleSidebarDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingSidebar(true);
  };

  const handleSidebarDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingSidebar(false);
  };

  const handleImportFiles = (files: FileList | null) => {
      setIsDraggingSidebar(false);
      if (!files || files.length === 0) return;
      
      let count = 0;
      Array.from(files).forEach(file => {
          if (file.type.startsWith('image/')) {
              const reader = new FileReader();
              reader.onload = (ev) => {
                  const result = ev.target?.result as string;
                  const newImg: GeneratedImage = {
                      id: crypto.randomUUID(),
                      projectId: currentProject.id,
                      url: result,
                      prompt: file.name.replace(/\.[^/.]+$/, ""), // Use filename as label
                      aspectRatio: 'custom'
                  };
                  onImportAsset(newImg);
              };
              reader.readAsDataURL(file);
              count++;
          }
      });
      
      if (count > 0) showNotification(`Imported ${count} images to pool`);
      if (sidebarFileInputRef.current) sidebarFileInputRef.current.value = '';
  };

  const handleSidebarDrop = (e: React.DragEvent) => {
      e.preventDefault();
      handleImportFiles(e.dataTransfer.files);
  };

  // --- Actions ---

  const removeFrame = (id: string) => {
      setFrames(prev => prev.filter(f => f.id !== id));
  };

  const clearFrameImage = (frameId: string, type: 'start' | 'end') => {
      setFrames(prev => prev.map(f => {
          if (f.id !== frameId) return f;
          if (type === 'start') {
              // If it's a ghost frame, just clearing it keeps it ghost
              return { ...f, images: { ...f.images, start: { id: 'ghost', projectId: '', url: '', prompt: 'Ghost', aspectRatio: '16:9' } } };
          } else {
              const newImages = { ...f.images };
              delete newImages.end;
              return { ...f, images: newImages, transitionNotes: undefined };
          }
      }));
  };

  const updateFrame = (id: string, field: keyof StoryboardFrame, value: any) => {
      setFrames(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const autoCaption = async (frame: StoryboardFrame) => {
      if (frame.images.start.id === 'ghost') {
          showNotification("Add an image first.");
          return;
      }
      setIsProcessingId(frame.id);
      try {
          const caption = await generateImageCaption(frame.images.start.url);
          const parts = caption.split(' - ');
          let shotType = frame.shotType;
          let text = caption;

          if (parts.length > 1) {
              const potentialType = parts[0].replace('[', '').replace(']', '').trim().toUpperCase();
              const matchedType = SHOT_TYPES.find(t => potentialType.includes(t));
              if (matchedType) shotType = matchedType as any;
              text = parts.slice(1).join(' - ');
          }

          updateFrame(frame.id, 'caption', text);
          updateFrame(frame.id, 'shotType', shotType);
          showNotification("Caption Generated");
      } catch (e) {
          console.error(e);
          showNotification("Failed to generate caption");
      } finally {
          setIsProcessingId(null);
      }
  };

  const autoTransition = async (frame: StoryboardFrame) => {
      if (!frame.images.end) return;
      setIsProcessingId(frame.id);
      try {
          const note = await generateTransitionPrompt(frame.images.start.url, frame.images.end.url);
          updateFrame(frame.id, 'transitionNotes', note);
          showNotification("Transition Analysis Complete");
      } catch (e) {
          console.error(e);
          showNotification("Failed to analyze transition");
      } finally {
          setIsProcessingId(null);
      }
  };

  const handlePrint = () => {
      window.print();
  };

  const exportCSV = () => {
      const headers = ['Panel', 'Shot Type', 'Duration', 'Transition', 'Caption', 'Technical Notes', 'AI Transition Notes'];
      const rows = frames.map((f, i) => [
          `Panel ${i + 1}`,
          f.shotType,
          f.duration,
          f.transition,
          `"${f.caption.replace(/"/g, '""')}"`,
          `"${f.notes.replace(/"/g, '""')}"`,
          `"${(f.transitionNotes || '').replace(/"/g, '""')}"`
      ]);

      // Add Byte Order Mark for Excel compatibility
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
          + headers.join(",") + "\n" 
          + rows.map(e => e.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${currentProject.name}_storyboard_data.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleSendFrameToVideo = (frame: StoryboardFrame) => {
      if (frame.images.start.id === 'ghost') {
          showNotification("Cannot send ghost frame to video.");
          return;
      }
      // Combine all context into a single rich prompt
      let combinedPrompt = "";
      if (frame.caption) combinedPrompt += `${frame.caption}. `;
      if (frame.notes) combinedPrompt += `Technical: ${frame.notes}. `;
      if (frame.transitionNotes) combinedPrompt += `Motion: ${frame.transitionNotes}.`;
      
      onSendToVideo(frame.images.start, frame.images.end, combinedPrompt.trim());
  };

  return (
    <div className="flex h-full bg-slate-950 text-slate-100 overflow-hidden">
        
        {/* Left Panel: Asset Source */}
        <div 
            className={`w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 print:hidden transition-colors ${isDraggingSidebar ? 'bg-slate-800 border-violet-500' : ''}`}
            onDragOver={handleSidebarDragOver}
            onDragLeave={handleSidebarDragLeave}
            onDrop={handleSidebarDrop}
        >
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Layout className="w-4 h-4" /> Asset Pool
                </h3>
                <button 
                    onClick={() => sidebarFileInputRef.current?.click()}
                    className="text-slate-500 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
                    title="Import Images"
                >
                    <Upload className="w-4 h-4" />
                </button>
                <input 
                    type="file" 
                    ref={sidebarFileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImportFiles(e.target.files)}
                />
            </div>

            {isDraggingSidebar && (
                <div className="p-4 text-center text-xs text-violet-300 bg-violet-900/20 border-b border-violet-500/30">
                    Drop images to import
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {/* Global Session Assets */}
                <div className="text-[10px] font-bold text-slate-500 mb-2">SESSION GENERATIONS</div>
                {globalAssets.map((img) => (
                    <div
                        key={img.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, img)}
                        className="relative group rounded-lg overflow-hidden border border-slate-700 cursor-grab active:cursor-grabbing hover:border-violet-500 transition-colors"
                    >
                        <img src={img.thumbnail || img.url} alt="asset" className="w-full h-24 object-cover pointer-events-none" loading="lazy" />
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[9px] truncate text-slate-300">
                            {img.prompt}
                        </div>
                        {/* Quality Score Badge */}
                        {img.generationContext?.qualityScore && (
                            <div
                                className={`absolute top-1 left-1 text-[8px] px-1 py-0.5 rounded font-bold ${
                                    img.generationContext.qualityScore.overall >= 8 ? 'bg-green-500 text-white' :
                                    img.generationContext.qualityScore.overall >= 6 ? 'bg-yellow-500 text-black' :
                                    'bg-red-500 text-white'
                                }`}
                                title={`Quality: ${img.generationContext.qualityScore.overall}/10`}
                            >
                                {img.generationContext.qualityScore.overall}
                            </div>
                        )}
                        {/* Delete Button */}
                        {onRemoveAsset && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onRemoveAsset(img.id); }}
                            className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-600 text-slate-400 hover:text-white rounded opacity-0 group-hover:opacity-100 transition-all"
                            title="Remove from pool"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                    </div>
                ))}
                
                {/* Library Assets */}
                <div className="text-[10px] font-bold text-slate-500 mt-6 mb-2">LIBRARY ASSETS</div>
                {libraryAssets.map((entity) => (
                    <div 
                        key={entity.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, { id: entity.id, projectId: entity.projectId, url: entity.data, prompt: entity.name, aspectRatio: 'custom' })}
                        className="relative group rounded-lg overflow-hidden border border-slate-700 cursor-grab active:cursor-grabbing hover:border-violet-500 transition-colors"
                    >
                        <img src={entity.data} alt="asset" className="w-full h-24 object-cover pointer-events-none" />
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[9px] truncate text-slate-300">
                            {entity.name}
                        </div>
                        <div className="absolute top-1 right-1 bg-violet-600 text-white text-[8px] px-1 rounded">LIB</div>
                    </div>
                ))}
            </div>
        </div>

        {/* Main Board Area */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            
            {/* Toolbar */}
            <div className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur print:hidden">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                        <Film className="w-5 h-5 text-violet-500" /> Storyboard
                    </h2>
                    <span className="text-xs text-slate-500 border-l border-slate-700 pl-4">
                        Drag images to create. Grab the handle (top of panel) to reorder.
                    </span>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportCSV} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                        <FileSpreadsheet className="w-4 h-4" /> Export Data (CSV)
                    </button>
                    <button onClick={handlePrint} className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-lg shadow-violet-900/20">
                        <FileDown className="w-4 h-4" /> Print PDF
                    </button>
                </div>
            </div>

            {/* Board Grid */}
            <div 
                className="flex-1 overflow-y-auto p-8"
                onDragOver={handleDragOver}
                onDrop={handleDropOnBoard}
            >
                {frames.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl text-slate-600">
                        <MonitorPlay className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg font-medium">Drag images here to start your sequence</p>
                        <p className="text-sm opacity-60">Build your narrative panel by panel</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-32 max-w-7xl mx-auto">
                        {frames.map((frame, index) => (
                            <div 
                                key={frame.id} 
                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                onDrop={(e) => handlePanelDrop(e, index)}
                                className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl group hover:border-slate-600 transition-all flex flex-col print:break-inside-avoid print:border-slate-200 print:bg-white print:text-black ${draggedFrameIndex === index ? 'opacity-50 border-violet-500 border-dashed' : ''}`}
                            >
                                {/* Header - DRAG HANDLE */}
                                <div 
                                    draggable
                                    onDragStart={(e) => handlePanelDragStart(e, index)}
                                    className="p-2 border-b border-slate-800 bg-slate-950 flex justify-between items-center print:bg-slate-100 print:border-slate-300 cursor-move active:cursor-grabbing hover:bg-slate-900 transition-colors"
                                    title="Drag here to reorder"
                                >
                                    <div className="flex items-center gap-2 pointer-events-none">
                                        <GripVertical className="w-4 h-4 text-slate-600" />
                                        <span className="text-xs font-bold text-slate-400 px-1 print:text-slate-600">PANEL {index + 1}</span>
                                    </div>
                                    <div className="flex gap-1 print:hidden" onMouseDown={(e) => e.stopPropagation()}>
                                        {/* Reorder Buttons */}
                                        <button 
                                          onClick={() => movePanelUp(index)} 
                                          disabled={index === 0}
                                          className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed" 
                                          title="Move Up"
                                        >
                                            <ChevronUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                          onClick={() => movePanelDown(index)} 
                                          disabled={index >= frames.length - 1}
                                          className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed" 
                                          title="Move Down"
                                        >
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        </button>
                                        <div className="w-px h-4 bg-slate-700 mx-1" />
                                        <button onClick={() => autoCaption(frame)} className={`p-1.5 rounded hover:bg-violet-900/50 text-slate-400 hover:text-violet-300 ${isProcessingId === frame.id ? 'animate-pulse text-violet-400' : ''}`} title="AI Auto-Caption">
                                            <Wand2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => removeFrame(frame.id)} className="p-1.5 rounded hover:bg-red-900/50 text-slate-400 hover:text-red-300" title="Delete Panel">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Image Area (Start/End) */}
                                <div className="relative aspect-video bg-black group-image-area flex" 
                                     onDrop={(e) => handleDropOnFrame(e, frame.id, 'start')}
                                     onDragOver={handleDragOver}
                                >
                                    {/* Start Frame */}
                                    <div className="flex-1 relative border-r border-slate-800 group/frame">
                                        {frame.images.start.id === 'ghost' ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                                                <Ghost className="w-8 h-8 opacity-20 mb-2" />
                                                <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">Drop Shot Here</span>
                                            </div>
                                        ) : (
                                            <>
                                                <img src={frame.images.start.url} className="w-full h-full object-cover pointer-events-none" alt="start" draggable={false} />
                                                <QualityBadge score={frame.images.start.generationContext?.qualityScore} />
                                            </>
                                        )}
                                        <span className="absolute top-2 left-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-bold backdrop-blur-sm print:hidden">START</span>
                                    </div>

                                    {/* End Frame (Optional) */}
                                    {frame.images.end ? (
                                        <div className="flex-1 relative animate-in fade-in slide-in-from-right-2 group/frame">
                                            <img src={frame.images.end.url} className="w-full h-full object-cover pointer-events-none" alt="end" draggable={false} />
                                            <span className="absolute top-2 right-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-bold backdrop-blur-sm print:hidden">END</span>
                                            <button 
                                                onClick={() => clearFrameImage(frame.id, 'end')}
                                                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover/frame:opacity-100 transition-opacity print:hidden"
                                                title="Remove End Frame"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                            
                                            {/* AI Transition Button */}
                                            <button 
                                                onClick={() => autoTransition(frame)}
                                                className={`absolute inset-y-0 -left-3 z-20 flex items-center justify-center group/link`}
                                                title="Analyze Transition with Gemini"
                                            >
                                                <div className={`bg-violet-600 rounded-full p-1 border-2 border-black print:hidden transition-transform ${frame.transitionNotes ? 'bg-green-500' : 'hover:scale-125'}`}>
                                                     {isProcessingId === frame.id ? <Loader2 className="w-3 h-3 animate-spin text-white"/> : <Link className="w-3 h-3 text-white" />}
                                                </div>
                                            </button>
                                        </div>
                                    ) : (
                                        /* Drop Zone for End Frame */
                                        <div 
                                            className="w-8 hover:w-1/3 transition-all bg-slate-900/50 border-l border-slate-800 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer print:hidden"
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDropOnFrame(e, frame.id, 'end')}
                                            title="Drop image here for End Frame (Motion)"
                                        >
                                            <Plus className="w-6 h-6 text-slate-500" />
                                        </div>
                                    )}
                                </div>
                                
                                {/* Send to Video Button */}
                                <button 
                                    onClick={() => handleSendFrameToVideo(frame)}
                                    disabled={frame.images.start.id === 'ghost'}
                                    className="w-full py-1.5 bg-slate-900 hover:bg-blue-600 text-blue-400 hover:text-white text-[10px] uppercase font-bold tracking-wider transition-colors border-b border-slate-800 flex items-center justify-center gap-1 print:hidden disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Video className="w-3 h-3" /> Send to Video Studio
                                </button>

                                {/* Controls & Text */}
                                <div className="p-4 space-y-3 flex-1 flex flex-col bg-slate-900 print:bg-white">
                                    <div className="flex gap-2">
                                        <select 
                                            value={frame.shotType}
                                            onChange={(e) => updateFrame(frame.id, 'shotType', e.target.value)}
                                            className="bg-slate-800 text-slate-300 text-[10px] rounded px-2 py-1 border border-slate-700 font-bold focus:border-violet-500 outline-none print:bg-slate-100 print:text-black print:border-slate-300"
                                        >
                                            {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <input 
                                            type="text"
                                            value={frame.duration}
                                            onChange={(e) => updateFrame(frame.id, 'duration', e.target.value)}
                                            className="w-16 bg-slate-800 text-slate-300 text-[10px] rounded px-2 py-1 border border-slate-700 font-bold focus:border-violet-500 outline-none text-center print:bg-slate-100 print:text-black print:border-slate-300"
                                            placeholder="Duration"
                                        />
                                        <select 
                                            value={frame.transition}
                                            onChange={(e) => updateFrame(frame.id, 'transition', e.target.value)}
                                            className="bg-slate-800 text-slate-300 text-[10px] rounded px-2 py-1 border border-slate-700 font-bold focus:border-violet-500 outline-none flex-1 text-right print:bg-slate-100 print:text-black print:border-slate-300"
                                        >
                                            {TRANSITIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>

                                    <textarea 
                                        value={frame.caption}
                                        onChange={(e) => updateFrame(frame.id, 'caption', e.target.value)}
                                        placeholder={isProcessingId === frame.id ? "Gemini is writing script..." : "Action / Dialogue..."}
                                        className="w-full bg-slate-950 text-slate-300 text-xs rounded p-2 border border-slate-800 resize-none h-20 focus:ring-1 focus:ring-violet-500 outline-none print:bg-white print:text-black print:border-slate-300"
                                    />
                                    
                                    <input 
                                        type="text"
                                        value={frame.notes}
                                        onChange={(e) => updateFrame(frame.id, 'notes', e.target.value)}
                                        placeholder="Technical Notes (Lighting, Sound)..."
                                        className="w-full bg-slate-950 text-slate-500 text-[10px] rounded px-2 py-1 border border-slate-800 focus:border-violet-500 outline-none italic print:bg-white print:text-slate-600 print:border-slate-300"
                                    />
                                    
                                    {frame.transitionNotes && (
                                        <div className="bg-green-900/20 border border-green-900/50 p-2 rounded text-[10px] text-green-300 italic print:text-green-800 print:bg-green-100 print:border-green-200">
                                            <span className="font-bold">AI Transition:</span> {frame.transitionNotes}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders when parent state changes
export default memo(StageThree);
