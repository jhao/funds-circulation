import React, { useState, useEffect, useRef } from 'react';
import { Project, ProjectStatus, ProjectFormValues } from '../types';
import { getProjects, createProject, updateProject, deleteProject, exportData, importData } from '../services/storageService';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/helpers';
import { 
    Plus, Search, Download, Upload, Trash2, Edit, 
    ArrowUp, ArrowDown, ArrowUpDown, Filter, Eye
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (route: string) => void;
}

type SortKey = 'lastUpdated' | 'startDate' | 'endDate';
type SortDirection = 'asc' | 'desc';

const STATUS_CONFIG = {
  [ProjectStatus.ACTIVE]: { color: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  [ProjectStatus.PAUSED]: { color: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
  [ProjectStatus.COMPLETED]: { color: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500' },
  [ProjectStatus.ABNORMAL]: { color: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500' },
};

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sorting State
  const [sortKey, setSortKey] = useState<SortKey>('lastUpdated');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filter State
  const [selectedStatuses, setSelectedStatuses] = useState<ProjectStatus[]>([]);

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectFormValues>({
    name: '',
    participants: '',
    startDate: '',
    endDate: '',
    status: ProjectStatus.ACTIVE
  });
  
  // Hidden file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProjects(getProjects());
  }, []);

  // --- Actions ---

  const handleSave = () => {
    if (!form.name) return;
    
    const participantsList = form.participants.split(/[,，]/).map(s => s.trim()).filter(Boolean);

    if (editingId) {
        const projectToUpdate = projects.find(p => p.id === editingId);
        if (projectToUpdate) {
            const updatedProject = {
                ...projectToUpdate,
                name: form.name,
                participants: participantsList,
                startDate: form.startDate,
                endDate: form.endDate,
                status: form.status
            };
            updateProject(updatedProject);
            setProjects(getProjects());
        }
    } else {
        createProject({
            name: form.name,
            participants: participantsList,
            startDate: form.startDate,
            endDate: form.endDate,
            status: form.status
        });
        setProjects(getProjects());
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这个工程吗？这将删除所有相关合同数据，不可恢复。')) {
      deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleExport = () => {
      const dataStr = exportData();
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `finance_circle_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const content = event.target?.result as string;
          if (content && importData(content)) {
              setProjects(getProjects());
              alert('数据导入成功！');
          } else {
              alert('数据导入失败，文件格式可能不正确。');
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset
  };

  const toggleSort = (key: SortKey) => {
      if (sortKey === key) {
          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          setSortKey(key);
          setSortDirection('desc'); // Default to new desc
      }
  };

  const toggleStatusFilter = (status: ProjectStatus) => {
      setSelectedStatuses(prev => 
          prev.includes(status) 
              ? prev.filter(s => s !== status) 
              : [...prev, status]
      );
  };

  // --- Processing Data ---

  const filteredAndSortedProjects = projects
    // 1. Search Filter
    .filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.participants.some(part => part.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    // 2. Status Filter
    .filter(p => 
        selectedStatuses.length === 0 || selectedStatuses.includes(p.status)
    )
    // 3. Sorting
    .sort((a, b) => {
        const valA = a[sortKey] || '';
        const valB = b[sortKey] || '';
        
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

  // --- Modal Helpers ---

  const openCreateModal = () => {
      resetForm();
      setIsModalOpen(true);
  };

  const handleEditClick = (project: Project) => {
      setEditingId(project.id);
      setForm({
          name: project.name,
          participants: project.participants.join(', '),
          startDate: project.startDate,
          endDate: project.endDate,
          status: project.status
      });
      setIsModalOpen(true);
  };

  const resetForm = () => {
      setEditingId(null);
      setForm({ name: '', participants: '', startDate: '', endDate: '', status: ProjectStatus.ACTIVE });
  };

  // --- Sub-components ---
  
  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
      if (sortKey !== colKey) return <ArrowUpDown size={14} className="text-gray-400 ml-1 inline" />;
      return sortDirection === 'asc' 
        ? <ArrowUp size={14} className="text-primary ml-1 inline" /> 
        : <ArrowDown size={14} className="text-primary ml-1 inline" />;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">财圈工程管理</h1>
          <p className="text-gray-500 mt-1">工程、合同与票据资金流向控制台</p>
        </div>
        <div className="flex items-center gap-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".json"
            />
            <button 
                onClick={handleImportClick}
                className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-2 transition text-sm font-medium"
            >
                <Upload size={16} /> 导入
            </button>
            <button 
                onClick={handleExport}
                className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-2 transition text-sm font-medium"
            >
                <Download size={16} /> 导出
            </button>
            <button 
                onClick={openCreateModal}
                className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow flex items-center gap-2 transition text-sm font-medium"
            >
                <Plus size={18} /> 新建工程
            </button>
        </div>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 space-y-4 md:space-y-0 md:flex md:justify-between md:items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
            type="text" 
            placeholder="搜索工程名称..." 
            className="w-full pl-9 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <div className="flex items-center text-gray-500 text-sm gap-1 mr-2">
                <Filter size={14} /> <span>状态筛选:</span>
            </div>
            {Object.values(ProjectStatus).map(status => {
                const isSelected = selectedStatuses.includes(status);
                const config = STATUS_CONFIG[status];
                return (
                    <button
                        key={status}
                        onClick={() => toggleStatusFilter(status)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 whitespace-nowrap
                            ${isSelected ? config.color + ' ring-1 ring-offset-1 ring-gray-300 shadow-sm' : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100'}
                        `}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? config.dot : 'bg-gray-400'}`}></span>
                        {status}
                    </button>
                )
            })}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                            工程名称
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                            参与单位
                        </th>
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                            onClick={() => toggleSort('startDate')}
                        >
                            开始日期 <SortIcon colKey="startDate" />
                        </th>
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                            onClick={() => toggleSort('endDate')}
                        >
                            结束日期 <SortIcon colKey="endDate" />
                        </th>
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                            onClick={() => toggleSort('lastUpdated')}
                        >
                            最后更新 <SortIcon colKey="lastUpdated" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            状态
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            操作
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedProjects.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-sm">
                                没有找到符合条件的工程
                            </td>
                        </tr>
                    ) : (
                        filteredAndSortedProjects.map((project) => (
                            <tr key={project.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-gray-900">{project.name}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {project.participants.slice(0, 2).map((p, i) => (
                                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                {p}
                                            </span>
                                        ))}
                                        {project.participants.length > 2 && (
                                            <span className="text-xs text-gray-500 self-center">+{project.participants.length - 2}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatDate(project.startDate)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatDate(project.endDate)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(project.lastUpdated).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_CONFIG[project.status].color}`}>
                                        {project.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => onNavigate(`#/project/${project.id}`)}
                                            className="text-primary hover:text-blue-900 bg-blue-50 p-1.5 rounded"
                                            title="查看详情"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleEditClick(project)}
                                            className="text-gray-600 hover:text-gray-900 bg-gray-100 p-1.5 rounded"
                                            title="编辑"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(project.id)}
                                            className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded"
                                            title="删除"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "编辑工程" : "新建工程"}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
                工程名称 <span className="text-red-500 ml-1">*</span>
            </label>
            <input 
              className="mt-1 w-full border rounded-md p-2 border-l-4 border-l-red-500" 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})}
              placeholder="例如：XX市中心体育馆建设"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">参与单位 (逗号分隔)</label>
            <textarea
              className="mt-1 w-full border rounded-md p-2 h-20" 
              value={form.participants} 
              onChange={e => setForm({...form, participants: e.target.value})}
              placeholder="甲公司, 乙公司, 丙分包... (支持中英文逗号)"
            />
            <p className="text-xs text-gray-400 mt-1">这些单位将用于后续合同节点中供选择。</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">开始日期</label>
              <input 
                type="date" 
                className="mt-1 w-full border rounded-md p-2" 
                value={form.startDate} 
                onChange={e => setForm({...form, startDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">结束日期</label>
              <input 
                type="date" 
                className="mt-1 w-full border rounded-md p-2" 
                value={form.endDate} 
                onChange={e => setForm({...form, endDate: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">状态</label>
            <select 
              className="mt-1 w-full border rounded-md p-2"
              value={form.status}
              onChange={e => setForm({...form, status: e.target.value as ProjectStatus})}
            >
              {Object.values(ProjectStatus).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end pt-4">
            <button 
              className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={handleSave}
            >
              {editingId ? "保存修改" : "创建"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};