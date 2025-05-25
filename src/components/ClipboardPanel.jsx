import React, { useState, useEffect } from 'react';
import './clipboardPanel.css';
import Button from '@/components/Button';
import {
  copyToClipboard,
  applyTemplate,
  getPromptTemplates
} from '@/utils/clipboardUtil';

const ClipboardPanel = () => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [clipboardError, setClipboardError] = useState('');
  const [templateError, setTemplateError] = useState('');
  const templates = getPromptTemplates();

  useEffect(() => {
    if (selectedTemplate && inputText) {
      const formatted = applyTemplate(selectedTemplate, inputText);
      if (formatted === null) {
        setTemplateError('Invalid template selected');
        setOutputText(inputText);
      } else {
        setTemplateError('');
        setOutputText(formatted);
      }
    } else {
      setTemplateError('');
      setOutputText(inputText);
    }
  }, [selectedTemplate, inputText]);

  const handleCopy = () => {
    copyToClipboard(selectedTemplate, inputText);
  };

  const handleTemplateChange = (e) => {
    const template = e.target.value;
    setSelectedTemplate(template);
  };

  const handleDone = () => {
    // Implement done functionality if needed
    console.log('Done button clicked');
  };

  return (
    <div className="clipboard-panel">
      <div>
        <select value={selectedTemplate} onChange={handleTemplateChange}>
          <option value="">Select template</option>
          {Object.keys(templates).map((key) => (
            <option key={key} value={key}>
              {key.replace('template', 'Template ')}
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
        <Button onClick={handleCopy} text="Copy to Clipboard" enabled={true} />
      </div>
      {templateError && <div className="error-message" data-testid="template-error">{templateError}</div>}
    </div>
  );
};

export default ClipboardPanel;