import { useEffect } from "react";

export function useMeta(config) {
  useEffect(() => {
    if (!config) return;
    document.title = config.title;

    const setMeta = (name, content, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("title", config.title);
    setMeta("description", config.description);
    setMeta("robots", "noindex, nofollow, noarchive, nocache");
    setMeta("googlebot", "noindex, nofollow, noarchive");
    setMeta("bingbot", "noindex, nofollow, noarchive");
    setMeta("archive", "no");
    setMeta("cache-control", "no-cache, no-store, must-revalidate");

    const setHttpEquiv = (httpEquiv, content) => {
      let el = document.querySelector(`meta[http-equiv="${httpEquiv}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("http-equiv", httpEquiv);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setHttpEquiv("Pragma", "no-cache");
    setHttpEquiv("Expires", "0");

    // Los bots de redes sociales no ejecutan JS: las etiquetas que valen para la
    // vista previa son las de index.html. Estas solo mantienen el <head> al día
    // cuando la invitación trae datos propios desde la API.
    const absoluteUrl = (url) =>
      url && url.startsWith("/") ? `${window.location.origin}${url}` : url;
    const ogImage = absoluteUrl(config.ogImage);

    setMeta("og:type", "website", true);
    setMeta("og:url", window.location.href, true);
    setMeta("og:title", config.title, true);
    setMeta("og:description", config.description, true);
    if (ogImage) setMeta("og:image", ogImage, true);

    setMeta("twitter:card", "summary_large_image", true);
    setMeta("twitter:url", window.location.href, true);
    setMeta("twitter:title", config.title, true);
    setMeta("twitter:description", config.description, true);
    if (ogImage) setMeta("twitter:image", ogImage, true);

    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.setAttribute("rel", "icon");
      document.head.appendChild(favicon);
    }
    favicon.setAttribute("href", config.favicon);
  }, [config]);
}
