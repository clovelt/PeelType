const loadedFontLinks = new Set();

export function quoteFontFamily(fontFamily) {
  if (!fontFamily) return 'Georgia';
  return fontFamily.includes(' ') ? `"${fontFamily}"` : fontFamily;
}

export function fontFamilyToGoogleSlug(fontFamily) {
  return fontFamily.trim().replace(/\s+/g, '+');
}

export function loadGoogleFont(fontFamily) {
  if (!fontFamily || loadedFontLinks.has(fontFamily)) return;
  // Offline build: do not fetch Google Fonts at runtime. Browsers will use an
  // installed font with this family name or fall back through the CSS stack.
  loadedFontLinks.add(fontFamily);
}
