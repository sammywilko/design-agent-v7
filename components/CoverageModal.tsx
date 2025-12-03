import React, { useState } from 'react';
import { X, Film, Check, Camera } from 'lucide-react';

interface CoverageConfig {
  framing: string[];
  lenses: string[];
  angles: string[];
}

interface CoverageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (config: CoverageConfig) => void;
}

const FRAMING_OPTIONS = [
  'Extreme Close-Up',
  'Close-Up',
  'Medium Shot',
  'Wide Shot',
  'Extreme Wide / Establishing'
];

const LENS_OPTIONS = [
  'Macro Lens',
  '16mm Wide',
  '24mm Standard',
  '35mm Street',
  '50mm Portrait',
  '85mm Telephoto',
  '200mm Zoom'
];

const ANGLE_OPTIONS = [
  'Eye Level',
  'Low Angle',
  'High Angle',
  'Overhead / Top-Down',
  'Dutch Angle',
  'Drone / Aerial'
];

const CoverageModal: React.FC<CoverageModalProps> = ({ isOpen, onClose, onGenerate }) => {
  const [framing, setFraming] = useState<string[]>(['Medium Shot', 'Wide Shot']);
  const [lenses, setLenses] = useState<string[]>([]);
  const [angles, setAngles] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleOption = (list: string[], setList: (l: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleGenerate = () => {
    onGenerate({ framing, lenses, angles });
    onClose();
  };

  const totalShots = framing.length + lenses.length + angles.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-violet-500" /> Coverage Configurator
            </h2>
            <p className="text-slate-400 text-xs mt-1">Select the variations you want to generate based on the source image.</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Framing Section */}
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4" /> Shot Framing
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {FRAMING_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => toggleOption(framing, setFraming, opt)}
                  className={`text-xs p-3 rounded-lg border text-left transition-all ${
                    framing.includes(opt) 
                      ? 'bg-violet-900/30 border-violet-500 text-violet-100 shadow-[0_0_10px_rgba(139,92,246,0.2)]' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{opt}</span>
                    {framing.includes(opt) && <Check className="w-3 h-3 text-violet-400" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Lens Section */}
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-slate-500" /> Focal Lengths
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {LENS_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => toggleOption(lenses, setLenses, opt)}
                  className={`text-xs p-3 rounded-lg border text-left transition-all ${
                    lenses.includes(opt) 
                      ? 'bg-blue-900/30 border-blue-500 text-blue-100 shadow-[0_0_10px_rgba(59,130,246,0.2)]' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{opt}</span>
                    {lenses.includes(opt) && <Check className="w-3 h-3 text-blue-400" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Angle Section */}
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <div className="w-4 h-4 border border-slate-500 transform rotate-45" /> Camera Angles
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ANGLE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => toggleOption(angles, setAngles, opt)}
                  className={`text-xs p-3 rounded-lg border text-left transition-all ${
                    angles.includes(opt) 
                      ? 'bg-emerald-900/30 border-emerald-500 text-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                   <div className="flex justify-between items-center">
                    <span>{opt}</span>
                    {angles.includes(opt) && <Check className="w-3 h-3 text-emerald-400" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between items-center">
           <div className="text-xs text-slate-500">
             Generates <span className="text-white font-bold">{totalShots}</span> variations
           </div>
           <button 
             onClick={handleGenerate}
             disabled={totalShots === 0}
             className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-violet-900/20 flex items-center gap-2"
           >
             <Film className="w-4 h-4" /> Run Coverage
           </button>
        </div>
      </div>
    </div>
  );
};

export default CoverageModal;