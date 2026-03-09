import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { classNames } from '~/utils/classNames';
import { uiColorRoleTokens, uiSpacingTokens, uiTypographyTokens } from './tokens';

const buttonVariants = cva(
  `inline-flex items-center justify-center whitespace-nowrap rounded-md ${uiTypographyTokens.bodySm} transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bolt-elements-borderColorActive focus-visible:ring-offset-2 focus-visible:ring-offset-bolt-elements-bg-depth-1 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none`,
  {
    variants: {
      variant: {
        primary: uiColorRoleTokens.primary,
        secondary: uiColorRoleTokens.secondary,
        danger: uiColorRoleTokens.danger,
        text: 'hover:bg-bolt-elements-bg-depth-2 hover:text-bolt-elements-textPrimary',
      },
      size: {
        default: `${uiSpacingTokens.minH32} ${uiSpacingTokens.px16} ${uiSpacingTokens.py8} font-medium`,
        sm: `rounded-md ${uiSpacingTokens.px8} ${uiSpacingTokens.py4} ${uiTypographyTokens.bodyXs}`,
        lg: `rounded-md ${uiSpacingTokens.px24} ${uiSpacingTokens.py8}`,
        icon: 'size-8',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

type CanonicalButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
type LegacyButtonVariant = 'default' | 'destructive' | 'outline' | 'ghost' | 'link';
type ButtonVariant = CanonicalButtonVariant | LegacyButtonVariant;

function normalizeButtonVariant(variant?: ButtonVariant): CanonicalButtonVariant {
  if (!variant) {
    return 'primary';
  }

  if (variant === 'default') {
    return 'primary';
  }

  if (variant === 'destructive') {
    return 'danger';
  }

  if (variant === 'outline') {
    return 'secondary';
  }

  if (variant === 'ghost' || variant === 'link') {
    return 'text';
  }

  return variant;
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<VariantProps<typeof buttonVariants>, 'variant'> {
  variant?: ButtonVariant;
  _asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, _asChild = false, ...props }, ref) => {
    const normalizedVariant = normalizeButtonVariant(variant);
    return (
      <button
        className={classNames(buttonVariants({ variant: normalizedVariant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
