import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders landing page title', () => {
  render(<App />);
  const headingElement = screen.getByText(/landing page/i);
  expect(headingElement).toBeInTheDocument();
});
