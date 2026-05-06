export function createPageUrl(pageName) {
  const clean = pageName.split('?')[0];
  const params = pageName.includes('?') ? '?' + pageName.split('?')[1] : '';
  const slug = clean.replace(/([A-Z])/g, (m, l, i) => (i ? '-' : '') + l.toLowerCase()).replace(/^-/, '');
  return '/' + slug + params;
}