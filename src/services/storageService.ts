import { Contract, ContractType, FinancialBatch, Project } from '../types';
import { generateId, pickDistinctColor, stringToColor } from '../utils/helpers';

const STORAGE_KEY = 'finance_circle_projects';

export const getProjects = (): Project[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveProjects = (projects: Project[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

export const getProjectById = (id: string): Project | undefined => {
  const projects = getProjects();
  return projects.find((p) => p.id === id);
};

export const createProject = (data: Omit<Project, 'id' | 'lastUpdated' | 'nodes'>): Project => {
  const projects = getProjects();
  const newProject: Project = {
    ...data,
    id: generateId(),
    lastUpdated: new Date().toISOString(),
    nodes: [
      {
        id: generateId(),
        name: '起始节点 (业主)',
        companies: []
      }
    ]
  };
  projects.push(newProject);
  saveProjects(projects);
  return newProject;
};

export const updateProject = (project: Project): void => {
  const projects = getProjects();
  const index = projects.findIndex((p) => p.id === project.id);
  if (index !== -1) {
    projects[index] = { ...project, lastUpdated: new Date().toISOString() };
    saveProjects(projects);
  }
};

export const deleteProject = (id: string): void => {
  const projects = getProjects();
  const filtered = projects.filter((p) => p.id !== id);
  saveProjects(filtered);
};

// --- Import / Export Helpers ---

export const exportData = (): string => {
    const projects = getProjects();
    return JSON.stringify(projects, null, 2);
};

export const importData = (jsonString: string): boolean => {
    try {
        const data = JSON.parse(jsonString);
        if (Array.isArray(data)) {
            // Basic validation: check if it looks like a project array
            saveProjects(data);
            return true;
        }
        return false;
    } catch (e) {
        console.error("Import failed", e);
        return false;
    }
};

// --- Project Manipulation Helpers ---

// Helper to add a node to a project
export const addNodeToProject = (projectId: string): Project | undefined => {
  const project = getProjectById(projectId);
  if (!project) return;
  
  project.nodes.push({
    id: generateId(),
    name: `第 ${project.nodes.length + 1} 阶段`,
    companies: []
  });
  
  updateProject(project);
  return project;
};

// Helper to add a company to a node
export const addCompanyToNode = (projectId: string, nodeId: string, companyName: string): Project | undefined => {
  const project = getProjectById(projectId);
  if (!project) return;

  const node = project.nodes.find(n => n.id === nodeId);
  if (node) {
    node.companies.push({
      id: generateId(),
      name: companyName,
      contracts: []
    });
    updateProject(project);
  }
  return project;
};

// Helper to add a contract to a company
export const addContractToCompany = (
  projectId: string,
  nodeId: string,
  companyId: string,
  contractData: Omit<Contract, 'id' | 'color' | 'financials'> & { color?: string }
): Project | undefined => {
  const project = getProjectById(projectId);
  if (!project) return;

  const node = project.nodes.find(n => n.id === nodeId);
  if (node) {
    const company = node.companies.find(c => c.id === companyId);
    if (company) {
      const resolveIncomingColor = (): string => {
        const incomingContracts = company.contracts.filter(c => c.type === ContractType.INCOMING);

        // Keep the same color if another contract is linked to the same source
        if (contractData.sourceContractId) {
          const siblingFromSameSource = incomingContracts.find(
            c => c.sourceContractId === contractData.sourceContractId
          );
          if (siblingFromSameSource) return siblingFromSameSource.color;
        }

        const preferredColor = contractData.color || stringToColor(contractData.title);
        const usedColors = incomingContracts
          .filter(c => c.sourceContractId !== contractData.sourceContractId)
          .map(c => c.color);

        return pickDistinctColor(preferredColor, usedColors);
      };

      const resolveColor = (): string => {
        if (contractData.type === ContractType.INCOMING) {
          return resolveIncomingColor();
        }
        return contractData.color || stringToColor(contractData.title);
      };

      company.contracts.push({
        ...contractData,
        id: generateId(),
        color: resolveColor(),
        financials: [],
        subContracts: []
      });
      updateProject(project);
    }
  }
  return project;
};

// Recursively find a contract and its parent array to allow deletion
const findContractInList = (contracts: Contract[], targetId: string): Contract | undefined => {
    for (const c of contracts) {
        if (c.id === targetId) return c;
        if (c.subContracts) {
            const found = findContractInList(c.subContracts, targetId);
            if (found) return found;
        }
    }
    return undefined;
};

export const deleteCompany = (projectId: string, nodeId: string, companyId: string) => {
    const project = getProjectById(projectId);
    if(!project) return;
    const node = project.nodes.find(n => n.id === nodeId);
    if(node) {
        node.companies = node.companies.filter(c => c.id !== companyId);
        updateProject(project);
    }
    return project;
}

// Recursive helper to remove a contract from a list (supports deep nesting)
const removeContractRecursively = (contracts: Contract[], targetId: string): boolean => {
    const idx = contracts.findIndex(c => c.id === targetId);
    if (idx > -1) {
        contracts.splice(idx, 1);
        return true;
    }
    for (const c of contracts) {
        if (c.subContracts && c.subContracts.length > 0) {
            if (removeContractRecursively(c.subContracts, targetId)) {
                return true;
            }
        }
    }
    return false;
};

export const deleteContract = (projectId: string, nodeId: string, companyId: string, contractId: string) => {
    const project = getProjectById(projectId);
    if(!project) return;
    const node = project.nodes.find(n => n.id === nodeId);
    if(node) {
        const company = node.companies.find(c => c.id === companyId);
        if(company) {
            removeContractRecursively(company.contracts, contractId);
            updateProject(project);
        }
    }
    return project;
}

export const addFinancialBatch = (
    projectId: string,
    nodeId: string,
    companyId: string,
    contractId: string,
    batch: Omit<FinancialBatch, 'id'>
) => {
    const project = getProjectById(projectId);
    if (!project) return;
    const node = project.nodes.find(n => n.id === nodeId);
    if (node) {
        const company = node.companies.find(c => c.id === companyId);
        if (company) {
            const contract = findContractInList(company.contracts, contractId);
            if (contract) {
                if (!contract.financials) contract.financials = [];
                contract.financials.push({
                    ...batch,
                    id: generateId()
                });
                updateProject(project);
            }
        }
    }
    return project;
};

export const deleteFinancialBatch = (
    projectId: string,
    nodeId: string,
    companyId: string,
    contractId: string,
    batchId: string
) => {
    const project = getProjectById(projectId);
    if (!project) return;
    const node = project.nodes.find(n => n.id === nodeId);
    if (node) {
        const company = node.companies.find(c => c.id === companyId);
        if (company) {
            const contract = findContractInList(company.contracts, contractId);
            if (contract && contract.financials) {
                contract.financials = contract.financials.filter(f => f.id !== batchId);
                updateProject(project);
            }
        }
    }
    return project;
};

// Nest a contract inside another
export const nestContract = (
    projectId: string,
    nodeId: string,
    companyId: string,
    parentContractId: string,
    childContractId: string
) => {
    const project = getProjectById(projectId);
    if (!project) return;
    const node = project.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const company = node.companies.find(c => c.id === companyId);
    if (!company) return;

    // 1. Find and remove child from top level (Current limitation: only nests top-level items)
    // To support deep re-nesting, we would need to find parent of child, splice it out, then add to new parent.
    // For now, assuming drag source is top level within the company card or simple logic.
    
    // We try to remove it using the recursive remover first to ensure we get it from wherever it is
    // But we need the object reference.
    
    const findAndRemove = (list: Contract[], id: string): Contract | null => {
        const idx = list.findIndex(c => c.id === id);
        if (idx > -1) {
            return list.splice(idx, 1)[0];
        }
        for (const c of list) {
             if (c.subContracts) {
                 const found = findAndRemove(c.subContracts, id);
                 if (found) return found;
             }
        }
        return null;
    }

    const childContract = findAndRemove(company.contracts, childContractId);

    if (!childContract) return;

    // 2. Find parent
    const parentContract = findContractInList(company.contracts, parentContractId);
    
    if (parentContract) {
        if (!parentContract.subContracts) parentContract.subContracts = [];
        parentContract.subContracts.push(childContract);
        updateProject(project);
    } else {
        // Rollback if parent not found, put it back at top
        company.contracts.push(childContract);
    }
    
    return project;
};