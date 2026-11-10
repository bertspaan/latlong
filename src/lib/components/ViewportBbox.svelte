<script lang="ts">
  import {
    clampViewportBboxSize,
    maxViewportBboxSize,
    minViewportBboxSize,
    type ViewportBboxSize
  } from '$lib/viewport-bbox';

  let {
    size,
    onresize
  }: {
    size: ViewportBboxSize;
    onresize: (size: ViewportBboxSize) => void;
  } = $props();

  const edges = [
    { name: 'Left', axis: 'width', x: -1, y: 0, class: 'left-0 -translate-x-1/2' },
    { name: 'Right', axis: 'width', x: 1, y: 0, class: 'right-0 translate-x-1/2' },
    { name: 'Top', axis: 'height', x: 0, y: -1, class: 'top-0 -translate-y-1/2' },
    { name: 'Bottom', axis: 'height', x: 0, y: 1, class: 'bottom-0 translate-y-1/2' }
  ] as const;

  const corners = [
    { name: 'Top-left', x: -1, y: -1, class: 'top-0 left-0 -translate-1/2 cursor-nwse-resize' },
    { name: 'Top-right', x: 1, y: -1, class: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize' },
    { name: 'Bottom-left', x: -1, y: 1, class: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize' },
    { name: 'Bottom-right', x: 1, y: 1, class: 'right-0 bottom-0 translate-1/2 cursor-nwse-resize' }
  ] as const;

  type Edge = (typeof edges)[number];
  type Direction = { x: number; y: number };
  let frame: HTMLDivElement;
  let drag: {
    pointer: number;
    start: { x: number; y: number };
    direction: Direction;
    size: ViewportBboxSize;
    viewport: DOMRect;
  } | null = null;

  function resizedPercent(initial: number, delta: number, viewportLength: number) {
    const percent = initial + (200 * delta) / viewportLength;
    return clampViewportBboxSize(Math.round(percent * 100) / 100);
  }

  function startDrag(event: PointerEvent, direction: Direction) {
    if (drag || event.button !== 0) return;

    const handle = event.currentTarget as HTMLDivElement;
    const viewport = frame.parentElement?.getBoundingClientRect();
    if (!viewport?.width || !viewport.height) return;
    drag = {
      pointer: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      direction,
      size,
      viewport
    };
    handle.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent) {
    if (drag?.pointer !== event.pointerId) return;

    const { start, direction, size: initial, viewport } = drag;
    onresize({
      width: resizedPercent(initial.width, (event.clientX - start.x) * direction.x, viewport.width),
      height: resizedPercent(initial.height, (event.clientY - start.y) * direction.y, viewport.height)
    });
  }

  function endDrag(event: PointerEvent) {
    if (drag?.pointer === event.pointerId) drag = null;
  }

  function finishDrag(event: PointerEvent) {
    moveDrag(event);
    endDrag(event);
  }

  function resizeWithKeyboard(event: KeyboardEvent, edge: Edge) {
    let percent = size[edge.axis];
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        percent += 1;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        percent -= 1;
        break;
      case 'Home':
        percent = minViewportBboxSize;
        break;
      case 'End':
        percent = maxViewportBboxSize;
        break;
      default:
        return;
    }
    event.preventDefault();
    onresize({ ...size, [edge.axis]: clampViewportBboxSize(percent) });
  }
</script>

<div
  bind:this={frame}
  class="pointer-events-none absolute top-1/2 left-1/2 z-[1] -translate-1/2 bg-teal-600/10 ring-2 ring-teal-700 ring-inset"
  style:width={`${size.width}%`}
  style:height={`${size.height}%`}
>
  {#each edges as edge (edge.name)}
    <div
      role="slider"
      tabindex="0"
      aria-label={`${edge.name} bbox edge`}
      aria-orientation={edge.axis === 'width' ? 'horizontal' : 'vertical'}
      aria-valuemin={minViewportBboxSize}
      aria-valuemax={maxViewportBboxSize}
      aria-valuenow={size[edge.axis]}
      aria-valuetext={`${size[edge.axis]}% of viewport ${edge.axis}`}
      class={`group pointer-events-auto absolute flex touch-none items-center justify-center outline-none ${edge.class} ${edge.axis === 'width' ? 'inset-y-3 w-6 cursor-ew-resize' : 'inset-x-3 h-6 cursor-ns-resize'}`}
      onpointerdown={(event) => startDrag(event, edge)}
      onpointermove={moveDrag}
      onpointerup={finishDrag}
      onlostpointercapture={endDrag}
      onkeydown={(event) => resizeWithKeyboard(event, edge)}
    >
      <span
        aria-hidden="true"
        class={`rounded-full border border-teal-700 bg-white shadow-sm group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-teal-800 ${edge.axis === 'width' ? 'h-6 w-2' : 'h-2 w-6'}`}
      ></span>
    </div>
  {/each}
  {#each corners as corner (corner.name)}
    <div
      aria-hidden="true"
      title={`${corner.name} bbox corner`}
      class={`pointer-events-auto absolute flex size-6 touch-none items-center justify-center ${corner.class}`}
      onpointerdown={(event) => startDrag(event, corner)}
      onpointermove={moveDrag}
      onpointerup={finishDrag}
      onlostpointercapture={endDrag}
    >
      <span class="size-2.5 rounded-xs border border-teal-700 bg-white shadow-sm"></span>
    </div>
  {/each}
</div>
