import React, { useState, useEffect } from 'react';
import { Project, Company, Contract, FinancialBatch, ContractType } from '../types';
import { getProjectById, addNodeToProject, addCompanyToNode, addContractToCompany, deleteCompany, deleteContract, addFinancialBatch, deleteFinancialBatch, nestContract } from '../services/storageService';
import { VisualizationHeader } from '../components/VisualizationHeader';
import { CompanyCard } from '../components/CompanyCard';
import { Plus, ArrowRight, Home } from 'lucide-react';
import { Modal } from '../components/Modal';

interface ProjectDetailProps {
  projectId: string;
  onNavigate: (route: string) => void;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ projectId, onNavigate }) => {
  const [project, setProject] = useState<Project | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  
  // State for Adding Company
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');

  // State for Linking Contract (Drop Action)
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [pendingLink, setPendingLink] = useState<{
      sourceContractId: string;
      sourceContractTitle: string;
      sourceContractColor: string;
      targetCompanyId: string;
      targetNodeId: string; // The node where the target company resides
  } | null>(null);
  const [linkForm, setLinkForm] = useState({ totalAmount: '', taxRate: '' });

  // Helper to refresh data
  const refreshProject = () => {
    const p = getProjectById(projectId);
    setProject(p);
  };

  useEffect(() => {
    refreshProject();
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleAddNode = () => {
    if (project) {
      addNodeToProject(project.id);
      refreshProject();
    }
  };

  const handleAddCompany = () => {
    if (project && activeNodeId && companyName) {
      addCompanyToNode(project.id, activeNodeId, companyName);
      setActiveNodeId(null);
      setCompanyName('');
      refreshProject();
    }
  };

  const handleAddContract = (nodeId: string, companyId: string, contractData: Omit<Contract, 'id' | 'color' | 'financials'>) => {
      if (project) {
          addContractToCompany(project.id, nodeId, companyId, contractData);
          refreshProject();
      }
  };

  const handleDeleteCompany = (nodeId: string, companyId: string) => {
      if(project && window.confirm('确定删除该公司及旗下所有合同？')) {
          deleteCompany(project.id, nodeId, companyId);
          refreshProject();
      }
  };

  const handleDeleteContract = (nodeId: string, companyId: string, contractId: string) => {
      if(project && window.confirm('确定删除该合同？')) {
          deleteContract(project.id, nodeId, companyId, contractId);
          refreshProject();
      }
  };

  const handleAddBatch = (nodeId: string, companyId: string, contractId: string, batch: Omit<FinancialBatch, 'id'>) => {
      if(project) {
          addFinancialBatch(project.id, nodeId, companyId, contractId, batch);
          refreshProject();
      }
  };

  const handleDeleteBatch = (nodeId: string, companyId: string, contractId: string, batchId: string) => {
      if(project) {
          deleteFinancialBatch(project.id, nodeId, companyId, contractId, batchId);
          refreshProject();
      }
  };

  const handleNestContract = (nodeId: string, companyId: string, parentContractId: string, childContractId: string) => {
      if(project) {
          nestContract(project.id, nodeId, companyId, parentContractId, childContractId);
          refreshProject();
      }
  };

  // Drag and Drop Linking
  const handleDropContract = (nodeId: string, dropData: any, targetCompanyId: string) => {
      // Validate: Can't drop on same node (logic generally prevents this, but safety check)
      if (dropData.nodeId === nodeId) return;
      
      setPendingLink({
          sourceContractId: dropData.contractId,
          sourceContractTitle: dropData.contractTitle,
          sourceContractColor: dropData.contractColor,
          targetCompanyId: targetCompanyId,
          targetNodeId: nodeId
      });
      setLinkModalOpen(true);
  };

  const confirmLinkContract = () => {
      if(!pendingLink || !linkForm.totalAmount) return;
      
      if(project) {
          addContractToCompany(project.id, pendingLink.targetNodeId, pendingLink.targetCompanyId, {
              title: `承接: ${pendingLink.sourceContractTitle}`,
              type: ContractType.INCOMING,
              totalAmount: parseFloat(linkForm.totalAmount),
              taxRate: parseFloat(linkForm.taxRate) || 0,
              sourceContractId: pendingLink.sourceContractId,
              color: pendingLink.sourceContractColor // Use same color
          });
          refreshProject();
      }
      
      setLinkModalOpen(false);
      setPendingLink(null);
      setLinkForm({ totalAmount: '', taxRate: '' });
  };

  if (loading) return <div>Loading...</div>;
  if (!project) return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="text-xl text-gray-800 font-semibold mb-4">工程不存在</div>
        <button 
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-blue-600 transition"
        >
            <Home size={18} />
            返回首页
        </button>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Nav */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-4 shrink-0 z-20">
        <button 
            onClick={() => onNavigate('/')}
            className="flex items-center gap-1 text-gray-600 hover:text-primary text-sm"
        >
            <Home size={16} />
            返回列表
        </button>
        <div className="h-4 w-px bg-gray-300"></div>
        <span className="font-medium text-gray-800">{project.name} - 管理看板</span>
      </div>

      {/* Stats Header */}
      <div className="shrink-0">
        <VisualizationHeader project={project} />
      </div>

      {/* Kanban Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
         <div className="inline-flex h-full gap-8">
            {project.nodes.map((node, index) => (
                <div key={node.id} className="flex flex-col h-full min-w-[20rem] w-auto shrink-0">
                    <div className="mb-3 flex justify-between items-center font-bold text-gray-700 bg-gray-200 p-2 rounded-lg border border-gray-300">
                        <span>{node.name}</span>
                        <button 
                            onClick={() => setActiveNodeId(node.id)}
                            className="text-primary hover:bg-white rounded p-1 transition"
                            title="添加参与公司"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                    
                    {/* Company List */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 pr-2 pb-20 custom-scrollbar">
                        {node.companies.map(company => (
                            <CompanyCard 
                                key={company.id} 
                                company={company}
                                nodeId={node.id}
                                isFirstNode={index === 0}
                                onAddContract={(data) => handleAddContract(node.id, company.id, data)}
                                onDeleteCompany={() => handleDeleteCompany(node.id, company.id)}
                                onDeleteContract={(contractId) => handleDeleteContract(node.id, company.id, contractId)}
                                onAddBatch={(cId, batch) => handleAddBatch(node.id, company.id, cId, batch)}
                                onDeleteBatch={(cId, bId) => handleDeleteBatch(node.id, company.id, cId, bId)}
                                onDropContract={(data, targetId) => handleDropContract(node.id, data, targetId)}
                                onNestContract={(parentId, childId) => handleNestContract(node.id, company.id, parentId, childId)}
                            />
                        ))}
                        
                        {node.companies.length === 0 && (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400 text-sm">
                                点击上方 "+" 添加公司
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Add Node Button */}
            <div className="flex flex-col h-full w-20 items-center pt-12 shrink-0">
                <button 
                    onClick={handleAddNode}
                    className="w-12 h-12 bg-white rounded-full shadow flex items-center justify-center text-primary hover:bg-blue-50 transition hover:scale-110"
                    title="添加新阶段节点"
                >
                    <ArrowRight size={24} />
                </button>
                <span className="mt-2 text-xs text-gray-500 font-medium">新节点</span>
            </div>
            
            {/* Spacer for right padding */}
            <div className="w-8 shrink-0"></div>
         </div>
      </div>

      {/* Modal for Adding Company */}
      <Modal 
        isOpen={!!activeNodeId} 
        onClose={() => setActiveNodeId(null)} 
        title="添加公司 / 参与方"
      >
        <div className="space-y-4">
           <div>
             <label className="block text-sm font-medium text-gray-700">
                公司名称 (从参与单位中选择) <span className="text-red-500 ml-1">*</span>
             </label>
             <select
                className="mt-1 w-full border rounded px-2 py-2 border-l-4 border-l-red-500"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                autoFocus
             >
                <option value="">-- 请选择 --</option>
                {project.participants.map(p => (
                    <option key={p} value={p}>{p}</option>
                ))}
             </select>
             {project.participants.length === 0 && (
                 <p className="text-xs text-red-500 mt-2 bg-red-50 p-2 rounded">
                     注意：该项目尚未配置参与单位，无法添加。请返回项目列表页编辑项目信息，添加参与单位。
                 </p>
             )}
           </div>
           <div className="flex justify-end">
              <button 
                onClick={handleAddCompany}
                className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!companyName}
              >
                确认添加
              </button>
           </div>
        </div>
      </Modal>

      {/* Modal for Linking Contract */}
      <Modal
        isOpen={linkModalOpen}
        onClose={() => { setLinkModalOpen(false); setPendingLink(null); }}
        title="关联承接项目"
      >
          <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 mb-2">
                  正在关联上游项目: <br/>
                  <span className="font-bold">{pendingLink?.sourceContractTitle}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        承接合同金额 <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input 
                        type="number" 
                        className="mt-1 w-full border rounded px-2 py-2 border-l-4 border-l-red-500"
                        value={linkForm.totalAmount}
                        onChange={e => setLinkForm({...linkForm, totalAmount: e.target.value})}
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">税率 (%)</label>
                    <input 
                        type="number" 
                        className="mt-1 w-full border rounded px-2 py-2"
                        value={linkForm.taxRate}
                        onChange={e => setLinkForm({...linkForm, taxRate: e.target.value})}
                    />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                  <button 
                    onClick={confirmLinkContract}
                    className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    确认关联
                  </button>
              </div>
          </div>
      </Modal>
    </div>
  );
};