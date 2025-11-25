import React from 'react';
import { Project, ProjectStatus } from '../types';
import { formatDate } from '../utils/helpers';
import { Calendar, Clock, Tag, Trash2, Edit } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

const statusColors = {
  [ProjectStatus.ACTIVE]: 'bg-blue-100 text-blue-800',
  [ProjectStatus.PAUSED]: 'bg-yellow-100 text-yellow-800',
  [ProjectStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [ProjectStatus.ABNORMAL]: 'bg-red-100 text-red-800',
};

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, onEdit, onDelete }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-200 p-6 cursor-pointer transition-all duration-200"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-gray-900 truncate">{project.name}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[project.status]}`}>
          {project.status}
        </span>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            <div className="flex flex-wrap gap-1">
            {project.participants.slice(0, 3).map((p, i) => (
                <span key={i} className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{p}</span>
            ))}
            {project.participants.length > 3 && <span>...</span>}
            </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(project.startDate)} - {formatDate(project.endDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>更新于: {formatDate(project.lastUpdated)}</span>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button 
          onClick={onEdit}
          className="text-blue-500 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded hover:bg-blue-50 transition flex items-center gap-1"
        >
          <Edit size={14} /> 编辑
        </button>
        <button 
          onClick={onDelete}
          className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition flex items-center gap-1"
        >
          <Trash2 size={14} /> 删除
        </button>
      </div>
    </div>
  );
};