import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import ButtonPanel from '../../src/components/ButtonPanel';

describe('ButtonPanel component', () => {
  test('renders all buttons with correct text', () => {
    render(<ButtonPanel />);

    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Save as')).toBeInTheDocument();
    expect(screen.getByText('Random')).toBeInTheDocument();
  });

  test('calls handleClick with correct button number when clicked', () => {
    render(<ButtonPanel />);

    // Mock the console.log to verify the button number
    const originalLog = console.log;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    fireEvent.click(screen.getByText('New'));
    expect(logSpy).toHaveBeenCalledWith('Button 4 clicked');

    fireEvent.click(screen.getByText('Open'));
    expect(logSpy).toHaveBeenCalledWith('Button 1 clicked');

    fireEvent.click(screen.getByText('Save as'));
    expect(logSpy).toHaveBeenCalledWith('Button 2 clicked');

    fireEvent.click(screen.getByText('Random'));
    expect(logSpy).toHaveBeenCalledWith('Button random clicked');

    // Restore original console.log
    logSpy.mockRestore();
  });

  test('dispatches custom event for Random button', () => {
    render(<ButtonPanel />);

    const eventSpy = jest.spyOn(window, 'dispatchEvent');

    fireEvent.click(screen.getByText('Random'));

    expect(eventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    const event = eventSpy.mock.calls[0][0];
    expect(event.type).toBe('buttonClick');
    expect(event.detail).toBe('random');
  });
});