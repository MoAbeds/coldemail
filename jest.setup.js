// Only load DOM-dependent setup in jsdom environment
if (typeof window !== "undefined") {
  require("@testing-library/jest-dom");

  // Mock next/navigation
  jest.mock("next/navigation", () => ({
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      refresh: jest.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => "/",
  }));

  // Mock next-auth
  jest.mock("next-auth/react", () => ({
    useSession: () => ({
      data: {
        user: { id: "test-user-id", name: "Test User", email: "test@example.com" },
      },
      status: "authenticated",
    }),
    signIn: jest.fn(),
    signOut: jest.fn(),
  }));

  // Mock window.matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Suppress noisy console.error in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === "string" && args[0].includes("Warning: ReactDOM.render")) return;
    originalError.call(console, ...args);
  };
});
afterAll(() => {
  console.error = originalError;
});
