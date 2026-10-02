import { colors } from '../theme';

export const accountTypes = [
  { value: 'CONTA_CORRENTE', label: 'Conta corrente', description: 'Para o seu dia a dia', icon: 'bank', color: colors.primary },
  { value: 'POUPANCA', label: 'Poupança', description: 'Para guardar\no seu dinheiro', icon: 'savings', color: colors.olive },
  { value: 'CARTEIRA', label: 'Carteira', description: 'Dinheiro em espécie', icon: 'wallet', color: colors.copper },
  { value: 'INVESTIMENTOS', label: 'Investimentos', description: 'Para fazer o seu\ndinheiro crescer', icon: 'investment', color: '#BF3629' },
];
export const getAccountType = value => accountTypes.find(type => type.value === value) || accountTypes[0];
