import { colors } from '../theme';

// Tons mais escuros mantêm o texto branco legível sobre o cartão.
const cardColors = {
  'itau': '#B8430B',
  'santander': '#BE1E2D',
  'banco do brasil': '#765F12',
  'caixa': '#075D93',
  'bradesco': '#991C42',
  'inter': '#C94B08',
  'nubank': '#6B23AD',
  'c6 bank': '#243044',
  'btg pactual': '#152D4F',
  'mercado pago': '#006C94',
  'picpay': '#087444',
  'pagbank': '#24652B',
  'neon': '#00757D',
  'original': '#14664A',
  'sicredi': '#306526',
  'sicoob': '#005C57',
  'safra': '#16294A',
  'brb': '#123C7D',
  'banrisul': '#175AA0',
  'bmg': '#B7450B',
  'digio': '#173C99',
  'sofisa direto': '#075C48',
  'xp': '#242424',
  'recargapay': '#165492',
  'daycoval': '#233F77',
  'banestes': '#185D3C',
  'banco do nordeste': '#963B30',
  'banco da amazonia': '#225638',
  'banpara': '#84233A',
  'unicred': '#786119',
  'outra instituicao': '#48536A',
};

const aliases = {
  'banco itau': 'itau',
  'itau unibanco': 'itau',
  'banco santander': 'santander',
  'bb': 'banco do brasil',
  'caixa economica federal': 'caixa',
  'banco bradesco': 'bradesco',
  'banco inter': 'inter',
  'c6': 'c6 bank',
  'banco c6': 'c6 bank',
  'btg': 'btg pactual',
  'banco btg pactual': 'btg pactual',
  'banco original': 'original',
  'banco safra': 'safra',
  'banco de brasilia': 'brb',
  'brb - banco de brasilia': 'brb',
  'banco bmg': 'bmg',
  'banco digio': 'digio',
  'banco sofisa': 'sofisa direto',
  'sofisa': 'sofisa direto',
  'xp investimentos': 'xp',
  'banco xp': 'xp',
  'banco daycoval': 'daycoval',
};

export function getInstitutionCardColor(institution) {
  const name = (institution?.name ?? '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
  return cardColors[aliases[name] || name] || colors.primary;
}
