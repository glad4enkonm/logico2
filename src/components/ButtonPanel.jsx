import React, { useState } from 'react';
import './buttonPanel.css';
import Button from '@/components/Button';
import ClipboardPanel from '@/components/ClipboardPanel';

const ButtonPanel = () => {
  const [showClipboard, setShowClipboard] = useState(false);

  return (
    <div className="button-panel">
      <div className="button-group">
        <Button
          onClick={() => {
            const event = new CustomEvent('buttonClick', { detail: 'new' });
            window.dispatchEvent(event);
          }}
          text="New"
          enabled={true}
        />
        <Button
          onClick={() => {
            const event = new CustomEvent('buttonClick', { detail: 'open' });
            window.dispatchEvent(event);
          }}
          text="Open"
          enabled={true}
        />
        <Button
          onClick={() => {
            const event = new CustomEvent('buttonClick', { detail: 'saveAs' });
            window.dispatchEvent(event);
          }}
          text="Save as"
          enabled={true} // Enabled button
        />
        <Button
          onClick={() => {
            const event = new CustomEvent('buttonClick', { detail: 'random' });
            window.dispatchEvent(event);
          }}
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