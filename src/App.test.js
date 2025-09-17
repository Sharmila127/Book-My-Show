import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Test 1: App renders without crashing
test('App component renders without crashing', () => {
  render(<App />);
});

// Test 2: Check that main text is present
// Make sure your App.js has an element like <h1>Book My Show</h1>
test('displays Book My Show text', () => {
  render(<App />);
  const textElement = screen.getByText(/Book My Show/i);
  expect(textElement).toBeInTheDocument();
});
