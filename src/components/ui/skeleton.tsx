import * as React from "react"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--border-oat-light)] ${className || ""}`}
      {...props}
    />
  )
}

export { Skeleton }
