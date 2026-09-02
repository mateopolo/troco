import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Troco application without crashing', () => {
  render(<App />);
  const brandElements = screen.getAllByText(/Troco/i);
  expect(brandElements.length).toBeGreaterThan(0);
});
