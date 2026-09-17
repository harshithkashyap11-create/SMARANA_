import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { privateMediaUrl } from "../../db/media";
export function PrivateImage({ src, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [resolved, setResolved] = useState<{ source: string; url: string | undefined }>();
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | undefined;
    if (src) void privateMediaUrl(src).then((url) => {
      objectUrl = url;
      if (!cancelled) setResolved({ source: src, url });
      else if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    }).catch(() => undefined);
    return () => { cancelled = true; if (objectUrl?.startsWith("blob:")) URL.revokeObjectURL(objectUrl); };
  }, [src]);
  const url = resolved && resolved.source === src ? resolved.url : undefined;
  return url ? <img {...props} src={url} /> : null;
}
