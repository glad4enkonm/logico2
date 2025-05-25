import React, { useState } from 'react';
import './buttonPanel.css';
import './clipboardPanel.css';
import Button from './Button';
import ClipboardPanel from './ClipboardPanel';

const ButtonPanel = () => {
  const [showClipboard, setShowClipboard] = useState(false);

  const handleClick = (buttonNumber) => {
    console.log(`Button ${buttonNumber} clicked`);

    // Dispatch a custom event for the button click
    if (buttonNumber === 'random' || buttonNumber === 'new') {
      const event = new CustomEvent('buttonClick', { detail: buttonNumber });
      window.dispatchEvent(event);
    }
  };

  return (
    <div className="button-panel">
      <div className="button-group">
        <Button
          onClick={() => handleClick('new')}
          text="New"
          enabled={true}
        />
        <Button
          onClick={() => handleClick(1)}
          text="Open"
          enabled={true}
        />
        <Button
          onClick={() => handleClick(2)}
          text="Save as"
          enabled={true} // Disabled button
        />
        <Button
          onClick={() => handleClick('random')}
          text="Random"
          enabled={true}
        />
        <Button
          onClick={() => setShowClipboard(!showClipboard)}
          text="LLM Clipboard"
          enabled={true}
        />
      </div>
      {showClipboard && (
        <div className="clipboard-panel-container">
          <ClipboardPanel />
        </div>
      )}
    </div>
  );
};

export default ButtonPanel;