import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import Button from '@/components/Button';

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

  test('renders nothing when disabled', () => {
    render(<Button text="Disabled Button" onClick={() => {}} enabled={false} />);
    expect(screen.queryByText('Disabled Button')).not.toBeInTheDocument();
  });

  test('does not have disabled attribute when enabled', () => {
    render(<Button text="Enabled Button" enabled={true} />);
    expect(screen.getByText('Enabled Button')).not.toBeDisabled();
  });
});