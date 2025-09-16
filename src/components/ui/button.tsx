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
        score: "bg-gradient-to-br from-card to-card/80 text-card-foreground border border-border/50 hover:border-primary/50 hover:bg-primary/10 hover:text-primary-foreground text-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm",
        boundary: "bg-gradient-to-br from-cricket-boundary to-cricket-boundary/80 text-white hover:from-cricket-boundary/90 hover:to-cricket-boundary text-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105",
        six: "bg-gradient-to-br from-cricket-six to-cricket-six/80 text-white hover:from-cricket-six/90 hover:to-cricket-six text-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105",
        wicket: "bg-gradient-to-br from-cricket-wicket to-cricket-wicket/80 text-white hover:from-cricket-wicket/90 hover:to-cricket-wicket text-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105",
        extra: "bg-gradient-to-r from-cricket-wide to-cricket-wide/80 text-white hover:from-cricket-wide/90 hover:to-cricket-wide text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105",
        retire: "bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-white hover:from-orange-600 hover:via-red-600 hover:to-orange-700 text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-orange-400/50 hover:border-orange-300",
        hero: "bg-gradient-to-r from-primary via-primary-glow to-primary text-primary-foreground hover:shadow-glow transform hover:scale-105 transition-all duration-300 text-lg font-semibold shadow-xl hover:shadow-2xl",
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
