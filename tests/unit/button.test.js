import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import Button from '../../src/components/Button';

describe('Button component', () => {
  test('renders text correctly', () => {
    render(<Button text="Test Button" />);
    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });

  test('calls onClick when clicked and enabled', () => {
    const handleClick = jest.fn();
    render(<Button text="Click Me" onClick={handleClick} />);

    fireEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('does not call onClick when disabled', () => {
    const handleClick = jest.fn();
    render(<Button text="Disabled Button" onClick={handleClick} enabled={false} />);

    fireEvent.click(screen.getByText('Disabled Button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('has correct disabled attribute when disabled', () => {
    render(<Button text="Disabled Button" enabled={false} />);
    expect(screen.getByText('Disabled Button')).toBeDisabled();
  });

  test('does not have disabled attribute when enabled', () => {
    render(<Button text="Enabled Button" enabled={true} />);
    expect(screen.getByText('Enabled Button')).not.toBeDisabled();
  });
});