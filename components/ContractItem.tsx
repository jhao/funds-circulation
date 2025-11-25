import React, { useState } from 'react';
import { Contract, ContractType, FinancialBatch } from '../types';
import { formatCurrency, calculateTax } from '../utils/helpers';
import { Trash2, ChevronDown, ChevronUp, CreditCard, Receipt, Plus } from 'lucide-react';

interface ContractItemProps {
  contract: Contract;
  nodeId: string;
  companyId?: string; // Needed for verify nesting source
  onDelete: () => void;
  onAddBatch: (batch: Omit<FinancialBatch, 'id'>) => void;
  onDeleteBatch: (batchId: string) => void;
  // New props for recursion and nesting
  onNestContract?: (draggedContractId: string, targetContractId: string) => void;
  renderSubContract?: (sub: Contract) => React.ReactNode;
}

export const ContractItem: React.FC<ContractItemProps> = ({ 
    contract, 
    nodeId,
    companyId,
    onDelete, 
    onAddBatch, 
    onDeleteBatch,
    onNestContract,
    renderSubContract
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState<'INVOICE' | 'PAYMENT' | null>(null);
  const [batchForm, setBatchForm] = useState({ amount: '', date: '', taxRate: '' });
  const [isDragOver, setIsDragOver] = useState(false);

  // Terminology Adjustment
  // INCOMING = Invoice (开票)
  // OUTGOING = Receive Invoice (收票)
  const invoiceLabel = contract.type === ContractType.INCOMING ? '开票' : '收票';

  const contractTaxAmount = calculateTax(contract.totalAmount, contract.taxRate);
  
  const handleAddBatch = () => {
      if(!batchForm.amount) return;
      onAddBatch({
          type: showBatchForm!,
          amount: parseFloat(batchForm.amount),
          date: batchForm.date,
          taxRate: batchForm.taxRate ? parseFloat(batchForm.taxRate) : contract.taxRate
      });
      setShowBatchForm(null);
      setBatchForm({ amount: '', date: '', taxRate: '' });
  };

  const handleDragStart = (e: React.DragEvent) => {
      // Allow dragging Outgoing contracts
      if (contract.type === ContractType.OUTGOING) {
        e.dataTransfer.setData('application/json', JSON.stringify({
            contractId: contract.id,
            nodeId: nodeId,
            companyId: companyId, // Include companyId to check for internal nesting
            contractTitle: contract.title,
            contractColor: contract.color,
            type: contract.type
        }));
        e.dataTransfer.effectAllowed = 'move'; // Support move for nesting
      }
  };

  const handleDragOver = (e: React.DragEvent) => {
      // Only allow dropping OUTGOING onto INCOMING
      if (contract.type === ContractType.INCOMING && onNestContract) {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(true);
      }
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
  }

  const handleDrop = (e: React.DragEvent) => {
      if (contract.type !== ContractType.INCOMING || !onNestContract) return;
      
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      
      const json = e.dataTransfer.getData('application/json');
      if (json) {
          const data = JSON.parse(json);
          // Check if it's an Outgoing contract from the same company (Nesting)
          // Data.companyId comes from the drag source
          if (data.type === ContractType.OUTGOING && data.companyId === companyId && data.nodeId === nodeId) {
              onNestContract(data.contractId, contract.id);
          }
      }
  };

  const invoices = contract.financials?.filter(f => f.type === 'INVOICE') || [];
  const payments = contract.financials?.filter(f => f.type === 'PAYMENT') || [];
  
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  // Stats for Green Header
  const remainingInvoiced = contract.totalAmount - totalInvoiced;
  const remainingPaid = contract.totalAmount - totalPaid;

  // Sub-contract Aggregation
  const subContracts = contract.subContracts || [];
  const totalSubAmount = subContracts.reduce((sum, c) => sum + c.totalAmount, 0);
  const totalSubPaid = subContracts.reduce((sum, c) => {
      return sum + (c.financials?.filter(f => f.type === 'PAYMENT').reduce((pSum, p) => pSum + p.amount, 0) || 0);
  }, 0);
  const remainingIncomingMargin = contract.totalAmount - totalSubAmount;

  return (
    <div 
      className={`mb-3 border rounded-lg bg-white shadow-sm overflow-hidden transition-all duration-200 
        ${contract.type === ContractType.OUTGOING ? 'cursor-grab active:cursor-grabbing' : ''}
        ${isDragOver ? 'ring-2 ring-primary ring-offset-1 bg-blue-50' : ''}
      `}
      style={{ borderLeft: `4px solid ${contract.color}` }}
      draggable={contract.type === ContractType.OUTGOING}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div 
        className="p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${contract.type === ContractType.INCOMING ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                        {contract.type === ContractType.INCOMING ? '承接' : '转出'}
                    </span>
                    <h5 className="font-medium text-gray-900 truncate text-sm" title={contract.title}>{contract.title}</h5>
                </div>
                <div className="text-xs text-gray-500 mt-1 font-mono flex gap-2">
                    <span>{formatCurrency(contract.totalAmount)}</span>
                    {contract.sourceContractId && <span className="text-blue-500 text-[10px] bg-blue-50 px-1 rounded">Linked</span>}
                </div>
            </div>
            <div className="ml-2 flex items-center text-gray-400">
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
        </div>
        
        {/* Summary Stats Header: Modified for Incoming vs Outgoing (2 lines) */}
        {contract.type === ContractType.INCOMING ? (
             <div className="mt-2 text-[10px] flex flex-col gap-1 text-indigo-600 font-medium bg-indigo-50/50 p-1.5 rounded">
                <div className="flex justify-between items-center">
                    <span>转出总额: {formatCurrency(totalSubAmount)}</span>
                    <span>已付转出: {formatCurrency(totalSubPaid)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-indigo-100/50 pt-1">
                    <span></span> {/* Spacer */}
                    <span className={remainingIncomingMargin < 0 ? 'text-red-500' : 'text-green-600'}>
                        剩余(毛利): {formatCurrency(remainingIncomingMargin)}
                    </span>
                </div>
             </div>
        ) : (
             <div className="mt-2 text-[10px] flex flex-col gap-1 text-emerald-600 font-medium bg-emerald-50/50 p-1.5 rounded">
                <div className="flex justify-between items-center">
                    <span>已付: {formatCurrency(totalPaid)}</span>
                    <span>已{invoiceLabel}: {formatCurrency(totalInvoiced)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-emerald-100/50 pt-1">
                    <span className={remainingPaid < 0 ? 'text-red-500' : ''}>未付: {formatCurrency(remainingPaid)}</span>
                    <span className={remainingInvoiced < 0 ? 'text-red-500' : ''}>未{invoiceLabel}: {formatCurrency(remainingInvoiced)}</span>
                </div>
            </div>
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-3 bg-gray-50 text-xs space-y-3 border-t pt-2 cursor-default">
           
           {/* Contract Stats */}
           <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded border border-gray-100">
              <div>
                <span className="text-gray-400 block">综合税率</span>
                <span className="font-medium">{contract.taxRate}%</span>
              </div>
              <div>
                 <span className="text-gray-400 block">合同税额</span>
                 <span className="font-medium">{formatCurrency(contractTaxAmount)}</span>
              </div>
           </div>
           
           {/* Invoices */}
           <div className="border border-gray-200 rounded bg-white overflow-hidden">
              <div className="flex items-center justify-between bg-blue-50 px-2 py-1.5 border-b border-blue-100">
                <div className="flex items-center gap-1 text-blue-700">
                    <Receipt size={12} />
                    <span className="font-bold">{invoiceLabel}记录</span>
                </div>
                <span className="font-mono">{formatCurrency(totalInvoiced)}</span>
              </div>
              <div className="p-2 space-y-2">
                  {invoices.map(inv => {
                      const tax = calculateTax(inv.amount, inv.taxRate);
                      return (
                        <div key={inv.id} className="flex justify-between items-center border-b border-gray-100 pb-1 last:border-0">
                            <div>
                                <div className="font-medium">{formatCurrency(inv.amount)}</div>
                                <div className="text-gray-400 scale-90 origin-left">{inv.date || '-'} (税: {formatCurrency(tax)})</div>
                            </div>
                            <button onClick={() => onDeleteBatch(inv.id)} className="text-red-300 hover:text-red-500"><Trash2 size={12} /></button>
                        </div>
                      )
                  })}
                  
                  {showBatchForm === 'INVOICE' ? (
                      <div className="bg-gray-50 p-2 rounded border border-blue-200 mt-2">
                          <input type="number" placeholder="金额 *" className="w-full mb-1 border-l-2 border-red-500 rounded px-1 py-0.5" autoFocus
                                 value={batchForm.amount} onChange={e => setBatchForm({...batchForm, amount: e.target.value})} />
                          <div className="flex gap-1 mb-1">
                             <input type="date" className="w-1/2 border rounded px-1 py-0.5" 
                                    value={batchForm.date} onChange={e => setBatchForm({...batchForm, date: e.target.value})} />
                             <input type="number" placeholder={`税率% (${contract.taxRate})`} className="w-1/2 border rounded px-1 py-0.5" 
                                    value={batchForm.taxRate} onChange={e => setBatchForm({...batchForm, taxRate: e.target.value})} />
                          </div>
                          <div className="flex justify-end gap-2">
                              <button onClick={() => setShowBatchForm(null)} className="px-2 py-0.5 text-gray-500">取消</button>
                              <button onClick={handleAddBatch} className="px-2 py-0.5 bg-blue-500 text-white rounded">确认</button>
                          </div>
                      </div>
                  ) : (
                      <button onClick={() => setShowBatchForm('INVOICE')} className="w-full py-1 text-blue-500 border border-dashed border-blue-200 rounded hover:bg-blue-50 flex justify-center items-center gap-1">
                          <Plus size={12} /> 添加{invoiceLabel}
                      </button>
                  )}
              </div>
           </div>

           {/* Payments */}
           <div className="border border-gray-200 rounded bg-white overflow-hidden">
              <div className="flex items-center justify-between bg-green-50 px-2 py-1.5 border-b border-green-100">
                <div className="flex items-center gap-1 text-green-700">
                    <CreditCard size={12} />
                    <span className="font-bold">收付款记录</span>
                </div>
                <span className="font-mono">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="p-2 space-y-2">
                  {payments.map(pay => (
                    <div key={pay.id} className="flex justify-between items-center border-b border-gray-100 pb-1 last:border-0">
                        <div>
                            <div className="font-medium">{formatCurrency(pay.amount)}</div>
                            <div className="text-gray-400 scale-90 origin-left">{pay.date || '-'}</div>
                        </div>
                        <button onClick={() => onDeleteBatch(pay.id)} className="text-red-300 hover:text-red-500"><Trash2 size={12} /></button>
                    </div>
                  ))}

                  {showBatchForm === 'PAYMENT' ? (
                      <div className="bg-gray-50 p-2 rounded border border-green-200 mt-2">
                          <input type="number" placeholder="金额 *" className="w-full mb-1 border-l-2 border-red-500 rounded px-1 py-0.5" autoFocus
                                 value={batchForm.amount} onChange={e => setBatchForm({...batchForm, amount: e.target.value})} />
                          <div className="flex gap-1 mb-1">
                             <input type="date" className="w-full border rounded px-1 py-0.5" 
                                    value={batchForm.date} onChange={e => setBatchForm({...batchForm, date: e.target.value})} />
                          </div>
                          <div className="flex justify-end gap-2">
                              <button onClick={() => setShowBatchForm(null)} className="px-2 py-0.5 text-gray-500">取消</button>
                              <button onClick={handleAddBatch} className="px-2 py-0.5 bg-green-500 text-white rounded">确认</button>
                          </div>
                      </div>
                  ) : (
                      <button onClick={() => setShowBatchForm('PAYMENT')} className="w-full py-1 text-green-500 border border-dashed border-green-200 rounded hover:bg-green-50 flex justify-center items-center gap-1">
                          <Plus size={12} /> 添加收付
                      </button>
                  )}
              </div>
           </div>

           {/* Nested Sub-contracts Render */}
           {subContracts.length > 0 && renderSubContract && (
               <div className="mt-2 border-l-2 border-dashed border-gray-300 pl-2">
                   <div className="text-[10px] text-gray-500 font-semibold mb-2 uppercase">关联转出合同 (Nested)</div>
                   {subContracts.map(sub => renderSubContract(sub))}
               </div>
           )}

           <div className="flex justify-end pt-2">
               <button 
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete();
                }}
                className="text-red-500 hover:bg-red-100 p-1 rounded transition flex items-center gap-1"
                title="删除合同"
               >
                   <Trash2 size={14} /> 删除合同
               </button>
           </div>
        </div>
      )}
    </div>
  );
};