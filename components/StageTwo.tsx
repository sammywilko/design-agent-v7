
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Check, Download, Layers, Loader2, Wand2, Save, Plus, X, Upload, ImagePlus, Brush, Eraser, Eye, EyeOff, Film, Columns, Palette, Gauge, RotateCcw } from 'lucide-react';
import { GeneratedImage, ReferenceAsset, Project, SavedEntity, ProductionDesign } from '../types';
import { applyEdit, extractStyleDNA, evaluateImageQuality } from '../services/gemini';
import { db } from '../services/db';
import CoverageModal from './CoverageModal';
import ReactMarkdown from 'react-markdown';

interface StageTwoProps {
  initialImage: GeneratedImage | null;
  onBack: () => void;
  showNotification: (msg: string) => void;
  onImageEdited?: (image: GeneratedImage) => void;
  onAddToGallery?: (image: GeneratedImage) => void; // Add images to global gallery
  currentProject: Project;
  onLibraryUpdate: () => void;
  productionDesign?: ProductionDesign; // Lookbook style injection
}

const MAX_REFERENCES = 14;

// UPDATED QUICK EDITS WITH NANO SUPERPOWERS
const QUICK_EDITS = [
    { label: 'Enhance', prompt: 'Enhance details, lighting, and sharpness.' },
    { label: 'Cyberpunk', prompt: 'Cyberpunk style, neon lights, rain, high contrast.' },
    { label: 'Sketch', prompt: 'Detailed pencil sketch on paper.' },
    { label: 'Glass', prompt: 'Translucent glass texture, caustic lighting.' },
    { label: 'Remove BG', prompt: 'Remove background, pure white background.' },
    { label: 'Change Angle', prompt: 'Rotate the camera angle slightly to the right. Maintain strict subject consistency (identity, clothes, scars). Use spatial reasoning to reveal the side profile.' },
    { label: 'Relight', prompt: 'Change lighting to Golden Hour sunset. Simulate realistic sun angle and long shadows. Keep geometry consistent.' },
    { label: 'Remove Crowd', prompt: 'Remove all people from the background. Reconstruct the empty scene behind them using architectural context.' },
    { label: 'Text Fix', prompt: 'Correct and sharpen any legible text in the image. Ensure typography matches the surface perspective.' },
    { label: '4K Upscale', prompt: 'STRICT UPSCALE ONLY. Increase resolution to 4K. CRITICAL: Preserve EXACTLY all colors, hair color, skin tone, beard color, eye color, clothing colors, and all visual details. Do NOT alter, reinterpret, or regenerate any content. Only add subtle sharpness and micro-texture detail. This is a technical upscale, not a creative edit.', resolution: '4K' },
];

const StageTwo: React.FC<StageTwoProps> = ({ initialImage, onBack, showNotification, onImageEdited, onAddToGallery, currentProject, onLibraryUpdate, productionDesign }) => {
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(initialImage);
  const [history, setHistory] = useState<GeneratedImage[]>(initialImage ? [initialImage] : []);
  const [instruction, setInstruction] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [references, setReferences] = useState<ReferenceAsset[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  // NON-DESTRUCTIVE EDITING: Track original + edit stack
  const [originalImage, setOriginalImage] = useState<GeneratedImage | null>(initialImage);
  const [editStack, setEditStack] = useState<string[]>([]);
  const [useNonDestructive, setUseNonDestructive] = useState(true); // Toggle for edit mode
  const [useLookbook, setUseLookbook] = useState(true); // Toggle for Production Design style injection
  
  // Masking State
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasMask, setHasMask] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);

  // Coverage Modal State
  const [showCoverageModal, setShowCoverageModal] = useState(false);

  // Critic State
  const [showCritic, setShowCritic] = useState(false);
  const [critique, setCritique] = useState<string>('');
  const [isCritiquing, setIsCritiquing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasInputRef = useRef<HTMLInputElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);
  const galleryUploadRef = useRef<HTMLInputElement>(null);
  const loadImageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialImage && (!currentImage || initialImage.id !== history[0]?.id)) {
        setCurrentImage(initialImage);
        setHistory([initialImage]);
        setInstruction('');
        setReferences([]); 
        clearMask();
        setCritique('');
    }
  }, [initialImage]);

  useEffect(() => {
    if (!containerRef.current || !maskCanvasRef.current || !currentImage) return;
    
    const resizeObserver = new ResizeObserver(() => {
        const imgElement = containerRef.current?.querySelector('img');
        if (imgElement && maskCanvasRef.current) {
            maskCanvasRef.current.width = imgElement.clientWidth;
            maskCanvasRef.current.height = imgElement.clientHeight;
        }
    });
    
    const img = containerRef.current.querySelector('img');
    if (img) {
        resizeObserver.observe(img);
        if(img.complete) {
            maskCanvasRef.current.width = img.clientWidth;
            maskCanvasRef.current.height = img.clientHeight;
        } else {
            img.onload = () => {
                 if (maskCanvasRef.current) {
                    maskCanvasRef.current.width = img.clientWidth;
                    maskCanvasRef.current.height = img.clientHeight;
                 }
            }
        }
    }

    return () => resizeObserver.disconnect();
  }, [currentImage, isBrushActive]);

  const clearMask = () => {
      const canvas = maskCanvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          setHasMask(false);
      }
  };

  const getMaskDataUrl = (): string | undefined => {
      if (!hasMask || !maskCanvasRef.current) return undefined;
      const visualCanvas = maskCanvasRef.current;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = visualCanvas.width;
      tempCanvas.height = visualCanvas.height;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return undefined;

      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      ctx.drawImage(visualCanvas, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      return tempCanvas.toDataURL('image/png');
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isBrushActive) return;
      setIsDrawing(true);
      const canvas = maskCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
          const rect = canvas.getBoundingClientRect();
          // Scale coordinates to match canvas internal dimensions vs display size
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const x = (e.clientX - rect.left) * scaleX;
          const y = (e.clientY - rect.top) * scaleY;
          
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'; // red-500/50
          ctx.lineWidth = 20 * Math.max(scaleX, scaleY); // Scale brush size too
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
      }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !isBrushActive) return;
      const canvas = maskCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
          const rect = canvas.getBoundingClientRect();
          // Scale coordinates to match canvas internal dimensions vs display size
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const x = (e.clientX - rect.left) * scaleX;
          const y = (e.clientY - rect.top) * scaleY;
          
          ctx.lineTo(x, y);
          ctx.stroke();
          if (!hasMask) setHasMask(true);
      }
  };

  const stopDrawing = () => {
      setIsDrawing(false);
  };

  const handleEdit = async (overrideInstruction?: string, overrideResolution?: string) => {
    let textToUse = typeof overrideInstruction === 'string' ? overrideInstruction : instruction;
    
    if (!currentImage || (!textToUse.trim() && references.length === 0) || isEditing) return;

    // Build Lookbook style context if enabled
    let styleContext = '';
    const styleRefs: ReferenceAsset[] = [];
    if (useLookbook && productionDesign) {
      const parts = [];
      if (productionDesign.visualStyle) parts.push(`VISUAL STYLE: ${productionDesign.visualStyle}`);
      if (productionDesign.colorPalette) parts.push(`COLOR PALETTE: ${productionDesign.colorPalette}`);
      if (productionDesign.cameraLanguage) parts.push(`CAMERA LANGUAGE: ${productionDesign.cameraLanguage}`);
      if (productionDesign.lightingApproach) parts.push(`LIGHTING: ${productionDesign.lightingApproach}`);
      if (parts.length > 0) {
        styleContext = `=== PRODUCTION DESIGN STYLE ===\n${parts.join('\n')}\n===\n\n`;
      }
      // Add style reference images
      if (productionDesign.styleRefs && productionDesign.styleRefs.length > 0) {
        productionDesign.styleRefs.slice(0, 3).forEach((ref, i) => {
          styleRefs.push({
            id: `style-ref-${i}`,
            data: ref,
            type: 'Style',
            name: `Style Reference ${i + 1}`
          });
        });
      }
    }

    // Prepend style context to instruction
    if (styleContext) {
      textToUse = styleContext + textToUse;
    }
    
    const allReferences = [...references, ...styleRefs].slice(0, MAX_REFERENCES);

    setIsEditing(true);
    const maskData = getMaskDataUrl();

    try {
      let newImage: GeneratedImage;
      
      // NON-DESTRUCTIVE MODE: Combine all edits and apply to original
      // (Skip if using mask - masks are position-specific and require destructive editing)
      if (useNonDestructive && originalImage && !maskData) {
        const newStack = [...editStack, textToUse];
        setEditStack(newStack);
        
        // Combine all edits into one comprehensive instruction
        const combinedInstruction = newStack.length === 1 
          ? newStack[0]
          : `Apply ALL of the following edits simultaneously to the image:\n${newStack.map((edit, i) => `${i + 1}. ${edit}`).join('\n')}\n\nIMPORTANT: Apply all edits at once, maintaining consistency across all changes.`;
        
        newImage = await applyEdit(
            originalImage.url,  // Always use original!
            combinedInstruction, 
            allReferences, 
            undefined,  // No mask in non-destructive mode
            overrideResolution,
            originalImage.aspectRatio
        );
        
        showNotification(`✓ Applied ${newStack.length} edit(s) to original`);
      } else {
        // DESTRUCTIVE MODE: Apply to current image (legacy behavior, or when using mask)
        newImage = await applyEdit(
            currentImage.url, 
            textToUse, 
            allReferences, 
            maskData, 
            overrideResolution,
            currentImage.aspectRatio
        );
        
        // If using destructive mode, reset the non-destructive stack
        if (maskData) {
          setOriginalImage(newImage); // New baseline after masked edit
          setEditStack([]);
          showNotification("Mask edit applied (new baseline set)");
        }
      }
      
      newImage.projectId = currentProject.id;
      setCurrentImage(newImage);
      setHistory(prev => [...prev, newImage]);
      setInstruction('');
      if (hasMask) clearMask();
      setCritique(''); // clear old critique
      
      if (onImageEdited) onImageEdited(newImage);

    } catch (error) {
      console.error("Editing failed:", error);
      showNotification("Editing failed. Please try again.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleAutoEnhance = () => {
      handleEdit("Enhance the details, lighting, and visual clarity of this image while maintaining the original composition.");
  };

  // Apply fixes suggested by AI Critic
  const handleApplyCritiqueFix = async () => {
    if (!critique || !currentImage || isEditing) return;
    
    // Extract the "What needs fixing?" section from the critique
    const fixMatch = critique.match(/What needs fixing\?[:\s]*([\s\S]*?)(?=\n\n|$)/i);
    const fixes = fixMatch ? fixMatch[1].trim() : '';
    
    if (!fixes) {
      showNotification("No specific fixes found in critique");
      return;
    }
    
    // Build a comprehensive fix instruction
    const fixInstruction = `APPLY THESE SPECIFIC FIXES TO ACHIEVE 10/10 QUALITY:

${fixes}

CRITICAL REQUIREMENTS:
- Fix ONLY the issues mentioned above
- Preserve ALL other aspects of the image exactly (colors, composition, identity, style)
- Maintain the original artistic intent
- Do not introduce new elements or changes beyond the fixes
- If resolution/upscale is mentioned, ensure output is at the requested resolution`;

    showNotification("Applying AI Critic fixes...");
    
    // Apply the fix using the existing edit handler
    handleEdit(fixInstruction, '4K');
  };

  // NON-DESTRUCTIVE EDITING HELPERS
  const removeEditFromStack = async (indexToRemove: number) => {
    if (!originalImage || !useNonDestructive) return;
    
    const newStack = editStack.filter((_, i) => i !== indexToRemove);
    setEditStack(newStack);
    
    if (newStack.length === 0) {
      // No edits left, revert to original
      setCurrentImage(originalImage);
      showNotification("Reverted to original image");
      return;
    }
    
    // Re-apply remaining edits
    setIsEditing(true);
    try {
      const combinedInstruction = newStack.length === 1 
        ? newStack[0]
        : `Apply ALL of the following edits simultaneously:\n${newStack.map((edit, i) => `${i + 1}. ${edit}`).join('\n')}`;
      
      const newImage = await applyEdit(
        originalImage.url,
        combinedInstruction,
        [],
        undefined,
        undefined,
        originalImage.aspectRatio
      );
      newImage.projectId = currentProject.id;
      setCurrentImage(newImage);
      setHistory(prev => [...prev, newImage]);
      showNotification(`Edit removed. ${newStack.length} edit(s) remaining.`);
    } catch (error) {
      console.error("Re-rendering failed:", error);
      showNotification("Failed to re-render edits");
    } finally {
      setIsEditing(false);
    }
  };

  const resetToOriginal = () => {
    if (!originalImage) return;
    setCurrentImage(originalImage);
    setEditStack([]);
    showNotification("Reset to original image");
  };

  // FINAL RENDER: "Happy Pass" - Clean re-render from original at maximum quality
  const handleFinalRender = async () => {
    if (!originalImage || editStack.length === 0) return;
    
    setIsEditing(true);
    showNotification("🎬 Final Render: Re-applying all edits from pristine original at 4K...");
    
    try {
      // Combine all edits with emphasis on quality
      const combinedInstruction = `FINAL HIGH-QUALITY RENDER - Apply ALL of the following edits to this pristine original image:
${editStack.map((edit, i) => `${i + 1}. ${edit}`).join('\n')}

CRITICAL REQUIREMENTS:
- Preserve maximum detail and sharpness in areas not explicitly edited
- Maintain original texture, grain, and micro-details where possible
- Apply all edits simultaneously for consistency
- Output at highest quality with no compression artifacts`;
      
      const newImage = await applyEdit(
        originalImage.url,
        combinedInstruction,
        references,
        undefined,
        '4K', // Force 4K for final render
        originalImage.aspectRatio
      );
      
      newImage.projectId = currentProject.id;
      setCurrentImage(newImage);
      setHistory(prev => [...prev, newImage]);
      
      if (onImageEdited) onImageEdited(newImage);
      showNotification("✅ Final Render complete - pristine 4K output from original");
      
    } catch (error) {
      console.error("Final render failed:", error);
      showNotification("❌ Final render failed");
    } finally {
      setIsEditing(false);
    }
  };

  // UPLOAD HANDLERS: Add images to gallery or load into edit canvas
  const handleUploadToGallery = (files: FileList | null) => {
    if (!files || !onAddToGallery) return;
    
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        const newImage: GeneratedImage = {
          id: crypto.randomUUID(),
          projectId: currentProject.id,
          url: result,
          prompt: `Uploaded: ${file.name}`,
          aspectRatio: '1:1'
        };
        onAddToGallery(newImage);
        showNotification(`Added "${file.name}" to gallery`);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLoadImageToCanvas = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const newImage: GeneratedImage = {
        id: crypto.randomUUID(),
        projectId: currentProject.id,
        url: result,
        prompt: `Loaded: ${file.name}`,
        aspectRatio: '1:1'
      };
      setCurrentImage(newImage);
      setOriginalImage(newImage);
      setHistory([newImage]);
      setEditStack([]);
      showNotification(`Loaded "${file.name}" for editing`);
    };
    reader.readAsDataURL(file);
  };

  const handleStyleMatch = async (files: FileList | null) => {
      if (!files || files.length === 0 || !currentImage) return;
      
      const file = files[0];
      if (!file.type.startsWith('image/')) return;

      setIsEditing(true);
      showNotification("Extracting Style DNA...");

      const reader = new FileReader();
      reader.onload = async (ev) => {
          const result = ev.target?.result as string;
          try {
              const dna = await extractStyleDNA(result);
              showNotification("Style extracted. Applying...");
              
              const newImage = await applyEdit(
                  currentImage.url,
                  `Apply this visual style strictly: ${dna}`,
                  [],
                  undefined,
                  '2K',
                  currentImage.aspectRatio
              );
              newImage.projectId = currentProject.id;
              setCurrentImage(newImage);
              setHistory(prev => [...prev, newImage]);
              if (onImageEdited) onImageEdited(newImage);
              showNotification("Style Match Complete");
          } catch (e) {
              console.error(e);
              showNotification("Style Match Failed");
          } finally {
              setIsEditing(false);
              if (styleInputRef.current) styleInputRef.current.value = '';
          }
      };
      reader.readAsDataURL(file);
  };

  const runCoverageGeneration = async (config: { framing: string[], lenses: string[], angles: string[] }) => {
      if (!currentImage) return;
      const allVariations = [...config.framing, ...config.lenses, ...config.angles];
      
      if (allVariations.length === 0) {
          showNotification("Please select at least one variation.");
          return;
      }

      setIsEditing(true);
      try {
          for (let i = 0; i < allVariations.length; i++) {
              const variant = allVariations[i];
              showNotification(`Generating ${variant}...`);
              const prompt = `Re-shoot this scene as a ${variant}. Maintain the exact character, lighting, and environment. Only change the camera framing/focal length to match: ${variant}.`;
              try {
                  const newImg = await applyEdit(currentImage.url, prompt, references, undefined, '2K', currentImage.aspectRatio);
                  newImg.prompt = `${variant}`;
                  newImg.projectId = currentProject.id;
                  setHistory(prev => [...prev, newImg]);
                  if (onImageEdited) onImageEdited(newImg);
              } catch (e) { console.error(e); }
          }
          showNotification("Coverage generation complete!");
      } finally {
          setIsEditing(false);
      }
  };

  const runQualityCheck = async () => {
      if (!currentImage) return;
      setShowCritic(true);
      setIsCritiquing(true);
      try {
          const result = await evaluateImageQuality(currentImage.url, currentImage.prompt);
          setCritique(result);
      } catch (e) {
          setCritique("Failed to evaluate image.");
      } finally {
          setIsCritiquing(false);
      }
  };

  const handleDownload = () => {
    if (!currentImage) return;
    const link = document.createElement('a');
    link.href = currentImage.url;
    const sanitizedProject = currentProject.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${sanitizedProject}_render_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveToLibrary = async () => {
    if (!currentImage) return;
    const name = prompt("Name this asset to save to library:", "Edited Image");
    if (!name) return;

    const entity: SavedEntity = {
        id: crypto.randomUUID(),
        projectId: currentProject.id,
        name,
        data: currentImage.url,
        type: 'General',
        campaignId: 'default',
        createdAt: Date.now()
    };

    await db.saveLibraryItem(entity);
    onLibraryUpdate();
    showNotification("Saved to Asset Library!");
  };

  const processFiles = async (files: FileList | File[]) => {
      const currentCount = references.length;
      if (currentCount + files.length > MAX_REFERENCES) {
          showNotification(`Limit reached: Max ${MAX_REFERENCES} references allowed.`);
          return;
      }
      const newRefs: ReferenceAsset[] = [];
      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith('image/')) {
              await new Promise<void>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                      newRefs.push({
                          id: crypto.randomUUID(),
                          data: reader.result as string,
                          type: 'General',
                          name: file.name
                      });
                      resolve();
                  };
                  reader.readAsDataURL(file);
              });
          }
      }
      if (newRefs.length > 0) {
          setReferences(prev => [...prev, ...newRefs]);
          showNotification(`Added ${newRefs.length} references`);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
    }
  };

  const removeReference = (id: string) => {
    setReferences(prev => prev.filter(r => r.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
    }
  };

  const handleCanvasUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (ev) => {
              const result = ev.target?.result as string;
              const newImg: GeneratedImage = {
                  id: crypto.randomUUID(),
                  projectId: currentProject.id,
                  url: result,
                  prompt: 'Uploaded Canvas',
                  aspectRatio: 'custom'
              };
              setCurrentImage(newImg);
              setOriginalImage(newImg); // For non-destructive editing
              setEditStack([]); // Reset edit stack
              setHistory([newImg]);
              if (onImageEdited) onImageEdited(newImg);
          };
          reader.readAsDataURL(file);
      }
  }

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (!file.type.startsWith('image/')) return;
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            const newImg: GeneratedImage = {
                id: crypto.randomUUID(),
                projectId: currentProject.id,
                url: result,
                prompt: 'Uploaded Canvas',
                aspectRatio: 'custom'
            };
            setCurrentImage(newImg);
            setOriginalImage(newImg); // For non-destructive editing
            setEditStack([]); // Reset edit stack
            setHistory([newImg]);
            if (onImageEdited) onImageEdited(newImg);
        };
        reader.readAsDataURL(file);
    }
  };

  const displayImage = showOriginal ? (history[0] || initialImage) : currentImage;

  return (
    <div className="flex h-full bg-zinc-950 text-white font-sans selection:bg-violet-500/30">
      
      <CoverageModal 
        isOpen={showCoverageModal}
        onClose={() => setShowCoverageModal(false)}
        onGenerate={runCoverageGeneration}
      />
        
      {/* Lightbox */}
      {isLightboxOpen && references.length > 0 && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8 backdrop-blur-xl animate-in fade-in duration-200" onClick={() => setIsLightboxOpen(false)}>
              <button onClick={() => setIsLightboxOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-8 h-8" /></button>
              <div className="flex gap-6 overflow-x-auto max-w-full p-4 items-center justify-center h-full">
                  {references.map(ref => (
                      <div key={ref.id} className="relative shrink-0 h-[80vh] aspect-auto bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                          <img src={ref.data} alt="Ref" className="h-full w-auto object-contain" />
                          <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
                              <p className="text-white font-medium text-lg">{ref.name}</p>
                              <p className="text-xs text-zinc-400 uppercase tracking-widest mt-1">{ref.type}</p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Critic Modal */}
      {showCritic && (
          <div className="absolute top-20 right-80 z-40 w-80 glass-panel rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-violet-300 flex items-center gap-2"><Gauge className="w-4 h-4"/> AI Critic</h3>
                  <button onClick={() => setShowCritic(false)}><X className="w-4 h-4 text-zinc-400 hover:text-white"/></button>
              </div>
              <div className="text-xs text-zinc-300 min-h-[100px]">
                  {isCritiquing ? (
                      <div className="flex items-center gap-2 py-4"><Loader2 className="w-4 h-4 animate-spin"/> Analyzing...</div>
                  ) : (
                      <ReactMarkdown>{critique}</ReactMarkdown>
                  )}
              </div>
              {/* Fix It Button */}
              {critique && !isCritiquing && (
                <button
                  onClick={handleApplyCritiqueFix}
                  disabled={isEditing}
                  className="w-full mt-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {isEditing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3"/>}
                  {isEditing ? 'Fixing...' : 'Fix It → 10/10'}
                </button>
              )}
          </div>
      )}

      {/* Left Toolbar */}
      <div className="w-16 glass-panel border-r border-white/5 flex flex-col items-center py-6 space-y-5 shrink-0 z-20">
        <button onClick={onBack} className="p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors" title="Back to Concepts">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="h-px w-8 bg-white/10" />
        
        <button 
            onClick={handleAutoEnhance}
            disabled={!currentImage || isEditing}
            className={`p-2.5 rounded-xl transition-all ${isEditing ? 'text-violet-300 bg-violet-500/20 animate-pulse' : 'text-violet-400 bg-white/5 hover:bg-white/10 hover:text-violet-300'}`} 
            title="Magic Auto-Enhance"
        >
          <Wand2 className="w-5 h-5" />
        </button>

        <button 
            onClick={() => setIsBrushActive(!isBrushActive)}
            disabled={!currentImage || isEditing}
            className={`p-2.5 rounded-xl transition-all ${isBrushActive ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
            title="Masking Brush (Paint area to edit)"
        >
            <Brush className="w-5 h-5" />
        </button>
        
        {hasMask && isBrushActive && (
            <button 
                onClick={clearMask}
                className="p-2.5 text-zinc-400 hover:text-red-400 hover:bg-white/10 rounded-xl transition-all"
                title="Clear Mask"
            >
                <Eraser className="w-5 h-5" />
            </button>
        )}
        
        <div className="h-px w-8 bg-white/10" />
        
        <button 
            onClick={() => setShowCoverageModal(true)}
            disabled={!currentImage || isEditing}
            className="p-2.5 text-blue-400 hover:text-blue-100 hover:bg-blue-500/20 rounded-xl transition-all"
            title="Generate Shot Coverage"
        >
            <Film className="w-5 h-5" />
        </button>

        <button 
            onClick={runQualityCheck}
            disabled={!currentImage || isEditing}
            className="p-2.5 text-emerald-400 hover:text-emerald-100 hover:bg-emerald-500/20 rounded-xl transition-all"
            title="Quality Check (AI Critic)"
        >
            <Gauge className="w-5 h-5" />
        </button>

        <div className="h-px w-8 bg-white/10" />

        <button
            onMouseDown={() => !isSplitView && setShowOriginal(true)}
            onMouseUp={() => setShowOriginal(false)}
            onMouseLeave={() => setShowOriginal(false)}
            onTouchStart={() => !isSplitView && setShowOriginal(true)}
            onTouchEnd={() => setShowOriginal(false)}
            disabled={!currentImage}
            className={`p-2.5 rounded-xl transition-all ${showOriginal ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
            title="Hold to view Original"
        >
            {showOriginal ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
        </button>

        <button 
            onClick={() => setIsSplitView(!isSplitView)}
            disabled={!currentImage}
            className={`p-2.5 rounded-xl transition-all ${isSplitView ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
            title="Side-by-Side Comparison"
        >
            <Columns className="w-5 h-5" />
        </button>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-zinc-950">
        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden relative">
           {/* Background Grid Pattern */}
           <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px'}}></div>

           {!currentImage ? (
               <div 
                  className="relative z-10 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 bg-zinc-900/50 rounded-3xl p-16 text-center max-w-lg w-full hover:border-violet-500/30 hover:bg-zinc-800/50 transition-all cursor-pointer group backdrop-blur-sm"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleCanvasDrop}
                  onClick={() => canvasInputRef.current?.click()}
               >
                   <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-xl">
                       <ImagePlus className="w-12 h-12 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                   </div>
                   <h3 className="text-2xl font-semibold text-white mb-2 tracking-tight">Upload Canvas</h3>
                   <p className="text-zinc-400 mb-8 font-light">Drag and drop an image here to start editing,<br/>or click to browse.</p>
                   <button className="bg-white text-black hover:bg-zinc-200 px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg">Select Image</button>
                   <input type="file" ref={canvasInputRef} className="hidden" accept="image/*" onChange={handleCanvasUpload} />
               </div>
           ) : (
             <div className="relative w-full h-full flex items-center justify-center z-10">
                 {isSplitView ? (
                     <div className="flex w-full h-full gap-4 items-center justify-center p-4">
                         {/* Original */}
                         <div className="flex-1 h-full flex flex-col relative border border-white/10 bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
                             <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">ORIGINAL</div>
                             <img src={history[0].url} className="w-full h-full object-contain" alt="Original" />
                         </div>
                         {/* Current */}
                         <div className="flex-1 h-full flex flex-col relative border border-white/10 bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
                             <div className="absolute top-4 left-4 z-10 bg-violet-500/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">CURRENT</div>
                             <img src={currentImage.url} className="w-full h-full object-contain" alt="Current" />
                         </div>
                     </div>
                 ) : (
                    <div 
                        ref={containerRef}
                        className="relative shadow-2xl shadow-black/50 border border-white/5 bg-zinc-900 max-h-full max-w-full flex items-center justify-center rounded-2xl overflow-hidden"
                    >
                    <img 
                        src={displayImage?.url} 
                        alt="Canvas" 
                        className={`max-h-[80vh] max-w-full object-contain transition-all duration-300 ${isEditing ? 'opacity-50 blur-sm scale-[0.98]' : 'opacity-100'} ${showOriginal ? 'grayscale-[0.5]' : ''}`}
                        draggable={false}
                    />
                    
                    <canvas 
                        ref={maskCanvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        className={`absolute inset-0 w-full h-full cursor-crosshair touch-none ${isBrushActive ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
                    />

                    {isEditing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                        <Loader2 className="w-12 h-12 text-violet-400 animate-spin mb-4" />
                        <span className="text-violet-200 font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">Refining Details...</span>
                        </div>
                    )}
                    
                    {showOriginal && (
                        <div className="absolute top-6 left-6 bg-blue-600/90 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg pointer-events-none animate-in fade-in backdrop-blur-md border border-white/20">
                            ORIGINAL
                        </div>
                    )}
                    </div>
                 )}
             </div>
           )}
        </div>
        
        {/* Bottom Editing Bar */}
        <div 
            className={`glass-panel border-t border-white/5 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] transition-colors relative pb-6 ${isDragging ? 'bg-zinc-800 border-violet-500' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
           {/* NON-DESTRUCTIVE EDIT STACK PANEL */}
           {useNonDestructive && editStack.length > 0 && currentImage && (
             <div className="mx-6 mt-4 bg-zinc-900/80 border border-zinc-700 rounded-xl p-3 backdrop-blur-sm">
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                   <Layers className="w-4 h-4 text-violet-400" />
                   <span className="text-xs font-bold text-zinc-300">Edit Stack ({editStack.length})</span>
                   <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">Non-destructive</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={handleFinalRender}
                     disabled={isEditing || editStack.length === 0}
                     className="text-[10px] text-violet-400 hover:text-violet-300 bg-violet-500/20 hover:bg-violet-500/30 px-2 py-1 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                     title="Re-render all edits from original at maximum quality"
                   >
                     <Wand2 className="w-3 h-3" /> Final Render
                   </button>
                   <button 
                     onClick={resetToOriginal}
                     className="text-[10px] text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                   >
                     <RotateCcw className="w-3 h-3" /> Reset
                   </button>
                 </div>
               </div>
               <div className="flex flex-wrap gap-2">
                 {editStack.map((edit, i) => (
                   <div key={i} className="flex items-center bg-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-300 max-w-[200px] group">
                     <span className="truncate" title={edit}>{i + 1}. {edit}</span>
                     <button 
                       onClick={() => removeEditFromStack(i)}
                       disabled={isEditing}
                       className="ml-2 text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
                     >
                       <X className="w-3 h-3" />
                     </button>
                   </div>
                 ))}
               </div>
               <p className="text-[9px] text-zinc-500 mt-2">All edits are applied to the original image simultaneously. Remove any edit to re-render.</p>
             </div>
           )}

           {/* Quick Edits Row */}
           {currentImage && !isEditing && (
             <div className="flex gap-3 px-6 pt-4 overflow-x-auto scrollbar-none justify-center items-center">
                {/* Non-destructive Mode Toggle */}
                <button
                  onClick={() => setUseNonDestructive(!useNonDestructive)}
                  className={`shrink-0 px-3 py-2 text-[10px] rounded-full border transition-all font-medium ${
                    useNonDestructive 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                      : 'bg-zinc-800/50 text-zinc-500 border-zinc-700 hover:text-zinc-300'
                  }`}
                  title={useNonDestructive ? "Non-destructive: Edits combine on original" : "Destructive: Each edit builds on previous"}
                >
                  <Layers className="w-3 h-3 inline mr-1" />
                  {useNonDestructive ? 'Stack Mode' : 'Layer Mode'}
                </button>

                {/* Lookbook Style Toggle */}
                {productionDesign && (productionDesign.visualStyle || productionDesign.styleRefs?.length) && (
                  <button
                    onClick={() => setUseLookbook(!useLookbook)}
                    className={`shrink-0 px-3 py-2 text-[10px] rounded-full border transition-all font-medium ${
                      useLookbook 
                        ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' 
                        : 'bg-zinc-800/50 text-zinc-500 border-zinc-700 hover:text-zinc-300'
                    }`}
                    title={`Style: ${productionDesign.visualStyle || 'Custom'}\n${productionDesign.styleRefs?.length || 0} reference images`}
                  >
                    <Palette className="w-3 h-3 inline mr-1" />
                    {useLookbook ? 'Lookbook On' : 'Lookbook Off'}
                  </button>
                )}

                {QUICK_EDITS.map(edit => (
                  <button 
                    key={edit.label}
                    onClick={() => handleEdit(edit.prompt, edit.resolution)}
                    className="shrink-0 px-4 py-2 bg-zinc-800/50 hover:bg-zinc-700 text-xs text-zinc-300 rounded-full border border-white/5 hover:border-white/20 transition-all font-medium backdrop-blur-sm"
                  >
                    {edit.label}
                  </button>
                ))}
                
                {/* Match Reference Preset Drop Zone */}
                <div 
                    className="shrink-0 relative group px-4 py-2 bg-zinc-800/50 hover:bg-violet-900/20 text-xs text-zinc-300 hover:text-violet-300 rounded-full border border-white/5 hover:border-violet-500/30 transition-all font-medium backdrop-blur-sm cursor-pointer border-dashed"
                    onClick={() => styleInputRef.current?.click()}
                >
                    <span className="flex items-center gap-2"><Palette className="w-3 h-3" /> Match Style</span>
                    <input 
                        type="file" 
                        ref={styleInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleStyleMatch(e.target.files)} 
                    />
                </div>
             </div>
           )}

           {isDragging && (
                 <div className="absolute inset-0 z-20 bg-violet-500/10 backdrop-blur-md flex items-center justify-center border-t-2 border-violet-500 pointer-events-none">
                     <p className="text-violet-200 font-semibold flex items-center gap-3 text-lg"><Upload className="w-6 h-6" /> Drop visual references here</p>
                 </div>
           )}

           {references.length > 0 && (
               <div className="flex gap-3 overflow-x-auto px-6 py-3 bg-black/20 border-b border-white/5 scrollbar-thin scrollbar-thumb-zinc-700">
                   {references.map(ref => (
                       <div key={ref.id} className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-white/10 group cursor-pointer shadow-lg" onClick={() => setIsLightboxOpen(true)}>
                           <img src={ref.data} alt="ref" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                           <button onClick={(e) => { e.stopPropagation(); removeReference(ref.id); }} className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 backdrop-blur-sm">
                               <X className="w-3 h-3" />
                           </button>
                       </div>
                   ))}
               </div>
           )}

           <div className="h-24 px-6 py-4 flex items-center justify-center gap-4">
             <div className="max-w-4xl w-full flex items-center gap-3">
               
               <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!currentImage}
                  className="p-4 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-2xl transition-all border border-white/5 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  title="Upload Reference Image for Edit"
               >
                   <Plus className="w-5 h-5" />
               </button>
               <input 
                   type="file" 
                   ref={fileInputRef} 
                   className="hidden" 
                   accept="image/*"
                   multiple
                   onChange={handleFileUpload}
               />

               <div className="relative flex-1 group">
                  <Wand2 className="absolute left-4 top-4 w-5 h-5 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
                  <input
                      type="text"
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                      disabled={!currentImage}
                      placeholder={hasMask ? "Describe changes for the RED MASKED area only..." : (currentImage ? "Describe your edit (e.g., 'Make the logo neon blue', 'Change background to sunset')..." : "Upload a canvas image to start editing")}
                      className={`w-full bg-zinc-800/50 border border-white/5 hover:border-white/10 text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder-zinc-500 shadow-inner ${hasMask ? 'border-red-500/30 focus:ring-red-500/30' : ''}`}
                  />
               </div>
               <button
                  onClick={() => handleEdit()}
                  disabled={!currentImage || isEditing || (!instruction && references.length === 0)}
                  className="bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 px-8 py-4 rounded-2xl font-bold transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
               >
                  {isEditing ? 'Rendering...' : (hasMask ? 'Edit Region' : 'Apply Edit')}
               </button>
             </div>
             
             <div className="h-10 w-px bg-white/10 mx-2" />
             
             <button 
               onClick={saveToLibrary}
               disabled={!currentImage}
               className="p-4 text-zinc-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10 disabled:opacity-50" title="Save to Library">
               <Save className="w-5 h-5" />
             </button>
             {/* Upload to Gallery */}
             {onAddToGallery && (
               <button 
                 onClick={() => galleryUploadRef.current?.click()}
                 className="p-4 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-2xl transition-all border border-transparent hover:border-emerald-500/30" title="Upload to Gallery">
                 <Plus className="w-5 h-5" />
               </button>
             )}
             <input 
               type="file" 
               ref={galleryUploadRef} 
               className="hidden" 
               accept="image/*" 
               multiple
               onChange={(e) => handleUploadToGallery(e.target.files)} 
             />
             <button 
               onClick={handleDownload}
               disabled={!currentImage}
               className="p-4 text-zinc-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10 disabled:opacity-50" title="Download High-Res">
               <Download className="w-5 h-5" />
             </button>
           </div>
        </div>
      </div>

      {/* Right Panel: History / Layers */}
      <div className="w-80 glass-panel border-l border-white/5 p-6 hidden lg:flex flex-col shrink-0 z-20">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Layers className="w-4 h-4" /> Version History</h3>
        
        {history.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-zinc-600 text-xs text-center px-4 font-medium">
                No edit history yet.
            </div>
        ) : (
            <div className="space-y-5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {[...history].reverse().map((img, idx) => (
                <div 
                    key={img.id} 
                    onClick={() => {
                        if (!isEditing) {
                            setCurrentImage(img);
                            if (img.prompt !== 'Uploaded Canvas') {
                                setInstruction(img.prompt);
                            }
                        }
                    }}
                    className={`cursor-pointer rounded-2xl border transition-all duration-300 overflow-hidden bg-zinc-900 group relative ${img.id === currentImage?.id ? 'border-violet-500/50 ring-2 ring-violet-500/20 shadow-xl' : 'border-white/5 hover:border-white/20 opacity-60 hover:opacity-100 hover:scale-[1.02]'}`}
                >
                <img src={img.url} alt="Thumbnail" className="w-full h-36 object-cover" />
                <div className="p-4 bg-zinc-900/90 backdrop-blur-sm border-t border-white/5">
                    <div className="text-[10px] uppercase text-zinc-500 mb-1.5 font-bold tracking-wider">{idx === history.length - 1 ? 'Original' : `Edit #${history.length - 1 - idx}`}</div>
                    <div className="text-xs text-zinc-300 truncate font-medium">
                    {img.prompt}
                    </div>
                </div>
                {img.id === currentImage?.id && (
                    <div className="absolute top-3 right-3 bg-violet-600 text-white p-1 rounded-full shadow-lg">
                        <Check className="w-3 h-3" />
                    </div>
                )}
                </div>
            ))}
            </div>
        )}
      </div>

    </div>
  );
};

export default StageTwo;
