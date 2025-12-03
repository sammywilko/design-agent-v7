
import React, { useState } from 'react';
import { Project } from '../types';
import { Plus, FolderOpen, Trash2, ArrowRight, LayoutGrid } from 'lucide-react';

interface ProjectDashboardProps {
  projects: Project[];
  onSelect: (project: Project) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
}

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ projects, onSelect, onCreate, onDelete }) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      onCreate(newProjectName);
      setNewProjectName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-950 text-white items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="mb-12 text-center">
            <h1 className="text-4xl font-light tracking-tight mb-2">Design Agent <span className="text-violet-500 font-bold">7.0</span></h1>
            <p className="text-slate-400">Select a project to begin your studio session.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create New Card */}
          <div className="bg-slate-900/50 border border-slate-800 border-dashed hover:border-violet-500/50 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[200px] transition-all group">
            {isCreating ? (
              <form onSubmit={handleCreate} className="w-full">
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
                  <button type="button" onClick={() => setIsCreating(false)} className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg">CANCEL</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setIsCreating(true)} className="flex flex-col items-center gap-3 text-slate-500 hover:text-violet-400">
                <div className="p-4 bg-slate-800 rounded-full group-hover:bg-slate-800/80 transition-colors">
                   <Plus className="w-8 h-8" />
                </div>
                <span className="font-medium">New Project</span>
              </button>
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
  );
};

export default ProjectDashboard;
