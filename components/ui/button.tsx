import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          // Touch-friendly: minimum 44x44px tap target on mobile (iOS/Android guidelines)
          "min-h-[44px] min-w-[44px] active:scale-95 touch-manipulation",
          {
            "bg-primary text-primary-foreground hover:bg-primary/90": variant === "default",
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground": variant === "outline",
            "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
            "bg-red-600 text-white hover:bg-red-700": variant === "destructive",
          },
          {
            "h-11 px-5 py-2.5 text-base md:h-10 md:px-4 md:py-2 md:text-sm": size === "default",
            "h-9 px-3 text-sm md:h-8 md:px-2 md:text-xs": size === "sm",
            "h-12 px-6 py-3 text-lg md:h-11 md:px-5 md:py-2.5 md:text-base": size === "lg",
            "h-11 w-11 p-0 md:h-10 md:w-10": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
