<script lang="ts">
  import { browser } from '$app/environment';
  import { afterNavigate, replaceState } from '$app/navigation';
  import MapLibreMap from '$lib/components/MapLibreMap.svelte';
  import Button, { buttonVariants } from '$lib/components/ui/button.svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import Input from '$lib/components/ui/input.svelte';
  import { smartParse } from '$lib/parse';
  import { defaultHashState, formatHash, geometryToHashState, parseHash, type HashState } from '$lib/hash';
  import {
    formatTemplate,
    getTemplate,
    precisionForZoom,
    templatesByMode,
    type Bbox,
    type Geometry,
    type Mode,
    type Point
  } from '$lib/templates';
  import {
    Check,
    ChevronDown,
    Clipboard,
    Crosshair,
    Link,
    LocateFixed,
    Scan,
    SquareDashedMousePointer,
    X
  } from '@lucide/svelte';
  import { onMount } from 'svelte';

  let center: Point = defaultHashState.center;
  let zoom = defaultHashState.zoom;
  let mode: Mode = defaultHashState.mode;
  let pointTemplateName = defaultHashState.pointTemplate;
  let bboxTemplateName = defaultHashState.bboxTemplate;
  let bbox: Bbox | null = defaultHashState.bbox;
  let viewportSize = defaultHashState.viewportSize;
  let viewBbox: Bbox | null = null;
  let drawing = false;
  let fitBboxSignal = 0;
  let inputFocused = false;
  let inputError = false;
  let textValue = '';
  let copied: 'value' | 'link' | null = null;
  let initialized = false;

  $: activeTemplate = getTemplate(mode, mode === 'point' ? pointTemplateName : bboxTemplateName);
  $: formatTitle = activeTemplate.name === 'bbox' ? 'Bbox' : activeTemplate.title;
  $: effectiveBbox = bbox ?? viewBbox;
  $: activeGeometry =
    mode === 'point'
      ? ({ mode: 'point', point: center } satisfies Geometry)
      : effectiveBbox
        ? ({ mode: 'bbox', bbox: effectiveBbox } satisfies Geometry)
        : null;
  $: precision = precisionForZoom(zoom);
  $: coordinateWidth = activeTemplate.template.replace(/%[^%]+%/g, `-180.${'0'.repeat(precision)}`).length + 1;
  $: formattedValue = activeGeometry ? formatTemplate(activeTemplate, activeGeometry, precision) : '';
  $: locationHash = formatHash({
    center,
    zoom,
    mode,
    pointTemplate: pointTemplateName,
    bboxTemplate: bboxTemplateName,
    bbox,
    viewportSize
  });
  $: if (!inputFocused && textValue !== formattedValue) {
    textValue = formattedValue;
  }
  $: if (browser && initialized) {
    updateLocationHash(locationHash);
  }

  afterNavigate(() => {
    initialized = true;
  });

  onMount(() => {
    applyHashState(parseHash(window.location.hash));
    const handleHashChange = () => applyHashState(parseHash(window.location.hash));
    window.addEventListener('hashchange', handleHashChange);

    return () => window.removeEventListener('hashchange', handleHashChange);
  });

  function currentHashState(): HashState {
    return {
      center,
      zoom,
      mode,
      pointTemplate: pointTemplateName,
      bboxTemplate: bboxTemplateName,
      bbox,
      viewportSize
    };
  }

  function applyHashState(state: HashState) {
    center = state.center;
    zoom = state.zoom;
    mode = state.mode;
    pointTemplateName = state.pointTemplate;
    bboxTemplateName = state.bboxTemplate;
    bbox = state.bbox;
    viewportSize = state.viewportSize;
    drawing = false;
    inputError = false;
  }

  function updateLocationHash(nextHash: string) {
    if (window.location.hash !== nextHash) {
      const url = new URL(window.location.href);
      url.hash = nextHash;
      replaceState(url, {});
    }
  }

  function handleMapMove(detail: { center: Point; zoom: number }) {
    center = detail.center;
    zoom = detail.zoom;
  }

  function applyGeometry(geometry: Geometry, fitBounds = geometry.mode === 'bbox') {
    const nextState = geometryToHashState(currentHashState(), geometry);
    mode = nextState.mode;
    center = nextState.center;
    bbox = nextState.bbox;
    inputError = false;

    if (geometry.mode === 'bbox' && fitBounds) {
      fitBboxSignal += 1;
    }
  }

  function handleInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    textValue = input.value;

    const parsed = smartParse(textValue, activeTemplate, mode);
    if (parsed) {
      applyGeometry(parsed);
      return;
    }

    inputError = textValue.trim().length > 0;
  }

  function handleInputBlur() {
    inputFocused = false;
    if (!inputError) {
      textValue = formattedValue;
    }
  }

  function selectFormat(value: string) {
    const [nextMode, name] = value.split('/');
    if (nextMode !== 'point' && nextMode !== 'bbox') return;

    mode = nextMode;
    drawing = false;
    inputError = false;
    if (mode === 'point') {
      pointTemplateName = name;
    } else {
      bboxTemplateName = name;
    }
  }

  function useViewportBbox() {
    bbox = null;
    drawing = false;
    inputError = false;
  }

  async function copyText(kind: 'value' | 'link', value: string) {
    if (!value) {
      return;
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(value);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }

    copied = kind;
    window.setTimeout(() => {
      copied = null;
    }, 1300);
  }

  function permalink() {
    const url = new URL(window.location.href);
    url.hash = formatHash(currentHashState());
    return url.toString();
  }

  async function copyValue() {
    await copyText('value', textValue);
  }

  async function copyLink() {
    await copyText('link', permalink());
  }

  function locatePoint() {
    if (!browser || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
      applyGeometry({
        mode: 'point',
        point: {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
      });
      zoom = Math.max(zoom, 15);
    });
  }
</script>

<svelte:head>
  <title>Latlong</title>
</svelte:head>

<svelte:window onkeydown={(event) => {
  if (event.key === 'Escape' && drawing && !event.defaultPrevented) drawing = false;
}} />

<main>
  <MapLibreMap
    {center}
    {zoom}
    {mode}
    {bbox}
    {viewportSize}
    {drawing}
    {fitBboxSignal}
    onmove={handleMapMove}
    onviewportbbox={(bounds) => (viewBbox = bounds)}
    onviewportsize={(size) => (viewportSize = size)}
    onbbox={(detail) => applyGeometry({ mode: 'bbox', bbox: detail.bbox }, false)}
    ondrawend={() => (drawing = false)}
  />

  <div class="pointer-events-none fixed top-[max(0.625rem,env(safe-area-inset-top))] right-12 left-2 z-10 max-[560px]:right-2">
    <section
      aria-label="Coordinate tools"
      class="pointer-events-auto inline-grid max-w-full grid-cols-[auto_minmax(0,auto)_auto] items-center gap-x-1 rounded-md border border-black/15 bg-white p-1 text-base shadow-md max-[560px]:w-full max-[560px]:grid-cols-[minmax(0,1fr)_auto] max-[560px]:gap-y-0.5"
    >
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class={buttonVariants({
            class: 'col-start-1 row-start-1 min-w-0 justify-start text-left font-bold text-zinc-700 data-[state=open]:bg-accent'
          })}
          aria-label={`Coordinate format: ${formatTitle}`}
          title="Coordinate format"
        >
          <span class="truncate">{formatTitle}<span aria-hidden="true">:</span></span>
          <ChevronDown class="text-zinc-500" aria-hidden="true" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.RadioGroup
            aria-label="Coordinate formats"
            value={`${mode}/${activeTemplate.name}`}
            onValueChange={selectFormat}
          >
            <div class="px-2 py-1 text-xs font-semibold text-zinc-500">Point</div>
            {#each templatesByMode.point as template (template.name)}
              <DropdownMenu.RadioItem value={`point/${template.name}`}>
                {template.title}
              </DropdownMenu.RadioItem>
            {/each}
            <DropdownMenu.Separator class="my-1 border-t border-zinc-200" />
            <div class="px-2 py-1 text-xs font-semibold text-teal-700">Bounding box</div>
            {#each templatesByMode.bbox as template (template.name)}
              <DropdownMenu.RadioItem value={`bbox/${template.name}`}>
                {template.name === 'bbox' ? 'Bbox' : template.title}
              </DropdownMenu.RadioItem>
            {/each}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator class="my-1 border-t border-zinc-200" />
          {#if mode === 'bbox'}
            <DropdownMenu.Item onSelect={useViewportBbox}>
              <Scan /> Use viewport box
              {#if !bbox}<Check class="ml-auto text-teal-700" />{/if}
            </DropdownMenu.Item>
          {:else}
            <DropdownMenu.Item onSelect={locatePoint}>
              <LocateFixed /> Use current location
            </DropdownMenu.Item>
          {/if}
          <DropdownMenu.Item onSelect={copyLink}>
            <Link /> Copy permalink
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <Input
        type="text"
        class="col-start-2 row-start-1 w-(--coordinate-width) max-w-full border-transparent px-1 text-lg max-[560px]:col-span-2 max-[560px]:col-start-1 max-[560px]:row-start-2 max-[560px]:w-full max-[560px]:px-2 max-[560px]:text-base"
        style={`--coordinate-width: ${coordinateWidth}ch`}
        aria-label="Coordinate value"
        aria-invalid={inputError}
        spellcheck="false"
        value={textValue}
        placeholder={mode === 'point' ? '52.3674, 4.915' : 'west, south, east, north'}
        onfocus={() => (inputFocused = true)}
        onblur={handleInputBlur}
        oninput={handleInput}
      />

      <div class="col-start-3 row-start-1 flex items-center max-[560px]:col-start-2">
        {#if mode === 'bbox'}
          <Button
            size="icon-sm"
            class="text-teal-700 aria-pressed:bg-teal-100"
            title={drawing ? 'Cancel drawing' : 'Draw rectangle'}
            aria-label="Draw rectangle"
            aria-pressed={drawing}
            onclick={() => (drawing = !drawing)}
          >
            {#if drawing}<X />{:else}<SquareDashedMousePointer />{/if}
          </Button>
        {/if}
        <Button
          size="icon-sm"
          class="text-zinc-600"
          title="Copy value"
          aria-label="Copy value"
          onclick={copyValue}
        >
          {#if copied === 'value'}<Check class="text-teal-700" />{:else}<Clipboard />{/if}
        </Button>
      </div>
      <span role="status" class="sr-only">
        {copied === 'value' ? 'Coordinate copied' : copied === 'link' ? 'Permalink copied' : ''}
      </span>
    </section>
  </div>
</main>
