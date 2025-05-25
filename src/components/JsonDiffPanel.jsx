import React, { useState } from 'react';
import './jsonDiffPanel.css';
import Button from '@/components/Button';

const JsonDiffPanel = ({ graph, graphDataRef, allValuesRef, highlitedRef, onDone }) => {
  const [inputJson, setInputJson] = useState('');

  const handleDone = () => {
    onDone(inputJson);
    // The graph update logic will be handled by the parent component (App.js)
    // via the onDone callback and the handleJsonEffect.
  };

  return (
    <div className="json-diff-panel">
      <div>
        <textarea
          value={inputJson}
          onChange={(e) => setInputJson(e.target.value)}
          placeholder="Enter JSON data here (nodes, edges, allValues)"
          rows="10"
          cols="50"
        />
      </div>
      <div className="button-group">
        <Button onClick={handleDone} text="Done" enabled={true} />
      </div>
    </div>
  );

};

export default JsonDiffPanel;