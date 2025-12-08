/**
 * PhotoToCharacterModal Component
 * Upload a real person photo and generate a stylized character using the project's locked-in style
 */

import React, { useState, useRef, useCallback } from 'react';
import {
    X, Upload, Camera, Lock, Unlock, Loader2, Sparkles, User,
    Palette, CheckCircle, AlertCircle, Image as ImageIcon, Trash2
} from 'lucide-react';
import { CharacterProfile, ProjectDefaultStyle, StyleDNA } from '../types';
import { generateStylizedCharacterFromPhotoFast, extractStyleDNAFromImage, PhotoRealismMode } from '../services/gemini';

interface PhotoToCharacterModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultStyle: ProjectDefaultStyle | undefined;
    onSetDefaultStyle: (style: ProjectDefaultStyle) => void;
    onCharacterCreated: (character: CharacterProfile) => void;
    showNotification: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

type Step = 'style' | 'photo' | 'generate';

const PhotoToCharacterModal: React.FC<PhotoToCharacterModalProps> = ({
    isOpen,
    onClose,
    defaultStyle,
    onSetDefaultStyle,
    onCharacterCreated,
    showNotification
}) => {
    const [currentStep, setCurrentStep] = useState<Step>(defaultStyle ? 'photo' : 'style');
    const [isExtractingStyle, setIsExtractingStyle] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Style setup
    const [styleImage, setStyleImage] = useState<string | null>(null);
    const [styleName, setStyleName] = useState('');
    const [extractedStyleDNA, setExtractedStyleDNA] = useState<StyleDNA | null>(null);

    // Photo upload
    const [personPhoto, setPersonPhoto] = useState<string | null>(null);
    const [characterName, setCharacterName] = useState('');
    const [realismMode, setRealismMode] = useState<PhotoRealismMode>('stylized');

    // Result
    const [generatedCharacter, setGeneratedCharacter] = useState<CharacterProfile | null>(null);

    const styleInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    // Handle style image upload
    const handleStyleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target?.result as string;
            setStyleImage(base64);
            setExtractedStyleDNA(null); // Reset extracted DNA when new image uploaded
        };
        reader.readAsDataURL(file);
    }, []);

    // Handle person photo upload
    const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target?.result as string;
            setPersonPhoto(base64);
        };
        reader.readAsDataURL(file);
    }, []);

    // Extract and lock style
    const handleLockStyle = async () => {
        if (!styleImage || !styleName.trim()) {
            showNotification('Please upload a style reference and enter a name', 'warning');
            return;
        }

        setIsExtractingStyle(true);
        try {
            const styleDNA = await extractStyleDNAFromImage(styleImage);
            setExtractedStyleDNA(styleDNA);

            const newDefaultStyle: ProjectDefaultStyle = {
                id: crypto.randomUUID(),
                name: styleName.trim(),
                referenceImage: styleImage,
                styleDNA: styleDNA,
                lockedAt: Date.now()
            };

            onSetDefaultStyle(newDefaultStyle);
            showNotification(`Style "${styleName}" locked for this project!`, 'success');
            setCurrentStep('photo');
        } catch (error) {
            console.error('Style extraction failed:', error);
            showNotification('Failed to extract style. Try a different image.', 'error');
        } finally {
            setIsExtractingStyle(false);
        }
    };

    // Generate stylized character
    const handleGenerate = async () => {
        if (!personPhoto) {
            showNotification('Please upload a photo first', 'warning');
            return;
        }

        if (!characterName.trim()) {
            showNotification('Please enter a character name', 'warning');
            return;
        }

        const styleToUse = defaultStyle;
        if (!styleToUse) {
            showNotification('No style locked. Please set up a style first.', 'warning');
            setCurrentStep('style');
            return;
        }

        setIsGenerating(true);
        setCurrentStep('generate');

        try {
            // Use FAST single-call version (~15-20s vs ~60-80s)
            const result = await generateStylizedCharacterFromPhotoFast(
                personPhoto,
                styleToUse.styleDNA,
                styleToUse.referenceImage,
                characterName.trim(),
                { aspectRatio: '1:1', resolution: '2K' },
                realismMode
            );

            // Add style tracking to the character
            result.characterProfile.styleApplied = styleToUse.id;

            setGeneratedCharacter(result.characterProfile);
            showNotification(`${characterName} created successfully!`, 'success');
        } catch (error) {
            console.error('Character generation failed:', error);
            showNotification('Generation failed. Please try again.', 'error');
            setCurrentStep('photo');
        } finally {
            setIsGenerating(false);
        }
    };

    // Save and close
    const handleSaveCharacter = () => {
        if (generatedCharacter) {
            onCharacterCreated(generatedCharacter);
            handleClose();
        }
    };

    // Reset and close
    const handleClose = () => {
        setCurrentStep(defaultStyle ? 'photo' : 'style');
        setStyleImage(null);
        setStyleName('');
        setExtractedStyleDNA(null);
        setPersonPhoto(null);
        setCharacterName('');
        setRealismMode('stylized');
        setGeneratedCharacter(null);
        onClose();
    };

    // Clear locked style
    const handleClearStyle = () => {
        onSetDefaultStyle(undefined as unknown as ProjectDefaultStyle);
        setCurrentStep('style');
        showNotification('Style unlocked. You can set a new one.', 'info');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl w-full max-w-4xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-gradient-to-r from-violet-900/20 to-fuchsia-900/20">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl">
                            <Camera className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Photo to Character</h2>
                            <p className="text-sm text-zinc-400">Transform real photos into your stylized characters</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center justify-center gap-4">
                        <StepIndicator
                            step={1}
                            label="Lock Style"
                            active={currentStep === 'style'}
                            completed={!!defaultStyle}
                        />
                        <div className="w-12 h-px bg-zinc-700" />
                        <StepIndicator
                            step={2}
                            label="Upload Photo"
                            active={currentStep === 'photo'}
                            completed={!!generatedCharacter}
                        />
                        <div className="w-12 h-px bg-zinc-700" />
                        <StepIndicator
                            step={3}
                            label="Generate"
                            active={currentStep === 'generate'}
                            completed={!!generatedCharacter && !isGenerating}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Style Setup */}
                    {currentStep === 'style' && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <h3 className="text-lg font-semibold text-white mb-2">Lock Your Character Style</h3>
                                <p className="text-sm text-zinc-400 max-w-md mx-auto">
                                    Upload one of your existing stylized characters. This style will be used for all photo-to-character generations in this project.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Upload Area */}
                                <div className="space-y-4">
                                    <label className="text-sm font-medium text-zinc-300">Style Reference Image</label>
                                    <div
                                        onClick={() => styleInputRef.current?.click()}
                                        className={`aspect-square rounded-xl border-2 border-dashed cursor-pointer transition-all flex items-center justify-center overflow-hidden ${
                                            styleImage
                                                ? 'border-violet-500/50 bg-violet-500/5'
                                                : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/50 hover:bg-zinc-800'
                                        }`}
                                    >
                                        {styleImage ? (
                                            <img src={styleImage} alt="Style reference" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center p-6">
                                                <Upload className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                                                <p className="text-sm text-zinc-400">Click to upload style reference</p>
                                                <p className="text-xs text-zinc-500 mt-1">Use one of your stylized 3D characters</p>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        ref={styleInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleStyleUpload}
                                        className="hidden"
                                    />
                                </div>

                                {/* Style Details */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-zinc-300 block mb-2">Style Name</label>
                                        <input
                                            type="text"
                                            value={styleName}
                                            onChange={(e) => setStyleName(e.target.value)}
                                            placeholder="e.g., Stylized 3D Animation"
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                                        />
                                    </div>

                                    {extractedStyleDNA && (
                                        <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 space-y-3">
                                            <div className="flex items-center gap-2 text-emerald-400">
                                                <CheckCircle size={16} />
                                                <span className="text-sm font-medium">Style DNA Extracted</span>
                                            </div>
                                            <p className="text-xs text-zinc-400 line-clamp-3">{extractedStyleDNA.promptSnippet}</p>
                                            <div className="flex flex-wrap gap-1">
                                                {extractedStyleDNA.moodKeywords?.map((kw, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300">{kw}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleLockStyle}
                                        disabled={!styleImage || !styleName.trim() || isExtractingStyle}
                                        className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-zinc-700 disabled:to-zinc-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        {isExtractingStyle ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Extracting Style DNA...
                                            </>
                                        ) : (
                                            <>
                                                <Lock size={18} />
                                                Lock This Style
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Photo Upload */}
                    {currentStep === 'photo' && (
                        <div className="space-y-6">
                            {/* Locked Style Preview */}
                            {defaultStyle && (
                                <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700 flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-zinc-600 flex-shrink-0">
                                        <img src={defaultStyle.referenceImage} alt="Locked style" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Lock size={14} className="text-violet-400" />
                                            <span className="text-sm font-medium text-white">{defaultStyle.name}</span>
                                        </div>
                                        <p className="text-xs text-zinc-400 line-clamp-2">{defaultStyle.styleDNA.promptSnippet}</p>
                                    </div>
                                    <button
                                        onClick={handleClearStyle}
                                        className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                                        title="Unlock and change style"
                                    >
                                        <Unlock size={18} />
                                    </button>
                                </div>
                            )}

                            <div className="text-center mb-6">
                                <h3 className="text-lg font-semibold text-white mb-2">Upload Real Person Photo</h3>
                                <p className="text-sm text-zinc-400 max-w-md mx-auto">
                                    Upload a photo of the person you want to turn into a stylized character.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Photo Upload */}
                                <div className="space-y-4">
                                    <label className="text-sm font-medium text-zinc-300">Person Photo</label>
                                    <div
                                        onClick={() => photoInputRef.current?.click()}
                                        className={`aspect-square rounded-xl border-2 border-dashed cursor-pointer transition-all flex items-center justify-center overflow-hidden ${
                                            personPhoto
                                                ? 'border-fuchsia-500/50 bg-fuchsia-500/5'
                                                : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/50 hover:bg-zinc-800'
                                        }`}
                                    >
                                        {personPhoto ? (
                                            <img src={personPhoto} alt="Person to stylize" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center p-6">
                                                <User className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                                                <p className="text-sm text-zinc-400">Click to upload person photo</p>
                                                <p className="text-xs text-zinc-500 mt-1">Clear, well-lit photo works best</p>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        ref={photoInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoUpload}
                                        className="hidden"
                                    />
                                    {personPhoto && (
                                        <button
                                            onClick={() => setPersonPhoto(null)}
                                            className="w-full text-sm text-zinc-400 hover:text-red-400 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Trash2 size={14} />
                                            Remove Photo
                                        </button>
                                    )}
                                </div>

                                {/* Character Details */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-zinc-300 block mb-2">Character Name</label>
                                        <input
                                            type="text"
                                            value={characterName}
                                            onChange={(e) => setCharacterName(e.target.value)}
                                            placeholder="e.g., Alex, Coach Sarah..."
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:border-fuchsia-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* Realism Mode Toggle */}
                                    <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                                        <label className="text-sm font-medium text-zinc-300 block mb-3">Output Mode</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setRealismMode('stylized')}
                                                className={`p-3 rounded-lg border transition-all text-left ${
                                                    realismMode === 'stylized'
                                                        ? 'border-violet-500 bg-violet-500/10 text-white'
                                                        : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Palette size={16} className={realismMode === 'stylized' ? 'text-violet-400' : ''} />
                                                    <span className="font-medium text-sm">Stylized</span>
                                                </div>
                                                <p className="text-xs text-zinc-500">Artistic interpretation</p>
                                            </button>
                                            <button
                                                onClick={() => setRealismMode('photo-real')}
                                                className={`p-3 rounded-lg border transition-all text-left ${
                                                    realismMode === 'photo-real'
                                                        ? 'border-emerald-500 bg-emerald-500/10 text-white'
                                                        : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Camera size={16} className={realismMode === 'photo-real' ? 'text-emerald-400' : ''} />
                                                    <span className="font-medium text-sm">Photo-Real</span>
                                                </div>
                                                <p className="text-xs text-zinc-500">Max likeness (recon)</p>
                                            </button>
                                        </div>
                                        {realismMode === 'photo-real' && (
                                            <p className="mt-2 text-xs text-emerald-400/80">
                                                Documentary mode: Exact facial features preserved
                                            </p>
                                        )}
                                    </div>

                                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                            <div className="text-sm">
                                                <p className="text-amber-200 font-medium mb-1">Best Results Tips</p>
                                                <ul className="text-amber-200/70 text-xs space-y-1">
                                                    <li>• Use a clear, front-facing photo</li>
                                                    <li>• Good lighting helps with accuracy</li>
                                                    <li>• Full body photos work best</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleGenerate}
                                        disabled={!personPhoto || !characterName.trim()}
                                        className={`w-full ${
                                            realismMode === 'photo-real'
                                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                                                : 'bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500'
                                        } disabled:from-zinc-700 disabled:to-zinc-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2`}
                                    >
                                        {realismMode === 'photo-real' ? <Camera size={18} /> : <Sparkles size={18} />}
                                        {realismMode === 'photo-real' ? 'Generate Photo-Real Avatar' : 'Generate Stylized Character'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Generation / Result */}
                    {currentStep === 'generate' && (
                        <div className="space-y-6">
                            {isGenerating ? (
                                <div className="text-center py-12">
                                    <div className="w-24 h-24 mx-auto mb-6 relative">
                                        <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
                                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 animate-spin" />
                                        <Sparkles className="w-10 h-10 text-violet-400 absolute inset-0 m-auto animate-pulse" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Creating {characterName}...</h3>
                                    <p className="text-sm text-zinc-400 max-w-md mx-auto">
                                        Transforming photo into stylized character. Usually takes 15-25 seconds.
                                    </p>
                                    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Stylizing • Rendering</span>
                                    </div>
                                </div>
                            ) : generatedCharacter ? (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <CheckCircle className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-white mb-1">Character Created!</h3>
                                        <p className="text-sm text-zinc-400">{generatedCharacter.name} is ready to use</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Original Photo */}
                                        <div className="space-y-2">
                                            <label className="text-xs text-zinc-500 font-medium uppercase">Original Photo</label>
                                            <div className="aspect-square rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800">
                                                {personPhoto && <img src={personPhoto} alt="Original" className="w-full h-full object-cover" />}
                                            </div>
                                        </div>

                                        {/* Arrow */}
                                        <div className="hidden md:flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 flex items-center justify-center">
                                                <Sparkles className="w-6 h-6 text-white" />
                                            </div>
                                        </div>

                                        {/* Generated Character */}
                                        <div className="space-y-2">
                                            <label className="text-xs text-zinc-500 font-medium uppercase">Stylized Character</label>
                                            <div className="aspect-square rounded-xl overflow-hidden border-2 border-violet-500/50 bg-zinc-800 shadow-lg shadow-violet-500/10">
                                                {generatedCharacter.imageRefs?.[0] && (
                                                    <img src={generatedCharacter.imageRefs[0]} alt="Stylized" className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Extracted Specs */}
                                    {generatedCharacter.extractedSpecs && (
                                        <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                                            <h4 className="text-sm font-medium text-zinc-300 mb-3">Extracted Character Traits</h4>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="px-2 py-1 bg-zinc-700 rounded text-xs text-zinc-300">{generatedCharacter.extractedSpecs.gender}</span>
                                                <span className="px-2 py-1 bg-zinc-700 rounded text-xs text-zinc-300">{generatedCharacter.extractedSpecs.ageRange}</span>
                                                <span className="px-2 py-1 bg-zinc-700 rounded text-xs text-zinc-300">{generatedCharacter.extractedSpecs.hairStyle}</span>
                                                <span className="px-2 py-1 bg-zinc-700 rounded text-xs text-zinc-300">{generatedCharacter.extractedSpecs.bodyType}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                setGeneratedCharacter(null);
                                                setCurrentStep('photo');
                                            }}
                                            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
                                        >
                                            Try Again
                                        </button>
                                        <button
                                            onClick={handleSaveCharacter}
                                            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={18} />
                                            Add to Characters
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Step Indicator Component
const StepIndicator: React.FC<{
    step: number;
    label: string;
    active: boolean;
    completed: boolean;
}> = ({ step, label, active, completed }) => (
    <div className={`flex items-center gap-2 ${active ? 'text-white' : completed ? 'text-violet-400' : 'text-zinc-500'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
            active
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                : completed
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/50'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
        }`}>
            {completed && !active ? <CheckCircle size={16} /> : step}
        </div>
        <span className="text-sm font-medium hidden sm:inline">{label}</span>
    </div>
);

export default PhotoToCharacterModal;
