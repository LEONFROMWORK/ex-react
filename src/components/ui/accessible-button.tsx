import * as React from "react"
import { Button, ButtonProps } from "./button"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AccessibleButtonProps extends ButtonProps {
  loading?: boolean
  loadingText?: string
  srOnlyText?: string
}

const AccessibleButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ 
    className, 
    children, 
    loading = false, 
    loadingText = "Loading...",
    srOnlyText,
    disabled,
    ...props 
  }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn("relative", className)}
        disabled={disabled || loading}
        aria-busy={loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            <span aria-live="polite">{loadingText}</span>
          </>
        ) : (
          <>
            {children}
            {srOnlyText && <span className="sr-only">{srOnlyText}</span>}
          </>
        )}
      </Button>
    )
  }
)

AccessibleButton.displayName = "AccessibleButton"

export { AccessibleButton }