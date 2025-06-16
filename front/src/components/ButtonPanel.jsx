import React, { useState } from 'react';
import './buttonPanel.css';
import Button from '@/components/Button';
import ClipboardPanel from '@/components/ClipboardPanel';
import JsonDiffPanel from '@/components/JsonDiffPanel';
import SearchPanel from '@/components/SearchPanel';
import { BUTTON_EVENTS } from '@/constants/appConstants';

const ButtonPanel = ({ sseConnected }) => {
  const [showClipboard, setShowClipboard] = useState(false);
  const [showJsonDiff, setShowJsonDiff] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="button-panel">
      <div className="button-group">
        <Button
          onClick={() => {
            const event = new CustomEvent('buttonClick', { detail: BUTTON_EVENTS.NEW });
            window.dispatchEvent(event);
          }}
          text="New"
          enabled={true}
        />
        <Button
          onClick={() => {
            const event = new CustomEvent('buttonClick', { detail: BUTTON_EVENTS.OPEN });
            window.dispatchEvent(event);
          }}
          text="Open"
          enabled={true}
        />
        <Button
          onClick={() => {
            const event = new CustomEvent('buttonClick', { detail: BUTTON_EVENTS.SAVE_AS });
            window.dispatchEvent(event);
          }}
          text="Save as"
          enabled={true} // Enabled button
        />
        <Button
          onClick={() => {
            const event = new CustomEvent('buttonClick', { detail: BUTTON_EVENTS.RANDOM });
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
        <Button
          onClick={() => setShowJsonDiff(!showJsonDiff)}
          text="JSON Diff"
          enabled={true}
        />
        <Button
          onClick={() => setShowSearch(!showSearch)}
          text="Search"
          enabled={true}
        />
        <Button
          onClick={() => {
            const event = new CustomEvent('buttonClick', { detail: BUTTON_EVENTS.NEO4J_SYNC });
            window.dispatchEvent(event);
          }}
          text="Neo4j Sync"
          enabled={true}
        />
        <Button
          onClick={() => {
            const eventType = sseConnected ? BUTTON_EVENTS.SSE_DISCONNECT : BUTTON_EVENTS.SSE_CONNECT;
            const event = new CustomEvent('buttonClick', { detail: { type: eventType } });
            window.dispatchEvent(event);
          }}
          text={sseConnected ? 'Disconnect' : 'Connect'}
          enabled={true}
          active={sseConnected}
        />
      </div>
      {showClipboard && (
        <div className="clipboard-panel-container">
          <ClipboardPanel />
        </div>
      )}
      {showJsonDiff && (
        <div className="json-panel-container">
          <div>
            <JsonDiffPanel
              onDone={(jsonData) => {
                const event = new CustomEvent('buttonClick', { detail: { type: BUTTON_EVENTS.JSON_DIFF_DONE, jsonData } });
                window.dispatchEvent(event);
                setShowJsonDiff(false);
              }}
            />
          </div>
        </div>
      )}
      {showSearch && (
        <div className="search-panel-container">
          <SearchPanel />
        </div>
      )}
    </div>
  );
};

export default ButtonPanel;