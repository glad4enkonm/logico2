import React, { useState, useEffect } from 'react';
import './clipboardPanel.css';
import Button from '@/components/Button';
import {
  getSearchEffects,
  applySearchEffect
} from '@/effects/search';

const SearchPanel = () => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [selectedEffect, setSelectedEffect] = useState('');
  const [effectError, setEffectError] = useState('');
  const effects = getSearchEffects();

  useEffect(() => {
    if (selectedEffect && inputText) {
      const result = applySearchEffect(selectedEffect)(inputText);
      if (result === null) {
        setEffectError('Invalid effect selected');
        setOutputText(inputText);
      } else {
        setEffectError('');
        setOutputText(result);
      }
    } else {
      setEffectError('');
      setOutputText(inputText);
    }
  }, [selectedEffect, inputText]);

  const handleEffectChange = (e) => {
    const effect = e.target.value;
    setSelectedEffect(effect);
  };

  const handleDone = () => {
    // Implement done functionality if needed
    console.log('Done button clicked');
  };

  return (
    <div className="clipboard-panel">
      <div>
        <select value={selectedEffect} onChange={handleEffectChange}>
          <option value="">Select effect</option>
          {Object.keys(effects).map((key) => (
            <option key={key} value={key}>
              {key.replace('effect', 'Effect ')}
            </option>
          ))}
        </select>
      </div>
      <div>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter text here"
          rows="4"
          cols="50"
        />
      </div>
      <div>
        <textarea
          value={outputText}
          readOnly
          placeholder="Output will appear here"
          rows="4"
          cols="50"
        />
      </div>
      <div className="button-group">
        <Button onClick={handleDone} text="Done" enabled={true} />
      </div>
      {effectError && <div className="error-message" data-testid="effect-error">{effectError}</div>}
    </div>
  );
};

export default SearchPanel;