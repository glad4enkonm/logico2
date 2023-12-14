import React from 'react';
import './rightPanel.css';

const RightPanel = ({data}) => {
  return (
    <div className="right-panel">
      <h2 className="panel-caption">Panel Caption</h2>
      <table className="info-table">
        <tbody>
          {Object.entries(data).map(([key, value], index) => (
            <tr key={index}>
              <td className="key">{key}</td>
              <td className="value">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RightPanel;