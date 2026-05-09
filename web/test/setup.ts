import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard/kb",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
  },
  Toaster: () => null,
}));

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
