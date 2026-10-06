export function getProfileInitials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  return parts.filter((_, index) => index === 0 || index === parts.length - 1)
    .map(part => part[0]).join('').toUpperCase() || 'V';
}
