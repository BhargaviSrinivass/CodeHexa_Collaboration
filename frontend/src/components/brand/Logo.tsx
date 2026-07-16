export function Logo({
  size = 36,
  showText = true,
  className = "",
}: {
  size?: number;
  showText?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src="/logo.png"
        alt="CodeHexa"
        width={size}
        height={size}
        className="rounded-lg object-contain"
        style={{ width: size, height: size }}
      />
      {showText && (
        <div className="leading-tight">
          <span className="text-lg font-bold tracking-tight">
            <span className="text-text-primary">Code</span>
            <span className="brand-gradient">Hexa</span>
          </span>
        </div>
      )}
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary">
      <img src="/logo.png" alt="CodeHexa" className="mb-4 h-16 w-16 animate-pulse rounded-xl" />
      <p className="text-sm font-medium tracking-widest text-text-secondary uppercase">
        Where Code Meets Collaboration
      </p>
    </div>
  );
}
