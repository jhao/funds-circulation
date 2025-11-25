import React, { useState } from 'react';
import { Company, Contract, ContractType, FinancialBatch } from '../types';
import { ContractItem } from './ContractItem';
import { Plus, Building2, Trash2 } from 'lucide-react';
import { Modal } from './Modal';

interface CompanyCardProps {
  company: Company;
  nodeId: string;
  isFirstNode: boolean;
  onAddContract: (data: Omit<Contract, 'id' | 'color' | 'financials'>) => void;
  onDeleteCompany: () => void;
  onDeleteContract: (contractId: string) => void;
  onAddBatch: (contractId: string, batch: Omit<FinancialBatch, 'id'>) => void;
  onDeleteBatch: (contractId: string, batchId: string) => void;
  onDropContract: (data: any, targetCompanyId: string) => void;
  onNestContract: (parentContractId: string, childContractId: string) => void;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({ 
    company, 
    nodeId,
    isFirstNode,
    onAddContract, 
    onDeleteCompany,
    onDeleteContract,
    onAddBatch,
    onDeleteBatch,
    onDropContract,
    onNestContract
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [form, setForm] = useState({
    title: '',
    type: isFirstNode ? ContractType.OUTGOING : ContractType.INCOMING,
    totalAmount: '',
    taxRate: '',
  });

  const handleSubmit = () => {
      if(!form.title || !form.totalAmount) return;

      onAddContract({
          title: form.title,
          type: form.type,
          totalAmount: parseFloat(form.totalAmount),
          taxRate: parseFloat(form.taxRate) || 0,
      });
      setIsModalOpen(false);
      setForm({
        title: '',
        type: isFirstNode ? ContractType.OUTGOING : ContractType.INCOMING,
        totalAmount: '',
        taxRate: '',
      });
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
  };

  const handleDragLeave = () => {
      setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const json = e.dataTransfer.getData('application/json');
      if (json) {
          const data = JSON.parse(json);
          // Only allow dropping from different nodes (handled mostly by logic in parent, but good to check here or just pass up)
          if (data.nodeId !== nodeId) {
              onDropContract(data, company.id);
          }
      }
  };

  // Sort contracts: INCOMING first, then OUTGOING
  const incomingContracts = company.contracts.filter(c => c.type === ContractType.INCOMING);
  const outgoingContracts = company.contracts.filter(c => c.type === ContractType.OUTGOING);

  // Helper to render nested contracts
  const renderContract = (c: Contract) => (
      <ContractItem 
          key={c.id} 
          contract={c} 
          nodeId={nodeId}
          companyId={company.id}
          onDelete={() => onDeleteContract(c.id)}
          onAddBatch={(b) => onAddBatch(c.id, b)}
          onDeleteBatch={(bid) => onDeleteBatch(c.id, bid)}
          onNestContract={(childId, parentId) => onNestContract(parentId, childId)}
          renderSubContract={renderContract}
      />
  );

  return (
    <div 
        className={`bg-white rounded-lg shadow border min-w-[20rem] w-full flex-shrink-0 flex flex-col relative group transition-colors duration-200 ${isDragOver ? 'border-primary ring-2 ring-blue-200 bg-blue-50' : 'border-gray-200'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      <div className="p-3 border-b bg-gray-50 rounded-t-lg flex justify-between items-center">
         <div className="flex items-center gap-2 font-bold text-gray-700 flex-1 min-w-0">
            <Building2 size={18} className="text-primary flex-shrink-0" />
            <span className="truncate" title={company.name}>{company.name}</span>
         </div>
         <div className="flex gap-1 flex-shrink-0">
            <button 
                onClick={onDeleteCompany}
                className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Trash2 size={16} />
            </button>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="text-primary hover:bg-blue-100 p-1 rounded"
            >
                <Plus size={18} />
            </button>
         </div>
      </div>

      <div className="p-3 flex-1 flex flex-col gap-4 relative">
          {/* Visual Connector Line for Internal Flow */}
          {incomingContracts.length > 0 && outgoingContracts.length > 0 && (
             <div className="absolute left-6 top-10 bottom-10 w-0.5 bg-gray-300 border-l border-dashed border-gray-300 z-0" style={{left: '50%'}}></div>
          )}

          {/* Incoming Section */}
          {!isFirstNode && (
              <div className="relative z-10">
                <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">承接 (Input)</div>
                {incomingContracts.length === 0 ? (
                    <div className="text-xs text-gray-400 italic text-center py-2 border border-dashed rounded">
                        无承接合同
                        <div className="text-[10px] mt-1 text-gray-300">拖拽上游项目至此</div>
                    </div>
                ) : (
                    incomingContracts.map(c => renderContract(c))
                )}
              </div>
          )}

          {/* Outgoing Section */}
          <div className="relative z-10">
             <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">转出 (Output)</div>
             {outgoingContracts.length === 0 ? (
                <div className="text-xs text-gray-400 italic text-center py-2 border border-dashed rounded">
                    无转出合同
                    <div className="text-[10px] mt-1 text-gray-300">可拖入上方承接合同中</div>
                </div>
             ) : (
                outgoingContracts.map(c => renderContract(c))
             )}
          </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="添加合同">
         <div className="space-y-3">
            <div>
                <label className="block text-sm font-medium text-gray-700">
                    合同名称 <span className="text-red-500 ml-1">*</span>
                </label>
                <input 
                    type="text" 
                    className="mt-1 w-full border rounded px-2 py-1.5 border-l-4 border-l-red-500" 
                    value={form.title}
                    onChange={e => setForm({...form, title: e.target.value})}
                    placeholder="请输入合同名称"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">类型</label>
                <select 
                    className="mt-1 w-full border rounded px-2 py-1.5"
                    value={form.type}
                    onChange={e => setForm({...form, type: e.target.value as ContractType})}
                    disabled={isFirstNode}
                >
                    <option value={ContractType.INCOMING} disabled={isFirstNode}>承接 (Input)</option>
                    <option value={ContractType.OUTGOING}>转出 (Output)</option>
                </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        合同金额 (¥) <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input 
                        type="number" 
                        className="mt-1 w-full border rounded px-2 py-1.5 border-l-4 border-l-red-500" 
                        value={form.totalAmount}
                        onChange={e => setForm({...form, totalAmount: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">综合税率 (%)</label>
                    <input 
                        type="number" 
                        className="mt-1 w-full border rounded px-2 py-1.5" 
                        value={form.taxRate}
                        onChange={e => setForm({...form, taxRate: e.target.value})}
                    />
                </div>
            </div>
            
            <div className="pt-4 flex justify-end">
                <button 
                    onClick={handleSubmit}
                    className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    保存合同
                </button>
            </div>
         </div>
      </Modal>
    </div>
  );
};