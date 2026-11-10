<script lang="ts">
  import { Check } from '@lucide/svelte';
  import { DropdownMenu as Primitive } from 'bits-ui';
  import { cn } from '$lib/utils';

  let {
    ref = $bindable(null),
    class: className,
    children: childrenProp,
    ...restProps
  }: Omit<Primitive.RadioItemProps, 'child'> = $props();
</script>

<Primitive.RadioItem
  bind:ref
  data-slot="dropdown-menu-radio-item"
  closeOnSelect
  class={cn('flex min-h-8 cursor-default items-center gap-2 rounded-sm px-2 outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground', className)}
  {...restProps}
>
  {#snippet children({ checked })}
    <span class="flex size-4 shrink-0 items-center" aria-hidden="true">
      {#if checked}<Check class="size-4 text-teal-700" />{/if}
    </span>
    {@render childrenProp?.({ checked })}
  {/snippet}
</Primitive.RadioItem>
