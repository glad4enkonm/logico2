import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import RightPanel from '../../src/components/rightPanel';

describe('RightPanel component', () => {
  const testData = {
    'Key 1': 'Value 1',
    'Key 2': 'Value 2',
    'Key 3': 'Value 3',
  };

  test('renders with correct caption', () => {
    render(<RightPanel data={testData} caption="Test Caption" />);

    expect(screen.getByText('Test Caption')).toBeInTheDocument();
  });

  test('renders all data entries correctly', () => {
    render(<RightPanel data={testData} caption="Test Caption" />);

    expect(screen.getByText('Key 1')).toBeInTheDocument();
    expect(screen.getByText('Value 1')).toBeInTheDocument();
    expect(screen.getByText('Key 2')).toBeInTheDocument();
    expect(screen.getByText('Value 2')).toBeInTheDocument();
    expect(screen.getByText('Key 3')).toBeInTheDocument();
    expect(screen.getByText('Value 3')).toBeInTheDocument();
  });

  test('renders ButtonPanel component', () => {
    render(<RightPanel data={testData} caption="Test Caption" />);

    // Check for buttons that should be in ButtonPanel
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Save as')).toBeInTheDocument();
    expect(screen.getByText('Random')).toBeInTheDocument();
  });
});