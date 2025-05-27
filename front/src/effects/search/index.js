import upperCaseEffect from './upperCase';
import lowerCaseEffect from './lowerCase';
import reverseWordsEffect from './reverseWords';
import reverseLinesEffect from './reverseLines';

export const searchEffects = {
  upperCase: upperCaseEffect,
  lowerCase: lowerCaseEffect,
  reverseWords: reverseWordsEffect,
  reverseLines: reverseLinesEffect
};

// Function to get a search effect
export const applySearchEffect = (effectKey) => {
  if (!searchEffects[effectKey]) {
    console.error(`Effect ${effectKey} not found`);
    return null;
  }

  return searchEffects[effectKey];
};

// Export search effects for reference
export const getSearchEffects = () => searchEffects;