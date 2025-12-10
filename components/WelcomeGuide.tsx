
import React, { useState, useEffect } from 'react';
import { X, Sparkles, Layers, Film, Video, ArrowRight, Lightbulb, MousePointerClick, Wand2, Zap, Star, Layout, Users, ScanEye, ChevronDown, ChevronUp, FileText, Box, PenTool, Palette, Check, Circle, Play, Download, Image as ImageIcon, BookOpen, Rocket, Eye, EyeOff } from 'lucide-react';

interface WelcomeGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

// Workflow steps for the visual pipeline
const WORKFLOW_STEPS = [
  { id: 'script', label: 'Script', icon: FileText, color: 'violet' },
  { id: 'bible', label: 'Bible', icon: Users, color: 'emerald' },
  { id: 'beats', label: 'Beats', icon: Film, color: 'blue' },
  { id: 'visualize', label: 'Visualize', icon: Sparkles, color: 'amber' },
  { id: 'export', label: 'Export', icon: Download, color: 'rose' },
];

// Quick start checklist items
const QUICK_START_ITEMS = [
  { id: 'script', label: 'Paste script or use Brain Dump Import', tip: 'Go to Script tab — paste screenplay OR dump unstructured ideas and let AI extract beats' },
  { id: 'characters', label: 'Build your Character Bible with references', tip: 'Upload Face/Full Body/3/4 refs, generate Turnaround Sheets and Expression Banks' },
  { id: 'lookbook', label: 'Configure Lookbook + Virtual Camera Rig', tip: 'Set visual style, analyze lighting refs, configure lens/aperture/color temp' },
  { id: 'beats', label: 'Expand beats to edit prompts and generate shot lists', tip: 'Click "Edit" on any beat to see full prompt, metadata, and AI-generated shot breakdown' },
  { id: 'visualize', label: 'Visualize or generate Sequences', tip: 'Single image or 2x2 cinematic grid — references auto-selected by shot type' },
];

// Detailed sections (collapsible)
const DETAILED_SECTIONS = [
  {
    id: 'script',
    title: 'Script Studio',
    icon: FileText,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
    description: 'The narrative foundation. Write or paste your script, then let AI break it down into visual beats with shot-by-shot breakdown.',
    features: [
      { icon: Wand2, title: 'Script Analysis + Brain Dump Import', text: 'Paste any screenplay format OR dump unstructured ideas. The AI extracts beats, characters, locations, and products automatically.' },
      { icon: Users, title: 'World Bible + Character Tools', text: 'Characters with categorized references (Face, Full Body, 3/4, Action), auto-generated Turnaround Sheets, and Expression Banks (6 emotions).' },
      { icon: Palette, title: 'Production Design + Virtual Camera Rig', text: 'Set visual styles, lighting analysis, and virtual camera settings (focal length, aperture, color temp) that inject into every prompt.' },
      { icon: Film, title: 'Beat → Shot Breakdown', text: 'Expand any beat to edit the full prompt, metadata, and AI-generate a detailed shot list with camera moves and durations.' }
    ]
  },
  {
    id: 'concept',
    title: 'Concept Generation',
    icon: Sparkles,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    description: 'The reasoning engine. Generate images with AI-powered prompt enhancement and smart reference selection.',
    features: [
      { icon: Zap, title: 'Power Tools', text: 'Specialized templates for Product Hero Shots, Blueprints, Character Sheets, and more.' },
      { icon: Wand2, title: 'Prompt Enhancer', text: 'Type "cool car" and the AI rewrites it into a studio-grade prompt with physics and lighting.' },
      { icon: Layers, title: 'Shot-Type Aware References', text: 'System automatically selects Face refs for close-ups, Full Body for wides, 3/4 for medium shots.' },
      { icon: Eye, title: 'Sequence Generator', text: 'Generate 2x2 cinematic sequence grids showing Wide → Medium → Close → Resolution flow.' }
    ]
  },
  {
    id: 'edit',
    title: 'Editing Canvas',
    icon: Layers,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    description: 'Precision control with in-painting and style matching.',
    features: [
      { icon: PenTool, title: 'Masking Brush', text: 'Paint over any object and type what you want. Only that area changes.' },
      { icon: Film, title: 'Shot Coverage', text: 'Instantly generate Close-ups, Wide shots, and drone angles of your canvas.' },
      { icon: MousePointerClick, title: 'Style Match', text: 'Drag a reference image to copy its lighting and vibe to your canvas.' }
    ]
  },
  {
    id: 'storyboard',
    title: 'Storyboard',
    icon: Film,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    description: 'Build your visual narrative with linked frames and AI transitions.',
    features: [
      { icon: Wand2, title: 'AI Transitions', text: 'Click between frames and let AI write the camera movement for you.' },
      { icon: Zap, title: 'Auto-Caption', text: 'AI writes script action based on image content.' },
      { icon: ArrowRight, title: 'Send to Video', text: 'One click sends your shot directly to Video Studio.' }
    ]
  },
  {
    id: 'video',
    title: 'Video Studio',
    icon: Video,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20',
    description: 'High-fidelity video generation with native audio.',
    features: [
      { icon: Lightbulb, title: 'Auto-End Frame', text: 'Pick start frame and camera move. AI builds the destination frame.' },
      { icon: Users, title: 'Character Ingredients', text: 'Drag character images to ensure consistent actor appearance.' },
      { icon: Wand2, title: 'Auto-Write Prompt', text: 'AI writes technical prompts with lighting and lens syntax.' }
    ]
  }
];

type ViewMode = 'hero' | 'quickstart' | 'details';

const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ isOpen, onClose }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('hero');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [showTipsInApp, setShowTipsInApp] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('showTipsInApp') !== 'false';
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem('showTipsInApp', showTipsInApp.toString());
  }, [showTipsInApp]);

  if (!isOpen) return null;

  const handleSkip = () => {
    onClose();
  };

  const handleQuickStart = () => {
    setViewMode('quickstart');
  };

  const renderHeroView = () => (
    <div className="flex flex-col items-center justify-center min-h-full py-12 px-8">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-2xl">
        {/* Logo/Icon */}
        <div className="mb-8 inline-flex items-center justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-900/50">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
              7.0
            </div>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
          Welcome to <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Design Agent</span>
        </h1>

        {/* Value prop */}
        <p className="text-xl text-zinc-400 mb-12 font-light">
          From script to screen in minutes.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <button
            onClick={handleQuickStart}
            className="group bg-white text-black px-8 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-zinc-100 transition-all hover:scale-105 shadow-2xl"
          >
            <Rocket className="w-5 h-5" />
            Quick Start
            <span className="text-zinc-500 text-sm font-normal">(2 min)</span>
          </button>
          <button
            onClick={handleSkip}
            className="group bg-zinc-800/50 text-zinc-300 px-8 py-4 rounded-2xl font-medium text-lg flex items-center justify-center gap-3 hover:bg-zinc-800 hover:text-white transition-all border border-white/10"
          >
            Skip — I know what I'm doing
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Visual workflow preview */}
        <div className="mb-8">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-6 font-medium">Your Creative Pipeline</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {WORKFLOW_STEPS.map((step, idx) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => {
                    setSelectedStep(step.id);
                    setViewMode('details');
                    setExpandedSection(DETAILED_SECTIONS.find(s => s.id === step.id)?.id || DETAILED_SECTIONS[0].id);
                  }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:bg-zinc-800/50 group cursor-pointer`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-${step.color}-500/20 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <step.icon className={`w-6 h-6 text-${step.color}-400`} />
                  </div>
                  <span className="text-xs text-zinc-400 font-medium group-hover:text-white transition-colors">{step.label}</span>
                </button>
                {idx < WORKFLOW_STEPS.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-zinc-700" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Show tips toggle */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setShowTipsInApp(!showTipsInApp)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              showTipsInApp
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700'
            }`}
          >
            {showTipsInApp ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Show tips in app
          </button>
        </div>
      </div>
    </div>
  );

  const renderQuickStartView = () => (
    <div className="flex flex-col min-h-full py-12 px-8">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Rocket className="w-4 h-4" />
            Quick Start Guide
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Get started in 4 steps</h2>
          <p className="text-zinc-400">Complete these to create your first visual</p>
        </div>

        {/* Checklist */}
        <div className="space-y-4 mb-10">
          {QUICK_START_ITEMS.map((item, idx) => (
            <div
              key={item.id}
              className="bg-zinc-800/30 border border-white/5 rounded-2xl p-5 hover:bg-zinc-800/50 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 font-bold text-sm shrink-0 group-hover:bg-violet-600 group-hover:text-white transition-all">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold mb-1">{item.label}</h4>
                  <p className="text-zinc-500 text-sm">{item.tip}</p>
                </div>
                <Circle className="w-5 h-5 text-zinc-600 shrink-0" />
              </div>
            </div>
          ))}
        </div>

        {/* Workflow visual */}
        <div className="bg-zinc-800/20 border border-white/5 rounded-2xl p-6 mb-10">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4 font-medium text-center">Visual Pipeline</p>
          <div className="flex items-center justify-between">
            {WORKFLOW_STEPS.map((step, idx) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-lg bg-${step.color}-500/20 flex items-center justify-center`}>
                    <step.icon className={`w-5 h-5 text-${step.color}-400`} />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium">{step.label}</span>
                </div>
                {idx < WORKFLOW_STEPS.length - 1 && (
                  <div className="flex-1 h-px bg-gradient-to-r from-zinc-700 to-zinc-700 mx-2" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => setViewMode('details')}
            className="bg-zinc-800 text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all border border-white/10"
          >
            <BookOpen className="w-4 h-4" />
            View Full Guide
          </button>
          <button
            onClick={onClose}
            className="bg-violet-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-violet-700 transition-all shadow-lg shadow-violet-900/30"
          >
            Start Creating
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderDetailsView = () => (
    <div className="flex min-h-full">
      {/* Sidebar */}
      <div className="w-72 bg-black/20 border-r border-white/5 flex flex-col p-6 shrink-0">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-1 tracking-tight">Design Agent <span className="text-violet-400">8.0</span><span className="ml-2 text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-medium">BETA</span></h2>
          <p className="text-zinc-500 text-xs font-medium">Complete Guide</p>
        </div>

        {/* Navigation */}
        <div className="space-y-1 flex-1">
          {DETAILED_SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                expandedSection === section.id
                  ? 'bg-zinc-800 text-white shadow-lg ring-1 ring-white/10'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              <section.icon className={`w-4 h-4 ${expandedSection === section.id ? section.color : ''}`} />
              <span className="font-medium text-sm flex-1">{section.title}</span>
              {expandedSection === section.id ? (
                <ChevronUp className="w-4 h-4 text-zinc-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              )}
            </button>
          ))}
        </div>

        {/* Pro tip */}
        <div className="pt-6 border-t border-white/5">
          <div className="bg-violet-900/10 border border-violet-500/20 p-4 rounded-xl">
            <h4 className="text-violet-300 font-bold text-xs flex items-center gap-2 mb-2">
              <Lightbulb className="w-3 h-3" /> Pro Tip
            </h4>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Use <b>"The Producer"</b> (bot icon in header) if you get stuck. It knows the entire manual.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {expandedSection ? (
            <>
              {DETAILED_SECTIONS.filter(s => s.id === expandedSection).map(section => (
                <div key={section.id} className="animate-in fade-in duration-300">
                  {/* Section header */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className={`p-4 rounded-2xl ${section.bgColor} ${section.borderColor} border`}>
                      <section.icon className={`w-8 h-8 ${section.color}`} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                      <p className="text-zinc-400 mt-1">{section.description}</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-4">
                    {section.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="bg-zinc-800/30 border border-white/5 p-5 rounded-2xl flex gap-4 hover:bg-zinc-800/50 transition-colors group"
                      >
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center group-hover:scale-110 transition-transform border border-white/5">
                          <feature.icon className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                        </div>
                        <div>
                          <h4 className="text-white font-semibold mb-1">{feature.title}</h4>
                          <p className="text-zinc-400 text-sm leading-relaxed">{feature.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-400 mb-2">Select a section</h3>
              <p className="text-zinc-600">Click any section in the sidebar to learn more</p>
            </div>
          )}

          {/* Bottom actions */}
          <div className="mt-12 flex justify-between items-center pt-8 border-t border-white/5">
            <button
              onClick={() => setViewMode('hero')}
              className="text-zinc-500 hover:text-white text-sm flex items-center gap-2 transition-colors"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              Back to Welcome
            </button>
            <button
              onClick={onClose}
              className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-violet-700 transition-all shadow-lg shadow-violet-900/30"
            >
              Enter Studio
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-500 hover:text-white z-20 transition-colors p-2 hover:bg-white/10 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Navigation tabs (only show when not on hero) */}
        {viewMode !== 'hero' && (
          <div className="absolute top-6 left-6 z-20 flex gap-2">
            <button
              onClick={() => setViewMode('hero')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'hero' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-white/10'
              }`}
            >
              Welcome
            </button>
            <button
              onClick={() => setViewMode('quickstart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'quickstart' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-white/10'
              }`}
            >
              Quick Start
            </button>
            <button
              onClick={() => setViewMode('details')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'details' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-white/10'
              }`}
            >
              Full Guide
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'hero' && renderHeroView()}
          {viewMode === 'quickstart' && renderQuickStartView()}
          {viewMode === 'details' && renderDetailsView()}
        </div>
      </div>
    </div>
  );
};

export default WelcomeGuide;
