<script lang="ts">
  import { DropdownMenu as Primitive } from 'bits-ui';
  import { cn } from '$lib/utils';

  let { ref = $bindable(null), class: className, ...restProps }: Primitive.ItemProps = $props();
</script>

<Primitive.Item
  bind:ref
  data-slot="dropdown-menu-item"
  class={cn('flex min-h-8 cursor-default items-center gap-2 rounded-sm px-2 outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0', className)}
  {...restProps}
/>
