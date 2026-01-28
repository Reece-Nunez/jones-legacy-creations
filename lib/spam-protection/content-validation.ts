/**
 * Content-based spam detection
 * Detects gibberish text, keyboard mashing, and bot-generated content
 */

export interface ContentValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Check if a string looks like gibberish (random characters)
 * Real text has a natural vowel/consonant ratio and word patterns
 */
function isGibberish(text: string): boolean {
  const cleaned = text.toLowerCase().replace(/[^a-z]/g, '');
  if (cleaned.length < 4) return false;

  const vowels = cleaned.match(/[aeiou]/g)?.length || 0;
  const vowelRatio = vowels / cleaned.length;

  // Real English text typically has 35-45% vowels
  // Gibberish often has <20% or >60%
  if (vowelRatio < 0.15 || vowelRatio > 0.65) {
    return true;
  }

  // Check for too many consecutive consonants (more than 4 in a row)
  const hasExcessiveConsonants = /[bcdfghjklmnpqrstvwxyz]{5,}/i.test(cleaned);
  if (hasExcessiveConsonants) {
    return true;
  }

  // Check for repeating patterns that indicate bot generation
  const hasRepeatingPattern = /(.{2,4})\1{2,}/.test(cleaned);
  if (hasRepeatingPattern) {
    return true;
  }

  // Check for alternating case pattern (TkRiYvXe) - normalize and check original
  const originalAlphaOnly = text.replace(/[^a-zA-Z]/g, '');
  if (originalAlphaOnly.length >= 6) {
    let caseChanges = 0;
    for (let i = 1; i < originalAlphaOnly.length; i++) {
      const prevUpper = originalAlphaOnly[i - 1] === originalAlphaOnly[i - 1].toUpperCase();
      const currUpper = originalAlphaOnly[i] === originalAlphaOnly[i].toUpperCase();
      if (prevUpper !== currUpper) caseChanges++;
    }
    // Too many case changes suggests random generation
    if (caseChanges / originalAlphaOnly.length > 0.6) {
      return true;
    }
  }

  return false;
}

/**
 * Validate a name field
 * Real names typically have first and last name with a space
 */
export function validateName(name: string): ContentValidationResult {
  const trimmed = name.trim();

  // Must have at least one space (first + last name)
  if (!trimmed.includes(' ')) {
    return {
      valid: false,
      reason: 'Please enter your full name (first and last name)',
    };
  }

  // Check each part of the name
  const parts = trimmed.split(/\s+/).filter(p => p.length > 0);

  // Need at least 2 name parts
  if (parts.length < 2) {
    return {
      valid: false,
      reason: 'Please enter your full name (first and last name)',
    };
  }

  // Each name part should be reasonable
  for (const part of parts) {
    // Name parts should be mostly letters
    const letterCount = (part.match(/[a-zA-Z]/g) || []).length;
    if (letterCount / part.length < 0.8) {
      return {
        valid: false,
        reason: 'Name contains invalid characters',
      };
    }

    // Check for gibberish in name parts longer than 4 chars
    if (part.length > 4 && isGibberish(part)) {
      return {
        valid: false,
        reason: 'Please enter a valid name',
      };
    }
  }

  return { valid: true };
}

/**
 * Validate a message/text field
 * Real messages have words, spaces, and readable content
 */
export function validateMessage(message: string, minWords: number = 3): ContentValidationResult {
  const trimmed = message.trim();

  // Split into words
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);

  // Must have minimum number of words
  if (words.length < minWords) {
    return {
      valid: false,
      reason: `Message must contain at least ${minWords} words`,
    };
  }

  // Check if the entire message looks like gibberish
  if (isGibberish(trimmed)) {
    return {
      valid: false,
      reason: 'Message appears to be invalid',
    };
  }

  // Check individual long words for gibberish
  const longWords = words.filter(w => w.replace(/[^a-zA-Z]/g, '').length > 6);
  const gibberishWords = longWords.filter(w => isGibberish(w));

  // If more than half of long words are gibberish, reject
  if (longWords.length > 0 && gibberishWords.length / longWords.length > 0.5) {
    return {
      valid: false,
      reason: 'Message appears to contain invalid content',
    };
  }

  return { valid: true };
}

/**
 * Validate a city name
 */
export function validateCity(city: string): ContentValidationResult {
  const trimmed = city.trim();

  // Cities can have multiple words, but each should be readable
  if (isGibberish(trimmed.replace(/\s+/g, ''))) {
    return {
      valid: false,
      reason: 'Please enter a valid city name',
    };
  }

  return { valid: true };
}

/**
 * Combined content validation check
 */
export interface ContentCheckOptions {
  name?: string;
  message?: string;
  city?: string;
  minMessageWords?: number;
}

export interface ContentCheckResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateContent(options: ContentCheckOptions): ContentCheckResult {
  const errors: Record<string, string> = {};

  if (options.name) {
    const nameResult = validateName(options.name);
    if (!nameResult.valid && nameResult.reason) {
      errors.name = nameResult.reason;
    }
  }

  if (options.message) {
    const messageResult = validateMessage(options.message, options.minMessageWords);
    if (!messageResult.valid && messageResult.reason) {
      errors.message = messageResult.reason;
    }
  }

  if (options.city) {
    const cityResult = validateCity(options.city);
    if (!cityResult.valid && cityResult.reason) {
      errors.city = cityResult.reason;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
