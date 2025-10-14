import React, { useState } from 'react';
import './rightPanel.css';
import ButtonPanel from '@/components/ButtonPanel';

const RightPanel = ({data, caption, sseConnected }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`right-panel ${collapsed ? 'collapsed' : ''}`}>
      <button
        className="toggle-button"
        onClick={() => {
        const newCollapsed = !collapsed;
        setCollapsed(newCollapsed);
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => {
            const event = new CustomEvent('rightPanelToggle', { detail: { collapsed: newCollapsed } });
            window.dispatchEvent(event);
          });
        } else {
          setTimeout(() => {
            const event = new CustomEvent('rightPanelToggle', { detail: { collapsed: newCollapsed } });
            window.dispatchEvent(event);
          }, 0);
        }
      }}
        aria-label={collapsed ? 'Expand right panel' : 'Collapse right panel'}
        title={collapsed ? 'Expand panel' : 'Collapse panel'}
      >
        {collapsed ? '⟨' : '⟩'}
      </button>
      <div className="panel-content">
        <ButtonPanel sseConnected={sseConnected}/>
        <div style={{ marginTop: '40px' }}>
          <h2 className="panel-caption">{caption}</h2>
          <table className="info-table">
            <tbody>
              {Object.entries(data).map(([key, value], index) => (
                <tr key={index}>
                  <td className="key">{key}</td>
                  <td className="value">{''+value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RightPanel;
