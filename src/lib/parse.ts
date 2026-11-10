import {
  type Bbox,
  type Geometry,
  type Mode,
  type Point,
  type Template,
  isValidBbox,
  isValidLat,
  isValidLng,
  isValidPoint,
  normalizeBbox
} from './templates';

const numberPattern = '([-+]?(?:\\d+\\.?\\d*|\\.\\d+))';
const looseNumberPattern = /[-+]?(?:\d+\.?\d*|\.\d+)/g;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function numberAt(value: string, index: number): number | null {
  const matches = value.match(looseNumberPattern);
  if (!matches || matches[index] === undefined) {
    return null;
  }

  const parsed = Number(matches[index]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseWithTemplate(value: string, template: Template): Geometry | null {
  const tokens: string[] = [];
  const pattern = escapeRegExp(template.template).replace(/%(lat|lng|west|south|east|north)%/g, (_, token: string) => {
    tokens.push(token);
    return `\\s*${numberPattern}\\s*`;
  });

  const match = value.trim().match(new RegExp(`^\\s*${pattern}\\s*$`, 'i'));
  if (!match) {
    return null;
  }

  const values = new Map<string, number>();
  for (const [index, token] of tokens.entries()) {
    const parsed = Number(match[index + 1]);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    values.set(token, parsed);
  }

  if (template.mode === 'point') {
    const lat = values.get('lat');
    const lng = values.get('lng');
    if (lat === undefined || lng === undefined) {
      return null;
    }

    const point = { lat, lng };
    return isValidPoint(point) ? { mode: 'point', point } : null;
  }

  const bbox = {
    west: values.get('west'),
    south: values.get('south'),
    east: values.get('east'),
    north: values.get('north')
  };

  if (
    bbox.west === undefined ||
    bbox.south === undefined ||
    bbox.east === undefined ||
    bbox.north === undefined
  ) {
    return null;
  }

  return isValidBbox(bbox as Bbox) ? { mode: 'bbox', bbox: normalizeBbox(bbox as Bbox) } : null;
}

function parseGeoJson(value: string): Geometry | null {
  try {
    const json = JSON.parse(value);
    const geometry = json?.type === 'Feature' ? json.geometry : json;
    const bbox = Array.isArray(json?.bbox) ? json.bbox : Array.isArray(geometry?.bbox) ? geometry.bbox : null;

    if (bbox?.length === 4) {
      return parseBboxNumbers(bbox);
    }

    if (geometry?.type === 'Point' && Array.isArray(geometry.coordinates)) {
      return parseLngLat(geometry.coordinates[0], geometry.coordinates[1]);
    }

    if (geometry?.type === 'Polygon' && Array.isArray(geometry.coordinates?.[0])) {
      return bboxFromPositions(geometry.coordinates[0]);
    }
  } catch {
    return null;
  }

  return null;
}

function parseWkt(value: string): Geometry | null {
  const point = value.match(/^\s*POINT\s*\(\s*([^)]+?)\s*\)\s*$/i);
  if (point) {
    return parseLngLat(numberAt(point[1], 0), numberAt(point[1], 1));
  }

  const polygon = value.match(/^\s*POLYGON\s*\(\(\s*(.+?)\s*\)\)\s*$/i);
  if (polygon) {
    const positions = polygon[1].split(',').map((part) => [numberAt(part, 0), numberAt(part, 1)]);
    return bboxFromPositions(positions);
  }

  return null;
}

function parseUrl(value: string): Geometry | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    try {
      url = new URL(`https://latlong.local/${value.startsWith('#') ? value : `#${value}`}`);
    } catch {
      return null;
    }
  }

  const bbox = url.searchParams.get('bbox') ?? url.searchParams.get('bounds');
  if (bbox) {
    const numbers = bbox.match(looseNumberPattern)?.map(Number);
    const parsed = parseBboxNumbers(numbers ?? []);
    if (parsed) {
      return parsed;
    }
  }

  const query = url.searchParams.get('q') ?? url.searchParams.get('query') ?? url.searchParams.get('ll');
  if (query) {
    const parsed = parseLatLngNumbers(query.match(looseNumberPattern)?.map(Number) ?? []);
    if (parsed) {
      return parsed;
    }
  }

  const googleAt = value.match(/@([-+]?(?:\d+\.?\d*|\.\d+)),\s*([-+]?(?:\d+\.?\d*|\.\d+)),/);
  if (googleAt) {
    return parseLatLngNumbers([Number(googleAt[1]), Number(googleAt[2])]);
  }

  const hash = url.hash.replace(/^#/, '');
  const osmHash = hash.match(/^map=\d+\/([-+]?(?:\d+\.?\d*|\.\d+))\/([-+]?(?:\d+\.?\d*|\.\d+))/);
  if (osmHash) {
    return parseLatLngNumbers([Number(osmHash[1]), Number(osmHash[2])]);
  }

  const oldHash = hash.match(/^\d+(?:\.\d+)?\/([-+]?(?:\d+\.?\d*|\.\d+))\/([-+]?(?:\d+\.?\d*|\.\d+))/);
  if (oldHash) {
    return parseLatLngNumbers([Number(oldHash[1]), Number(oldHash[2])]);
  }

  return null;
}

function parseLngLat(lng: unknown, lat: unknown): Geometry | null {
  const point = { lng: Number(lng), lat: Number(lat) };
  return isValidPoint(point) ? { mode: 'point', point } : null;
}

function parseLatLngNumbers(numbers: number[]): Geometry | null {
  if (numbers.length < 2) {
    return null;
  }

  const [lat, lng] = numbers;
  const point = { lat, lng };
  if (isValidPoint(point)) {
    return { mode: 'point', point };
  }

  const swapped = { lat: lng, lng: lat };
  return isValidPoint(swapped) ? { mode: 'point', point: swapped } : null;
}

function parseBboxNumbers(numbers: unknown[]): Geometry | null {
  if (numbers.length < 4) {
    return null;
  }

  const bbox = {
    west: Number(numbers[0]),
    south: Number(numbers[1]),
    east: Number(numbers[2]),
    north: Number(numbers[3])
  };

  if (isValidBbox(bbox)) {
    return { mode: 'bbox', bbox: normalizeBbox(bbox) };
  }

  return null;
}

function bboxFromPositions(positions: unknown[][]): Geometry | null {
  const points = positions
    .map((position) => ({ lng: Number(position[0]), lat: Number(position[1]) }))
    .filter((point): point is Point => isValidLat(point.lat) && isValidLng(point.lng));

  if (!points.length) {
    return null;
  }

  return {
    mode: 'bbox',
    bbox: {
      west: Math.min(...points.map((point) => point.lng)),
      south: Math.min(...points.map((point) => point.lat)),
      east: Math.max(...points.map((point) => point.lng)),
      north: Math.max(...points.map((point) => point.lat))
    }
  };
}

export function smartParse(value: string, preferredTemplate: Template, mode: Mode): Geometry | null {
  const templateMatch = parseWithTemplate(value, preferredTemplate);
  if (templateMatch) {
    return templateMatch;
  }

  return (
    parseGeoJson(value) ??
    parseWkt(value) ??
    parseUrl(value) ??
    (mode === 'bbox'
      ? parseBboxNumbers(value.match(looseNumberPattern)?.map(Number) ?? [])
      : parseLatLngNumbers(value.match(looseNumberPattern)?.map(Number) ?? []))
  );
}
