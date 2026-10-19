import type { SiteImage } from "./content";

/** <img> com srcset dos WebP pré-otimizados; lazy por padrão. */
export function SiteImg({
  img,
  sizes,
  alt = "",
  className,
  priority = false,
}: {
  img: SiteImage;
  sizes: string;
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  const src = (w: number) => `/site/img/${img.name}-${w}.webp`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src(img.widths[img.widths.length - 1])}
      srcSet={img.widths.map((w) => `${src(w)} ${w}w`).join(", ")}
      sizes={sizes}
      width={img.w}
      height={img.h}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : undefined}
    />
  );
}
