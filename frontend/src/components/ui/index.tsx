import { Link } from "react-router-dom";
import { Logo } from "../brand/Logo";

interface DifficultyBadgeProps {
  difficulty: string;
}

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const colors: Record<string, string> = {
    EASY: "bg-success/10 text-success",
    MEDIUM: "bg-warning/10 text-warning",
    HARD: "bg-error/10 text-error",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        colors[difficulty] || "bg-bg-tertiary text-text-secondary"
      }`}
    >
      {difficulty}
    </span>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: "brand-gradient-bg hover:opacity-90 text-white shadow-sm shadow-accent/20",
    secondary: "bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-primary border border-border",
    ghost: "bg-transparent hover:bg-bg-tertiary/50 text-text-secondary",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  return (
    <button
      className={`rounded-xl font-medium transition-all disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 ${className}`}
      {...props}
    />
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-bg-secondary p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link to="/" className="mb-3">
            <Logo size={56} />
          </Link>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-text-secondary">
            Where Code Meets Collaboration
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
