import { type Bbox, type Geometry, type Mode, type Point, defaultTemplates, getTemplate, normalizeBbox } from './templates';
import { clampViewportBboxSize, defaultViewportBboxSize, type ViewportBboxSize } from './viewport-bbox';

export type HashState = {
  center: Point;
  zoom: number;
  mode: Mode;
  pointTemplate: string;
  bboxTemplate: string;
  bbox: Bbox | null;
  viewportSize: ViewportBboxSize;
};

const defaultCenter = { lat: 52.3674, lng: 4.915 };

export const defaultHashState: HashState = {
  center: defaultCenter,
  zoom: 6,
  mode: 'point',
  pointTemplate: 'latlong',
  bboxTemplate: 'bbox',
  bbox: null,
  viewportSize: defaultViewportBboxSize
};

function parseParams(rest: string[]): URLSearchParams {
  return new URLSearchParams(rest.join('&'));
}

function parseNumber(value: string | null | undefined): number | null {
  if (!value?.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseHash(hash: string): HashState {
  const clean = hash.replace(/^#/, '');
  if (!clean) {
    return defaultHashState;
  }

  const [position, ...parameterParts] = clean.split('&');
  const params = parseParams(parameterParts);
  const [zoomValue, latValue, lngValue] = position.split('/');
  const zoom = parseNumber(zoomValue) ?? defaultHashState.zoom;
  const lat = parseNumber(latValue) ?? defaultHashState.center.lat;
  const lng = parseNumber(lngValue) ?? defaultHashState.center.lng;
  const mode = params.get('mode') === 'bbox' ? 'bbox' : 'point';
  const template = params.get('template');
  const pointTemplate = getTemplate('point', mode === 'point' ? template : null).name;
  const bboxTemplate = getTemplate('bbox', mode === 'bbox' ? template : null).name;
  const viewportValues = params.get('viewport')?.split(',') ?? [];
  const width = parseNumber(viewportValues[0]);
  const height = parseNumber(viewportValues[1]);
  const viewportSize =
    viewportValues.length === 2 && width !== null && height !== null
      ? { width: clampViewportBboxSize(width), height: clampViewportBboxSize(height) }
      : defaultViewportBboxSize;
  const bboxValues = params.get('bbox')?.split(',').map(Number) ?? [];
  const bbox =
    bboxValues.length === 4 && bboxValues.every(Number.isFinite)
      ? normalizeBbox({
          west: bboxValues[0],
          south: bboxValues[1],
          east: bboxValues[2],
          north: bboxValues[3]
        })
      : null;

  return {
    center: { lat, lng },
    zoom,
    mode,
    pointTemplate,
    bboxTemplate,
    bbox,
    viewportSize
  };
}

function formatNumber(value: number, precision = 6): string {
  return Number(value.toFixed(precision)).toString();
}

export function formatHash(state: HashState): string {
  const params = new URLSearchParams();
  const zoom = Math.round(state.zoom * 100) / 100;

  if (state.mode === 'bbox') {
    params.set('mode', 'bbox');
  }

  const template = state.mode === 'bbox' ? state.bboxTemplate : state.pointTemplate;
  if (template !== defaultTemplates[state.mode].name) {
    params.set('template', template);
  }

  if (state.bbox) {
    const bbox = normalizeBbox(state.bbox);
    params.set(
      'bbox',
      [bbox.west, bbox.south, bbox.east, bbox.north].map((value) => formatNumber(value)).join(',')
    );
  }

  const { width, height } = state.viewportSize;
  if (width !== defaultViewportBboxSize.width || height !== defaultViewportBboxSize.height) {
    params.set('viewport', `${formatNumber(width, 2)},${formatNumber(height, 2)}`);
  }

  const position = [formatNumber(zoom, 2), formatNumber(state.center.lat), formatNumber(state.center.lng)].join('/');
  const query = params.toString();
  return `#${position}${query ? `&${query}` : ''}`;
}

export function geometryToHashState(state: HashState, geometry: Geometry): HashState {
  if (geometry.mode === 'point') {
    return {
      ...state,
      center: geometry.point,
      mode: 'point'
    };
  }

  return {
    ...state,
    mode: 'bbox',
    bbox: normalizeBbox(geometry.bbox),
    center: {
      lat: (geometry.bbox.south + geometry.bbox.north) / 2,
      lng: (geometry.bbox.west + geometry.bbox.east) / 2
    }
  };
}
