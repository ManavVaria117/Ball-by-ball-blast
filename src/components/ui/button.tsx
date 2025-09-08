import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Cricket scoring button variants
        score: "bg-card text-card-foreground border border-border hover:bg-accent hover:text-accent-foreground text-lg font-semibold shadow-sm transition-all duration-200 hover:scale-105",
        boundary: "bg-cricket-boundary text-white hover:bg-cricket-boundary/90 text-lg font-bold shadow-md",
        six: "bg-cricket-six text-white hover:bg-cricket-six/90 text-lg font-bold shadow-md",
        wicket: "bg-cricket-wicket text-white hover:bg-cricket-wicket/90 text-lg font-bold shadow-md",
        extra: "bg-cricket-wide text-white hover:bg-cricket-wide/90 text-sm font-medium",
        hero: "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:shadow-glow transform hover:scale-105 transition-all duration-300 text-lg font-semibold",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-14 rounded-lg px-10 text-xl",
        icon: "h-10 w-10",
        touch: "h-16 w-16 rounded-xl text-2xl font-bold",
        wide: "h-12 px-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
