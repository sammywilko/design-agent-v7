
import React, { useState, useEffect } from 'react';
import StageOne from './components/StageOne';
import StageTwo from './components/StageTwo';
import StageThree from './components/StageThree';
import StageFour from './components/StageFour';
import ProjectDashboard from './components/ProjectDashboard';
import StudioAssistant from './components/StudioAssistant';
import WelcomeGuide from './components/WelcomeGuide';
import ScriptStudio from './components/ScriptStudio';
import PipelineOverview from './components/PipelineOverview';
import MoodBoardPanel from './components/MoodBoardPanel';
import ProducerChat from './components/ProducerChat';
import CollaborationPanel from './components/CollaborationPanel';
import { ProducerAppContext } from './services/producerAgent';
import { useCollaboration } from './hooks/useCollaboration';
import { AppStage, GeneratedImage, SavedEntity, Project, ScriptData, Beat, CharacterProfile, LocationProfile, ProductProfile, MoodBoard, MoodBoardImage } from './types';
import { Palette, Layers, Sparkles, Film, ArrowLeft, Bot, Loader2, Video, DownloadCloud, HelpCircle, FileText, FileSpreadsheet, LayoutDashboard, ImageIcon, Undo2 } from 'lucide-react';
import { db } from './services/db';
import { generateCharacterSheet, generateExpressionBank, generateImage } from './services/gemini';
import { generateThumbnail } from './services/imageUtils';
import { analyzeImage, extractStyleDNA, ensureThumbnail } from './services/moodBoardService';
import JSZip from 'jszip';

interface ToastMsg {
    id: string;
    message: string;
}

const App: React.FC = () => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  
  const [stage, setStage] = useState<AppStage>(AppStage.STAGE_1_CONCEPT);
  const [workingImage, setWorkingImage] = useState<GeneratedImage | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Script Data State
  const [scriptData, setScriptData] = useState<ScriptData | undefined>(undefined);
  const [incomingBeatPrompt, setIncomingBeatPrompt] = useState<{prompt: string, refs: any[], isSequence?: boolean, beatId?: string} | null>(null);
  const [incomingGhostBeats, setIncomingGhostBeats] = useState<Beat[] | null>(null);
  const [incomingCharacter, setIncomingCharacter] = useState<GeneratedImage | null>(null); // New state for back-porting

  const [videoStartFrame, setVideoStartFrame] = useState<GeneratedImage | null>(null);
  const [videoEndFrame, setVideoEndFrame] = useState<GeneratedImage | null>(null);
  const [videoPrompt, setVideoPrompt] = useState<string>('');

  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);
  const [showPipelineOverview, setShowPipelineOverview] = useState(false);

  const [globalHistory, setGlobalHistory] = useState<GeneratedImage[]>([]);
  const [libraryAssets, setLibraryAssets] = useState<SavedEntity[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Mood Board State
  const [moodBoards, setMoodBoards] = useState<MoodBoard[]>([]);
  const [showMoodBoardPanel, setShowMoodBoardPanel] = useState(false);
  const [activeMoodBoardId, setActiveMoodBoardId] = useState<string | null>(null);

  // Producer Agent State
  const [showProducerChat, setShowProducerChat] = useState(false);

  // Undo System for Agent Actions
  const [scriptHistory, setScriptHistory] = useState<ScriptData[]>([]);
  const MAX_UNDO_HISTORY = 20;

  // Collaboration Hook
  const collaboration = useCollaboration({
    scriptData,
    moodBoards,
    globalHistory,
    setScriptData: (data) => setScriptData(data),
    setMoodBoards: (boards) => setMoodBoards(boards),
    setGlobalHistory: (history) => setGlobalHistory(history)
  });

  useEffect(() => {
    const loadProjects = async () => {
        try {
            const loaded = await db.getProjects();
            setProjects(loaded.sort((a, b) => b.createdAt - a.createdAt));
        } catch (e) {
            console.error("Failed to load projects", e);
        } finally {
            setIsLoadingProjects(false);
        }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    if (currentProject) {
      const loadData = async () => {
          setIsLoadingData(true);
          try {
              const [history, library, savedScript, savedMoodBoards] = await Promise.all([
                  db.getHistory(currentProject.id),
                  db.getLibrary(currentProject.id),
                  db.getScriptData(currentProject.id),
                  db.getMoodBoards(currentProject.id)
              ]);
              setGlobalHistory(history);
              setLibraryAssets(library);
              if (savedScript) setScriptData(savedScript);
              setMoodBoards(savedMoodBoards);

          } catch (e) {
              console.error("Failed to load project data", e);
          } finally {
              setIsLoadingData(false);
          }
      };

      loadData();
      setStage(AppStage.STAGE_0_SCRIPT); // Start at Script Studio

      const hasSeenGuide = localStorage.getItem('hasSeenWelcomeGuideV4');
      if (!hasSeenGuide) {
          setShowWelcomeGuide(true);
      }
    }
  }, [currentProject]);

  const closeWelcomeGuide = () => {
      setShowWelcomeGuide(false);
      localStorage.setItem('hasSeenWelcomeGuideV4', 'true');
  };

  const createProject = async (name: string) => {
    const newProject: Project = { id: crypto.randomUUID(), name, createdAt: Date.now() };
    await db.saveProject(newProject);
    setProjects(prev => [newProject, ...prev]);
    setCurrentProject(newProject);
  };

  const deleteProject = async (id: string) => {
    if (confirm("Are you sure? This will delete all assets and history for this project.")) {
        await db.deleteProject(id);
        setProjects(prev => prev.filter(p => p.id !== id));
        if (currentProject?.id === id) setCurrentProject(null);
    }
  };

  const addToGlobalHistory = async (images: GeneratedImage | GeneratedImage[]) => {
      const imgs = Array.isArray(images) ? images : [images];

      // Generate thumbnails for new images (non-blocking)
      const imgsWithThumbnails = await Promise.all(
          imgs.map(async (img) => {
              if (!img.thumbnail && img.url) {
                  try {
                      const thumbnail = await generateThumbnail(img.url, 300, 0.7);
                      return { ...img, thumbnail };
                  } catch {
                      return img; // Keep original if thumbnail fails
                  }
              }
              return img;
          })
      );

      setGlobalHistory(prev => {
          const newIds = new Set(imgsWithThumbnails.map(i => i.id));
          const filteredPrev = prev.filter(p => !newIds.has(p.id));
          return [...filteredPrev, ...imgsWithThumbnails];
      });

      for (const img of imgsWithThumbnails) {
          if (!img.projectId && currentProject) img.projectId = currentProject.id;
          if (img.projectId) await db.saveHistoryImage(img);
      }
  };

  const removeFromGlobalHistory = async (imageId: string) => {
      setGlobalHistory(prev => prev.filter(img => img.id !== imageId));
      // Optionally remove from DB too
      try {
          await db.deleteHistoryImage(imageId);
      } catch (e) {
          console.log("Could not delete from DB:", e);
      }
  };

  const refreshLibrary = async () => {
      if (currentProject) {
          const library = await db.getLibrary(currentProject.id);
          setLibraryAssets(library);
      }
  };

  const showNotification = (message: string) => {
      const id = crypto.randomUUID();
      setToast({ id, message });
      setTimeout(() => {
          setToast(prev => prev?.id === id ? null : prev);
      }, 3000);
  };

  // --- CONNECTED WORKFLOW HANDLERS ---

  const handleGenerateBeat = (beat: Beat, characters: CharacterProfile[], locations: LocationProfile[], products: ProductProfile[]) => {
      // 1. Construct Master Prompt
      const lookbook = scriptData?.productionDesign;
      let prompt = "";

      // Inject Mood Board Style DNA first (highest priority for visual style)
      const activeMoodBoard = getActiveMoodBoard();
      if (activeMoodBoard?.styleDNA) {
          prompt += `STYLE DNA: ${activeMoodBoard.styleDNA.promptSnippet} `;
          if (activeMoodBoard.styleDNA.colorPalette.length > 0) {
              prompt += `COLOR PALETTE: ${activeMoodBoard.styleDNA.colorPalette.slice(0, 4).join(', ')}. `;
          }
          if (activeMoodBoard.styleDNA.lightingCharacteristics) {
              prompt += `LIGHTING STYLE: ${activeMoodBoard.styleDNA.lightingCharacteristics}. `;
          }
          if (activeMoodBoard.styleDNA.photographicStyle) {
              prompt += `PHOTOGRAPHIC STYLE: ${activeMoodBoard.styleDNA.photographicStyle}. `;
          }
      }

      // Inject Lookbook Styles first
      if (lookbook) {
          if (lookbook.visualStyle) prompt += `STYLE: ${lookbook.visualStyle}. `;
          if (lookbook.colorPalette) prompt += `COLOR: ${lookbook.colorPalette}. `;
          if (lookbook.lightingApproach) prompt += `LIGHTING: ${lookbook.lightingApproach}. `;
          if (lookbook.lightingAnalysis) prompt += `LIGHTING SETUP: ${lookbook.lightingAnalysis}. `;

          // Camera Rig Settings
          if (lookbook.cameraRig) {
              const rig = lookbook.cameraRig;
              let cameraPrompt = 'CAMERA SETTINGS: ';

              // Focal length
              const focalNum = parseInt(rig.focalLength);
              if (focalNum <= 24) {
                  cameraPrompt += `Shot on ${rig.focalLength} wide-angle lens with dramatic perspective and expansive field of view. `;
              } else if (focalNum <= 50) {
                  cameraPrompt += `Shot on ${rig.focalLength} lens with natural perspective. `;
              } else {
                  cameraPrompt += `Shot on ${rig.focalLength} telephoto lens, compressing background toward subject for intimate framing. `;
              }

              // Aperture / Depth of Field
              const apertureNum = parseFloat(rig.aperture.replace('f/', ''));
              if (apertureNum <= 2.8) {
                  cameraPrompt += `Shallow depth of field at ${rig.aperture}, subject sharp with creamy bokeh background. `;
              } else if (apertureNum <= 8) {
                  cameraPrompt += `Moderate depth of field at ${rig.aperture}. `;
              } else {
                  cameraPrompt += `Deep focus at ${rig.aperture}, entire scene sharp from foreground to background. `;
              }

              // Color Temperature
              const kelvin = rig.colorTemp.replace('K', '');
              const kelvinNum = parseInt(kelvin);
              if (kelvinNum <= 3200) {
                  cameraPrompt += `Warm tungsten lighting at ${kelvin}K color temperature, golden and intimate. `;
              } else if (kelvinNum <= 4500) {
                  cameraPrompt += `Neutral lighting at ${kelvin}K color temperature. `;
              } else if (kelvinNum <= 5600) {
                  cameraPrompt += `Daylight balanced at ${kelvin}K color temperature, bright and clean. `;
              } else {
                  cameraPrompt += `Cool shade lighting at ${kelvin}K color temperature, blue tint and moody. `;
              }

              prompt += cameraPrompt;
          }
      }

      prompt += `\n\nSHOT ACTION: ${beat.visualSummary}. Shot Type: ${beat.shotType}. Mood: ${beat.mood}.`;

      // 2. Gather all relevant refs and snippets
      const relevantRefs: any[] = [];

      // Include mood board reference images (first 2-3 for style guidance)
      if (activeMoodBoard?.images && activeMoodBoard.images.length > 0) {
          activeMoodBoard.images.slice(0, 3).forEach((img, idx) => {
              relevantRefs.push({
                  id: `moodboard-ref-${idx}`,
                  data: img.thumbnail || img.url,
                  type: 'Style',
                  name: `Mood Board Reference ${idx + 1}`
              });
          });
      }

      // Include global style references from lookbook moodboard
      if (lookbook?.styleRefs && lookbook.styleRefs.length > 0) {
          lookbook.styleRefs.forEach((ref, idx) => {
              relevantRefs.push({
                  id: `style-ref-${idx}`,
                  data: ref,
                  type: 'Style',
                  name: `Style Reference ${idx + 1}`
              });
          });
      }
      
      // Characters - with shot-type aware reference selection
      const relevantChars = characters.filter(c => beat.characters?.includes(c.name));

      // Map shot types to ref coverage categories
      const getShotTypeCategory = (shotType: string): 'face' | 'fullBody' | 'threeQuarter' | 'action' => {
          const type = shotType.toUpperCase();
          if (type.includes('CLOSE') || type.includes('ECU') || type.includes('CU')) return 'face';
          if (type.includes('WIDE') || type.includes('ESTABLISHING') || type.includes('WS')) return 'fullBody';
          if (type.includes('MED') || type.includes('MS') || type.includes('MCU')) return 'threeQuarter';
          if (type.includes('ACTION') || type.includes('DYNAMIC')) return 'action';
          return 'threeQuarter'; // Default to 3/4 for unspecified
      };

      const preferredCategory = getShotTypeCategory(beat.shotType);

      relevantChars.forEach(c => {
          if (c.promptSnippet) {
              prompt += `\nCHARACTER (${c.name}): ${c.promptSnippet}.`;
          } else {
              prompt += `\nCHARACTER (${c.name}): ${c.description}.`;
          }
          if (c.consistencyAnchors) {
              prompt += ` ANCHORS: ${c.consistencyAnchors}.`;
          }

          // Prioritize categorized refs based on shot type
          let selectedRef: string | undefined;

          if (c.refCoverage) {
              // Try preferred category first
              const preferredRefs = c.refCoverage[preferredCategory];
              if (preferredRefs && preferredRefs.length > 0) {
                  selectedRef = preferredRefs[0];
                  prompt += ` [Using ${preferredCategory} reference for ${beat.shotType} shot]`;
              } else {
                  // Fallback order: threeQuarter > fullBody > face > action
                  const fallbackOrder: Array<'threeQuarter' | 'fullBody' | 'face' | 'action'> = ['threeQuarter', 'fullBody', 'face', 'action'];
                  for (const cat of fallbackOrder) {
                      const refs = c.refCoverage[cat];
                      if (refs && refs.length > 0) {
                          selectedRef = refs[0];
                          break;
                      }
                  }
              }
          }

          // Fall back to general imageRefs if no categorized refs
          if (!selectedRef && c.imageRefs && c.imageRefs.length > 0) {
              selectedRef = c.imageRefs[0];
          }

          if (selectedRef) {
              relevantRefs.push({
                  id: c.id,
                  data: selectedRef,
                  type: 'Character',
                  name: c.name
              });
          }
      });

      // Locations
      const relevantLocs = locations.filter(l => beat.locations?.includes(l.name));
      relevantLocs.forEach(l => {
          if (l.promptSnippet) {
              prompt += `\nLOCATION (${l.name}): ${l.promptSnippet}.`;
          } else {
              prompt += `\nLOCATION (${l.name}): ${l.description}.`;
          }
          if (l.timeOfDay) prompt += ` TIME: ${l.timeOfDay}.`;
          if (l.weather) prompt += ` WEATHER: ${l.weather}.`;
          if (l.lightingNotes) prompt += ` ENV LIGHTING: ${l.lightingNotes}.`;

          // Add anchor image with strong prompt
          if (l.anchorImage) {
              prompt += ` LOCATION PLATE: All action takes place within this exact environment. Match the lighting, color palette, spatial depth, and architectural details precisely.`;
              relevantRefs.push({
                  id: `${l.id}-anchor`,
                  data: l.anchorImage,
                  type: 'Location',
                  name: `${l.name} (Master Plate)`
              });
          }

          if (l.imageRefs && l.imageRefs.length > 0) {
              relevantRefs.push({
                  id: l.id,
                  data: l.imageRefs[0],
                  type: 'Location',
                  name: l.name
              });
          }
      });

      // Products
      const relevantProds = products.filter(p => beat.products?.includes(p.name));
      relevantProds.forEach(p => {
          if (p.promptSnippet) {
              prompt += `\nPRODUCT (${p.name}): ${p.promptSnippet}.`;
          } else {
              prompt += `\nPRODUCT (${p.name}): ${p.description}.`;
          }
          if (p.materialNotes) prompt += ` MATERIALS: ${p.materialNotes}.`;
          
          if (p.imageRefs && p.imageRefs.length > 0) {
              relevantRefs.push({
                  id: p.id,
                  data: p.imageRefs[0],
                  type: 'Product',
                  name: p.name
              });
          }
      });

      // Inject Camera Language last
      if (lookbook?.cameraLanguage) prompt += `\nCAMERA: ${lookbook.cameraLanguage}.`;

      setIncomingBeatPrompt({ prompt, refs: relevantRefs });
      setStage(AppStage.STAGE_1_CONCEPT);
      showNotification("Beat transferred to Visualizer.");
  };

  const handleGenerateSequence = (beat: Beat, characters: CharacterProfile[], locations: LocationProfile[], products: ProductProfile[]) => {
      // Build prompt similar to handleGenerateBeat but with sequence instruction
      const lookbook = scriptData?.productionDesign;
      let prompt = "";

      // Inject Mood Board Style DNA first (highest priority for visual style)
      const activeMoodBoard = getActiveMoodBoard();
      if (activeMoodBoard?.styleDNA) {
          prompt += `STYLE DNA: ${activeMoodBoard.styleDNA.promptSnippet} `;
          if (activeMoodBoard.styleDNA.colorPalette.length > 0) {
              prompt += `COLOR PALETTE: ${activeMoodBoard.styleDNA.colorPalette.slice(0, 4).join(', ')}. `;
          }
          if (activeMoodBoard.styleDNA.lightingCharacteristics) {
              prompt += `LIGHTING STYLE: ${activeMoodBoard.styleDNA.lightingCharacteristics}. `;
          }
          if (activeMoodBoard.styleDNA.photographicStyle) {
              prompt += `PHOTOGRAPHIC STYLE: ${activeMoodBoard.styleDNA.photographicStyle}. `;
          }
      }

      // Inject Lookbook Styles
      if (lookbook) {
          if (lookbook.visualStyle) prompt += `STYLE: ${lookbook.visualStyle}. `;
          if (lookbook.colorPalette) prompt += `COLOR: ${lookbook.colorPalette}. `;
          if (lookbook.lightingApproach) prompt += `LIGHTING: ${lookbook.lightingApproach}. `;
          if (lookbook.lightingAnalysis) prompt += `LIGHTING SETUP: ${lookbook.lightingAnalysis}. `;

          // Camera Rig Settings for sequences
          if (lookbook.cameraRig) {
              const rig = lookbook.cameraRig;
              let cameraPrompt = 'CAMERA SETTINGS: ';

              // Focal length
              const focalNum = parseInt(rig.focalLength);
              if (focalNum <= 24) {
                  cameraPrompt += `Wide-angle ${rig.focalLength} perspective. `;
              } else if (focalNum <= 50) {
                  cameraPrompt += `Natural ${rig.focalLength} perspective. `;
              } else {
                  cameraPrompt += `Telephoto ${rig.focalLength} compression. `;
              }

              // Aperture
              const apertureNum = parseFloat(rig.aperture.replace('f/', ''));
              if (apertureNum <= 2.8) {
                  cameraPrompt += `Shallow DOF at ${rig.aperture}. `;
              } else if (apertureNum <= 8) {
                  cameraPrompt += `Moderate DOF at ${rig.aperture}. `;
              } else {
                  cameraPrompt += `Deep focus at ${rig.aperture}. `;
              }

              // Color temp
              const kelvin = rig.colorTemp.replace('K', '');
              cameraPrompt += `${kelvin}K color temperature. `;

              prompt += cameraPrompt;
          }
      }

      // Add sequence instruction
      prompt += `\n\nCreate a cinematic sequence of 4 frames in a 2x2 grid layout for this beat: "${beat.visualSummary}". `;
      prompt += `Frame 1 (top-left): Wide establishing shot showing the full environment and context. `;
      prompt += `Frame 2 (top-right): Medium shot capturing the main action. `;
      prompt += `Frame 3 (bottom-left): Close-up reaction shot focusing on emotion or detail. `;
      prompt += `Frame 4 (bottom-right): Resolution shot wrapping up the moment. `;
      prompt += `Mood: ${beat.mood}. Maintain visual continuity across all 4 frames.`;

      // Gather refs
      const relevantRefs: any[] = [];

      // Include mood board reference images (first 2-3 for style guidance)
      if (activeMoodBoard?.images && activeMoodBoard.images.length > 0) {
          activeMoodBoard.images.slice(0, 3).forEach((img, idx) => {
              relevantRefs.push({
                  id: `moodboard-ref-${idx}`,
                  data: img.thumbnail || img.url,
                  type: 'Style',
                  name: `Mood Board Reference ${idx + 1}`
              });
          });
      }

      // Style refs
      if (lookbook?.styleRefs && lookbook.styleRefs.length > 0) {
          lookbook.styleRefs.forEach((ref, idx) => {
              relevantRefs.push({
                  id: `style-ref-${idx}`,
                  data: ref,
                  type: 'Style',
                  name: `Style Reference ${idx + 1}`
              });
          });
      }

      // Characters - for sequence, prioritize 3/4 and fullBody refs (covers most angles in the 2x2 grid)
      const relevantChars = characters.filter(c => beat.characters?.includes(c.name));
      relevantChars.forEach(c => {
          if (c.promptSnippet) {
              prompt += `\nCHARACTER (${c.name}): ${c.promptSnippet}.`;
          } else if (c.description) {
              prompt += `\nCHARACTER (${c.name}): ${c.description}.`;
          }

          // For sequences, we need versatile refs - prioritize threeQuarter and fullBody
          let selectedRef: string | undefined;

          if (c.refCoverage) {
              // For 2x2 grid sequences, prefer versatile angles
              const sequencePriorityOrder: Array<'threeQuarter' | 'fullBody' | 'face' | 'action'> = ['threeQuarter', 'fullBody', 'face', 'action'];
              for (const cat of sequencePriorityOrder) {
                  const refs = c.refCoverage[cat];
                  if (refs && refs.length > 0) {
                      selectedRef = refs[0];
                      break;
                  }
              }
          }

          // Fall back to general imageRefs
          if (!selectedRef && c.imageRefs && c.imageRefs.length > 0) {
              selectedRef = c.imageRefs[0];
          }

          if (selectedRef) {
              relevantRefs.push({
                  id: c.id,
                  data: selectedRef,
                  type: 'Character',
                  name: c.name
              });
          }
      });

      // Locations
      const relevantLocs = locations.filter(l => beat.locations?.includes(l.name));
      relevantLocs.forEach(l => {
          if (l.promptSnippet) {
              prompt += `\nLOCATION (${l.name}): ${l.promptSnippet}.`;
          } else if (l.description) {
              prompt += `\nLOCATION (${l.name}): ${l.description}.`;
          }

          // Add anchor image with strong prompt
          if (l.anchorImage) {
              prompt += ` LOCATION PLATE: All action takes place within this exact environment. Match the lighting, color palette, spatial depth, and architectural details precisely.`;
              relevantRefs.push({
                  id: `${l.id}-anchor`,
                  data: l.anchorImage,
                  type: 'Location',
                  name: `${l.name} (Master Plate)`
              });
          }

          if (l.imageRefs && l.imageRefs.length > 0) {
              relevantRefs.push({
                  id: l.id,
                  data: l.imageRefs[0],
                  type: 'Location',
                  name: l.name
              });
          }
      });

      // Products
      const relevantProds = products.filter(p => beat.products?.includes(p.name));
      relevantProds.forEach(p => {
          if (p.promptSnippet) {
              prompt += `\nPRODUCT (${p.name}): ${p.promptSnippet}.`;
          } else if (p.description) {
              prompt += `\nPRODUCT (${p.name}): ${p.description}.`;
          }
          if (p.imageRefs && p.imageRefs.length > 0) {
              relevantRefs.push({
                  id: p.id,
                  data: p.imageRefs[0],
                  type: 'Product',
                  name: p.name
              });
          }
      });

      // Camera language
      if (lookbook?.cameraLanguage) prompt += `\nCAMERA: ${lookbook.cameraLanguage}.`;

      // Set aspect ratio to 1:1 for 2x2 grid
      setIncomingBeatPrompt({ prompt, refs: relevantRefs, isSequence: true, beatId: beat.id });
      setStage(AppStage.STAGE_1_CONCEPT);
      showNotification("Sequence generation started.");
  };

  const handleSyncToStoryboard = (beats: Beat[]) => {
      setIncomingGhostBeats(beats);
      setStage(AppStage.STAGE_3_STORYBOARD);
      showNotification("Script synced to Storyboard.");
  };

  const handleSendToScript = (image: GeneratedImage) => {
      setIncomingCharacter(image);
      setStage(AppStage.STAGE_0_SCRIPT);
      showNotification("Sending to Character Bible...");
  };

  // Quick add image to storyboard as new frame
  const handleSendToStoryboard = (image: GeneratedImage) => {
      // Add to global history if not already there
      addToGlobalHistory(image);
      // Switch to storyboard stage
      setStage(AppStage.STAGE_3_STORYBOARD);
      showNotification("Image added to assets. Drag it onto the storyboard!");
  };

  const handleGenerateCharacterSheet = async (character: CharacterProfile): Promise<string | null> => {
      // Get the best available reference (prioritize face refs, then general imageRefs)
      let sourceRef: string | undefined;

      if (character.refCoverage?.face && character.refCoverage.face.length > 0) {
          sourceRef = character.refCoverage.face[0];
      } else if (character.refCoverage?.threeQuarter && character.refCoverage.threeQuarter.length > 0) {
          sourceRef = character.refCoverage.threeQuarter[0];
      } else if (character.refCoverage?.fullBody && character.refCoverage.fullBody.length > 0) {
          sourceRef = character.refCoverage.fullBody[0];
      } else if (character.imageRefs && character.imageRefs.length > 0) {
          sourceRef = character.imageRefs[0];
      }

      if (!sourceRef) {
          showNotification('Upload at least one reference image first');
          return null;
      }

      // Get style context from production design if available
      const styleContext = scriptData?.productionDesign?.visualStyle || undefined;

      try {
          const sheetUrl = await generateCharacterSheet(
              character.name,
              character.description || '',
              sourceRef,
              styleContext
          );
          return sheetUrl;
      } catch (error) {
          console.error('Character sheet generation failed:', error);
          showNotification('Failed to generate character sheet');
          return null;
      }
  };

  const handleGenerateExpressionBank = async (character: CharacterProfile): Promise<string | null> => {
      // Get the best available face reference
      let sourceRef: string | undefined;

      // Prioritize face refs for expression bank
      if (character.refCoverage?.face && character.refCoverage.face.length > 0) {
          sourceRef = character.refCoverage.face[0];
      } else if (character.characterSheet) {
          // Use character sheet as fallback (it has face views)
          sourceRef = character.characterSheet;
      } else if (character.refCoverage?.threeQuarter && character.refCoverage.threeQuarter.length > 0) {
          sourceRef = character.refCoverage.threeQuarter[0];
      } else if (character.imageRefs && character.imageRefs.length > 0) {
          sourceRef = character.imageRefs[0];
      }

      if (!sourceRef) {
          showNotification('Upload a face reference first');
          return null;
      }

      // Get style context from production design if available
      const styleContext = scriptData?.productionDesign?.visualStyle || undefined;

      try {
          const bankUrl = await generateExpressionBank(
              character.name,
              sourceRef,
              styleContext
          );
          return bankUrl;
      } catch (error) {
          console.error('Expression bank generation failed:', error);
          showNotification('Failed to generate expression bank');
          return null;
      }
  };

  // Coverage Pack Image Generation - simple wrapper for the coverage system
  const handleGenerateCoverageImage = async (prompt: string): Promise<string> => {
      try {
          const result = await generateImage(prompt, [], {
              aspectRatio: '1:1',
              resolution: '1024x1024'
          });
          return result.url;
      } catch (error) {
          console.error('Coverage image generation failed:', error);
          throw error;
      }
  };

  const handleImageSelect = (image: GeneratedImage) => {
    addToGlobalHistory(image);
    setWorkingImage(image);
    setStage(AppStage.STAGE_2_EDITING);
  };
  
  const handleSendToVideo = (start: GeneratedImage, end?: GeneratedImage, prompt?: string) => {
      setVideoStartFrame(start);
      setVideoEndFrame(end || null);
      setVideoPrompt(prompt || '');
      setStage(AppStage.STAGE_4_VIDEO);
  };

  const handleExportZip = async () => {
      if (!currentProject) return;
      setIsExporting(true);
      showNotification("Preparing ZIP archive...");

      try {
          const zip = new JSZip();
          const folderName = currentProject.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const root = zip.folder(folderName);

          const historyFolder = root?.folder("generations");
          globalHistory.forEach((img, idx) => {
              const base64Data = img.url.split(',')[1];
              if(base64Data) {
                  historyFolder?.file(`gen_${idx + 1}_${img.prompt.slice(0, 15).replace(/\s/g, '_')}.png`, base64Data, { base64: true });
              }
          });

          const libraryFolder = root?.folder("library");
          libraryAssets.forEach((asset, idx) => {
              const base64Data = asset.data.split(',')[1];
              if(base64Data) {
                  libraryFolder?.file(`lib_${asset.type}_${asset.name.replace(/\s/g, '_')}.png`, base64Data, { base64: true });
              }
          });

          if (scriptData) {
              root?.file("script.json", JSON.stringify(scriptData, null, 2));
          }

          const content = await zip.generateAsync({ type: "blob" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(content);
          link.download = `${folderName}_archive.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          showNotification("Project exported successfully!");

      } catch (e) {
          console.error("Export failed", e);
          showNotification("Failed to create ZIP archive.");
      } finally {
          setIsExporting(false);
      }
  };

  // Professional Shot List CSV Export
  const handleExportShotList = () => {
      if (!scriptData?.beats || scriptData.beats.length === 0) {
          showNotification("No beats to export. Create beats first.");
          return;
      }

      const headers = [
          'Shot #',
          'Type',
          'Description',
          'Duration',
          'Mood',
          'Characters',
          'Locations',
          'Products',
          'Status',
          'Has Visual'
      ];

      const rows = scriptData.beats.map((beat, idx) => [
          idx + 1,
          beat.shotType || 'MED',
          `"${(beat.visualSummary || '').replace(/"/g, '""')}"`,
          beat.duration || '3s',
          beat.mood || '',
          `"${(beat.characters || []).join(', ')}"`,
          `"${(beat.locations || []).join(', ')}"`,
          `"${(beat.products || []).join(', ')}"`,
          beat.status || 'scripted',
          (beat.generatedImageIds?.length || beat.sequenceGrid) ? 'Yes' : 'No'
      ]);

      // Add BOM for Excel compatibility + header + data
      const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${currentProject?.name || 'project'}_shot_list.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showNotification("Shot list exported!");
  };

  // Export Final Cut Pro XML (FCPXML) for professional NLE import
  const handleExportFCPXML = () => {
      if (!scriptData?.beats || scriptData.beats.length === 0) {
          showNotification("No beats to export. Create beats first.");
          return;
      }

      const projectName = currentProject?.name || 'Design_Agent_Project';
      const fps = 30;
      const frameRate = `${fps}/1s`;

      // Calculate total duration (sum of all beat durations)
      const parseDuration = (dur: string): number => {
          const match = dur.match(/(\d+)/);
          return match ? parseInt(match[1]) : 3;
      };

      let currentOffset = 0;
      const clips = scriptData.beats.map((beat, idx) => {
          const durationSec = parseDuration(beat.duration || '3s');
          const durationFrames = durationSec * fps;
          const startFrame = currentOffset;
          currentOffset += durationFrames;

          return `        <clip name="Beat_${idx + 1}" offset="${startFrame}/${fps}s" duration="${durationFrames}/${fps}s" start="0s">
          <note>${beat.visualSummary?.replace(/[<>&"']/g, '') || 'No description'}</note>
          <keyword value="${beat.shotType || 'MED'}" />
          <keyword value="${beat.mood || 'neutral'}" />
        </clip>`;
      }).join('\n');

      const totalDuration = currentOffset;

      const fcpxml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <resources>
    <format id="r1" name="FFVideoFormat1080p${fps}" frameDuration="1/${fps}s" width="1920" height="1080"/>
  </resources>
  <library>
    <event name="${projectName}">
      <project name="${projectName}_Timeline">
        <sequence format="r1" duration="${totalDuration}/${fps}s">
          <spine>
${clips}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>`;

      const blob = new Blob([fcpxml], { type: 'application/xml;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${projectName}_timeline.fcpxml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showNotification("Final Cut Pro XML exported!");
  };

  // ============================================
  // MOOD BOARD HANDLERS
  // ============================================

  const handleCreateMoodBoard = async (name: string, purpose: MoodBoard['purpose']) => {
      if (!currentProject) return;

      const newBoard: MoodBoard = {
          id: `mb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name,
          purpose,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          images: [],
          appliedToBeats: []
      };

      setMoodBoards(prev => [...prev, newBoard]);
      await db.saveMoodBoard(currentProject.id, newBoard);
      showNotification(`Mood board "${name}" created!`);
  };

  const handleDeleteMoodBoard = async (id: string) => {
      setMoodBoards(prev => prev.filter(b => b.id !== id));
      await db.deleteMoodBoard(id);
      showNotification("Mood board deleted");
  };

  const handleAddImageToBoard = async (boardId: string, image: MoodBoardImage) => {
      if (!currentProject) return;

      // Generate thumbnail if needed
      let imageWithThumb = image;
      if (!image.thumbnail && image.url) {
          try {
              const thumbnail = await ensureThumbnail(image.url);
              imageWithThumb = { ...image, thumbnail };
          } catch {
              // Continue without thumbnail
          }
      }

      setMoodBoards(prev => prev.map(board => {
          if (board.id !== boardId) return board;
          return {
              ...board,
              images: [...board.images, imageWithThumb],
              updatedAt: Date.now()
          };
      }));

      // Persist
      const updatedBoard = moodBoards.find(b => b.id === boardId);
      if (updatedBoard) {
          const boardWithNewImage = {
              ...updatedBoard,
              images: [...updatedBoard.images, imageWithThumb],
              updatedAt: Date.now()
          };
          await db.saveMoodBoard(currentProject.id, boardWithNewImage);
      }
  };

  const handleRemoveImageFromBoard = async (boardId: string, imageId: string) => {
      if (!currentProject) return;

      setMoodBoards(prev => prev.map(board => {
          if (board.id !== boardId) return board;
          return {
              ...board,
              images: board.images.filter(img => img.id !== imageId),
              updatedAt: Date.now()
          };
      }));

      // Persist
      const board = moodBoards.find(b => b.id === boardId);
      if (board) {
          const updatedBoard = {
              ...board,
              images: board.images.filter(img => img.id !== imageId),
              updatedAt: Date.now()
          };
          await db.saveMoodBoard(currentProject.id, updatedBoard);
      }
  };

  const handleUpdateImageNotes = async (boardId: string, imageId: string, notes: string) => {
      if (!currentProject) return;

      setMoodBoards(prev => prev.map(board => {
          if (board.id !== boardId) return board;
          return {
              ...board,
              images: board.images.map(img =>
                  img.id === imageId ? { ...img, userNotes: notes } : img
              ),
              updatedAt: Date.now()
          };
      }));

      // Persist
      const board = moodBoards.find(b => b.id === boardId);
      if (board) {
          const updatedBoard = {
              ...board,
              images: board.images.map(img =>
                  img.id === imageId ? { ...img, userNotes: notes } : img
              ),
              updatedAt: Date.now()
          };
          await db.saveMoodBoard(currentProject.id, updatedBoard);
      }
  };

  const handleExtractStyleDNA = async (boardId: string) => {
      if (!currentProject) return;

      const board = moodBoards.find(b => b.id === boardId);
      if (!board || board.images.length < 2) {
          showNotification("Need at least 2 images to extract Style DNA");
          return;
      }

      showNotification("Extracting Style DNA...");

      try {
          const styleDNA = await extractStyleDNA(board.images);

          setMoodBoards(prev => prev.map(b => {
              if (b.id !== boardId) return b;
              return { ...b, styleDNA, updatedAt: Date.now() };
          }));

          // Persist
          const updatedBoard = { ...board, styleDNA, updatedAt: Date.now() };
          await db.saveMoodBoard(currentProject.id, updatedBoard);

          showNotification("Style DNA extracted successfully!");
      } catch (error) {
          console.error("Style DNA extraction failed:", error);
          showNotification("Failed to extract Style DNA");
      }
  };

  const handleAnalyzeMoodBoardImage = async (boardId: string, imageId: string) => {
      if (!currentProject) return;

      const board = moodBoards.find(b => b.id === boardId);
      const image = board?.images.find(img => img.id === imageId);

      if (!board || !image) return;

      try {
          const analysis = await analyzeImage(image.thumbnail || image.url);

          setMoodBoards(prev => prev.map(b => {
              if (b.id !== boardId) return b;
              return {
                  ...b,
                  images: b.images.map(img =>
                      img.id === imageId ? { ...img, aiAnalysis: analysis } : img
                  ),
                  updatedAt: Date.now()
              };
          }));

          // Persist
          const updatedBoard = {
              ...board,
              images: board.images.map(img =>
                  img.id === imageId ? { ...img, aiAnalysis: analysis } : img
              ),
              updatedAt: Date.now()
          };
          await db.saveMoodBoard(currentProject.id, updatedBoard);

          showNotification("Image analyzed!");
      } catch (error) {
          console.error("Image analysis failed:", error);
          showNotification("Failed to analyze image");
      }
  };

  // Get active mood board for style injection
  const getActiveMoodBoard = (): MoodBoard | undefined => {
      if (activeMoodBoardId) {
          return moodBoards.find(b => b.id === activeMoodBoardId);
      }
      // Default to first board with Style DNA
      return moodBoards.find(b => b.styleDNA);
  };

  // ============================================
  // PRODUCER AGENT CONTEXT
  // ============================================

  // Undo function for Producer actions
  const undoScriptChange = () => {
      if (scriptHistory.length === 0) {
          showNotification("Nothing to undo");
          return;
      }

      const previousState = scriptHistory[scriptHistory.length - 1];
      setScriptHistory(prev => prev.slice(0, -1));
      setScriptData(previousState);

      if (currentProject) {
          db.saveScriptData(currentProject.id, previousState).catch(console.error);
      }

      showNotification("Undone last change");
  };

  const producerAppContext: ProducerAppContext = {
      scriptData,
      moodBoards,
      globalHistory,
      setScriptData: (data: ScriptData) => {
          // Push current state to history before updating
          if (scriptData) {
              setScriptHistory(prev => {
                  const newHistory = [...prev, scriptData];
                  // Keep only last N entries
                  if (newHistory.length > MAX_UNDO_HISTORY) {
                      return newHistory.slice(-MAX_UNDO_HISTORY);
                  }
                  return newHistory;
              });
          }

          setScriptData(data);

          // Also persist to DB
          if (currentProject) {
              db.saveScriptData(currentProject.id, data).catch(console.error);
          }
      },
      onGenerateBeat: handleGenerateBeat,
      onGenerateSequence: handleGenerateSequence,
      onCreateMoodBoard: handleCreateMoodBoard,
      showNotification
  };

  if (isLoadingProjects) {
      return (
          <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
      );
  }

  if (!currentProject) {
    return (
        <ProjectDashboard 
            projects={projects}
            onCreate={createProject}
            onSelect={setCurrentProject}
            onDelete={deleteProject}
        />
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 overflow-hidden font-sans relative text-white">
      <WelcomeGuide isOpen={showWelcomeGuide} onClose={closeWelcomeGuide} />

      {toast && (
          <div className="fixed bottom-8 right-8 z-[100] bg-zinc-800/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/5 animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-3 ring-1 ring-white/10">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
              <span className="font-medium text-sm tracking-wide">{toast.message}</span>
          </div>
      )}

      <StudioAssistant
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        currentStage={stage}
      />

      {/* New Agentic Producer Chat */}
      <ProducerChat
        appContext={producerAppContext}
        isOpen={showProducerChat}
        onClose={() => setShowProducerChat(false)}
      />

      <header className="h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 flex items-center px-8 justify-between shrink-0 z-30">
        <div className="flex items-center gap-6">
            <button onClick={() => setCurrentProject(null)} className="text-zinc-500 hover:text-white transition-colors" title="Back to Projects">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-white/5" />
            <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-1.5 rounded-xl shadow-lg shadow-violet-900/20">
                    <Palette className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-sm font-semibold text-white tracking-tight hidden sm:block">{currentProject.name}</h1>
                <button onClick={() => setShowWelcomeGuide(true)} className="ml-2 text-zinc-600 hover:text-zinc-400 transition-colors"><HelpCircle className="w-4 h-4" /></button>
            </div>

            {/* Collaboration Status */}
            <CollaborationPanel
                mode={collaboration.mode}
                projectId={collaboration.projectId}
                shareUrl={collaboration.shareUrl}
                syncStatus={collaboration.syncStatus}
                lastSyncedAt={collaboration.lastSyncedAt}
                lastEditedBy={collaboration.lastEditedBy}
                isOwner={collaboration.isOwner}
                error={collaboration.error}
                isFirebaseAvailable={collaboration.isFirebaseAvailable}
                onStartSharing={collaboration.startSharing}
                onStopSharing={collaboration.stopSharing}
                onSyncNow={collaboration.syncNow}
            />
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5 backdrop-blur-md absolute left-1/2 transform -translate-x-1/2 shadow-xl">
            <button onClick={() => setStage(AppStage.STAGE_0_SCRIPT)} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${stage === AppStage.STAGE_0_SCRIPT ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}>
                <FileText className="w-3.5 h-3.5" /> Script
            </button>
            <button onClick={() => setStage(AppStage.STAGE_1_CONCEPT)} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${stage === AppStage.STAGE_1_CONCEPT ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}>
                <Sparkles className="w-3.5 h-3.5" /> Concept
            </button>
            <button onClick={() => setStage(AppStage.STAGE_2_EDITING)} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${stage === AppStage.STAGE_2_EDITING ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}>
                <Layers className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={() => setStage(AppStage.STAGE_3_STORYBOARD)} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${stage === AppStage.STAGE_3_STORYBOARD ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}>
                <Film className="w-3.5 h-3.5" /> Board
            </button>
            <button onClick={() => setStage(AppStage.STAGE_4_VIDEO)} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${stage === AppStage.STAGE_4_VIDEO ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}>
                <Video className="w-3.5 h-3.5" /> Video
            </button>
        </div>

        <div className="flex items-center gap-3">
            <button onClick={() => setShowMoodBoardPanel(!showMoodBoardPanel)} className={`p-2.5 rounded-xl transition-colors border ${showMoodBoardPanel ? 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10'}`} title="Mood Boards">
                <ImageIcon className="w-5 h-5" />
            </button>
            <button onClick={() => setShowPipelineOverview(!showPipelineOverview)} className={`p-2.5 rounded-xl transition-colors border ${showPipelineOverview ? 'text-violet-400 bg-violet-500/10 border-violet-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10'}`} title="Pipeline Overview">
                <LayoutDashboard className="w-5 h-5" />
            </button>
            <button onClick={undoScriptChange} disabled={scriptHistory.length === 0} className={`p-2.5 rounded-xl transition-colors border ${scriptHistory.length > 0 ? 'text-amber-400 hover:bg-amber-500/10 border-amber-500/30' : 'text-zinc-600 border-transparent cursor-not-allowed'}`} title={`Undo (${scriptHistory.length} changes)`}>
                <Undo2 className="w-5 h-5" />
            </button>
            <button onClick={handleExportFCPXML} className="p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10" title="Export Final Cut Pro XML">
                <Film className="w-5 h-5" />
            </button>
            <button onClick={handleExportShotList} className="p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10" title="Export Shot List (CSV)">
                <FileSpreadsheet className="w-5 h-5" />
            </button>
            <button onClick={handleExportZip} disabled={isExporting} className="p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10" title="Download Project ZIP">
                {isExporting ? <Loader2 className="w-5 h-5 animate-spin"/> : <DownloadCloud className="w-5 h-5" />}
            </button>
            <button onClick={() => setShowProducerChat(!showProducerChat)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 shadow-lg ${showProducerChat ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-transparent' : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'}`}>
                <Sparkles className="w-4 h-4" /><span className="text-xs font-bold hidden md:inline">Producer AI</span>
            </button>
        </div>
      </header>

      {/* Pipeline Overview Panel */}
      {showPipelineOverview && (
          <div className="px-8 py-4 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl animate-in slide-in-from-top-2">
              <PipelineOverview
                  scriptData={scriptData}
                  globalHistory={globalHistory}
                  onNavigate={(stageNum) => {
                      const stageMap: AppStage[] = [
                          AppStage.STAGE_0_SCRIPT,
                          AppStage.STAGE_1_CONCEPT,
                          AppStage.STAGE_2_EDITING,
                          AppStage.STAGE_3_STORYBOARD,
                          AppStage.STAGE_4_VIDEO
                      ];
                      setStage(stageMap[stageNum] || AppStage.STAGE_0_SCRIPT);
                      setShowPipelineOverview(false);
                  }}
              />
          </div>
      )}

      <main className="flex-1 overflow-hidden relative flex">
        {isLoadingData && <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center"><Loader2 className="w-10 h-10 text-white animate-spin opacity-50" /></div>}

        {/* Mood Board Slide-Out Panel */}
        {showMoodBoardPanel && (
            <div className="w-80 h-full border-r border-white/5 bg-zinc-950 shrink-0 animate-in slide-in-from-left duration-200 z-20">
                <MoodBoardPanel
                    moodBoards={moodBoards}
                    globalHistory={globalHistory}
                    onCreateMoodBoard={handleCreateMoodBoard}
                    onDeleteMoodBoard={handleDeleteMoodBoard}
                    onAddImageToBoard={handleAddImageToBoard}
                    onRemoveImageFromBoard={handleRemoveImageFromBoard}
                    onUpdateImageNotes={handleUpdateImageNotes}
                    onExtractStyleDNA={handleExtractStyleDNA}
                    onAnalyzeImage={handleAnalyzeMoodBoardImage}
                />
            </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 relative">
        <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${stage === AppStage.STAGE_0_SCRIPT ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <ScriptStudio
                currentProject={currentProject}
                onUpdateScriptData={setScriptData}
                savedData={scriptData}
                showNotification={showNotification}
                onGenerateBeat={handleGenerateBeat}
                onGenerateSequence={handleGenerateSequence}
                onGenerateCharacterSheet={handleGenerateCharacterSheet}
                onGenerateExpressionBank={handleGenerateExpressionBank}
                onSyncStoryboard={handleSyncToStoryboard}
                incomingCharacter={incomingCharacter}
                moodBoards={moodBoards}
                onSaveVariantToHistory={(variant) => addToGlobalHistory(variant)}
                onGenerateCoverageImage={handleGenerateCoverageImage}
            />
        </div>

        <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${stage === AppStage.STAGE_1_CONCEPT ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <StageOne
                onImageSelect={handleImageSelect}
                showNotification={showNotification}
                onImageGenerated={(img) => addToGlobalHistory(img)}
                currentProject={currentProject}
                onLibraryUpdate={refreshLibrary}
                incomingPrompt={incomingBeatPrompt}
                onClearIncomingPrompt={() => setIncomingBeatPrompt(null)}
                onSendToScript={handleSendToScript}
                onSendToStoryboard={handleSendToStoryboard}
                bibleCharacters={scriptData?.characters || []}
                productionDesign={scriptData?.productionDesign}
            />
        </div>
        
        <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${stage === AppStage.STAGE_2_EDITING ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <StageTwo 
                initialImage={workingImage} 
                onBack={() => setStage(AppStage.STAGE_1_CONCEPT)}
                showNotification={showNotification}
                onImageEdited={(img) => addToGlobalHistory(img)}
                onAddToGallery={(img) => addToGlobalHistory(img)}
                currentProject={currentProject}
                onLibraryUpdate={refreshLibrary}
                productionDesign={scriptData?.productionDesign}
            />
        </div>

        <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${stage === AppStage.STAGE_3_STORYBOARD ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <StageThree 
                globalAssets={globalHistory}
                libraryAssets={libraryAssets}
                showNotification={showNotification}
                onImportAsset={(img) => addToGlobalHistory(img)}
                onRemoveAsset={removeFromGlobalHistory}
                currentProject={currentProject}
                onSendToVideo={handleSendToVideo}
                incomingBeats={incomingGhostBeats}
                onClearIncomingBeats={() => setIncomingGhostBeats(null)}
            />
        </div>

        <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${stage === AppStage.STAGE_4_VIDEO ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <StageFour
                currentProject={currentProject}
                showNotification={showNotification}
                initialStartFrame={videoStartFrame}
                initialEndFrame={videoEndFrame}
                initialPrompt={videoPrompt}
                projectImages={globalHistory}
                libraryAssets={libraryAssets}
            />
        </div>
        </div>{/* End Main Content Area */}
      </main>
    </div>
  );
};

export default App;
