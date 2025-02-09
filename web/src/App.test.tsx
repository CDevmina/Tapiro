import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";

test("renders learn react link", () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});

test("renders vite and react logos", () => {
  render(<App />);
  const viteLogo = screen.getByAltText(/vite logo/i);
  const reactLogo = screen.getByAltText(/react logo/i);
  expect(viteLogo).toBeInTheDocument();
  expect(reactLogo).toBeInTheDocument();
});

test("increments counter on button click", () => {
  render(<App />);
  const button = screen.getByRole("button");
  expect(button).toHaveTextContent("count is 0");
  fireEvent.click(button);
  expect(button).toHaveTextContent("count is 1");
});
