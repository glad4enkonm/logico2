import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import ButtonPanel from '@/components/ButtonPanel';

describe('ButtonPanel component', () => {
  test('renders all buttons with correct text', () => {
    render(<ButtonPanel />);

    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Save as')).toBeInTheDocument();
    expect(screen.getByText('Random')).toBeInTheDocument();
  });

  test('dispatches custom event for implemented buttons', () => {
    render(<ButtonPanel />);

    const eventSpy = jest.spyOn(window, 'dispatchEvent');

    fireEvent.click(screen.getByText('New'));
    expect(eventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    const event = eventSpy.mock.calls[0][0];
    expect(event.type).toBe('buttonClick');
    expect(event.detail).toBe('new');

    eventSpy.mockReset();

    fireEvent.click(screen.getByText('Open'));
    expect(eventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    const event2 = eventSpy.mock.calls[0][0];
    expect(event2.type).toBe('buttonClick');
    expect(event2.detail).toBe('open');

    eventSpy.mockReset();

    fireEvent.click(screen.getByText('Save as'));
    expect(eventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    const event3 = eventSpy.mock.calls[0][0];
    expect(event3.type).toBe('buttonClick');
    expect(event3.detail).toBe('saveAs');

    eventSpy.mockReset();

    fireEvent.click(screen.getByText('Random'));
    expect(eventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    const event4 = eventSpy.mock.calls[0][0];
    expect(event4.type).toBe('buttonClick');
    expect(event4.detail).toBe('random');

    eventSpy.mockRestore();
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