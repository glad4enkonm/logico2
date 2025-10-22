import React, { useState, useRef } from 'react';
import './rightPanel.css';
import ButtonPanel from '@/components/ButtonPanel';

const RightPanel = ({data, caption, sseConnected }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [panelWidth, setPanelWidth] = useState(400);
  const [resizing, setResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(400);

  const onMouseDown = (e) => {
    if (collapsed) return;
    setResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = panelWidth;

    const onMouseMove = (ev) => {
      const dx = startXRef.current - ev.clientX;
      const vw = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
      const minW = 260;
      const maxW = Math.min(Math.floor(vw * 0.85), 900);
      let newWidth = startWidthRef.current + dx;
      if (newWidth < minW) newWidth = minW;
      if (newWidth > maxW) newWidth = maxW;
      setPanelWidth(newWidth);
      const evt = new CustomEvent('rightPanelResize', { detail: { width: newWidth } });
      window.dispatchEvent(evt);
    };

    const onMouseUp = () => {
      setResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  };

  return (
    <div className={`right-panel ${collapsed ? 'collapsed' : ''} ${resizing ? 'resizing' : ''}`} style={{ width: collapsed ? undefined : panelWidth }}>
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
      {!collapsed && (
        <div className="resize-handle" onMouseDown={onMouseDown} role="separator" aria-orientation="vertical" aria-label="Resize right panel" />
      )}
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
