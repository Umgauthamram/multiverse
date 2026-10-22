import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { AuthProvider } from "@/lib/auth/authContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { UserMenu } from "@/components/auth/UserMenu";
import { assertAntiSlopCompliance } from "@/lib/design/antiSlopGuard";

describe("Authentication & Header User Experience", () => {
  it("renders UserMenu with Log In and Sign Up buttons for guest users", () => {
    const onOpenLogin = vi.fn();
    const onOpenSignup = vi.fn();

    const html = renderToString(
      <AuthProvider>
        <UserMenu onOpenLogin={onOpenLogin} onOpenSignup={onOpenSignup} />
      </AuthProvider>
    );

    expect(html).toContain("Log In");
    expect(html).toContain("Sign Up");
    assertAntiSlopCompliance(html);
  });

  it("renders AuthModal dialog with Sign In tab, inputs, and demo button", () => {
    const onClose = vi.fn();

    const html = renderToString(
      <AuthProvider>
        <AuthModal isOpen={true} onClose={onClose} initialMode="login" />
      </AuthProvider>
    );

    expect(html).toContain("Welcome back to Multiverse");
    expect(html).toContain("Sign In");
    expect(html).toContain("Create Account");
    expect(html).toContain("Email Address");
    expect(html).toContain("Password");
    expect(html).toContain("Instant Demo Account");
    expect(html).toContain("Continue with GitHub");
    assertAntiSlopCompliance(html);
  });

  it("renders AuthModal in signup mode with Full Name and Confirm Password", () => {
    const onClose = vi.fn();

    const html = renderToString(
      <AuthProvider>
        <AuthModal isOpen={true} onClose={onClose} initialMode="signup" />
      </AuthProvider>
    );

    expect(html).toContain("Create your Multiverse account");
    expect(html).toContain("Full Name");
    expect(html).toContain("Confirm Password");
    expect(html).toContain("Create Free Account");
    assertAntiSlopCompliance(html);
  });

  it("does not render AuthModal when isOpen is false", () => {
    const onClose = vi.fn();

    const html = renderToString(
      <AuthProvider>
        <AuthModal isOpen={false} onClose={onClose} />
      </AuthProvider>
    );

    expect(html).toBe("");
  });
});
