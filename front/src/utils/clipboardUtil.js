import fs from 'fs';
import path from 'path';

// Prompt templates
const promptTemplates = {
  extractAndApplyGraphChanges: fs.readFileSync(path.join(__dirname, '../../prompt/extractAndApplyGraphChanges.txt'), 'utf8'),
  extractObjectsAndRelations: fs.readFileSync(path.join(__dirname, '../../prompt/extractObjectsAndRelations.txt'), 'utf8'),
  initObjectsAndRelationsInsert: fs.readFileSync(path.join(__dirname, '../../prompt/initObjectsAndRelationsInsert.txt'), 'utf8'),
  template1: "Explain this in simple terms: {content}",
  template2: "Generate a summary of: {content}",
  template3: "Translate to French: {content}",
  template4: "Write a poem about: {content}"
};

// Function to copy text to clipboard
export const copyToClipboard = (templateKey, content) => {
  if (!promptTemplates[templateKey]) {
    console.error(`Template ${templateKey} not found`);
    return;
  }

  const template = promptTemplates[templateKey];
  const prompt = template.replace('[content]', content);

  navigator.clipboard.writeText(prompt).then(() => {
    console.log('Text copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
};

// Function to get text from clipboard
export const getFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText();
    return text;
  } catch (err) {
    console.error('Failed to read clipboard: ', err);
    return null;
  }
};

// Function to apply a prompt template
export const applyTemplate = (templateKey, content) => {
  if (!promptTemplates[templateKey]) {
    console.error(`Template ${templateKey} not found`);
    return null;
  }

  return promptTemplates[templateKey].replace('{content}', content);
};

// Export prompt templates for reference
export const getPromptTemplates = () => promptTemplates;