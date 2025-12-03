import React, { useState, useRef, useEffect } from 'react';
import { CharacterProfile, LocationProfile, ProductProfile, ReferenceBundle } from '../types';
import { User, MapPin, Package, X, Sparkles } from 'lucide-react';

interface SmartPromptInputProps {
  value: string;
  onChange: (text: string) => void;
  onBundlesChange: (bundles: ReferenceBundle[]) => void;
  characters: CharacterProfile[];
  locations: LocationProfile[];
  products: ProductProfile[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onSend?: () => void;
}

export const SmartPromptInput: React.FC<SmartPromptInputProps> = ({
  value,
  onChange,
  onBundlesChange,
  characters,
  locations,
  products,
  placeholder,
  className,
  disabled,
  onSend
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [filter, setFilter] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeBundles, setActiveBundles] = useState<ReferenceBundle[]>([]);

  // Collect all entities with their reference hierarchy
  const allEntities = [
    ...characters.map(c => ({
      type: 'CHARACTER' as const,
      id: c.id,
      name: c.name,
      // Priority: characterSheet > refCoverage > imageRefs
      img: c.characterSheet || c.refCoverage?.threeQuarter?.[0] || c.imageRefs?.[0] || '',
      aux: [
        ...(c.refCoverage?.face || []),
        ...(c.refCoverage?.fullBody || []),
        ...(c.refCoverage?.action || []),
        ...(c.imageRefs || [])
      ].filter(Boolean).slice(0, 3),
      promptSnippet: c.promptSnippet
    })),
    ...locations.map(l => ({
      type: 'LOCATION' as const,
      id: l.id,
      name: l.name,
      img: l.anchorImage || l.imageRefs?.[0] || '',
      aux: l.imageRefs?.slice(1, 4) || [],
      promptSnippet: l.promptSnippet
    })),
    ...products.map(p => ({
      type: 'PRODUCT' as const,
      id: p.id,
      name: p.name,
      img: p.imageRefs?.[0] || '',
      aux: p.imageRefs?.slice(1, 4) || [],
      promptSnippet: p.promptSnippet
    }))
  ];

  const filteredEntities = allEntities.filter(e =>
    e.name.toLowerCase().includes(filter.toLowerCase())
  );

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const newPos = e.target.selectionStart;

    onChange(newVal);
    setCursorPos(newPos);

    // Check for @ trigger
    const lastAt = newVal.lastIndexOf('@', newPos - 1);
    if (lastAt !== -1) {
      const textAfterAt = newVal.substring(lastAt + 1, newPos);
      if (!textAfterAt.includes(' ')) {
        setShowSuggestions(true);
        setFilter(textAfterAt);
        return;
      }
    }
    setShowSuggestions(false);
  };

  const selectEntity = (entity: typeof allEntities[0]) => {
    // Replace @filter with @Name
    const lastAt = value.lastIndexOf('@', cursorPos - 1);
    const textBefore = value.substring(0, lastAt);
    const textAfter = value.substring(cursorPos);
    const newVal = `${textBefore}@${entity.name} ${textAfter}`;

    onChange(newVal);
    setShowSuggestions(false);

    // Add to active bundles if not present and has image
    if (entity.img && !activeBundles.find(b => b.id === entity.id)) {
      const newBundle: ReferenceBundle = {
        type: entity.type,
        id: entity.id,
        name: entity.name,
        primaryRef: entity.img,
        auxiliaryRefs: entity.aux,
        promptSnippet: entity.promptSnippet
      };
      const updated = [...activeBundles, newBundle];
      setActiveBundles(updated);
      onBundlesChange(updated);
    }

    // Refocus
    setTimeout(() => textareaRef.current?.focus(), 10);
  };

  const removeBundle = (id: string) => {
    const updated = activeBundles.filter(b => b.id !== id);
    setActiveBundles(updated);
    onBundlesChange(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && onSend) {
      e.preventDefault();
      onSend();
    }
  };

  // Get color based on entity type
  const getTypeColor = (type: 'CHARACTER' | 'LOCATION' | 'PRODUCT') => {
    switch (type) {
      case 'CHARACTER': return 'border-emerald-500/50 bg-emerald-500/10';
      case 'LOCATION': return 'border-cyan-500/50 bg-cyan-500/10';
      case 'PRODUCT': return 'border-amber-500/50 bg-amber-500/10';
    }
  };

  const getTypeIcon = (type: 'CHARACTER' | 'LOCATION' | 'PRODUCT') => {
    switch (type) {
      case 'CHARACTER': return <User className="w-3 h-3 text-emerald-400" />;
      case 'LOCATION': return <MapPin className="w-3 h-3 text-cyan-400" />;
      case 'PRODUCT': return <Package className="w-3 h-3 text-amber-400" />;
    }
  };

  return (
    <div className="relative">
      {/* Pixel Context Chip Bar */}
      {activeBundles.length > 0 && (
        <div className="flex gap-2 mb-2 p-2 bg-zinc-900/80 rounded-lg overflow-x-auto border border-zinc-800">
          <span className="text-[10px] text-zinc-500 self-center uppercase font-bold px-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Pixel Context:
          </span>
          {activeBundles.map(b => (
            <div
              key={b.id}
              className={`relative group flex items-center border rounded pr-2 overflow-hidden ${getTypeColor(b.type)}`}
            >
              {/* Stacked reference thumbnails */}
              <div className="flex -space-x-2 mr-2">
                <img
                  src={b.primaryRef}
                  className="w-8 h-8 object-cover rounded-full border-2 border-zinc-900 z-10"
                  alt={b.name}
                />
                {b.auxiliaryRefs.slice(0, 2).map((aux, i) => (
                  <img
                    key={i}
                    src={aux}
                    className="w-8 h-8 object-cover rounded-full border-2 border-zinc-900 opacity-70"
                    style={{ zIndex: 9 - i }}
                    alt={`${b.name} ref ${i + 1}`}
                  />
                ))}
              </div>
              <span className="text-xs text-zinc-300 flex items-center gap-1">
                {getTypeIcon(b.type)}
                {b.name}
              </span>
              <button
                onClick={() => removeBundle(b.id)}
                className="ml-2 text-zinc-500 hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-300 focus:ring-1 focus:ring-violet-500 outline-none resize-none ${className}`}
        placeholder={placeholder || "Type @ to mention characters, locations, or products..."}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={3}
      />

      {/* Autocomplete Dropdown */}
      {showSuggestions && (
        <div className="absolute left-0 bottom-full mb-2 w-72 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
          {filteredEntities.length > 0 ? (
            filteredEntities.map((e, i) => (
              <button
                key={i}
                onClick={() => selectEntity(e)}
                className="w-full text-left px-3 py-2 hover:bg-zinc-800 flex items-center space-x-2 border-b border-zinc-800 last:border-0"
              >
                <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-zinc-800">
                  {e.img ? (
                    <img src={e.img} className="w-full h-full object-cover" alt={e.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getTypeIcon(e.type)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{e.name}</p>
                  <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                    {getTypeIcon(e.type)}
                    {e.type}
                    {e.aux.length > 0 && (
                      <span className="ml-1 text-zinc-600">• {e.aux.length + 1} refs</span>
                    )}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-zinc-500">No entities found</p>
              <p className="text-[10px] text-zinc-600 mt-1">Add characters, locations, or products in Script Studio</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
