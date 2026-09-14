export function PhotoStrip({ photos, label }: { photos: Array<{ id: string; url: string | null; caption: string }>; label: string }) {
  if (!photos.length) return null;
  return <div aria-label={label} className="flex snap-x gap-3 overflow-x-auto">{photos.map((photo) => photo.url ? <img alt={photo.caption} className="h-56 min-w-full snap-center rounded-card object-cover" key={photo.id} src={photo.url} /> : null)}</div>;
}
