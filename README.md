# Latlong

Find and copy latitude/longitude coordinates and bounding boxes from a map.

[Open Latlong](https://bertspaan.nl/latlong/)

## Features

- Point mode with latitude/longitude, longitude/latitude, WKT, PostGIS, and GeoJSON output.
- Bbox mode with a centered viewport box or a fixed rectangle. Export bounds, WKT polygons, PostGIS boxes, or GeoJSON polygons.
- Smart paste for coordinates, WKT, GeoJSON, common map URLs, and bbox strings.
- Copy value and copy permalink actions.
- MapLibre GL with OpenFreeMap vector tiles, built with SvelteKit, shadcn-svelte, and Tailwind CSS.

## Viewport box

Choose a bbox format from the format menu. The viewport box starts at 75% of the map's width and height, and its coordinates update as you pan or zoom. Drag an edge to resize one dimension or a corner to resize both. The opposite sides mirror the drag so the box stays centered. You can also focus an edge and resize it with the arrow keys.

Use **Draw rectangle** to create fixed bounds, or choose **Use viewport box** to return to live bounds. **Copy permalink** includes the box dimensions or the fixed bounds.

## Development

```sh
pnpm install
pnpm run dev
```

## Build

```sh
pnpm run check
pnpm run build
```

The static site is written to `build`. GitHub Actions builds and deploys it to GitHub Pages on pushes to `main`.
