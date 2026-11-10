<script lang="ts" module>
  import { tv, type VariantProps } from 'tailwind-variants';

  export const buttonVariants = tv({
    base: 'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-sm whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    variants: {
      variant: {
        ghost: 'hover:bg-accent hover:text-accent-foreground'
      },
      size: {
        sm: 'h-8 px-2',
        'icon-sm': 'size-8'
      }
    },
    defaultVariants: { variant: 'ghost', size: 'sm' }
  });
</script>

<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils';

  let {
    class: className,
    children,
    variant,
    size,
    type = 'button',
    ...restProps
  }: HTMLButtonAttributes & VariantProps<typeof buttonVariants> = $props();
</script>

<button data-slot="button" class={cn(buttonVariants({ variant, size }), className)} {type} {...restProps}>
  {@render children?.()}
</button>
