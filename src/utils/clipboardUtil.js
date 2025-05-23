import React from 'react';

// Prompt templates
const promptTemplates = {
  template1: "Explain this in simple terms: {content}",
  template2: "Generate a summary of: {content}",
  template3: "Translate to French: {content}",
  template4: "Write a poem about: {content}"
};

// Function to copy text to clipboard
export const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
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