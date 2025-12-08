
import React, { useState, useEffect } from 'react';
import { GeneratedImage, GeneratedVideo, Project, ReferenceAsset, SavedEntity } from '../types';
import { Play, Film, Wand2, Loader2, Download, Trash2, Plus, ArrowRight, Image as ImageIcon, Video, Sparkles, PanelLeft, PanelRight, Sliders, RefreshCw, Pencil, Check, Repeat, Gauge, Aperture, Book, X, Eye, Grid3X3, RectangleHorizontal, Ban, Users, FastForward } from 'lucide-react';
import { generateVideo, generateTransitionPrompt, generateShotSpecs, generateImage, applyEdit } from '../services/gemini';
import { db } from '../services/db';

interface StageFourProps {
  initialStartFrame?: GeneratedImage | null;
  initialEndFrame?: GeneratedImage | null;
  initialPrompt?: string;
  currentProject: Project;
  showNotification: (msg: string) => void;
  projectImages?: GeneratedImage[];
  libraryAssets?: SavedEntity[];
}

const StageFour: React.FC<StageFourProps> = ({ 
    initialStartFrame, 
    initialEndFrame, 
    initialPrompt, 
    currentProject, 
    showNotification,
    projectImages = [],
    libraryAssets = []
}) => {
  const [startFrame, setStartFrame] = useState<GeneratedImage | null>(initialStartFrame || null);
  const [endFrame, setEndFrame] = useState<GeneratedImage | null>(initialEndFrame || null);
  const [characterRefs, setCharacterRefs] = useState<GeneratedImage[]>([]);
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [activeVideo, setActiveVideo] = useState<GeneratedVideo | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'videos' | 'assets'>('videos');
  const [draggedImage, setDraggedImage] = useState<GeneratedImage | null>(null);
  
  const [showPromptGuide, setShowPromptGuide] = useState(false);
  
  // Viewfinder State
  const [viewfinderMode, setViewfinderMode] = useState<'none' | 'thirds' | 'safe' | 'cross'>('none');

  // Shot Intelligence Configuration
  const [autoEndFrame, setAutoEndFrame] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [cameraMove, setCameraMove] = useState('Dolly In');
  const [duration, setDuration] = useState('4s');
  const [audioDirection, setAudioDirection] = useState('');
  const [resolution, setResolution] = useState('720p');
  const [motionIntensity, setMotionIntensity] = useState<number>(5); // 1-10
  const [cameraStability, setCameraStability] = useState<number>(20); // 0 = Tripod, 100 = Chaos
  const [filmLook, setFilmLook] = useState('Standard');
  
  // Pipeline State
  const [pipelineStep, setPipelineStep] = useState<'idle' | 'analyzing' | 'review_end' | 'generating_video'>('idle');

  // Unified Asset List (Project History + Library Assets)
  const allAssets: GeneratedImage[] = [
      ...projectImages,
      ...libraryAssets.map(entity => ({
          id: entity.id,
          projectId: entity.projectId,
          url: entity.data,
          prompt: entity.name,
          aspectRatio: 'custom'
      }))
  ];

  const CINEMATIC_MOVES = [
      'Static', 'Dolly In', 'Dolly Out', 'Pan Left', 'Pan Right', 
      'Crane Up', 'Crane Down', 'Handheld', 'Orbit Left', 'Orbit Right', 
      'Tracking Shot', 'Rack Focus', 'Whip Pan', 'Zoom In (Optical)', 'Zoom Out (Optical)', 'Tilt Up', 'Tilt Down'
  ];

  useEffect(() => {
      const loadVideos = async () => {
          const vids = await db.getVideos(currentProject.id);
          setVideos(vids.sort((a, b) => b.createdAt - a.createdAt));
          if (vids.length > 0) setActiveVideo(vids[0]);
      };
      loadVideos();
  }, [currentProject.id]);

  useEffect(() => {
      if (initialStartFrame) setStartFrame(initialStartFrame);
      if (initialEndFrame) setEndFrame(initialEndFrame);
      if (initialPrompt) setPrompt(initialPrompt);
  }, [initialStartFrame, initialEndFrame, initialPrompt]);

  useEffect(() => {
      if (isLooping && startFrame) {
          setEndFrame(startFrame);
          setAutoEndFrame(false);
      } else if (!isLooping && endFrame?.id === startFrame?.id) {
          setEndFrame(null);
      }
  }, [isLooping, startFrame]);

  const handleAssetClick = (img: GeneratedImage) => {
      if (!startFrame) {
          setStartFrame(img);
          showNotification("Start Frame Set");
      } else if (!endFrame && !autoEndFrame && !isLooping) {
          setEndFrame(img);
          showNotification("End Frame Set");
      } else {
          setStartFrame(img);
          showNotification("Start Frame Replaced");
      }
  };

  const addCharacterRef = (img: GeneratedImage) => {
      if (characterRefs.length >= 3) {
          showNotification("Max 3 Character References");
          return;
      }
      if (characterRefs.find(r => r.id === img.id)) return;
      setCharacterRefs(prev => [...prev, img]);
      showNotification("Character Ingredient Added");
  };

  const removeCharacterRef = (id: string) => {
      setCharacterRefs(prev => prev.filter(c => c.id !== id));
  };

  const handleGenerateVideo = async () => {
      if (!prompt || isGenerating) return;
      if (!startFrame && !endFrame) {
          showNotification("Please provide at least a Start Frame or End Frame for control.");
          return;
      }

      setPipelineStep('generating_video');
      setIsGenerating(true);
      setStatusMessage('Synthesizing Video (Veo 3.1)...');

      try {
          let finalPrompt = prompt;
          if (motionIntensity <= 3) finalPrompt += " Subtle, minimal movement, atmospheric.";
          else if (motionIntensity >= 8) finalPrompt += " Dynamic, rapid movement, high energy, motion blur.";

          // Stability/Handheld context from shot-design-agent
          if (cameraStability < 30) {
              finalPrompt += " Shot on a stable tripod, smooth fluid motion, steadycam.";
          } else if (cameraStability < 70) {
              finalPrompt += " Handheld camera movement, slight organic shake, realistic documentary feel.";
          } else {
              finalPrompt += " Intense shaky cam, chaotic action camera, heavy vibration, action movie style.";
          }

          if (filmLook !== 'Standard') finalPrompt += ` Cinematic style: ${filmLook} look.`;
          if (audioDirection) finalPrompt += ` Audio: ${audioDirection}.`;
          if (duration) finalPrompt += ` Duration: ${duration}.`;
          
          // Reference injection logic would happen here or inside service
          const charRefUrls = characterRefs.map(c => c.url);

          const video = await generateVideo(
              finalPrompt, 
              startFrame?.url, 
              endFrame?.url,
              charRefUrls
          );
          
          video.projectId = currentProject.id;
          await db.saveVideo(video);
          
          setVideos(prev => [video, ...prev]);
          setActiveVideo(video);
          showNotification("Video Generated Successfully!");
          setPipelineStep('idle');
      } catch (e) {
          console.error(e);
          showNotification("Failed to generate video. Check API limits.");
          setPipelineStep('review_end');
      } finally {
          setIsGenerating(false);
          setStatusMessage('');
      }
  };

  const handleSmartWorkflow = async () => {
      if (!startFrame) {
          showNotification("Start Frame required for Auto-End Frame generation.");
          return;
      }

      setIsGenerating(true);
      setPipelineStep('analyzing');
      setStatusMessage('Gemini 3.0 Pro: Analyzing shot physics...');

      try {
          const refAssets: ReferenceAsset[] = characterRefs.map(c => ({
              id: c.id, data: c.url, type: 'Character', name: 'Char Ref'
          }));

          const specs = await generateShotSpecs(startFrame.url, cameraMove, duration, audioDirection, refAssets);
          setPrompt(specs.videoMotionPrompt);
          
          setStatusMessage('Nano Banana Pro: Generating End Frame...');
          
          const startRef: ReferenceAsset = {
              id: 'start-ref', data: startFrame.url, type: 'General', name: 'Start Frame'
          };
          
          // Combine start ref + character refs
          const generationRefs = [startRef, ...refAssets];

          const newEndFrame = await generateImage(
              specs.endFramePrompt,
              generationRefs,
              { aspectRatio: startFrame.aspectRatio as any || '16:9', resolution: '2K' },
              false
          );
          newEndFrame.projectId = currentProject.id;
          newEndFrame.prompt = "Auto-Generated End Frame";
          
          setEndFrame(newEndFrame);
          setPipelineStep('review_end');
          showNotification("End Frame Generated. Review below.");

      } catch (e) {
          console.error(e);
          showNotification("Failed to generate end frame specs.");
          setPipelineStep('idle');
      } finally {
          setIsGenerating(false);
          setStatusMessage('');
      }
  };

  const handleAutoWritePrompt = async () => {
      if (!startFrame || !endFrame) {
          showNotification("Need both frames to analyze motion.");
          return;
      }
      setIsGenerating(true);
      setStatusMessage("Analyzing Motion Vector...");
      try {
          const motionDescription = await generateTransitionPrompt(startFrame.url, endFrame.url);
          setPrompt(motionDescription);
      } catch(e) {
          console.error(e);
          showNotification("Failed to analyze motion.");
      } finally {
          setIsGenerating(false);
          setStatusMessage("");
      }
  }

  const handleRegenerateEndFrame = async () => { handleSmartWorkflow(); };

  const handleEditEndFrame = async () => {
      if (!endFrame) return;
      const newInstruction = window.prompt("Enter edit instruction for the End Frame:");
      if (!newInstruction) return;

      setIsGenerating(true);
      setStatusMessage('Refining End Frame...');
      try {
          const editedFrame = await applyEdit(
              endFrame.url, newInstruction, [], undefined, '2K', endFrame.aspectRatio
          );
          setEndFrame(editedFrame);
          showNotification("End Frame Updated");
      } catch (e) {
          console.error(e);
          showNotification("Edit failed");
      } finally {
          setIsGenerating(false);
          setStatusMessage('');
      }
  };

  const handleExtendVideo = async (video: GeneratedVideo) => {
      // Set the last frame of this video as the NEW start frame for the next shot
      // Since we don't have frame extraction in this demo, we'll use the thumbnail as a proxy for "context"
      // Ideally, the backend would return the last frame explicitly. 
      // For now, we simulate the workflow by alerting the user.
      showNotification("Extension mode active. Use the last frame as Start.");
      // In a real app, we'd fetch the last frame here.
  };

  const handleDelete = async (id: string) => {
      if (confirm("Delete this video?")) {
          await db.deleteVideo(id);
          setVideos(prev => prev.filter(v => v.id !== id));
          if (activeVideo?.id === id) setActiveVideo(null);
      }
  };

  const handleDragStart = (e: React.DragEvent, img: GeneratedImage) => {
      setDraggedImage(img);
      e.dataTransfer.setData('application/json', JSON.stringify(img));
      e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDropOnFrame = (e: React.DragEvent, type: 'start' | 'end' | 'char') => {
      e.preventDefault();
      let img = draggedImage;
      if (!img) {
          try { const data = e.dataTransfer.getData('application/json'); if (data) img = JSON.parse(data); } catch (err) { console.error(err); }
      }
      if (img) {
          if (type === 'start') setStartFrame(img);
          else if (type === 'end') setEndFrame(img);
          else if (type === 'char') addCharacterRef(img);
      }
      setDraggedImage(null);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };

  return (
    <div className="flex h-full bg-slate-950 text-slate-100 overflow-hidden">
        {showPromptGuide && (
            <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8" onClick={() => setShowPromptGuide(false)}>
                <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md rounded-t-2xl">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Book className="w-5 h-5 text-violet-400"/> Veo 3.1 Prompting Master Guide</h2>
                            <p className="text-xs text-zinc-400 mt-1">Official syntax for high-fidelity video generation</p>
                        </div>
                        <button onClick={() => setShowPromptGuide(false)}><X className="w-5 h-5 text-zinc-500 hover:text-white"/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-zinc-300">
                        {/* Guide Content */}
                        <div className="bg-violet-900/10 border border-violet-500/20 p-4 rounded-xl">
                            <h3 className="font-bold text-violet-300 mb-2">🎯 THE FORMULA</h3>
                            <code className="block bg-black/30 p-3 rounded-lg text-xs font-mono text-violet-200">
                                [CAMERA ANGLE] + [SHOT TYPE] + [SUBJECT] + [ACTION] + [ENVIRONMENT] + [LIGHTING] + [CAMERA MOVEMENT] + [DURATION]
                            </code>
                        </div>
                        {/* Additional Guide Sections... */}
                    </div>
                </div>
            </div>
        )}

        <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
            <div className="flex border-b border-slate-800">
                <button onClick={() => setActiveSidebarTab('videos')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${activeSidebarTab === 'videos' ? 'bg-slate-800 text-violet-400 border-b-2 border-violet-500' : 'text-slate-500 hover:text-white'}`}><Film className="w-3.5 h-3.5" /> Videos</button>
                <button onClick={() => setActiveSidebarTab('assets')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${activeSidebarTab === 'assets' ? 'bg-slate-800 text-violet-400 border-b-2 border-violet-500' : 'text-slate-500 hover:text-white'}`}><ImageIcon className="w-3.5 h-3.5" /> Assets</button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {activeSidebarTab === 'videos' ? (
                    videos.map(video => (
                        <div key={video.id} onClick={() => setActiveVideo(video)} className={`relative group rounded-lg overflow-hidden border cursor-pointer transition-all ${activeVideo?.id === video.id ? 'border-violet-500 ring-1 ring-violet-500/50' : 'border-slate-700 hover:border-slate-500'}`}>
                            <div className="aspect-video bg-black relative">
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-800"><Play className="w-8 h-8 text-slate-600" /></div>
                                <img src={video.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="thumb" />
                            </div>
                            <div className="p-2 bg-slate-900 flex justify-between items-center">
                                <span className="text-[10px] text-slate-300 truncate flex-1">{video.prompt}</span>
                                <button onClick={(e) => { e.stopPropagation(); handleExtendVideo(video); }} className="text-[9px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded" title="Extend Scene"><FastForward className="w-3 h-3" /></button>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(video.id); }} className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                        </div>
                    ))
                ) : (
                    allAssets.map(img => (
                         <div key={img.id} draggable onDragStart={(e) => handleDragStart(e, img)} onClick={() => handleAssetClick(img)} className="relative group rounded-lg overflow-hidden border border-slate-700 cursor-pointer hover:border-violet-500 transition-colors">
                            <img src={img.url} alt="asset" className="w-full h-24 object-cover pointer-events-none" />
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[9px] truncate text-slate-300">{img.prompt}</div>
                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity backdrop-blur-sm">
                                <button onClick={(e) => { e.stopPropagation(); setStartFrame(img); }} className="bg-violet-600 hover:bg-violet-700 text-white p-1.5 rounded text-[9px] font-bold flex flex-col items-center justify-center w-8 h-8 shadow-lg" title="Set Start"><PanelLeft className="w-3 h-3" /></button>
                                <button onClick={(e) => { e.stopPropagation(); setEndFrame(img); }} className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded text-[9px] font-bold flex flex-col items-center justify-center w-8 h-8 shadow-lg" title="Set End"><PanelRight className="w-3 h-3" /></button>
                                <button onClick={(e) => { e.stopPropagation(); addCharacterRef(img); }} className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded text-[9px] font-bold flex flex-col items-center justify-center w-8 h-8 shadow-lg" title="Add Character Ref"><Users className="w-3 h-3" /></button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        <div className="flex-1 flex flex-col">
            <div className="flex-1 bg-black flex items-center justify-center p-8 relative">
                {activeVideo ? (
                    <div className="relative w-full max-w-4xl aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-2xl ring-1 ring-slate-800 group/player">
                        <video src={activeVideo.videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                        {/* Overlays... */}
                        {viewfinderMode === 'thirds' && <div className="absolute inset-0 pointer-events-none opacity-50"><div className="absolute top-1/3 left-0 right-0 h-px bg-white/50"></div><div className="absolute top-2/3 left-0 right-0 h-px bg-white/50"></div><div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/50"></div><div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/50"></div></div>}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover/player:opacity-100 transition-opacity">
                            <button onClick={() => setViewfinderMode(m => m === 'thirds' ? 'none' : 'thirds')} className="p-1.5 rounded-lg backdrop-blur-md bg-black/50 text-white/70 hover:bg-black/80" title="Rule of Thirds"><Grid3X3 className="w-4 h-4"/></button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-slate-500"><Film className="w-16 h-16 mx-auto mb-4 opacity-20" /><p>Select or generate a video to preview</p></div>
                )}
                {isGenerating && <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50"><Loader2 className="w-12 h-12 text-violet-500 animate-spin mb-4" /><span className="text-violet-300 font-medium tracking-wide animate-pulse">{statusMessage || 'Processing...'}</span></div>}
            </div>

            <div className="h-80 bg-slate-900 border-t border-slate-800 p-6 flex gap-6">
                <div className="w-72 space-y-4 shrink-0 border-r border-slate-800 pr-6 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Sliders className="w-4 h-4" /> Shot Intelligence</span></div>
                    
                    {/* Character Ingredients */}
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                        <label className="text-[10px] text-slate-400 block mb-2 flex items-center gap-1 font-bold uppercase"><Users className="w-3 h-3"/> Character Consistency ({characterRefs.length}/3)</label>
                        <div className="flex gap-2">
                            {characterRefs.map(ref => (
                                <div key={ref.id} className="w-10 h-10 rounded-lg overflow-hidden relative group border border-slate-600">
                                    <img src={ref.url} className="w-full h-full object-cover" alt="Char" />
                                    <button onClick={() => removeCharacterRef(ref.id)} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-red-400"><X className="w-3 h-3"/></button>
                                </div>
                            ))}
                            {characterRefs.length < 3 && (
                                <div onDragOver={handleDragOver} onDrop={(e) => handleDropOnFrame(e, 'char')} className="w-10 h-10 rounded-lg border border-dashed border-slate-600 flex items-center justify-center text-slate-600 hover:text-slate-400 hover:border-slate-400 cursor-pointer" title="Drop Character Ref Here"><Plus className="w-4 h-4"/></div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div className={`p-2 rounded-lg border cursor-pointer transition-all ${autoEndFrame ? 'bg-violet-900/20 border-violet-500/50' : 'bg-slate-800 border-slate-700'}`} onClick={() => { if(!isLooping) setAutoEndFrame(!autoEndFrame); }}><span className="text-[10px] font-bold text-slate-300 flex items-center gap-2">Auto End <Sparkles className={`w-3 h-3 ${autoEndFrame ? 'text-violet-400' : 'text-slate-600'}`} /></span></div>
                            <div className={`p-2 rounded-lg border cursor-pointer transition-all ${isLooping ? 'bg-blue-900/20 border-blue-500/50' : 'bg-slate-800 border-slate-700'}`} onClick={() => setIsLooping(!isLooping)}><span className="text-[10px] font-bold text-slate-300 flex items-center gap-2">Loop <Repeat className={`w-3 h-3 ${isLooping ? 'text-blue-400' : 'text-slate-600'}`} /></span></div>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 block mb-1">Camera Movement</label>
                            <select value={cameraMove} onChange={(e) => setCameraMove(e.target.value)} disabled={isLooping} className="w-full bg-slate-800 text-xs border border-slate-700 rounded p-1.5 focus:border-violet-500 outline-none">
                                {CINEMATIC_MOVES.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        {/* Handheld Chaos Slider */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Gauge className="w-3 h-3 text-violet-400" />
                                    Handheld Chaos
                                </label>
                                <span className="text-[10px] font-mono text-slate-600">{cameraStability}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={cameraStability}
                                onChange={(e) => setCameraStability(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                            />
                            <div className="flex justify-between text-[8px] text-slate-600 font-mono mt-0.5">
                                <span>TRIPOD</span>
                                <span>HANDHELD</span>
                                <span>CHAOS</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-40 aspect-video bg-slate-800 rounded-lg border border-slate-700 overflow-hidden relative group hover:border-violet-500 transition-colors shrink-0 cursor-pointer" onDragOver={handleDragOver} onDrop={(e) => handleDropOnFrame(e, 'start')} onClick={() => setActiveSidebarTab('assets')}>
                            {startFrame ? <><img src={startFrame.url} className="w-full h-full object-cover" alt="Start" /><div className="absolute top-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-bold text-white">START</div><button onClick={(e) => { e.stopPropagation(); setStartFrame(null); }} className="absolute top-1 right-1 bg-black/50 hover:bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button></> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 text-xs text-center p-2"><ImageIcon className="w-6 h-6 mb-1 opacity-50" /> Start Frame</div>}
                        </div>
                        {isLooping ? <Repeat className="w-6 h-6 text-blue-500 animate-spin-slow" /> : <ArrowRight className={`w-6 h-6 ${isGenerating ? 'text-violet-500 animate-pulse' : 'text-slate-600'}`} />}
                        <div className={`w-40 aspect-video rounded-lg border overflow-hidden relative group transition-colors shrink-0 ${autoEndFrame ? 'bg-violet-900/10 border-violet-500/30' : 'bg-slate-800 border-slate-700 hover:border-violet-500 cursor-pointer'}`} onDragOver={handleDragOver} onDrop={(e) => !autoEndFrame && !isLooping && handleDropOnFrame(e, 'end')} onClick={() => !autoEndFrame && !isLooping && setActiveSidebarTab('assets')}>
                             {endFrame ? <><img src={endFrame.url} className="w-full h-full object-cover" alt="End" /><div className="absolute top-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-bold text-white">END</div>{!autoEndFrame && !isLooping && <button onClick={(e) => { e.stopPropagation(); setEndFrame(null); }} className="absolute top-1 right-1 bg-black/50 hover:bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>}</> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 text-xs border-dashed border border-slate-700 text-center p-2">{autoEndFrame ? <><Sparkles className="w-6 h-6 mb-1 text-violet-500 opacity-80" /> <span className="text-violet-300">Auto-Generate</span></> : <><ImageIcon className="w-6 h-6 mb-1 opacity-50" /> End Frame</>}</div>}
                        </div>
                    </div>
                    <div className="flex-1 relative group">
                        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Motion Prompt..." className="w-full h-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none resize-none placeholder-slate-600" />
                        <div className="absolute bottom-3 right-3 flex gap-2">
                            <button onClick={() => setShowPromptGuide(true)} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-2 py-1.5 rounded-lg transition-all border border-slate-700"><Book className="w-3 h-3" /></button>
                            <button onClick={handleAutoWritePrompt} className="text-[10px] bg-slate-800 hover:bg-violet-600 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-all border border-slate-700 hover:border-violet-500 shadow-md flex items-center gap-1.5"><Wand2 className="w-3 h-3" /> Auto-Write</button>
                        </div>
                    </div>
                </div>

                <div className="w-40 flex flex-col justify-end gap-3 shrink-0">
                    {autoEndFrame && pipelineStep !== 'review_end' && !isLooping && <button onClick={handleSmartWorkflow} disabled={isGenerating || !startFrame} className="bg-slate-800 hover:bg-violet-900/30 text-violet-300 border border-slate-700 hover:border-violet-500/50 py-3 rounded-xl text-xs font-bold transition-all disabled:opacity-50">Draft Shot</button>}
                    {autoEndFrame && pipelineStep === 'review_end' && !isLooping && <><button onClick={handleGenerateVideo} className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"><Check className="w-3 h-3" /> Approve & Run</button><button onClick={handleRegenerateEndFrame} className="bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"><RefreshCw className="w-3 h-3" /> Regenerate</button></>}
                    {(!autoEndFrame || isLooping) && <button onClick={handleGenerateVideo} disabled={isGenerating || !prompt || (!startFrame && !endFrame)} className="bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-violet-900/20 flex items-center justify-center gap-2 disabled:opacity-50">{isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Generate Video</button>}
                </div>
            </div>
        </div>
    </div>
  );
};

export default StageFour;
