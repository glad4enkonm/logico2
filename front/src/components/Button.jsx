import React from 'react';
import './buttonPanel.css';

const Button = ({ onClick, text, enabled = true, active = false }) => {
  return (
    <button
      className={`panel-button ${active ? 'active' : ''}`}
      onClick={enabled ? onClick : undefined}
      disabled={!enabled}
    >
      {text}
    </button>
  );
};

export default Button;