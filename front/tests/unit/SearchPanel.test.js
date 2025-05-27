import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchPanel from '@/components/SearchPanel';
import { applySearchEffect, getSearchEffects } from '@/effects/search';

jest.mock('@/effects/search', () => ({
  applySearchEffect: jest.fn(),
  getSearchEffects: jest.fn()
}));

describe('SearchPanel', () => {
  beforeEach(() => {
    applySearchEffect.mockImplementation((effectKey) => {
      if (effectKey === 'upperCase') {
        return (content) => content.toUpperCase();
      }
      return null;
    });
    getSearchEffects.mockReturnValue({
      upperCase: 'Upper Case',
      lowerCase: 'Lower Case'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<SearchPanel />);
    expect(screen.getByText('Select effect')).toBeInTheDocument();
  });

  it('applies effect when selected', async () => {
    render(<SearchPanel />);

    const input = screen.getByPlaceholderText('Enter text here');
    const select = screen.getByRole('combobox');

    fireEvent.change(input, { target: { value: 'test input' } });
    fireEvent.change(select, { target: { value: 'upperCase' } });

    await waitFor(() => {
      expect(applySearchEffect).toHaveBeenCalledWith('upperCase');
      expect(screen.getByDisplayValue('TEST INPUT')).toBeInTheDocument();
    });
  });
  
});