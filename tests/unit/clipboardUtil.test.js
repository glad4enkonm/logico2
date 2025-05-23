import {
  copyToClipboard,
  getFromClipboard,
  applyTemplate,
  getPromptTemplates
} from '../../src/utils/clipboardUtil';

describe('Clipboard utilities', () => {
  it('should provide prompt templates', () => {
    const templates = getPromptTemplates();
    expect(templates).toHaveProperty('template1');
    expect(templates).toHaveProperty('template2');
    expect(templates).toHaveProperty('template3');
    expect(templates).toHaveProperty('template4');
  });

  it('should apply templates correctly', () => {
    const content = "example content";
    expect(applyTemplate('template1', content)).toBe("Explain this in simple terms: example content");
    expect(applyTemplate('template2', content)).toBe("Generate a summary of: example content");
    expect(applyTemplate('template3', content)).toBe("Translate to French: example content");
    expect(applyTemplate('template4', content)).toBe("Write a poem about: example content");
  });

  it('should handle invalid template', () => {
    const content = "example content";
    const result = applyTemplate('invalidTemplate', content);
    expect(result).toBeNull();
  });
});