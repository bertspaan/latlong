export type Mode = 'point' | 'bbox';

export type Point = {
  lat: number;
  lng: number;
};

export type Bbox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type Geometry =
  | {
      mode: 'point';
      point: Point;
    }
  | {
      mode: 'bbox';
      bbox: Bbox;
    };

export type Template = {
  name: string;
  title: string;
  mode: Mode;
  template: string;
};

export const pointTemplates = [
  {
    name: 'latlong',
    title: 'Latitude, longitude',
    mode: 'point',
    template: '%lat%, %lng%'
  },
  {
    name: 'longlat',
    title: 'Longitude, latitude',
    mode: 'point',
    template: '%lng%, %lat%'
  },
  {
    name: 'wkt',
    title: 'Well-known text',
    mode: 'point',
    template: 'POINT(%lng% %lat%)'
  },
  {
    name: 'postgis',
    title: 'PostGIS',
    mode: 'point',
    template: 'ST_SetSRID(ST_MakePoint(%lng%, %lat%), 4326)'
  },
  {
    name: 'geojson',
    title: 'GeoJSON',
    mode: 'point',
    template: '{"type":"Point","coordinates":[%lng%, %lat%]}'
  }
] satisfies Template[];

export const bboxTemplates = [
  {
    name: 'bbox',
    title: 'Bounds',
    mode: 'bbox',
    template: '%west%, %south%, %east%, %north%'
  },
  {
    name: 'wkt',
    title: 'WKT polygon',
    mode: 'bbox',
    template:
      'POLYGON((%west% %north%, %east% %north%, %east% %south%, %west% %south%, %west% %north%))'
  },
  {
    name: 'postgis',
    title: 'PostGIS box',
    mode: 'bbox',
    template: 'ST_SetSRID(ST_MakeBox2D(ST_Point(%west%, %south%), ST_Point(%east%, %north%)), 4326)'
  },
  {
    name: 'geojson',
    title: 'GeoJSON polygon',
    mode: 'bbox',
    template:
      '{"type":"Polygon","coordinates":[[[%west%, %north%], [%east%, %north%], [%east%, %south%], [%west%, %south%], [%west%, %north%]]]}'
  }
] satisfies Template[];

export const templatesByMode = {
  point: pointTemplates,
  bbox: bboxTemplates
} satisfies Record<Mode, Template[]>;

export const defaultTemplates = {
  point: pointTemplates[0],
  bbox: bboxTemplates[0]
} satisfies Record<Mode, Template>;

export function getTemplate(mode: Mode, name: string | null | undefined): Template {
  return templatesByMode[mode].find((template) => template.name === name) ?? defaultTemplates[mode];
}

export function precisionForZoom(zoom: number): number {
  return Math.max(0, Math.ceil(Math.log(Math.max(1, zoom)) / Math.LN2));
}

export function normalizeLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

export function normalizeBbox(bbox: Bbox): Bbox {
  const west = Math.min(bbox.west, bbox.east);
  const east = Math.max(bbox.west, bbox.east);
  const south = Math.min(bbox.south, bbox.north);
  const north = Math.max(bbox.south, bbox.north);

  return { west, south, east, north };
}

function formatNumber(value: number, precision: number): string {
  return value.toFixed(precision);
}

export function formatTemplate(template: Template, geometry: Geometry, precision: number): string {
  if (template.mode === 'point' && geometry.mode === 'point') {
    return template.template
      .replaceAll('%lat%', formatNumber(geometry.point.lat, precision))
      .replaceAll('%lng%', formatNumber(normalizeLng(geometry.point.lng), precision));
  }

  if (template.mode === 'bbox' && geometry.mode === 'bbox') {
    const bbox = normalizeBbox(geometry.bbox);

    return template.template
      .replaceAll('%west%', formatNumber(normalizeLng(bbox.west), precision))
      .replaceAll('%south%', formatNumber(bbox.south, precision))
      .replaceAll('%east%', formatNumber(normalizeLng(bbox.east), precision))
      .replaceAll('%north%', formatNumber(bbox.north, precision));
  }

  return '';
}

export function isValidLat(lat: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLng(lng: number): boolean {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

export function isValidPoint(point: Point): boolean {
  return isValidLat(point.lat) && isValidLng(point.lng);
}

export function isValidBbox(bbox: Bbox): boolean {
  return isValidLng(bbox.west) && isValidLng(bbox.east) && isValidLat(bbox.south) && isValidLat(bbox.north);
}
