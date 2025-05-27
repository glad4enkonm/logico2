import React, { useState } from 'react';
import './clipboardPanel.css';
import Button from '@/components/Button';

const SearchPanel = () => {
  const [inputText, setInputText] = useState('');
  const [effectError, setEffectError] = useState('');

  const handleDone = async () => {
    if (!inputText) {
      setEffectError('Please enter input text');
      return;
    }

    // Dispatch event for findByEmbedding
    const event = new CustomEvent('buttonClick', {
      detail: {
        type: 'EFFECT_CALL_FINDBYEMBEDDING',
        inputText
      }
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="clipboard-panel">
      <div>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter text here"
          rows="4"
          cols="50"
        />
      </div>
      <div className="button-group">
        <Button onClick={handleDone} text="Find by Embedding" enabled={true} />
      </div>
      {effectError && <div className="error-message" data-testid="effect-error">{effectError}</div>}
    </div>
  );
};

export default SearchPanel;