import { ui, defaultLang, showDefaultLang, routes } from './ui';

export type Lang = keyof typeof ui;

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as Lang;
  return defaultLang;
}

export function useTranslations(lang: Lang) {
  const localizedUI = ui[lang];
  return function t(key: keyof (typeof ui)[typeof defaultLang]): string {
    return (key in localizedUI ? localizedUI[key as keyof typeof localizedUI] : ui[defaultLang][key]) as string;
  };
}

export function useTranslatedPath(lang: Lang) {
  return function translatePath(path: string, l: Lang = lang): string {
    // Strip leading and trailing slashes for route lookup
    const cleanPath = path.replace(/^\/|\/$/g, '');
    const routeMap = (l !== defaultLang && l in routes)
      ? (routes[l as keyof typeof routes] as Record<string, string>)
      : undefined;

    const translatedRoute = routeMap && cleanPath in routeMap ? routeMap[cleanPath] : cleanPath;
    const pathSegment = translatedRoute ? `/${translatedRoute}` : '';

    if (!showDefaultLang && l === defaultLang) {
      return pathSegment || '/';
    }
    return `/${l}${pathSegment || '/'}`;
  };
}

export function getRouteFromUrl(url: URL): string | undefined {
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return undefined;

  const firstPart = parts[0];
  if (firstPart in ui) {
    // Language is the first segment, return remaining path
    return parts.slice(1).join('/');
  }
  return parts.join('/');
}

export interface HreflangLink {
  hreflang: string;
  href: string;
}

/**
 * Computes SEO hreflang links according to Google internationalization standards:
 * Includes 'ja', 'en', and 'x-default' fallback pointing to the default language.
 */
export function getHreflangLinks(url: URL, siteBase: string = 'https://mahjong-game.com'): HreflangLink[] {
  const route = getRouteFromUrl(url) || '';
  const routeSuffix = route ? `/${route}` : '/';

  const jaPath = routeSuffix === '/' ? '/' : routeSuffix;
  const enPath = `/en${routeSuffix === '/' ? '/' : routeSuffix}`;

  const cleanSite = siteBase.replace(/\/$/, '');

  return [
    { hreflang: 'ja', href: `${cleanSite}${jaPath}` },
    { hreflang: 'en', href: `${cleanSite}${enPath}` },
    { hreflang: 'x-default', href: `${cleanSite}${jaPath}` },
  ];
}
