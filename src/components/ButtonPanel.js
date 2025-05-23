import React from 'react';
import './buttonPanel.css';
import Button from './Button';

const ButtonPanel = () => {
  const handleClick = (buttonNumber) => {
    console.log(`Button ${buttonNumber} clicked`);
  };

  return (
    <div className="button-panel">
      <Button
        onClick={() => handleClick(4)}
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
        onClick={() => handleClick(3)}
        text="Switch to"
        enabled={true}
      />      
    </div>
  );
};

export default ButtonPanel;