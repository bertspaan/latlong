<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils';

  let {
    class: className,
    value = $bindable(),
    ...restProps
  }: HTMLInputAttributes = $props();
</script>

<input
  data-slot="input"
  class={cn('h-8 w-full min-w-0 rounded-sm border border-input bg-transparent px-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring aria-invalid:bg-red-50 aria-invalid:text-red-900', className)}
  bind:value
  {...restProps}
/>
