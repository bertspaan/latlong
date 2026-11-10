<script lang="ts">
  import { DropdownMenu as Primitive } from 'bits-ui';
  import { cn } from '$lib/utils';

  let {
    ref = $bindable(null),
    sideOffset = 6,
    align = 'start',
    class: className,
    ...restProps
  }: Primitive.ContentProps = $props();
</script>

<Primitive.Portal>
  <Primitive.Content
    bind:ref
    data-slot="dropdown-menu-content"
    {sideOffset}
    {align}
    class={cn('z-50 max-h-(--bits-dropdown-menu-content-available-height) min-w-56 overflow-y-auto rounded-md border border-input bg-popover p-1 text-sm text-popover-foreground shadow-md outline-none', className)}
    {...restProps}
  />
</Primitive.Portal>
