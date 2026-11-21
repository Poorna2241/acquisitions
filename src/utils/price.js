export const STANDARD_PRICE_BRACKETS = [
  { id: 'under-25', label: 'Under $25', min: 0, max: 25 },
  { id: '25-50', label: '$25 to $50', min: 25, max: 50 },
  { id: '50-100', label: '$50 to $100', min: 50, max: 100 },
  { id: '100-200', label: '$100 to $200', min: 100, max: 200 },
  { id: '200-500', label: '$200 to $500', min: 200, max: 500 },
  { id: '500-above', label: '$500 & Above', min: 500, max: null },
];

/**
 * Parses a price bracket string into { minPrice, maxPrice }
 * Supports:
 * - Standard IDs: 'under-25', '25-50', '50-100', '100-200', '200-500', '500-above'
 * - Under formats: 'under-50', '<50', '0-50'
 * - Over/above formats: '500+', 'over-500', '>500', '500-above', '500-up'
 * - Range formats: '50-100', '50,100', '[50,100]', '50 to 100'
 *
 * @param {string} bracket
 * @returns {{ minPrice: number | null, maxPrice: number | null } | null}
 */
export const parsePriceBracket = bracket => {
  if (!bracket || typeof bracket !== 'string') return null;

  const trimmed = bracket.trim().toLowerCase();
  if (!trimmed) return null;

  // 1. Check exact match with STANDARD_PRICE_BRACKETS by ID or label
  const standard = STANDARD_PRICE_BRACKETS.find(
    b => b.id === trimmed || b.label.toLowerCase() === trimmed
  );
  if (standard) {
    return { minPrice: standard.min, maxPrice: standard.max };
  }

  // 2. Formats: 'under-X' or '<X'
  if (trimmed.startsWith('under-') || trimmed.startsWith('<')) {
    const rawVal = trimmed.replace(/^(under-|<)/, '').trim();
    const val = parseFloat(rawVal);
    if (!isNaN(val) && val >= 0) {
      return { minPrice: 0, maxPrice: val };
    }
  }

  // 3. Formats: 'over-X' or '>X'
  if (trimmed.startsWith('over-') || trimmed.startsWith('>')) {
    const rawVal = trimmed.replace(/^(over-|>)/, '').trim();
    const val = parseFloat(rawVal);
    if (!isNaN(val) && val >= 0) {
      return { minPrice: val, maxPrice: null };
    }
  }

  // 4. Formats: 'X+' or 'X-above' or 'X-up' or 'X-more'
  const suffixOverMatch = trimmed.match(
    /^(\d+(?:\.\d+)?)\s*(?:\+|-(?:above|up|more))$/
  );
  if (suffixOverMatch) {
    const val = parseFloat(suffixOverMatch[1]);
    if (!isNaN(val) && val >= 0) {
      return { minPrice: val, maxPrice: null };
    }
  }

  // 5. Formats: 'min-max', '[min,max]', 'min,max', 'min to max'
  const rangeMatch = trimmed.match(
    /^\[?\s*(\d+(?:\.\d+)?)\s*(?:-|–|_|,|\sto\s)\s*(\d+(?:\.\d+)?)\s*\]?$/
  );
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (!isNaN(min) && !isNaN(max) && min <= max) {
      return { minPrice: min, maxPrice: max };
    }
  }

  return null;
};
