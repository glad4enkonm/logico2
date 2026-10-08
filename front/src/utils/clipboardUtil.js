import extractAndApplyGraphChanges from 'bundle-text:../../prompt/extractAndApplyGraphChanges.txt';
import extractObjectsAndRelations from 'bundle-text:../../prompt/extractObjectsAndRelations.txt';
import initObjectsAndRelationsInsert from 'bundle-text:../../prompt/initObjectsAndRelationsInsert.txt';

// Prompt templates.
// The LLM prompt files are inlined at build time by Parcel's `bundle-text:`
// scheme, so no runtime filesystem access (fs/path/__dirname) is needed —
// those Node.js APIs do not exist in the browser.
const promptTemplates = {
  extractAndApplyGraphChanges,
  extractObjectsAndRelations,
  initObjectsAndRelationsInsert,
  template1: "Explain this in simple terms: {content}",
  template2: "Generate a summary of: {content}",
  template3: "Translate to French: {content}",
  template4: "Write a poem about: {content}"
};

// Templates embed the user content either as `[content]` (LLM prompt files)
// or as `{content}` (simple templates). Replace every occurrence of both.
const replaceContent = (template, content) =>
  template.replaceAll('[content]', content).replaceAll('{content}', content);

// Function to copy text to clipboard
export const copyToClipboard = (templateKey, content) => {
  if (!promptTemplates[templateKey]) {
    console.error(`Template ${templateKey} not found`);
    return;
  }

  const template = promptTemplates[templateKey];
  const prompt = replaceContent(template, content);

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

  return replaceContent(promptTemplates[templateKey], content);
};

// Export prompt templates for reference
export const getPromptTemplates = () => promptTemplates;
