import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

vi.mock("../auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../auth/AuthContext";
import AuthPage from "../pages/AuthPage";

const mockedUseAuth = vi.mocked(useAuth);

const auth = {
  signUp: vi.fn(),
  signIn: vi.fn(),
  resetPassword: vi.fn(),
};

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();

  auth.signUp.mockResolvedValue(undefined);
  auth.signIn.mockResolvedValue(undefined);
  auth.resetPassword.mockResolvedValue(undefined);

  mockedUseAuth.mockReturnValue(
    auth as unknown as ReturnType<typeof useAuth>,
  );
});

describe("AuthPage flows", () => {
  it("renders login mode and switches password visibility", () => {
    render(<AuthPage />);

    expect(
      screen.getByRole("heading", { name: "Welcome back" }),
    ).toBeInTheDocument();

    const password = screen.getByPlaceholderText("Enter your password");

    expect(password).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(password).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("validates mismatched signup passwords before calling auth", async () => {
    render(<AuthPage />);

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    fireEvent.change(screen.getByPlaceholderText("Your full name"), {
      target: { value: "Test User" },
    });

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    });

    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "password123" },
    });

    // Fixed: use the actual placeholder rendered by AuthPage
    fireEvent.change(screen.getByPlaceholderText("Confirm your password"), {
      target: { value: "different123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      await screen.findByText("Passwords do not match."),
    ).toBeInTheDocument();

    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("validates short signup password", async () => {
    render(<AuthPage />);

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    fireEvent.change(screen.getByPlaceholderText("Your full name"), {
      target: { value: "Test User" },
    });

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    });

    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "short" },
    });

    // Fixed: use the actual placeholder rendered by AuthPage
    fireEvent.change(screen.getByPlaceholderText("Confirm your password"), {
      target: { value: "short" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      await screen.findByText("Password must contain at least 8 characters."),
    ).toBeInTheDocument();

    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("submits valid signup and shows verification message", async () => {
    render(<AuthPage />);

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    fireEvent.change(screen.getByPlaceholderText("Your full name"), {
      target: { value: "  Test User  " },
    });

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: " test@example.com " },
    });

    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "password123" },
    });

    // Fixed: use the actual placeholder rendered by AuthPage
    fireEvent.change(screen.getByPlaceholderText("Confirm your password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(auth.signUp).toHaveBeenCalledWith(
        "Test User",
        "test@example.com",
        "password123",
      );
    });

    expect(
      await screen.findByText(/Account created! Check your email/),
    ).toBeInTheDocument();
  });

  it("submits login and surfaces authentication errors", async () => {
    auth.signIn.mockRejectedValueOnce(new Error("Invalid credentials"));

    render(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@example.com" },
    });

    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "badpassword" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();

    expect(auth.signIn).toHaveBeenCalledWith(
      "user@example.com",
      "badpassword",
    );
  });

  it("sends reset email and displays confirmation", async () => {
    render(<AuthPage />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Forgot password?" })[0],
    );

    expect(
      screen.getByRole("heading", { name: "Reset your password" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Send Reset Link" }));

    await waitFor(() => {
      expect(auth.resetPassword).toHaveBeenCalledWith("user@example.com");
    });

    expect(
      await screen.findByText(/Password reset link sent/),
    ).toBeInTheDocument();
  });
});