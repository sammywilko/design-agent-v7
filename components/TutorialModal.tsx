import React, { useState, useEffect } from 'react';
import {
  X, BookOpen, Clapperboard, Palette, Pencil, Layout, Film,
  Users, MapPin, Package, Camera, Lightbulb, Keyboard,
  DollarSign, AlertCircle, Workflow, ChevronRight, ChevronLeft,
  CheckCircle, Sparkles, Lock, AtSign, Image, Wand2, Layers,
  Grid, MessageSquare, Zap, RotateCw, Sun, Target, HelpCircle
} from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: number;
}

const SECTIONS = [
  { id: 'welcome', label: 'Welcome', icon: BookOpen },
  { id: 'workflow', label: 'Workflow', icon: Workflow },
  { id: 'bible', label: 'World Bible', icon: Users },
  { id: 'contact', label: 'Contact Sheet', icon: Grid },
  { id: 'edit', label: 'Edit Canvas', icon: Pencil },
  { id: 'generation', label: 'Best Practices', icon: Sparkles },
  { id: 'shortcuts', label: 'Tips & Shortcuts', icon: Keyboard },
  { id: 'workflows', label: 'Common Workflows', icon: Clapperboard },
  { id: 'troubleshoot', label: 'Troubleshooting', icon: AlertCircle },
  { id: 'cost', label: 'Cost Optimization', icon: DollarSign },
];

const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose, initialSection = 0 }) => {
  const [activeSection, setActiveSection] = useState(initialSection);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveSection(initialSection);
    }
  }, [isOpen, initialSection]);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('design-agent-tutorial-dismissed', 'true');
    }
    onClose();
  };

  const nextSection = () => {
    if (activeSection < SECTIONS.length - 1) {
      setActiveSection(activeSection + 1);
    }
  };

  const prevSection = () => {
    if (activeSection > 0) {
      setActiveSection(activeSection - 1);
    }
  };

  if (!isOpen) return null;

  const renderContent = () => {
    switch (SECTIONS[activeSection].id) {
      case 'welcome':
        return <WelcomeSection />;
      case 'workflow':
        return <WorkflowSection />;
      case 'bible':
        return <BibleSection />;
      case 'contact':
        return <ContactSheetSection />;
      case 'edit':
        return <EditCanvasSection />;
      case 'generation':
        return <GenerationSection />;
      case 'shortcuts':
        return <ShortcutsSection />;
      case 'workflows':
        return <CommonWorkflowsSection />;
      case 'troubleshoot':
        return <TroubleshootSection />;
      case 'cost':
        return <CostSection />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-600 rounded-xl">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Design Agent 8.0 Guide</h2>
              <p className="text-xs text-zinc-500">Professional AI Video Production</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-56 border-r border-zinc-800 p-3 overflow-y-auto shrink-0 bg-zinc-950/50">
            <nav className="space-y-1">
              {SECTIONS.map((section, idx) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(idx)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeSection === idx
                        ? 'bg-violet-600 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 shrink-0 bg-zinc-950/50">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-xs text-zinc-500">Don't show on startup</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={prevSection}
              disabled={activeSection === 0}
              className="flex items-center gap-1 px-4 py-2 text-sm text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={nextSection}
              disabled={activeSection === SECTIONS.length - 1}
              className="flex items-center gap-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// SECTION COMPONENTS
// ═══════════════════════════════════════════════════════════

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
  <div className="flex items-start gap-4 mb-6">
    <div className="p-3 bg-violet-600/20 rounded-xl text-violet-400">
      {icon}
    </div>
    <div>
      <h3 className="text-xl font-bold text-white">{title}</h3>
      {subtitle && <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>}
    </div>
  </div>
);

const TipCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; color?: string }> = ({
  icon, title, children, color = 'violet'
}) => (
  <div className={`bg-${color}-500/10 border border-${color}-500/20 rounded-xl p-4`}>
    <div className="flex items-center gap-2 mb-2">
      <span className={`text-${color}-400`}>{icon}</span>
      <span className={`text-sm font-bold text-${color}-300`}>{title}</span>
    </div>
    <div className="text-sm text-zinc-300">{children}</div>
  </div>
);

const StageCard: React.FC<{ stage: string; title: string; description: string; icon: React.ReactNode }> = ({
  stage, title, description, icon
}) => (
  <div className="flex items-start gap-3 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
    <div className="p-2 bg-violet-600/20 rounded-lg text-violet-400 shrink-0">
      {icon}
    </div>
    <div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-violet-400 font-bold">{stage}</span>
        <span className="text-sm font-bold text-white">{title}</span>
      </div>
      <p className="text-xs text-zinc-400 mt-1">{description}</p>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
// WELCOME SECTION
// ═══════════════════════════════════════════════════════════

const WelcomeSection: React.FC = () => (
  <div className="space-y-6">
    <SectionTitle
      icon={<BookOpen className="w-6 h-6" />}
      title="Welcome to Design Agent 8.0"
      subtitle="Professional AI Video Production Pipeline"
    />

    <div className="bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/30 rounded-xl p-6">
      <p className="text-zinc-300 leading-relaxed">
        Design Agent is a <strong className="text-white">5-stage production pipeline</strong> that transforms scripts
        into professional video storyboards. Whether you're creating commercials, films, or marketing content,
        Design Agent provides the tools to visualize your creative vision with AI-powered consistency.
      </p>
    </div>

    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">The 5 Stages</h4>

    <div className="grid gap-3">
      <StageCard
        stage="Stage 0"
        title="Script Studio"
        description="Analyze and break down your script into beats with character, location, and product extraction"
        icon={<Clapperboard className="w-5 h-5" />}
      />
      <StageCard
        stage="Stage 1"
        title="Concept Generation"
        description="Create visual concepts, characters, and key moments with AI image generation"
        icon={<Palette className="w-5 h-5" />}
      />
      <StageCard
        stage="Stage 2"
        title="Edit Canvas"
        description="Refine and perfect your images with AI editing, masking, and style controls"
        icon={<Pencil className="w-5 h-5" />}
      />
      <StageCard
        stage="Stage 3"
        title="Storyboard"
        description="Assemble your final shot sequence with drag-and-drop organization"
        icon={<Layout className="w-5 h-5" />}
      />
      <StageCard
        stage="Stage 4"
        title="Video Studio"
        description="Generate video from your storyboard frames with AI video synthesis"
        icon={<Film className="w-5 h-5" />}
      />
    </div>

    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-bold text-amber-300">Pro Tip</span>
      </div>
      <p className="text-sm text-zinc-300">
        The key to great results is <strong className="text-white">building your World Bible first</strong>.
        Characters, locations, and products added to the Bible maintain consistency across all your generations.
      </p>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
// WORKFLOW SECTION
// ═══════════════════════════════════════════════════════════

const WorkflowSection: React.FC = () => (
  <div className="space-y-6">
    <SectionTitle
      icon={<Workflow className="w-6 h-6" />}
      title="Recommended Workflow"
      subtitle="Two approaches depending on your starting point"
    />

    <div className="grid md:grid-cols-2 gap-4">
      {/* Script-Based Workflow */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clapperboard className="w-5 h-5 text-violet-400" />
          <h4 className="text-sm font-bold text-white">Script-Based Projects</h4>
        </div>
        <ol className="space-y-3 text-sm">
          {[
            'Script Studio → Upload script → Get beat breakdown',
            'World Bible → Add characters, locations, products',
            'Concept Generation → Create key moments',
            'Contact Sheet → Generate coverage for each beat',
            'Edit Canvas → Refine selected shots',
            'Storyboard → Assemble final sequence',
          ].map((step, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-violet-600/20 text-violet-400 text-xs font-bold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <span className="text-zinc-300">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Concept-First Workflow */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-emerald-400" />
          <h4 className="text-sm font-bold text-white">Concept-First Projects</h4>
        </div>
        <ol className="space-y-3 text-sm">
          {[
            'Concept Generation → Create hero shot',
            'Add to World Bible → Extract characters/elements',
            'Contact Sheet → Generate variations and coverage',
            'Edit Canvas → Polish selected shots',
            'Storyboard → Build sequence',
          ].map((step, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-600/20 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <span className="text-zinc-300">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>

    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-bold text-blue-300">Key Principle</span>
      </div>
      <p className="text-sm text-zinc-300">
        <strong className="text-white">Build your World Bible early.</strong> The more reference images and character
        descriptions you add, the more consistent your generations will be across the entire project.
      </p>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
// WORLD BIBLE SECTION
// ═══════════════════════════════════════════════════════════

const BibleSection: React.FC = () => (
  <div className="space-y-6">
    <SectionTitle
      icon={<Users className="w-6 h-6" />}
      title="World Bible - Your Asset Library"
      subtitle="Central repository for visual consistency"
    />

    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5">
      <h4 className="text-sm font-bold text-white mb-3">What is World Bible?</h4>
      <p className="text-sm text-zinc-300">
        Your central repository for <strong className="text-emerald-400">characters</strong>,
        <strong className="text-blue-400"> locations</strong>, and
        <strong className="text-amber-400"> products</strong>.
        Once added to the Bible, these entities can be referenced in any generation to maintain visual consistency.
      </p>
    </div>

    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Best Practices</h4>

    <div className="grid gap-3">
      {[
        { icon: <CheckCircle className="w-4 h-4" />, text: 'Add characters FIRST before generating scenes', color: 'emerald' },
        { icon: <Image className="w-4 h-4" />, text: 'Use Photo→Character for real people/products', color: 'blue' },
        { icon: <AtSign className="w-4 h-4" />, text: '@mention entities in prompts (e.g., "@John walks into @CoffeeShop")', color: 'violet' },
        { icon: <Lock className="w-4 h-4" />, text: 'Lock entities in Contact Sheet for guaranteed consistency', color: 'amber' },
        { icon: <Sparkles className="w-4 h-4" />, text: 'Build your Bible early - it\'s your visual DNA', color: 'pink' },
      ].map((item, idx) => (
        <div key={idx} className={`flex items-center gap-3 p-3 bg-${item.color}-500/10 border border-${item.color}-500/20 rounded-lg`}>
          <span className={`text-${item.color}-400`}>{item.icon}</span>
          <span className="text-sm text-zinc-300">{item.text}</span>
        </div>
      ))}
    </div>

    <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-bold text-violet-300">14-Slot Reference System</span>
      </div>
      <p className="text-sm text-zinc-300">
        World Bible can hold up to <strong className="text-white">14 reference images</strong> simultaneously.
        Use them! More references = better consistency across your generations.
      </p>
    </div>

    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Entity Types</h4>

    <div className="grid grid-cols-3 gap-3">
      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
        <Users className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
        <span className="text-sm font-bold text-emerald-300">Characters</span>
        <p className="text-xs text-zinc-500 mt-1">People, animals, creatures</p>
      </div>
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center">
        <MapPin className="w-8 h-8 text-blue-400 mx-auto mb-2" />
        <span className="text-sm font-bold text-blue-300">Locations</span>
        <p className="text-xs text-zinc-500 mt-1">Places, environments, sets</p>
      </div>
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
        <Package className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <span className="text-sm font-bold text-amber-300">Products</span>
        <p className="text-xs text-zinc-500 mt-1">Objects, props, items</p>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
// CONTACT SHEET SECTION
// ═══════════════════════════════════════════════════════════

const ContactSheetSection: React.FC = () => (
  <div className="space-y-6">
    <SectionTitle
      icon={<Grid className="w-6 h-6" />}
      title="Contact Sheet - Professional Coverage"
      subtitle="Generate complete cinematographic shot coverage"
    />

    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5">
      <h4 className="text-sm font-bold text-white mb-3">What is Contact Sheet?</h4>
      <p className="text-sm text-zinc-300">
        Generate professional cinematographic coverage with specialized shot packs. Perfect for
        creating consistent scene coverage, character turnarounds, or product visualizations.
      </p>
    </div>

    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Coverage Packs</h4>

    <div className="grid grid-cols-2 gap-3">
      {[
        { icon: <Camera className="w-5 h-5" />, label: 'Cinematic 9-Shot', count: '9', desc: 'Complete scene coverage', color: 'violet' },
        { icon: <Grid className="w-5 h-5" />, label: '12-Shot Grid', count: '12', desc: 'Extended coverage options', color: 'blue' },
        { icon: <MessageSquare className="w-5 h-5" />, label: 'Dialogue Pack', count: '5', desc: 'Conversation coverage', color: 'emerald' },
        { icon: <Zap className="w-5 h-5" />, label: 'Action Pack', count: '5', desc: 'Dynamic action sequences', color: 'amber' },
      ].map((pack, idx) => (
        <div key={idx} className={`p-4 bg-${pack.color}-500/10 border border-${pack.color}-500/20 rounded-xl`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-${pack.color}-400`}>{pack.icon}</span>
            <span className={`text-xs font-bold text-${pack.color}-400 bg-${pack.color}-500/20 px-2 py-0.5 rounded`}>
              {pack.count} shots
            </span>
          </div>
          <span className="text-sm font-bold text-white">{pack.label}</span>
          <p className="text-xs text-zinc-500">{pack.desc}</p>
        </div>
      ))}
    </div>

    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-bold text-emerald-300">Reference Lock Feature</span>
      </div>
      <ul className="space-y-2 text-sm text-zinc-300">
        <li className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>Upload a reference image to maintain style across all shots</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>Enable "Lock Visual Style" for consistent look and feel</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>Enable "Lock Characters" for character consistency</span>
        </li>
        <li className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>Reference affects ALL shots in the pack</span>
        </li>
      </ul>
    </div>

    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Film className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-bold text-blue-300">Sequential Storytelling</span>
      </div>
      <p className="text-sm text-zinc-300 mb-3">
        Describe shot sequences in Scene Context - the AI understands narrative flow!
      </p>
      <div className="bg-zinc-900 rounded-lg p-3 text-xs font-mono text-zinc-400">
        "Shot 1: Character enters room<br />
        Shot 2: Discovers the artifact<br />
        Shot 3: Villain appears behind them"
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
// EDIT CANVAS SECTION
// ═══════════════════════════════════════════════════════════

const EditCanvasSection: React.FC = () => (
  <div className="space-y-6">
    <SectionTitle
      icon={<Pencil className="w-6 h-6" />}
      title="Edit Canvas - Refine & Perfect"
      subtitle="Professional image editing with AI assistance"
    />

    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Quick Edit Dropdowns</h4>

    <div className="grid grid-cols-2 gap-3">
      {[
        { icon: <Sparkles className="w-5 h-5" />, label: 'Enhance', desc: 'Brightness, contrast, saturation, sharpen, HDR', color: 'amber' },
        { icon: <Palette className="w-5 h-5" />, label: 'Style', desc: 'Cyberpunk, watercolor, anime, film noir, etc.', color: 'violet' },
        { icon: <RotateCw className="w-5 h-5" />, label: 'Rotate', desc: 'Precise angles: 15°, 45°, 90°, bird\'s eye', color: 'blue' },
        { icon: <Sun className="w-5 h-5" />, label: 'Lighting', desc: 'Golden hour, rim light, studio, neon, etc.', color: 'yellow' },
      ].map((item, idx) => (
        <div key={idx} className={`p-4 bg-${item.color}-500/10 border border-${item.color}-500/20 rounded-xl`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-${item.color}-400`}>{item.icon}</span>
            <span className="text-sm font-bold text-white">{item.label}</span>
          </div>
          <p className="text-xs text-zinc-500">{item.desc}</p>
        </div>
      ))}
    </div>

    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5">
      <h4 className="text-sm font-bold text-white mb-3">AI Edits - Natural Language</h4>
      <p className="text-sm text-zinc-400 mb-3">Type instructions in plain English:</p>
      <div className="space-y-2">
        {[
          '"Make the sky darker and more dramatic"',
          '"Remove the person in the background"',
          '"Change her shirt from blue to red"',
          '"Add rain and wet streets"',
          '"Add @John from World Bible to the scene"',
        ].map((example, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <code className="text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded">{example}</code>
          </div>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-bold text-violet-300">Stack Mode</span>
        </div>
        <p className="text-xs text-zinc-400">
          Layer multiple edits on the same image. Non-destructive - remove any edit from the stack.
        </p>
      </div>
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Wand2 className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold text-blue-300">Quick Actions</span>
        </div>
        <p className="text-xs text-zinc-400">
          Remove BG, Remove Crowd, Text Fix, 4K Upscale - one-click common operations.
        </p>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
// GENERATION BEST PRACTICES
// ═══════════════════════════════════════════════════════════

const GenerationSection: React.FC = () => (
  <div className="space-y-6">
    <SectionTitle
      icon={<Sparkles className="w-6 h-6" />}
      title="Generation Best Practices"
      subtitle="Writing effective prompts for consistent results"
    />

    <div className="grid md:grid-cols-2 gap-4">
      {/* DO */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <h4 className="text-sm font-bold text-emerald-300">DO ✓</h4>
        </div>
        <ul className="space-y-2 text-sm text-zinc-300">
          <li>• Be specific about style <span className="text-zinc-500">("cinematic 3D render")</span></li>
          <li>• Include lighting details <span className="text-zinc-500">("golden hour, rim lighting")</span></li>
          <li>• Specify camera angles <span className="text-zinc-500">("low angle, 24mm lens")</span></li>
          <li>• Use @mentions for consistency <span className="text-zinc-500">("@John wearing @LeatherJacket")</span></li>
          <li>• Describe physical details <span className="text-zinc-500">("tall, 30s, beard")</span></li>
        </ul>
      </div>

      {/* DON'T */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <X className="w-5 h-5 text-red-400" />
          <h4 className="text-sm font-bold text-red-300">DON'T ✗</h4>
        </div>
        <ul className="space-y-2 text-sm text-zinc-300">
          <li>• Use vague descriptions <span className="text-zinc-500">("nice looking person")</span></li>
          <li>• Forget to lock references for consistency</li>
          <li>• Mix conflicting styles <span className="text-zinc-500">("photorealistic anime")</span></li>
          <li>• Use generic prompts <span className="text-zinc-500">("make it cool")</span></li>
          <li>• Ignore the World Bible</li>
        </ul>
      </div>
    </div>

    <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-violet-400" />
        <h4 className="text-sm font-bold text-violet-300">Character Consistency Workflow</h4>
      </div>
      <ol className="space-y-2 text-sm text-zinc-300">
        <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 text-xs flex items-center justify-center shrink-0">1</span>
          <span>Create character in World Bible FIRST</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 text-xs flex items-center justify-center shrink-0">2</span>
          <span>Use Photo→Character for best results</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 text-xs flex items-center justify-center shrink-0">3</span>
          <span>@mention in every prompt</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 text-xs flex items-center justify-center shrink-0">4</span>
          <span>Lock in Contact Sheet for coverage</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 text-xs flex items-center justify-center shrink-0">5</span>
          <span>Describe consistently in every prompt</span>
        </li>
      </ol>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
// SHORTCUTS & TIPS
// ═══════════════════════════════════════════════════════════

const ShortcutsSection: React.FC = () => (
  <div className="space-y-6">
    <SectionTitle
      icon={<Keyboard className="w-6 h-6" />}
      title="Tips & Shortcuts"
      subtitle="Work faster with these efficiency tips"
    />

    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5">
      <h4 className="text-sm font-bold text-white mb-4">Quick Actions</h4>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          { action: 'Hover images', result: 'See action buttons' },
          { action: 'Click thumbnails', result: 'Full preview' },
          { action: 'Drag in Storyboard', result: 'Reorder shots' },
          { action: '@mention', result: 'Reference Bible entities' },
          { action: 'Hold Eye button', result: 'View original' },
          { action: 'Side-by-side', result: 'Compare versions' },
        ].map((item, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 bg-zinc-900 rounded-lg">
            <span className="text-zinc-400">{item.action}</span>
            <span className="text-emerald-400">{item.result}</span>
          </div>
        ))}
      </div>
    </div>

    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Efficiency Tips</h4>

    <div className="space-y-3">
      {[
        { emoji: '🚀', tip: 'Generate concepts BEFORE detailed coverage' },
        { emoji: '🚀', tip: 'Use Contact Sheet for batch generation (more cost-effective)' },
        { emoji: '🚀', tip: 'Build World Bible early and reference it everywhere' },
        { emoji: '🚀', tip: 'Lock references for consistency across shots' },
        { emoji: '🚀', tip: 'Use Stack Mode in Edit Canvas for iterative refinement' },
        { emoji: '🚀', tip: 'Generate variations before committing to edits' },
      ].map((item, idx) => (
        <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
          <span className="text-xl">{item.emoji}</span>
          <span className="text-sm text-zinc-300">{item.tip}</span>
        </div>
      ))}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
// COMMON WORKFLOWS
// ═══════════════════════════════════════════════════════════

const CommonWorkflowsSection: React.FC = () => (
  <div className="space-y-6">
    <SectionTitle
      icon={<Clapperboard className="w-6 h-6" />}
      title="Common Workflows"
      subtitle="Step-by-step guides for typical use cases"
    />

    <div className="space-y-4">
      {/* Character Turnaround */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-emerald-400" />
          <h4 className="text-sm font-bold text-emerald-300">Character Turnaround</h4>
        </div>
        <ol className="space-y-1 text-sm text-zinc-300">
          <li>1. Upload photo → Photo→Character</li>
          <li>2. Add to World Bible as "@CharacterName"</li>
          <li>3. Contact Sheet → Lock character</li>
          <li>4. Generate: "Front view, side view, back view, 3/4 view"</li>
        </ol>
      </div>

      {/* Product Visualization */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-5 h-5 text-amber-400" />
          <h4 className="text-sm font-bold text-amber-300">Product Visualization</h4>
        </div>
        <ol className="space-y-1 text-sm text-zinc-300">
          <li>1. Upload product → Add to World Bible</li>
          <li>2. Contact Sheet → Lock product</li>
          <li>3. Generate: "Various angles and lighting setups"</li>
          <li>4. Edit Canvas → Refine best shots</li>
        </ol>
      </div>

      {/* Scene Coverage */}
      <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Film className="w-5 h-5 text-violet-400" />
          <h4 className="text-sm font-bold text-violet-300">Scene Coverage (Film Production)</h4>
        </div>
        <ol className="space-y-1 text-sm text-zinc-300">
          <li>1. Concept Generation → Create master shot</li>
          <li>2. Add to references</li>
          <li>3. Contact Sheet → Generate coverage (wide, medium, close-up, OTS)</li>
          <li>4. Storyboard → Assemble sequence</li>
        </ol>
      </div>

      {/* Marketing Content */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-blue-400" />
          <h4 className="text-sm font-bold text-blue-300">Marketing Content</h4>
        </div>
        <ol className="space-y-1 text-sm text-zinc-300">
          <li>1. Create hero product shot in Concept Generation</li>
          <li>2. Add product to World Bible</li>
          <li>3. Contact Sheet → Generate variations</li>
          <li>4. Edit Canvas → Polish for different platforms</li>
          <li>5. Export for social/web/print</li>
        </ol>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
// TROUBLESHOOTING
// ═══════════════════════════════════════════════════════════

const TroubleshootSection: React.FC = () => (
  <div className="space-y-6">
    <SectionTitle
      icon={<AlertCircle className="w-6 h-6" />}
      title="Troubleshooting"
      subtitle="Solutions to common issues"
    />

    <div className="space-y-4">
      {[
        {
          problem: '"My character looks different in every shot"',
          solutions: [
            'Add to World Bible and @mention in every prompt',
            'Lock in Contact Sheet reference system',
            'Use Photo→Character for best consistency',
          ],
        },
        {
          problem: '"Reference image isn\'t affecting generation"',
          solutions: [
            'Enable "Lock Visual Style" checkbox',
            'Ensure reference image is clear and high quality',
            'Add specific style description to match',
          ],
        },
        {
          problem: '"Objects are different sizes across shots"',
          solutions: [
            'Reference lock now includes scale consistency',
            'Describe object size explicitly ("hand-sized bottle")',
            'Use same reference across all generations',
          ],
        },
        {
          problem: '"Style keeps changing"',
          solutions: [
            'Lock visual style in Contact Sheet',
            'Use consistent prompt language',
            'Reference previous successful generations',
          ],
        },
        {
          problem: '"Generation failed or looks wrong"',
          solutions: [
            'Simplify your prompt (remove conflicting instructions)',
            'Check if safety filters triggered',
            'Try different wording or break into smaller steps',
          ],
        },
      ].map((item, idx) => (
        <div key={idx} className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <span className="text-sm font-bold text-amber-300">{item.problem}</span>
          </div>
          <div className="pl-8 space-y-1">
            {item.solutions.map((solution, sIdx) => (
              <div key={sIdx} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-emerald-400">→</span>
                <span>{solution}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
// COST OPTIMIZATION
// ═══════════════════════════════════════════════════════════

const CostSection: React.FC = () => (
  <div className="space-y-6">
    <SectionTitle
      icon={<DollarSign className="w-6 h-6" />}
      title="Cost Optimization"
      subtitle="Get the most from your generations"
    />

    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
      <h4 className="text-sm font-bold text-emerald-300 mb-3">Smart Generation Strategy</h4>
      <ul className="space-y-2 text-sm text-zinc-300">
        <li className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>Use Contact Sheet for batch coverage (1 API setup = multiple shots)</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>Generate concepts first, THEN refine</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>Don't regenerate entire sequences - use Edit Canvas</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>Build World Bible once, reference everywhere</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>Lock references to avoid inconsistent generations</span>
        </li>
      </ul>
    </div>

    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">When to Use Each Tool</h4>

    <div className="grid grid-cols-2 gap-3">
      {[
        { icon: <Grid className="w-5 h-5" />, label: 'Contact Sheet', tip: 'Most cost-effective for coverage', color: 'emerald' },
        { icon: <Palette className="w-5 h-5" />, label: 'Concept Generation', tip: 'Single hero shots', color: 'violet' },
        { icon: <Pencil className="w-5 h-5" />, label: 'Edit Canvas', tip: 'Cheaper than regenerating', color: 'blue' },
        { icon: <Clapperboard className="w-5 h-5" />, label: 'Script Studio', tip: 'Free analysis, guides project', color: 'amber' },
      ].map((item, idx) => (
        <div key={idx} className={`p-4 bg-${item.color}-500/10 border border-${item.color}-500/20 rounded-xl`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-${item.color}-400`}>{item.icon}</span>
            <span className="text-sm font-bold text-white">{item.label}</span>
          </div>
          <p className="text-xs text-zinc-500">💰 {item.tip}</p>
        </div>
      ))}
    </div>

    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-bold text-amber-300">Golden Rule</span>
      </div>
      <p className="text-sm text-zinc-300">
        <strong className="text-white">Plan before you generate.</strong> A well-prepared World Bible
        and clear shot list will save you from expensive re-generations.
      </p>
    </div>
  </div>
);

export default TutorialModal;

// Export helper to check if should show on startup
export const shouldShowTutorial = (): boolean => {
  return localStorage.getItem('design-agent-tutorial-dismissed') !== 'true';
};

// Export helper to reset tutorial
export const resetTutorial = (): void => {
  localStorage.removeItem('design-agent-tutorial-dismissed');
};
