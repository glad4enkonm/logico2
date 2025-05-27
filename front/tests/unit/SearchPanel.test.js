import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchPanel from '@/components/SearchPanel';

describe('SearchPanel', () => {
  it('renders without crashing', () => {
    render(<SearchPanel />);
    expect(screen.getByPlaceholderText('Enter text here')).toBeInTheDocument();
    expect(screen.getByText('Find by Embedding')).toBeInTheDocument();
  });

  it('dispatches findByEmbedding event when done', () => {
    const dispatchEvent = jest.spyOn(window, 'dispatchEvent');
    render(<SearchPanel />);

    const input = screen.getByPlaceholderText('Enter text here');
    fireEvent.change(input, { target: { value: 'test input' } });

    const button = screen.getByText('Find by Embedding');
    fireEvent.click(button);

    expect(dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
    const event = dispatchEvent.mock.calls[0][0];
    expect(event.type).toBe('buttonClick');
    expect(event.detail.type).toBe('EFFECT_CALL_FINDBYEMBEDDING');
    expect(event.detail.inputText).toBe('test input');
  });

  it('shows error when no input', () => {
    render(<SearchPanel />);
    const button = screen.getByText('Find by Embedding');
    fireEvent.click(button);
    expect(screen.getByText('Please enter input text')).toBeInTheDocument();
  });
});