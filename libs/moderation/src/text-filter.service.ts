import { Injectable } from '@nestjs/common';
import {
  TextFilterResult,
  ModerationSeverity,
  ModerationCategory,
  WordListEntry,
} from './moderation.types';

import profanityEn from './word-lists/profanity.en.json';
import profanityZh from './word-lists/profanity.zh.json';
import spamList from './word-lists/spam.json';
import sexualList from './word-lists/sexual.json';

const SEVERITY_ORDER: Record<ModerationSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

/** L33t speak → normalized character map */
const LEET_MAP: Record<string, string> = {
  '@': 'a',
  '4': 'a',
  '0': 'o',
  '1': 'i',
  '!': 'i',
  '3': 'e',
  '$': 's',
  '5': 's',
  '7': 't',
  '+': 't',
  '8': 'b',
};

@Injectable()
export class TextFilterService {
  private readonly wordEntries: WordListEntry[];

  constructor() {
    this.wordEntries = [
      ...(profanityEn as WordListEntry[]),
      ...(profanityZh as WordListEntry[]),
      ...(spamList as WordListEntry[]),
      ...(sexualList as WordListEntry[]),
    ];
  }

  /**
   * Check text for prohibited content.
   * Returns the highest severity match found.
   */
  check(text: string): TextFilterResult {
    if (!text || text.trim().length === 0) {
      return { passed: true, flaggedWords: [], severity: null, category: 'clean' };
    }

    const normalized = this.normalize(text);
    const flaggedWords: string[] = [];
    let highestSeverity: ModerationSeverity | null = null;
    let highestCategory: ModerationCategory = 'clean';

    for (const entry of this.wordEntries) {
      const pattern = entry.pattern.toLowerCase();

      if (normalized.includes(pattern)) {
        if (!flaggedWords.includes(entry.pattern)) {
          flaggedWords.push(entry.pattern);
        }

        if (
          !highestSeverity ||
          SEVERITY_ORDER[entry.severity] > SEVERITY_ORDER[highestSeverity]
        ) {
          highestSeverity = entry.severity;
          highestCategory = entry.category;
        }
      }
    }

    return {
      passed: flaggedWords.length === 0,
      flaggedWords,
      severity: highestSeverity,
      category: highestCategory,
    };
  }

  /**
   * Normalize text for matching:
   * 1. Unicode NFC normalization (Chinese characters)
   * 2. Lowercase
   * 3. L33t speak normalization
   * 4. Whitespace collapsing (removes spaces between letters)
   */
  private normalize(text: string): string {
    // Unicode NFC normalization
    let result = text.normalize('NFC');

    // Lowercase
    result = result.toLowerCase();

    // L33t speak normalization
    result = this.decodeLeet(result);

    // Collapse whitespace between single letters: "f u c k" → "fuck"
    result = this.collapseSpacedLetters(result);

    return result;
  }

  private decodeLeet(text: string): string {
    let result = '';
    for (const char of text) {
      result += LEET_MAP[char] ?? char;
    }
    return result;
  }

  /**
   * Collapse sequences of single characters separated by spaces/dots/dashes.
   * e.g. "f u c k" → "fuck", "f.u.c.k" → "fuck"
   */
  private collapseSpacedLetters(text: string): string {
    // Match 3+ single letters separated by spaces, dots, dashes, or underscores
    // Pattern: single_char SEP single_char SEP single_char (SEP single_char)*
    return text.replace(
      /(?<![a-z])([a-z])[\s.\-_]+([a-z])[\s.\-_]+([a-z])([\s.\-_]+[a-z])*(?![a-z])/g,
      (match) => {
        return match.replace(/[\s.\-_]+/g, '');
      },
    );
  }
}
