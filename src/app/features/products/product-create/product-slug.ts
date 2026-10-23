// src/app/features/products/product-create/product-slug.ts
//
// Persian/Latin → URL slug for the create form (BO-F07, extended by BO-F16).
//
// WHY A DICTIONARY PLUS A CHARACTER MAP
// -------------------------------------
// A character-by-character transliteration turns «لپ‌تاپ» into `lptap`, which is
// not a slug a human would search for. A small word dictionary handles the
// catalogue's common nouns, and the character map is the fallback for the rest.
// The map is deliberately conservative: unknown non-Latin characters are dropped
// rather than guessed, so a slug is always `[a-z0-9-]`.
//
// This file is NOT under `models/`: it exports a runtime function, and AGENTS.md
// keeps `features/*/models/` types-only.

/** Common catalogue words whose transliteration is not letter-by-letter. */
const WORD_MAP: Readonly<Record<string, string>> = {
  لپتاپ: 'laptop',
  ایسوس: 'asus',
  هدفون: 'headphone',
  سونی: 'sony',
  کیبورد: 'keyboard',
  مکانیکی: 'mechanical',
  ماوس: 'mouse',
  گیمینگ: 'gaming',
  ساعت: 'watch',
  هوشمند: 'smart',
  کیف: 'bag',
  چرم: 'leather',
  دستدوز: 'dastdoz',
  کفش: 'shoe',
  ورزشی: 'sport',
  عطر: 'perfume',
  زنانه: 'women',
  کوله: 'backpack',
  پشتی: 'back',
  عینک: 'glasses',
  آفتابی: 'sun',
  پاوربانک: 'powerbank',
  شارژر: 'charger',
  کابل: 'cable',
  اسپیکر: 'speaker',
  لامپ: 'lamp',
  دوربین: 'camera',
  هارد: 'hard',
  فلش: 'flash',
  مانیتور: 'monitor',
  اینچ: 'inch',
};

/** Fallback letters for Persian/Arabic characters. */
const CHAR_MAP: Readonly<Record<string, string>> = {
  آ: 'a',
  ا: 'a',
  أ: 'a',
  إ: 'e',
  ب: 'b',
  پ: 'p',
  ت: 't',
  ث: 's',
  ج: 'j',
  چ: 'ch',
  ح: 'h',
  خ: 'kh',
  د: 'd',
  ذ: 'z',
  ر: 'r',
  ز: 'z',
  ژ: 'zh',
  س: 's',
  ش: 'sh',
  ص: 's',
  ض: 'z',
  ط: 't',
  ظ: 'z',
  ع: 'a',
  غ: 'gh',
  ف: 'f',
  ق: 'gh',
  ک: 'k',
  ك: 'k',
  گ: 'g',
  ل: 'l',
  م: 'm',
  ن: 'n',
  و: 'v',
  ه: 'h',
  ی: 'y',
  ي: 'y',
  ئ: 'y',
  ء: '',
  ة: 'h',
  ؤ: 'o',
};

/**
 * Normalise one word: dictionary first, character map second, Latin untouched.
 */
function slugWord(word: string): string {
  const mapped = WORD_MAP[word];
  if (mapped) {
    return mapped;
  }

  return Array.from(word)
    .map((character) => CHAR_MAP[character] ?? character)
    .join('');
}

/**
 * Build a slug from a product name.
 *
 * TRACE: `slugify('لپ‌تاپ ایسوس')`
 *   1. NFKC + remove ZWNJ/RLM/LRM → `لپتاپ ایسوس`
 *   2. collapse `لپ تاپ` → `لپتاپ` (so both spellings hit the dictionary)
 *   3. split on whitespace/punctuation → `['لپتاپ', 'ایسوس']`
 *   4. dictionary → `['laptop', 'asus']`
 *   5. join with `-`, strip anything outside `[a-z0-9-]`, cap at 80 → `laptop-asus`
 *
 * `slugify('')` and a whitespace-only name return `''`, which the form's required
 * validator turns into an error rather than a `-`.
 */
export function slugify(input: string): string {
  const normalized = input
    .normalize('NFKC')
    .replace(/[\u200c\u200e\u200f]/g, '')
    .replace(/\u0640/g, '')
    .replace(/لپ\s*تاپ/g, 'لپتاپ')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .trim()
    .toLowerCase();

  if (normalized === '') {
    return '';
  }

  return normalized
    .split(/[^a-z0-9\u0600-\u06ff]+/)
    .filter(Boolean)
    .map(slugWord)
    .join('-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}
