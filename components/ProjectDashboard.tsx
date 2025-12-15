
import React, { useState } from 'react';
import { Project, ProjectTemplate } from '../types';
import { Plus, FolderOpen, Trash2, ArrowRight, LayoutGrid, LogIn, User, LogOut, Cloud, HardDrive, LayoutTemplate } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import AuthModal from './AuthModal';
import TemplateSelector from './TemplateSelector';

interface ProjectDashboardProps {
  projects: Project[];
  onSelect: (project: Project) => void;
  onCreate: (name: string, template?: ProjectTemplate | null) => void;
  onDelete: (id: string) => void;
}

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ projects, onSelect, onCreate, onDelete }) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);

  const { isAuthenticated, isLoading: isAuthLoading, user, logout, isFirebaseAvailable } = useAuth();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      onCreate(newProjectName, selectedTemplate);
      setNewProjectName('');
      setIsCreating(false);
      setSelectedTemplate(null);
    }
  };

  const handleTemplateSelect = (template: ProjectTemplate | null) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
    setIsCreating(true);
    // Pre-fill project name from template if selected
    if (template && template.id !== 'template-blank') {
      setNewProjectName(`${template.name} Project`);
    } else {
      setNewProjectName('');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-white">
      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Template Selector Modal */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={handleTemplateSelect}
      />

      {/* Header with Auth */}
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-1.5 rounded-lg">
            <LayoutGrid className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-slate-300">Design Agent</span>
        </div>

        {/* Auth Status / Login Button */}
        <div className="flex items-center gap-3">
          {isFirebaseAvailable && (
            <>
              {isAuthLoading ? (
                <div className="text-xs text-slate-500">Loading...</div>
              ) : isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs text-emerald-400">Cloud Sync</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <span className="text-sm text-slate-300 hidden sm:block">{user.displayName || user.email}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg">
                    <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-400">Local Storage</span>
                  </div>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div className="max-w-4xl w-full">
          <div className="mb-12 text-center">
              <h1 className="text-4xl font-light tracking-tight mb-2">Design Agent <span className="text-violet-500 font-bold">8.0</span><span className="ml-2 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium">BETA</span></h1>
              <p className="text-slate-400">Select a project to begin your studio session.</p>
              {!isAuthenticated && isFirebaseAvailable && (
                <p className="text-slate-500 text-sm mt-2">
                  <button onClick={() => setShowAuthModal(true)} className="text-violet-400 hover:text-violet-300 underline">Sign in</button> to sync projects across devices
                </p>
              )}
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create New Card */}
          <div className="bg-slate-900/50 border border-slate-800 border-dashed hover:border-violet-500/50 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[200px] transition-all group">
            {isCreating ? (
              <form onSubmit={handleCreate} className="w-full">
                {/* Template indicator */}
                {selectedTemplate && (
                  <div className="mb-3 p-2 bg-violet-600/20 border border-violet-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-xl">{selectedTemplate.icon}</span>
                      <span className="text-violet-300 font-medium">{selectedTemplate.name}</span>
                      <button
                        type="button"
                        onClick={() => setShowTemplateSelector(true)}
                        className="ml-auto text-xs text-violet-400 hover:text-violet-300 underline"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}
                <input
                  autoFocus
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project Name..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm focus:border-violet-500 focus:outline-none mb-3"
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-2 rounded-lg">CREATE</button>
                  <button type="button" onClick={() => { setIsCreating(false); setSelectedTemplate(null); }} className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg">CANCEL</button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center gap-4 w-full">
                <button onClick={() => setShowTemplateSelector(true)} className="flex flex-col items-center gap-3 text-slate-500 hover:text-violet-400 w-full">
                  <div className="p-4 bg-slate-800 rounded-full group-hover:bg-slate-800/80 transition-colors">
                     <Plus className="w-8 h-8" />
                  </div>
                  <span className="font-medium">New Project</span>
                </button>
                <button
                  onClick={() => { setSelectedTemplate(null); setIsCreating(true); }}
                  className="text-xs text-slate-500 hover:text-slate-400 underline"
                >
                  or start blank
                </button>
              </div>
            )}
          </div>

          {/* Project Cards */}
          {projects.map(project => (
            <div key={project.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-600 hover:shadow-xl hover:shadow-violet-900/10 transition-all group relative">
               <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); onDelete(project.id); }} className="text-slate-600 hover:text-red-500 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
               </div>
               
               <div>
                 <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center mb-4 border border-slate-700">
                    <LayoutGrid className="w-5 h-5 text-slate-400" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-200 mb-1">{project.name}</h3>
                 <p className="text-xs text-slate-500">Created {new Date(project.createdAt).toLocaleDateString()}</p>
               </div>

               <button 
                 onClick={() => onSelect(project)}
                 className="mt-6 w-full py-2 bg-slate-800 hover:bg-violet-600 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
               >
                 Open Studio <ArrowRight className="w-4 h-4" />
               </button>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDashboard;
