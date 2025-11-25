export enum ProjectStatus {
  ACTIVE = '进行中',
  PAUSED = '暂停',
  COMPLETED = '完成',
  ABNORMAL = '异常',
}

export enum ContractType {
  INCOMING = 'INCOMING', // 承接 (Input)
  OUTGOING = 'OUTGOING', // 转出 (Output)
}

export interface FinancialBatch {
  id: string;
  type: 'INVOICE' | 'PAYMENT';
  amount: number; // 含税金额
  date: string;
  taxRate: number; // 批次特定税率，通常继承合同
}

export interface Contract {
  id: string;
  title: string;
  type: ContractType;
  totalAmount: number; // 合同总额
  taxRate: number; // 综合税率 %
  
  // New: Multiple batches
  financials: FinancialBatch[];
  
  // Linking
  sourceContractId?: string; // ID of the Outgoing contract this is linked to
  
  // Visual grouping color (hex)
  color: string;

  // Nesting: An Incoming contract can contain Outgoing contracts
  subContracts?: Contract[];
}

export interface Company {
  id: string;
  name: string;
  contracts: Contract[];
}

export interface ProjectNode {
  id: string;
  name: string; // e.g., "业主方", "总包方", "分包方"
  companies: Company[];
}

export interface Project {
  id: string;
  name: string;
  participants: string[]; // Simplified tag list
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  lastUpdated: string;
  nodes: ProjectNode[];
}

export interface ProjectFormValues {
  name: string;
  participants: string; // comma separated string for input
  startDate: string;
  endDate: string;
  status: ProjectStatus;
}
