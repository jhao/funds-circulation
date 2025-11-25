export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN');
};

// Formula: Tax = Amount - Amount / (1 + Rate/100)
export const calculateTax = (amount: number, rate: number): number => {
  if (!amount) return 0;
  const base = amount / (1 + rate / 100);
  return amount - base;
};

// Generate a consistent, distinct color from a string
export const stringToColor = (str: string): string => {
  const colors = [
    '#ef4444', // Red 500
    '#f97316', // Orange 500
    '#f59e0b', // Amber 500
    '#84cc16', // Lime 500
    '#10b981', // Emerald 500
    '#06b6d4', // Cyan 500
    '#3b82f6', // Blue 500
    '#6366f1', // Indigo 500
    '#8b5cf6', // Violet 500
    '#d946ef', // Fuchsia 500
    '#f43f5e', // Rose 500
    '#64748b', // Slate 500
    '#0ea5e9', // Sky 500
    '#a855f7', // Purple 500
    '#ec4899', // Pink 500
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};