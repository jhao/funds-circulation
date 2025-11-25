import React, { useMemo } from 'react';
import { Project } from '../types';
import { formatCurrency } from '../utils/helpers';
import * as d3 from 'd3';

interface VisualizationHeaderProps {
  project: Project;
}

export const VisualizationHeader: React.FC<VisualizationHeaderProps> = ({ project }) => {
  // Calculate totals per node for a simple bar chart visualization
  const data = useMemo(() => {
    return project.nodes.map(node => {
       const totalValue = node.companies.reduce((acc, company) => {
           return acc + company.contracts.reduce((cAcc, contract) => cAcc + contract.totalAmount, 0);
       }, 0);
       return {
           name: node.name,
           value: totalValue
       };
    });
  }, [project]);

  // Basic scale for width
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="bg-white border-b border-gray-200 p-4 mb-4">
       <div className="flex justify-between items-center mb-4">
           <div>
               <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
               <div className="flex gap-2 mt-1">
                   {project.participants.map((p,i) => (
                       <span key={i} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs border">{p}</span>
                   ))}
               </div>
           </div>
           <div className="flex flex-col items-end">
               <span className={`px-3 py-1 rounded-full text-sm font-bold 
                   ${project.status === '进行中' ? 'bg-blue-100 text-blue-800' : 
                     project.status === '完成' ? 'bg-green-100 text-green-800' : 
                     'bg-gray-100 text-gray-800'}`}>
                   {project.status}
               </span>
               <span className="text-xs text-gray-400 mt-1">最后更新: {new Date(project.lastUpdated).toLocaleString()}</span>
           </div>
       </div>

       <div className="mt-2">
           <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">节点合同总额概览</h3>
           <div className="flex items-end gap-2 h-16">
               {data.map((d, i) => {
                   const heightPercent = (d.value / maxValue) * 100;
                   return (
                       <div key={i} className="flex flex-col items-center flex-1 min-w-0 group">
                            <div className="text-[10px] text-gray-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity truncate w-full text-center">
                                {formatCurrency(d.value)}
                            </div>
                           <div 
                                className="w-full bg-blue-200 rounded-t hover:bg-blue-300 transition-all relative"
                                style={{ height: `${Math.max(heightPercent, 5)}%` }}
                           >
                           </div>
                           <div className="text-[10px] text-gray-400 mt-1 truncate w-full text-center" title={d.name}>{d.name}</div>
                       </div>
                   )
               })}
           </div>
       </div>
    </div>
  );
};