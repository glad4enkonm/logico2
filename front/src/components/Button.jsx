import React from 'react';
import './buttonPanel.css';

const Button = ({ onClick, text, enabled = true }) => {
  return (
    <button
      className="panel-button"
      onClick={enabled ? onClick : undefined}
      disabled={!enabled}
    >
      {text}
    </button>
  );
};

export default Button;