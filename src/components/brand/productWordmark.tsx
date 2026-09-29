import { cn } from "@/lib/utils";

export function ProductWordmark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex min-w-0 items-baseline gap-1.5 whitespace-nowrap font-semibold tracking-tight",
        className
      )}
    >
      <span className="text-primary">pallas</span>
      <span className="text-[0.72em] font-medium tracking-normal text-muted-foreground">
        for
      </span>
      <span
        className="text-[0.9em] font-bold tracking-tight text-black dark:text-white"
        style={{
          fontFamily:
            '"Avenir Next", "Helvetica Neue", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
          fontWeight: 700,
        }}
      >
        Asianode
      </span>
    </span>
  );
}
