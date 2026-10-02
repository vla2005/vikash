export function searchFinancialInstitutions(institutions, query) {
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return institutions.filter(item => {
    const name = normalize(item.name);
    return terms.every(term => name.includes(term));
  });
}
