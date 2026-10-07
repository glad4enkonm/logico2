import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { LAYOUT_METHODS, LAYOUT_PARAMS } from '@/constants/layoutParams';
import './layoutModal.css';

const LayoutModal = ({ isOpen, onClose, onApply }) => {
  const [selectedLayout, setSelectedLayout] = useState('forceAtlas2');
  const [params, setParams] = useState(() => buildDefaults('forceAtlas2'));

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleLayoutChange = useCallback((e) => {
    const layout = e.target.value;
    setSelectedLayout(layout);
    setParams(buildDefaults(layout));
  }, []);

  const handleParamChange = useCallback((key, value, type) => {
    setParams((prev) => ({
      ...prev,
      [key]: type === 'number' ? Number(value) : value,
    }));
  }, []);

  const handleApply = useCallback(() => {
    const layoutConfig = { type: selectedLayout, ...params };
    onApply(layoutConfig);
  }, [selectedLayout, params, onApply]);

  if (!isOpen) return null;

  const paramDefs = LAYOUT_PARAMS[selectedLayout] || {};
  const paramKeys = Object.keys(paramDefs);

  return createPortal(
    <div className="layout-modal-backdrop" onMouseDown={onClose}>
      <div className="layout-modal" onMouseDown={(e) => e.stopPropagation()}>
        <h3>Auto Layout</h3>
        <div className="param-row" style={{ marginBottom: 16 }}>
          <label>Layout Method</label>
          <select value={selectedLayout} onChange={handleLayoutChange}>
            {LAYOUT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        {paramKeys.map((key) => {
          const p = paramDefs[key];
          return (
            <div className="param-row" key={key}>
              <label>{p.label}</label>
              {p.type === 'boolean' && (
                <input
                  type="checkbox"
                  checked={!!params[key]}
                  onChange={(e) => handleParamChange(key, e.target.checked, 'boolean')}
                />
              )}
              {p.type === 'number' && (
                <input
                  type="number"
                  value={params[key]}
                  step={p.step || 1}
                  onChange={(e) => handleParamChange(key, e.target.value, 'number')}
                />
              )}
              {p.type === 'select' && (
                <select
                  value={params[key]}
                  onChange={(e) => handleParamChange(key, e.target.value, 'select')}
                >
                  {p.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleApply}>Apply</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

function buildDefaults(layout) {
  const defs = LAYOUT_PARAMS[layout] || {};
  const result = {};
  for (const key of Object.keys(defs)) {
    result[key] = defs[key].default;
  }
  return result;
}

export default LayoutModal;
