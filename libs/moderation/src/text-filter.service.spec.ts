import { TextFilterService } from './text-filter.service';

describe('TextFilterService', () => {
  let service: TextFilterService;

  beforeEach(() => {
    service = new TextFilterService();
  });

  describe('clean text', () => {
    it('should pass clean English text', () => {
      const result = service.check('Hello, how are you today?');
      expect(result.passed).toBe(true);
      expect(result.flaggedWords).toHaveLength(0);
      expect(result.category).toBe('clean');
      expect(result.severity).toBeNull();
    });

    it('should pass clean Chinese text', () => {
      const result = service.check('你好，今天天氣真好');
      expect(result.passed).toBe(true);
      expect(result.flaggedWords).toHaveLength(0);
    });

    it('should pass empty string', () => {
      const result = service.check('');
      expect(result.passed).toBe(true);
    });

    it('should pass null/undefined-like input', () => {
      const result = service.check('   ');
      expect(result.passed).toBe(true);
    });
  });

  describe('English profanity detection', () => {
    it('should detect basic profanity', () => {
      const result = service.check('What the fuck is this');
      expect(result.passed).toBe(false);
      expect(result.flaggedWords).toContain('fuck');
      expect(result.category).toBe('profanity');
      expect(result.severity).toBe('medium');
    });

    it('should detect high severity slurs', () => {
      const result = service.check('You are a faggot');
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('high');
    });

    it('should detect profanity case-insensitively', () => {
      const result = service.check('FUCK YOU');
      expect(result.passed).toBe(false);
      expect(result.flaggedWords).toContain('fuck');
    });
  });

  describe('Chinese profanity detection', () => {
    it('should detect Chinese profanity', () => {
      const result = service.check('你是白癡嗎');
      expect(result.passed).toBe(false);
      expect(result.flaggedWords).toContain('白癡');
    });

    it('should detect high severity Chinese profanity', () => {
      const result = service.check('幹你娘');
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('high');
    });
  });

  describe('l33t speak normalization', () => {
    it('should detect l33t speak profanity: @ss', () => {
      const result = service.check('You @sshole');
      expect(result.passed).toBe(false);
      expect(result.flaggedWords).toContain('asshole');
    });

    it('should detect l33t speak: fvck with $', () => {
      const result = service.check('$hit happens');
      expect(result.passed).toBe(false);
      expect(result.flaggedWords).toContain('shit');
    });

    it('should detect numeric l33t: sh1t', () => {
      const result = service.check('sh1t');
      expect(result.passed).toBe(false);
      expect(result.flaggedWords).toContain('shit');
    });
  });

  describe('spaced letter detection', () => {
    it('should detect spaced profanity: f u c k', () => {
      const result = service.check('f u c k you');
      expect(result.passed).toBe(false);
      expect(result.flaggedWords).toContain('fuck');
    });

    it('should detect dot-separated: f.u.c.k', () => {
      const result = service.check('f.u.c.k this');
      expect(result.passed).toBe(false);
    });
  });

  describe('spam/scam detection', () => {
    it('should detect scam phrases', () => {
      const result = service.check('I can help you earn money fast');
      expect(result.passed).toBe(false);
      expect(result.category).toBe('scam');
    });

    it('should detect Chinese scam phrases', () => {
      const result = service.check('保證獲利，穩賺不賠');
      expect(result.passed).toBe(false);
      expect(result.category).toBe('scam');
      expect(result.severity).toBe('high');
    });

    it('should detect platform redirect spam', () => {
      const result = service.check('Add me on whatsapp me at 123');
      expect(result.passed).toBe(false);
    });
  });

  describe('sexual content detection', () => {
    it('should detect sexual content', () => {
      const result = service.check('send nudes please');
      expect(result.passed).toBe(false);
      expect(result.category).toBe('sexual');
      expect(result.severity).toBe('high');
    });

    it('should detect Chinese sexual content', () => {
      const result = service.check('要不要約砲');
      expect(result.passed).toBe(false);
      expect(result.category).toBe('sexual');
    });
  });

  describe('severity ordering', () => {
    it('should return the highest severity when multiple matches', () => {
      // Contains both low ("damn") and high severity words
      const result = service.check('damn you faggot');
      expect(result.severity).toBe('high');
    });
  });

  describe('long text handling', () => {
    it('should handle very long text without errors', () => {
      const longText = 'hello world '.repeat(10000);
      const result = service.check(longText);
      expect(result.passed).toBe(true);
    });

    it('should detect profanity in long text', () => {
      const longText = 'hello world '.repeat(100) + ' fuck ' + 'hello world '.repeat(100);
      const result = service.check(longText);
      expect(result.passed).toBe(false);
    });
  });

  describe('mixed content', () => {
    it('should detect mixed English and Chinese violations', () => {
      const result = service.check('fuck 你是白癡');
      expect(result.passed).toBe(false);
      expect(result.flaggedWords.length).toBeGreaterThanOrEqual(2);
    });
  });
});
