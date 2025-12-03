import React from 'react';
import { Lookbook } from '../types';
import { Eye, Palette, Camera, Zap, X, Plus } from 'lucide-react';

interface LookbookEditorProps {
  lookbook: Lookbook;
  onUpdate: (lookbook: Lookbook) => void;
}

const DEFAULT_LOOKBOOK: Lookbook = {
  visualStyleTags: [],
  colourPalette: '',
  typographyNotes: '',
  compositionRules: '',
  grainTextureRules: '',
  cameraLanguage: '',
  lightingApproach: '',
  referenceFrames: []
};

export const LookbookEditor: React.FC<LookbookEditorProps> = ({ 
  lookbook = DEFAULT_LOOKBOOK, 
  onUpdate 
}) => {
  const updateField = (field: keyof Lookbook, value: any) => {
    onUpdate({ ...lookbook, [field]: value });
  };

  const addTag = (tag: string) => {
    if (tag && !lookbook.visualStyleTags.includes(tag)) {
      updateField('visualStyleTags', [...lookbook.visualStyleTags, tag]);
    }
  };

  const removeTag = (index: number) => {
    updateField('visualStyleTags', lookbook.visualStyleTags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Eye className="w-5 h-5 text-pink-500" />
          Production Design Lookbook
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          The visual constitution of your project. These rules are injected into every generation.
        </p>
      </div>

      {/* Visual Style Tags */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-3">Core Aesthetics</h4>
        <div className="flex flex-wrap gap-2 mb-3">
          {lookbook.visualStyleTags.map((tag, i) => (
            <span
              key={i}
              className="bg-zinc-900 border border-zinc-700 px-3 py-1 rounded-full text-sm text-white flex items-center"
            >
              {tag}
              <button
                onClick={() => removeTag(i)}
                className="ml-2 text-zinc-500 hover:text-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            className="bg-transparent border-b border-zinc-700 text-sm text-white focus:border-violet-500 outline-none px-2 py-1 min-w-[120px]"
            placeholder="+ Add Tag"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addTag(e.currentTarget.value.trim());
                e.currentTarget.value = '';
              }
            }}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {['Cinematic', 'Sport-Fashion', 'High-Key', 'Noir', 'Cyberpunk', 'Editorial', 'Documentary', 'Luxury'].map(preset => (
            <button
              key={preset}
              onClick={() => addTag(preset)}
              className="text-[10px] px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Art Direction */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-pink-500 uppercase tracking-wide flex items-center gap-2">
            <Palette className="w-4 h-4" /> Art Direction
          </h4>
          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Color Palette</label>
            <textarea
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-300 resize-none h-16"
              value={lookbook.colourPalette}
              onChange={(e) => updateField('colourPalette', e.target.value)}
              placeholder="e.g. Deep blacks, electric blue accents, warm skin tones"
            />
          </div>
          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Typography Notes</label>
            <input
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-300"
              value={lookbook.typographyNotes}
              onChange={(e) => updateField('typographyNotes', e.target.value)}
              placeholder="e.g. Bold Sans-Serif, Athletic branding"
            />
          </div>
        </div>

        {/* Cinematography */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wide flex items-center gap-2">
            <Camera className="w-4 h-4" /> Cinematography
          </h4>
          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Camera Language</label>
            <textarea
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-300 resize-none h-16"
              value={lookbook.cameraLanguage}
              onChange={(e) => updateField('cameraLanguage', e.target.value)}
              placeholder="e.g. Dynamic tracking shots, shallow DOF, center framing"
            />
          </div>
          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Lighting Approach</label>
            <input
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-300"
              value={lookbook.lightingApproach}
              onChange={(e) => updateField('lightingApproach', e.target.value)}
              placeholder="e.g. High contrast, rim lighting, studio flash"
            />
          </div>
        </div>

        {/* Texture & Composition */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3 md:col-span-2">
          <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wide flex items-center gap-2">
            <Zap className="w-4 h-4" /> Texture & Composition
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Composition Rules</label>
              <textarea
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-300 resize-none h-16"
                value={lookbook.compositionRules}
                onChange={(e) => updateField('compositionRules', e.target.value)}
                placeholder="e.g. Rule of thirds, negative space, symmetric frames"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Grain / Texture</label>
              <textarea
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-300 resize-none h-16"
                value={lookbook.grainTextureRules}
                onChange={(e) => updateField('grainTextureRules', e.target.value)}
                placeholder="e.g. Clean digital, subtle film grain, matte finish"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Usage Hint */}
      <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3">
        <p className="text-xs text-violet-300">
          <strong>How it works:</strong> These settings form your project's "Visual DNA" and are automatically 
          injected into every image generation prompt. Characters and locations will maintain this consistent style.
        </p>
      </div>
    </div>
  );
};
