<script lang="ts">
  import { onMount } from 'svelte';
  import type { FeatureCollection } from 'geojson';
  import type { GeoJSONSource, Map as MapLibre } from 'maplibre-gl';
  import ViewportBbox from '$lib/components/ViewportBbox.svelte';
  import { normalizeBbox, type Bbox, type Mode, type Point } from '$lib/templates';
  import type { ViewportBboxSize } from '$lib/viewport-bbox';

  export let center: Point;
  export let zoom: number;
  export let mode: Mode = 'point';
  export let bbox: Bbox | null = null;
  export let viewportSize: ViewportBboxSize;
  export let drawing = false;
  export let fitBboxSignal = 0;
  export let onmove: ((detail: { center: Point; zoom: number }) => void) | undefined = undefined;
  export let onviewportbbox: ((bounds: Bbox) => void) | undefined = undefined;
  export let onviewportsize: (size: ViewportBboxSize) => void;
  export let onbbox: ((detail: { bbox: Bbox }) => void) | undefined = undefined;
  export let ondrawend: (() => void) | undefined = undefined;

  const bboxSourceId = 'latlong-bbox-source';
  const bboxFillLayerId = 'latlong-bbox-fill';
  const bboxLineLayerId = 'latlong-bbox-line';

  let container: HTMLDivElement;
  let map: MapLibre | null = null;
  let drawStart: { x: number; y: number } | null = null;
  let drawCurrent: { x: number; y: number } | null = null;
  let lastSyncedView = '';
  let lastSyncedBbox = '';
  let lastFitBboxSignal = fitBboxSignal;

  onMount(() => {
    let disposed = false;

    async function init() {
      const maplibregl = (await import('maplibre-gl')).default;
      if (disposed) {
        return;
      }

      map = new maplibregl.Map({
        container,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [center.lng, center.lat],
        zoom,
        minZoom: 2,
        maxZoom: 20,
        attributionControl: { compact: false }
      });

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');
      map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: false
        }),
        'top-right'
      );

      map.on('load', () => {
        addBboxLayers();
        updateBboxLayer();
        emitMove();
      });

      const updateViewportBbox = () => {
        if (mode === 'bbox' && !bbox) emitViewportBbox(map, viewportSize);
      };
      map.on('move', updateViewportBbox);
      map.on('resize', updateViewportBbox);
      map.on('moveend', emitMove);
    }

    init();

    return () => {
      disposed = true;
      map?.remove();
      map = null;
    };
  });

  $: if (map && center && Number.isFinite(zoom)) {
    syncView();
  }

  $: if (map && mode && bbox !== undefined) {
    updateBboxLayer();
  }

  $: if (map && mode === 'bbox' && !bbox) {
    emitViewportBbox(map, viewportSize);
  }

  $: if (map && bbox && fitBboxSignal !== lastFitBboxSignal) {
    lastFitBboxSignal = fitBboxSignal;
    const next = normalizeBbox(bbox);
    map.fitBounds(
      [
        [next.west, next.south],
        [next.east, next.north]
      ],
      { padding: 72, maxZoom: 17, duration: 0 }
    );
  }

  $: if (map) {
    if (drawing) {
      map.dragPan.disable();
      map.boxZoom.disable();
    } else {
      map.dragPan.enable();
      map.boxZoom.enable();
      drawStart = null;
      drawCurrent = null;
    }
  }

  function addBboxLayers() {
    if (!map || map.getSource(bboxSourceId)) {
      return;
    }

    map.addSource(bboxSourceId, {
      type: 'geojson',
      data: emptyFeatureCollection()
    });

    map.addLayer({
      id: bboxFillLayerId,
      type: 'fill',
      source: bboxSourceId,
      paint: {
        'fill-color': '#1d9a8a',
        'fill-opacity': 0.14
      }
    });

    map.addLayer({
      id: bboxLineLayerId,
      type: 'line',
      source: bboxSourceId,
      paint: {
        'line-color': '#0f766e',
        'line-width': 2,
        'line-dasharray': [2, 1]
      }
    });
  }

  function syncView() {
    if (!map) {
      return;
    }

    const viewKey = `${center.lng.toFixed(7)},${center.lat.toFixed(7)},${zoom.toFixed(2)}`;
    const mapCenter = map.getCenter();
    const currentKey = `${mapCenter.lng.toFixed(7)},${mapCenter.lat.toFixed(7)},${map.getZoom().toFixed(2)}`;

    if (viewKey !== currentKey && viewKey !== lastSyncedView) {
      lastSyncedView = viewKey;
      map.jumpTo({ center: [center.lng, center.lat], zoom });
    }
  }

  function updateBboxLayer() {
    if (!map || !map.getSource(bboxSourceId)) {
      return;
    }

    const key = bbox && mode === 'bbox' ? `${bbox.west},${bbox.south},${bbox.east},${bbox.north}` : '';
    if (key === lastSyncedBbox) {
      return;
    }

    lastSyncedBbox = key;
    const source = map.getSource(bboxSourceId) as GeoJSONSource;
    source.setData(bbox && mode === 'bbox' ? bboxFeatureCollection(bbox) : emptyFeatureCollection());
  }

  function emitMove() {
    if (!map) {
      return;
    }

    const mapCenter = map.getCenter();
    lastSyncedView = `${mapCenter.lng.toFixed(7)},${mapCenter.lat.toFixed(7)},${map.getZoom().toFixed(2)}`;

    onmove?.({
      center: { lat: mapCenter.lat, lng: mapCenter.lng },
      zoom: map.getZoom()
    });
  }

  function emitViewportBbox(currentMap: MapLibre | null, size: ViewportBboxSize) {
    if (!currentMap) return;

    const { clientWidth, clientHeight } = container;
    const left = (clientWidth * (100 - size.width)) / 200;
    const top = (clientHeight * (100 - size.height)) / 200;
    const right = clientWidth - left;
    const bottom = clientHeight - top;
    const corners = [
      currentMap.unproject([left, top]),
      currentMap.unproject([right, top]),
      currentMap.unproject([right, bottom]),
      currentMap.unproject([left, bottom])
    ];

    onviewportbbox?.({
      west: Math.min(...corners.map((corner) => corner.lng)),
      south: Math.min(...corners.map((corner) => corner.lat)),
      east: Math.max(...corners.map((corner) => corner.lng)),
      north: Math.max(...corners.map((corner) => corner.lat))
    });
  }

  function pointerPosition(event: PointerEvent) {
    const rect = container.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function handlePointerDown(event: PointerEvent) {
    if (!drawing) {
      return;
    }

    event.currentTarget instanceof HTMLElement && event.currentTarget.setPointerCapture(event.pointerId);
    drawStart = pointerPosition(event);
    drawCurrent = drawStart;
  }

  function handlePointerMove(event: PointerEvent) {
    if (!drawing || !drawStart) {
      return;
    }

    drawCurrent = pointerPosition(event);
  }

  function handlePointerUp(event: PointerEvent) {
    if (!map || !drawing || !drawStart || !drawCurrent) {
      return;
    }

    const first = map.unproject([drawStart.x, drawStart.y]);
    const second = map.unproject([drawCurrent.x, drawCurrent.y]);
    const nextBbox = normalizeBbox({
      west: first.lng,
      south: second.lat,
      east: second.lng,
      north: first.lat
    });

    onbbox?.({ bbox: nextBbox });
    ondrawend?.();
    drawStart = null;
    drawCurrent = null;
  }

  function emptyFeatureCollection(): FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: []
    };
  }

  function bboxFeatureCollection(value: Bbox): FeatureCollection {
    const next = normalizeBbox(value);
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [next.west, next.north],
                [next.east, next.north],
                [next.east, next.south],
                [next.west, next.south],
                [next.west, next.north]
              ]
            ]
          }
        }
      ]
    };
  }

  $: drawBoxStyle =
    drawStart && drawCurrent
      ? `left:${Math.min(drawStart.x, drawCurrent.x)}px;top:${Math.min(drawStart.y, drawCurrent.y)}px;width:${Math.abs(
          drawCurrent.x - drawStart.x
        )}px;height:${Math.abs(drawCurrent.y - drawStart.y)}px;`
      : '';
</script>

<div class="fixed inset-0 bg-slate-200">
  <div class="size-full" bind:this={container}></div>

  {#if mode === 'point'}
    <div class="crosshair" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
  {:else if map && !bbox && !drawing}
    <ViewportBbox size={viewportSize} onresize={onviewportsize} />
  {/if}

  {#if drawing}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="absolute inset-0 z-[4] cursor-crosshair touch-none"
      onpointerdown={handlePointerDown}
      onpointermove={handlePointerMove}
      onpointerup={handlePointerUp}
      onpointercancel={() => {
        drawStart = null;
        drawCurrent = null;
      }}
    >
      {#if drawBoxStyle}
        <div
          class="absolute border-2 border-teal-700 bg-teal-600/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.85)]"
          style={drawBoxStyle}
        ></div>
      {/if}
    </div>
  {/if}
</div>
