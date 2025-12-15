
import React, { useState, useEffect, useCallback } from 'react';
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
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import DownloadModal from './components/DownloadModal';
import TutorialModal, { shouldShowTutorial } from './components/TutorialModal';
import ProductionJournal from './components/ProductionJournal';
import ErrorBoundary from './components/ErrorBoundary';
import AuthModal from './components/AuthModal';
import UserMenu from './components/UserMenu';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ProducerAppContext } from './services/producerAgent';
import { useCollaboration } from './hooks/useCollaboration';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AppStage, GeneratedImage, SavedEntity, Project, ScriptData, Beat, CharacterProfile, LocationProfile, ProductProfile, MoodBoard, MoodBoardImage, ReferenceAsset, ReferenceType, ProducerContext, ProjectTemplate } from './types';
import { Palette, Layers, Sparkles, Film, ArrowLeft, Bot, Loader2, Video, DownloadCloud, HelpCircle, FileText, FileSpreadsheet, LayoutDashboard, ImageIcon, Undo2, Keyboard, BookOpen } from 'lucide-react';
import { db } from './services/db';
import * as storage from './services/storage';
import { generateCharacterSheet, generateExpressionBank, generateImage } from './services/gemini';
import { generateThumbnail } from './services/imageUtils';
import { analyzeImage, extractStyleDNA, ensureThumbnail } from './services/moodBoardService';
import JSZip from 'jszip';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMsg {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

const App: React.FC = () => {
  // Auth state
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();

  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  
  const [stage, setStage] = useState<AppStage>(AppStage.STAGE_1_CONCEPT);
  const [workingImage, setWorkingImage] = useState<GeneratedImage | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Edit Queue System - prevent accidental overwrites
  const [editQueue, setEditQueue] = useState<GeneratedImage[]>([]);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);
  const [showEditQueueModal, setShowEditQueueModal] = useState(false);
  const [pendingEditImage, setPendingEditImage] = useState<GeneratedImage | null>(null);
  
  // Script Data State
  const [scriptData, setScriptData] = useState<ScriptData | undefined>(undefined);
  const [incomingBeatPrompt, setIncomingBeatPrompt] = useState<{prompt: string, refs: ReferenceAsset[], isSequence?: boolean, beatId?: string} | null>(null);
  const [incomingGhostBeats, setIncomingGhostBeats] = useState<Beat[] | null>(null);
  const [incomingCharacter, setIncomingCharacter] = useState<GeneratedImage | null>(null); // New state for back-porting

  const [videoStartFrame, setVideoStartFrame] = useState<GeneratedImage | null>(null);
  const [videoEndFrame, setVideoEndFrame] = useState<GeneratedImage | null>(null);
  const [videoPrompt, setVideoPrompt] = useState<string>('');

  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);
  const [showPipelineOverview, setShowPipelineOverview] = useState(false);

  // Mobile detection for responsive FAB
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768
  );

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [globalHistory, setGlobalHistory] = useState<GeneratedImage[]>([]);
  const [libraryAssets, setLibraryAssets] = useState<SavedEntity[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Mood Board State
  const [moodBoards, setMoodBoards] = useState<MoodBoard[]>([]);
  const [showMoodBoardPanel, setShowMoodBoardPanel] = useState(false);
  const [activeMoodBoardId, setActiveMoodBoardId] = useState<string | null>(null);

  // Producer Agent State
  const [showProducerChat, setShowProducerChat] = useState(false);

  // Keyboard Shortcuts Modal
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Download Modal
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Auth Modal
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Tutorial Modal
  const [showTutorialModal, setShowTutorialModal] = useState(false);

  // Production Journal Modal
  const [showJournalModal, setShowJournalModal] = useState(false);

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

  // Keyboard Shortcuts Hook
  useKeyboardShortcuts({
    setStage,
    toggleAssistant: useCallback(() => setIsAssistantOpen(prev => !prev), []),
    toggleMoodBoard: useCallback(() => setShowMoodBoardPanel(prev => !prev), []),
    onShowHelp: useCallback(() => setShowTutorialModal(true), []), // Show tutorial on ? key
  });

  // Load projects when auth state changes
  useEffect(() => {
    // Wait for auth to finish loading
    if (isAuthLoading) return;

    const loadProjects = async () => {
        setIsLoadingProjects(true);
        try {
            // Use hybrid storage - loads from Firestore if authenticated, IndexedDB if not
            const loaded = await storage.getProjects();
            setProjects(loaded.sort((a, b) => b.createdAt - a.createdAt));

            // Clear current project when auth state changes
            setCurrentProject(null);
        } catch (e) {
            console.error("Failed to load projects", e);
        } finally {
            setIsLoadingProjects(false);
        }
    };
    loadProjects();
  }, [isAuthLoading, isAuthenticated, user?.uid]);

  useEffect(() => {
    if (currentProject) {
      const loadData = async () => {
          setIsLoadingData(true);

          // CRITICAL: Clear ALL state before loading new project data
          // This prevents cross-contamination between projects
          setGlobalHistory([]);
          setLibraryAssets([]);
          setScriptData(undefined);
          setMoodBoards([]);
          setWorkingImage(null);
          setEditQueue([]);
          setHasUnsavedEdits(false);
          setVideoStartFrame(null);
          setVideoEndFrame(null);
          setVideoPrompt('');
          setIncomingBeatPrompt(null);
          setIncomingGhostBeats(null);
          setIncomingCharacter(null);
          setScriptHistory([]); // Clear undo history too

          try {
              const [history, library, savedScript, savedMoodBoards] = await Promise.all([
                  db.getHistory(currentProject.id),
                  db.getLibrary(currentProject.id),
                  db.getScriptData(currentProject.id),
                  db.getMoodBoards(currentProject.id)
              ]);
              setGlobalHistory(history);
              setLibraryAssets(library);
              // FIXED: Always set scriptData, even if null (for new projects)
              setScriptData(savedScript || undefined);
              setMoodBoards(savedMoodBoards);

          } catch (e) {
              console.error("Failed to load project data", e);
          } finally {
              setIsLoadingData(false);
          }
      };

      loadData();
      setStage(AppStage.STAGE_0_SCRIPT); // Start at Script Studio

      // Show tutorial on first visit (comprehensive guide)
      if (shouldShowTutorial()) {
          setShowTutorialModal(true);
      }
    }
  }, [currentProject]);

  const closeWelcomeGuide = () => {
      setShowWelcomeGuide(false);
      localStorage.setItem('hasSeenWelcomeGuideV4', 'true');
  };

  const createProject = async (name: string, template?: ProjectTemplate | null) => {
    // Use hybrid storage - saves to Firestore if authenticated, IndexedDB if not
    const newProject = await storage.createProject(name);
    setProjects(prev => [newProject, ...prev]);
    setCurrentProject(newProject);

    // If a template was selected, pre-populate the World Bible
    if (template && template.id !== 'template-blank') {
      // Pre-populate characters from template
      const templateCharacters: CharacterProfile[] = template.worldBible.suggestedCharacters.map((char, idx) => ({
        id: `template-char-${idx}-${Date.now()}`,
        name: char.name,
        description: char.description,
        imageRefs: [],
        promptSnippet: char.placeholder ? undefined : char.description,
        isLocked: false
      }));

      // Pre-populate locations from template
      const templateLocations: LocationProfile[] = template.worldBible.suggestedLocations.map((loc, idx) => ({
        id: `template-loc-${idx}-${Date.now()}`,
        name: loc.name,
        description: loc.description,
        imageRefs: [],
        promptSnippet: loc.placeholder ? undefined : loc.description
      }));

      // Pre-populate products from template
      const templateProducts: ProductProfile[] = template.worldBible.suggestedProducts.map((prod, idx) => ({
        id: `template-prod-${idx}-${Date.now()}`,
        name: prod.name,
        description: prod.description,
        imageRefs: [],
        promptSnippet: prod.placeholder ? undefined : prod.description
      }));

      // Save to database
      for (const char of templateCharacters) {
        await db.saveCharacter(newProject.id, char);
      }
      for (const loc of templateLocations) {
        await db.saveLocation(newProject.id, loc);
      }
      for (const prod of templateProducts) {
        await db.saveProduct(newProject.id, prod);
      }

      // Update local state (will be loaded when project data loads)
      showToast(`Project created with ${template.name} template!`, 'success');
    }
  };

  const deleteProject = async (id: string) => {
    if (confirm("Are you sure? This will delete all assets and history for this project.")) {
        // Use hybrid storage - deletes from both Firestore and IndexedDB
        await storage.deleteProject(id);
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

  const showNotification = (
      message: string,
      type: ToastType = 'info',
      options?: {
          duration?: number;
          action?: { label: string; onClick: () => void }
      }
  ) => {
      const id = crypto.randomUUID();
      const duration = options?.duration ?? (type === 'error' ? 6000 : type === 'warning' ? 4500 : 3000);
      setToast({ id, message, type, duration, action: options?.action });
      setTimeout(() => {
          setToast(prev => prev?.id === id ? null : prev);
      }, duration);
  };

  const dismissToast = () => setToast(null);

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
      const relevantRefs: ReferenceAsset[] = [];

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
      const relevantRefs: ReferenceAsset[] = [];

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

  // Coverage Pack Image Generation - uses reference images for consistency
  const handleGenerateCoverageImage = async (prompt: string, referenceImages?: string[], aspectRatio?: string): Promise<string> => {
      try {
          // Convert reference image URLs/base64 to ReferenceAsset format
          const references: ReferenceAsset[] = (referenceImages || []).slice(0, 3).map((img, idx) => ({
              id: `ref-${idx}`,
              data: img, // Can be URL or base64
              type: 'Character' as ReferenceType,
              name: `Reference ${idx + 1}`
          }));

          // Use 16:9 for locations (cinematic), 1:1 for characters/products
          const finalAspectRatio = aspectRatio || '16:9';

          console.log(`Generating coverage image with ${references.length} references, aspect ratio: ${finalAspectRatio}`);

          const result = await generateImage(prompt, references, {
              aspectRatio: finalAspectRatio as any,
              resolution: '1K'
          });
          return result.url;
      } catch (error) {
          console.error('Coverage image generation failed:', error);
          throw error;
      }
  };

  const handleImageSelect = (image: GeneratedImage) => {
    addToGlobalHistory(image);

    // If already in edit mode with unsaved changes, show queue modal
    if (stage === AppStage.STAGE_2_EDITING && hasUnsavedEdits) {
      setPendingEditImage(image);
      setShowEditQueueModal(true);
      return;
    }

    setWorkingImage(image);
    setHasUnsavedEdits(false); // Reset for new edit session
    setStage(AppStage.STAGE_2_EDITING);
  };

  // Edit Queue Modal Actions
  const handleQueueEdit = () => {
    if (pendingEditImage) {
      setEditQueue(prev => [...prev, pendingEditImage]);
      showNotification(`Added to edit queue (${editQueue.length + 1} pending)`);
    }
    setPendingEditImage(null);
    setShowEditQueueModal(false);
  };

  const handleSwitchEdit = () => {
    if (pendingEditImage) {
      setWorkingImage(pendingEditImage);
      setHasUnsavedEdits(false);
    }
    setPendingEditImage(null);
    setShowEditQueueModal(false);
  };

  const handleCancelQueueModal = () => {
    setPendingEditImage(null);
    setShowEditQueueModal(false);
  };

  // Process next item in edit queue
  const processNextInQueue = () => {
    if (editQueue.length > 0) {
      const [next, ...rest] = editQueue;
      setEditQueue(rest);
      setWorkingImage(next);
      setHasUnsavedEdits(false);
      showNotification(`Loading queued image (${rest.length} remaining)`);
    }
  };

  // Called when edits are made in StageTwo
  const markEditsUnsaved = () => {
    setHasUnsavedEdits(true);
  };

  // Called when user finishes with current edit (save/done)
  const markEditsDone = () => {
    setHasUnsavedEdits(false);
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
      showNotification("Preparing ZIP archive with sequential panel naming...");

      try {
          const zip = new JSZip();
          const folderName = currentProject.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const root = zip.folder(folderName);

          // Helper to sanitize filenames
          const sanitize = (str: string) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 30);

          // === STORYBOARD PANELS (Sequential Naming) ===
          // Creates: panels/001_beat_name.png, panels/002.1_start.png, panels/002.2_end.png
          const panelsFolder = root?.folder("panels");
          let panelCounter = 1;

          if (scriptData?.beats) {
            for (const beat of scriptData.beats) {
              // Get beat name for the filename prefix
              const beatName = beat.visualSummary
                ? sanitize(beat.visualSummary.slice(0, 20))
                : `beat_${panelCounter}`;

              // Check for generated images on this beat
              if (beat.generatedImageIds && beat.generatedImageIds.length > 0) {
                // Find the images for this beat
                for (let shotIdx = 0; shotIdx < beat.generatedImageIds.length; shotIdx++) {
                  const imgId = beat.generatedImageIds[shotIdx];
                  const img = globalHistory.find(h => h.id === imgId);
                  if (img) {
                    const base64Data = img.url.split(',')[1];
                    if (base64Data) {
                      // Format: 001_beatname.png or 001.1, 001.2 for multiple shots
                      const shotSuffix = beat.generatedImageIds.length > 1 ? `.${shotIdx + 1}` : '';
                      const paddedNum = String(panelCounter).padStart(3, '0');
                      panelsFolder?.file(`${paddedNum}${shotSuffix}_${beatName}.png`, base64Data, { base64: true });
                    }
                  }
                }
              }

              // Check for sequence grid (4-up coverage)
              if (beat.sequenceGrid) {
                const base64Data = beat.sequenceGrid.split(',')[1];
                if (base64Data) {
                  const paddedNum = String(panelCounter).padStart(3, '0');
                  panelsFolder?.file(`${paddedNum}_${beatName}_grid.png`, base64Data, { base64: true });
                }
              }

              panelCounter++;
            }
          }

          // === LINKED BEAT IMAGES (for start/end frame workflows) ===
          // Images linked to beats via linkedBeatId get proper naming
          const linkedImages = globalHistory.filter(img => img.linkedBeatId);
          const beatImageGroups = new Map<string, GeneratedImage[]>();

          linkedImages.forEach(img => {
            if (img.linkedBeatId) {
              const existing = beatImageGroups.get(img.linkedBeatId) || [];
              existing.push(img);
              beatImageGroups.set(img.linkedBeatId, existing);
            }
          });

          let linkedPanelCounter = 1;
          beatImageGroups.forEach((images, beatId) => {
            const beat = scriptData?.beats.find(b => b.id === beatId);
            const beatName = beat?.visualSummary
              ? sanitize(beat.visualSummary.slice(0, 20))
              : `linked_${linkedPanelCounter}`;

            images.forEach((img, frameIdx) => {
              const base64Data = img.url.split(',')[1];
              if (base64Data) {
                const paddedNum = String(linkedPanelCounter).padStart(3, '0');
                // .1 = start frame, .2 = end frame pattern
                const frameSuffix = images.length > 1 ? `.${frameIdx + 1}` : '';
                panelsFolder?.file(`${paddedNum}${frameSuffix}_${beatName}_linked.png`, base64Data, { base64: true });
              }
            });
            linkedPanelCounter++;
          });

          // === ALL GENERATIONS (legacy folder for non-beat images) ===
          const historyFolder = root?.folder("generations");
          globalHistory.forEach((img, idx) => {
              // Skip images already exported as panels
              if (img.linkedBeatId) return;

              const base64Data = img.url.split(',')[1];
              if(base64Data) {
                  const paddedIdx = String(idx + 1).padStart(3, '0');
                  const promptSlug = sanitize(img.prompt.slice(0, 20));
                  historyFolder?.file(`${paddedIdx}_${promptSlug}.png`, base64Data, { base64: true });
              }
          });

          // === LIBRARY ASSETS ===
          const libraryFolder = root?.folder("library");
          libraryAssets.forEach((asset, idx) => {
              const base64Data = asset.data.split(',')[1];
              if(base64Data) {
                  const paddedIdx = String(idx + 1).padStart(3, '0');
                  libraryFolder?.file(`${paddedIdx}_${asset.type}_${sanitize(asset.name)}.png`, base64Data, { base64: true });
              }
          });

          // === CHARACTER SHEETS ===
          if (scriptData?.characters && scriptData.characters.length > 0) {
            const charactersFolder = root?.folder("characters");
            scriptData.characters.forEach((char, idx) => {
              if (char.characterSheet) {
                const base64Data = char.characterSheet.split(',')[1];
                if (base64Data) {
                  const paddedIdx = String(idx + 1).padStart(2, '0');
                  charactersFolder?.file(`${paddedIdx}_${sanitize(char.name)}_sheet.png`, base64Data, { base64: true });
                }
              }
              // Also export expression banks
              if (char.expressionBank?.grid) {
                const base64Data = char.expressionBank.grid.split(',')[1];
                if (base64Data) {
                  const paddedIdx = String(idx + 1).padStart(2, '0');
                  charactersFolder?.file(`${paddedIdx}_${sanitize(char.name)}_expressions.png`, base64Data, { base64: true });
                }
              }
            });
          }

          // === LOCATION PLATES ===
          if (scriptData?.locations && scriptData.locations.length > 0) {
            const locationsFolder = root?.folder("locations");
            scriptData.locations.forEach((loc, idx) => {
              if (loc.anchorImage) {
                const base64Data = loc.anchorImage.split(',')[1];
                if (base64Data) {
                  const paddedIdx = String(idx + 1).padStart(2, '0');
                  locationsFolder?.file(`${paddedIdx}_${sanitize(loc.name || 'location')}_plate.png`, base64Data, { base64: true });
                }
              }
            });
          }

          // === SCRIPT DATA (JSON) ===
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

          showNotification(`Project exported! Panels numbered sequentially (${panelCounter - 1} beats)`);

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

  // Build comprehensive context for the AI Producer
  const studioAssistantContext: ProducerContext = {
      currentStage: stage,
      selectedImageId: workingImage?.id,

      // Script & Narrative
      script: scriptData ? {
          content: scriptData.content || '',
          beatCount: scriptData.beats?.length || 0,
          beats: (scriptData.beats || []).map(b => ({
              id: b.id,
              visualSummary: b.visualSummary,
              characters: b.characters || [],
              locations: b.locations || [],
              products: b.products || [],
              status: b.status,
              hasGeneratedImages: (b.generatedImageIds?.length || 0) > 0
          }))
      } : undefined,

      // World Bible Assets
      worldBible: {
          characters: (scriptData?.characters || []).map(c => ({
              name: c.name,
              hasPromptSnippet: !!c.promptSnippet,
              hasCharacterSheet: !!c.characterSheet,
              hasExpressionBank: !!(c.expressionBank?.grid),
              imageRefCount: c.imageRefs?.length || 0,
              isLocked: !!c.isLocked
          })),
          locations: (scriptData?.locations || []).map(l => ({
              name: l.name,
              hasPromptSnippet: !!l.promptSnippet,
              hasAnchorImage: !!l.anchorImage,
              imageRefCount: l.imageRefs?.length || 0
          })),
          products: (scriptData?.products || []).map(p => ({
              name: p.name,
              hasPromptSnippet: !!p.promptSnippet,
              imageRefCount: p.imageRefs?.length || 0
          }))
      },

      // Production Design
      productionDesign: {
          hasLookbook: !!scriptData?.lookbook,
          visualStyle: scriptData?.productionDesign?.visualStyle,
          colorPalette: scriptData?.productionDesign?.colorPalette,
          hasLightingRef: !!scriptData?.productionDesign?.lightingRef,
          hasCameraRig: !!scriptData?.productionDesign?.cameraRig
      },

      // Generation History
      generationHistory: {
          totalImages: globalHistory.length,
          recentGenerations: globalHistory.slice(-10).map(img => ({
              prompt: img.prompt,
              timestamp: img.generationContext?.timestamp || 0,
              hadReferences: (img.generationContext?.referenceIds?.length || 0) > 0,
              aspectRatio: img.aspectRatio
          })),
          failedGenerations: 0 // Could track this if needed
      },

      // Storyboard Status (from moodBoards/frames if available)
      storyboard: {
          frameCount: 0, // Would need storyboard frames state
          completedFrames: 0,
          hasStartEndPairs: 0
      },

      // Contact Sheet
      contactSheet: {
          imageCount: globalHistory.length,
          referenceImageCount: libraryAssets.length
      }
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
      <KeyboardShortcutsModal isOpen={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} />
      <TutorialModal isOpen={showTutorialModal} onClose={() => setShowTutorialModal(false)} />
      <ProductionJournal isOpen={showJournalModal} onClose={() => setShowJournalModal(false)} projectId={currentProject?.id || ''} />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <DownloadModal
          isOpen={showDownloadModal}
          onClose={() => setShowDownloadModal(false)}
          projectName={currentProject.name}
          globalHistory={globalHistory}
          libraryAssets={libraryAssets}
          scriptData={scriptData}
          showNotification={showNotification}
      />

      {toast && (
          <div className={`fixed bottom-8 right-8 z-[100] backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-3 max-w-md ${
              toast.type === 'error' ? 'bg-red-900/90 border-red-500/30 ring-1 ring-red-500/20' :
              toast.type === 'success' ? 'bg-emerald-900/90 border-emerald-500/30 ring-1 ring-emerald-500/20' :
              toast.type === 'warning' ? 'bg-amber-900/90 border-amber-500/30 ring-1 ring-amber-500/20' :
              'bg-zinc-800/90 border-white/5 ring-1 ring-white/10'
          }`}>
              {/* Icon based on type */}
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                  toast.type === 'error' ? 'bg-red-500' :
                  toast.type === 'success' ? 'bg-emerald-500' :
                  toast.type === 'warning' ? 'bg-amber-500 animate-pulse' :
                  'bg-violet-500 animate-pulse'
              }`} />
              <span className="font-medium text-sm tracking-wide flex-1">{toast.message}</span>
              {/* Action button if provided */}
              {toast.action && (
                  <button
                      onClick={() => { toast.action?.onClick(); dismissToast(); }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                          toast.type === 'error' ? 'bg-red-500/20 hover:bg-red-500/40 text-red-200' :
                          toast.type === 'success' ? 'bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-200' :
                          toast.type === 'warning' ? 'bg-amber-500/20 hover:bg-amber-500/40 text-amber-200' :
                          'bg-white/10 hover:bg-white/20'
                      }`}
                  >
                      {toast.action.label}
                  </button>
              )}
              {/* Dismiss button */}
              <button onClick={dismissToast} className="text-white/50 hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
              </button>
          </div>
      )}

      {/* Mobile Floating Action Button for The Producer */}
      {isMobileView && !isAssistantOpen && (
        <button
          onClick={() => setIsAssistantOpen(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-full shadow-2xl shadow-violet-900/50 flex items-center justify-center z-40 transition-all active:scale-95 animate-in fade-in slide-in-from-bottom-4 duration-300"
          title="Open The Producer"
        >
          <Bot className="w-6 h-6 text-white" />
        </button>
      )}

      <StudioAssistant
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        currentStage={stage}
        projectContext={studioAssistantContext}
      />

      {/* New Agentic Producer Chat */}
      <ProducerChat
        appContext={producerAppContext}
        isOpen={showProducerChat}
        onClose={() => setShowProducerChat(false)}
      />

      <header className="h-14 md:h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 flex items-center px-3 md:px-8 justify-between shrink-0 z-30">
        <div className="flex items-center gap-2 md:gap-6">
            <button onClick={() => setCurrentProject(null)} className="p-2 text-zinc-500 hover:text-white transition-colors" title="Back to Projects">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-white/5 hidden md:block" />
            <div className="flex items-center gap-2 md:gap-3">
                <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-1.5 rounded-xl shadow-lg shadow-violet-900/20">
                    <Palette className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-sm font-semibold text-white tracking-tight hidden md:block max-w-[120px] truncate">{currentProject.name}</h1>
                <button onClick={() => setShowJournalModal(true)} className="p-2 text-zinc-600 hover:text-violet-400 transition-colors" title="Production Journal"><BookOpen className="w-4 h-4" /></button>
                <button onClick={() => setShowTutorialModal(true)} className="p-2 text-zinc-600 hover:text-violet-400 transition-colors hidden sm:flex" title="Help & Tutorial (?)"><HelpCircle className="w-4 h-4" /></button>
            </div>

            {/* Collaboration Status - hidden on mobile */}
            <div className="hidden lg:block">
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
        </div>

        {/* Navigation Tabs - responsive */}
        <div className="flex bg-zinc-900/50 p-0.5 md:p-1 rounded-lg md:rounded-xl border border-white/5 backdrop-blur-md absolute left-1/2 transform -translate-x-1/2 shadow-xl">
            <button onClick={() => setStage(AppStage.STAGE_0_SCRIPT)} className={`flex items-center gap-1 md:gap-2 px-2 md:px-5 py-1.5 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs font-semibold transition-all duration-300 ${stage === AppStage.STAGE_0_SCRIPT ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}>
                <FileText className="w-3 md:w-3.5 h-3 md:h-3.5" /> <span className="hidden sm:inline">Script</span>
            </button>
            <button onClick={() => setStage(AppStage.STAGE_1_CONCEPT)} className={`flex items-center gap-1 md:gap-2 px-2 md:px-5 py-1.5 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs font-semibold transition-all duration-300 ${stage === AppStage.STAGE_1_CONCEPT ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}>
                <Sparkles className="w-3 md:w-3.5 h-3 md:h-3.5" /> <span className="hidden sm:inline">Concept</span>
            </button>
            <button onClick={() => setStage(AppStage.STAGE_2_EDITING)} className={`flex items-center gap-1 md:gap-2 px-2 md:px-5 py-1.5 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs font-semibold transition-all duration-300 ${stage === AppStage.STAGE_2_EDITING ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}>
                <Layers className="w-3 md:w-3.5 h-3 md:h-3.5" /> <span className="hidden sm:inline">Edit</span>
            </button>
            <button onClick={() => setStage(AppStage.STAGE_3_STORYBOARD)} className={`flex items-center gap-1 md:gap-2 px-2 md:px-5 py-1.5 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs font-semibold transition-all duration-300 ${stage === AppStage.STAGE_3_STORYBOARD ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}>
                <Film className="w-3 md:w-3.5 h-3 md:h-3.5" /> <span className="hidden sm:inline">Board</span>
            </button>
            <button onClick={() => setStage(AppStage.STAGE_4_VIDEO)} className={`flex items-center gap-1 md:gap-2 px-2 md:px-5 py-1.5 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs font-semibold transition-all duration-300 ${stage === AppStage.STAGE_4_VIDEO ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}>
                <Video className="w-3 md:w-3.5 h-3 md:h-3.5" /> <span className="hidden sm:inline">Video</span>
            </button>
        </div>

        <div className="flex items-center gap-1 md:gap-3">
            <button onClick={() => setShowMoodBoardPanel(!showMoodBoardPanel)} className={`p-2 md:p-2.5 rounded-xl transition-colors border ${showMoodBoardPanel ? 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10'}`} title="Mood Boards">
                <ImageIcon className="w-4 md:w-5 h-4 md:h-5" />
            </button>
            <button onClick={() => setShowPipelineOverview(!showPipelineOverview)} className={`p-2 md:p-2.5 rounded-xl transition-colors border hidden sm:flex ${showPipelineOverview ? 'text-violet-400 bg-violet-500/10 border-violet-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10'}`} title="Pipeline Overview">
                <LayoutDashboard className="w-4 md:w-5 h-4 md:h-5" />
            </button>
            <button onClick={undoScriptChange} disabled={scriptHistory.length === 0} className={`p-2 md:p-2.5 rounded-xl transition-colors border hidden md:flex ${scriptHistory.length > 0 ? 'text-amber-400 hover:bg-amber-500/10 border-amber-500/30' : 'text-zinc-600 border-transparent cursor-not-allowed'}`} title={`Undo (${scriptHistory.length} changes)`}>
                <Undo2 className="w-4 md:w-5 h-4 md:h-5" />
            </button>
            <button onClick={handleExportFCPXML} className="p-2 md:p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 hidden lg:flex" title="Export Final Cut Pro XML">
                <Film className="w-4 md:w-5 h-4 md:h-5" />
            </button>
            <button onClick={handleExportShotList} className="p-2 md:p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 hidden lg:flex" title="Export Shot List (CSV)">
                <FileSpreadsheet className="w-4 md:w-5 h-4 md:h-5" />
            </button>
            <button onClick={() => setShowDownloadModal(true)} disabled={isExporting} className="p-2 md:p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10" title="Download Project ZIP">
                {isExporting ? <Loader2 className="w-5 h-5 animate-spin"/> : <DownloadCloud className="w-5 h-5" />}
            </button>
            <button onClick={() => setShowShortcutsModal(true)} className="p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10" title="Keyboard Shortcuts (?)">
                <Keyboard className="w-5 h-5" />
            </button>
            <button onClick={() => setShowProducerChat(!showProducerChat)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 shadow-lg ${showProducerChat ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-transparent' : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'}`}>
                <Sparkles className="w-4 h-4" /><span className="text-xs font-bold hidden md:inline">Producer AI</span>
            </button>
            <div className="h-6 w-px bg-white/10 mx-1" />
            <UserMenu onSignInClick={() => setShowAuthModal(true)} />
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
            <ErrorBoundary componentName="Script Studio" onError={(e) => console.error('Script Studio error:', e)}>
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
            </ErrorBoundary>
        </div>

        <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${stage === AppStage.STAGE_1_CONCEPT ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <ErrorBoundary componentName="Concept Generator" onError={(e) => console.error('Concept Generator error:', e)}>
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
                  bibleLocations={scriptData?.locations || []}
                  bibleProducts={scriptData?.products || []}
                  productionDesign={scriptData?.productionDesign}
              />
            </ErrorBoundary>
        </div>
        
        <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${stage === AppStage.STAGE_2_EDITING ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <ErrorBoundary componentName="Image Editor" onError={(e) => console.error('Image Editor error:', e)}>
              <StageTwo
                  initialImage={workingImage}
                  onBack={() => {
                      setStage(AppStage.STAGE_1_CONCEPT);
                      markEditsDone();
                  }}
                  showNotification={showNotification}
                  onImageEdited={(img) => {
                      addToGlobalHistory(img);
                      markEditsUnsaved();
                  }}
                  onAddToGallery={(img) => addToGlobalHistory(img)}
                  currentProject={currentProject}
                  onLibraryUpdate={refreshLibrary}
                  productionDesign={scriptData?.productionDesign}
                  bibleCharacters={scriptData?.characters || []}
                  bibleLocations={scriptData?.locations || []}
                  bibleProducts={scriptData?.products || []}
                  editQueue={editQueue}
                  onProcessQueue={processNextInQueue}
              />
            </ErrorBoundary>
        </div>

        <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${stage === AppStage.STAGE_3_STORYBOARD ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <ErrorBoundary componentName="Storyboard" onError={(e) => console.error('Storyboard error:', e)}>
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
            </ErrorBoundary>
        </div>

        <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${stage === AppStage.STAGE_4_VIDEO ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <ErrorBoundary componentName="Video Generator" onError={(e) => console.error('Video Generator error:', e)}>
              <StageFour
                  currentProject={currentProject}
                  showNotification={showNotification}
                  initialStartFrame={videoStartFrame}
                  initialEndFrame={videoEndFrame}
                  initialPrompt={videoPrompt}
                  projectImages={globalHistory}
                  libraryAssets={libraryAssets}
              />
            </ErrorBoundary>
        </div>
        </div>{/* End Main Content Area */}

        {/* Edit Queue Confirmation Modal */}
        {showEditQueueModal && pendingEditImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-zinc-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  Edit in Progress
                </h3>
                <p className="text-sm text-zinc-400 mt-1">
                  You have unsaved edits. What would you like to do?
                </p>
              </div>

              {/* Pending Image Preview */}
              <div className="p-4 bg-zinc-950/50">
                <div className="flex items-center gap-4">
                  <img
                    src={pendingEditImage.url}
                    alt="Pending edit"
                    className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-500 uppercase tracking-wide">New Image</p>
                    <p className="text-sm text-zinc-300 truncate">{pendingEditImage.prompt}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 space-y-3">
                <button
                  onClick={handleQueueEdit}
                  className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Layers className="w-4 h-4" />
                  Add to Queue ({editQueue.length + 1} pending)
                </button>
                <button
                  onClick={handleSwitchEdit}
                  className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Switch Now (Discard Current)
                </button>
                <button
                  onClick={handleCancelQueueModal}
                  className="w-full py-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Wrap App with AuthProvider
const AppWithAuth: React.FC = () => (
  <AuthProvider>
    <App />
  </AuthProvider>
);

export default AppWithAuth;
