interface CircleArrowUpProps {
  className?: string;
  filled?: boolean;
}

export function CircleArrowUp({ className = "", filled = false }: CircleArrowUpProps) {
  return (
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" fill={filled ? "currentColor" : "none"} />
      <path d="m16 12-4-4-4 4" />
      <path d="M12 16V8" />
    </svg>
  );
}