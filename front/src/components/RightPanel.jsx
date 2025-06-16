import React from 'react';
import './rightPanel.css';
import ButtonPanel from '@/components/ButtonPanel';

const RightPanel = ({data, caption, sseConnected }) => {
  return (
    <div className="right-panel">
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
  );
};

export default RightPanel;