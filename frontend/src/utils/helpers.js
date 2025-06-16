
/**
 * Formats a date string into a localized format
 * @param {string} dateString - Date string in any format accepted by Date constructor
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return dateString; // Return the original string if it's not a valid date
    }
    
    // Format the date - you can customize this format as needed
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch (err) {
    console.error('Error formatting date:', err);
    return dateString;
  }
};

/**
 * Normalizes Icelandic characters for search
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
export const normalizeText = (text = '') => {
  if (!text) return '';
  
  return text.toLowerCase()
    .replace(/ó/g, 'o')
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ú/g, 'u')
    .replace(/ý/g, 'y')
    .replace(/þ/g, 'th')
    .replace(/æ/g, 'ae')
    .replace(/ö/g, 'o')
    .replace(/ð/g, 'd');
};
