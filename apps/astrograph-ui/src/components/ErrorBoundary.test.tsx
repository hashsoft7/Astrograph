import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

const Thrower = () => {
  throw new Error("test error");
};

describe("ErrorBoundary", () => {
  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <span data-testid="child">ok</span>
      </ErrorBoundary>
    );
    expect(screen.getByTestId("child")).toHaveTextContent("ok");
  });

  it("shows fallback UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(
        /An unexpected error occurred. Please try reloading the app/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Reload App/ })
    ).toBeInTheDocument();
  });
});
