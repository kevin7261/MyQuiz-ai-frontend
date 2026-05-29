/**
 * 首屏 favicon：在 Vue bundle 載入前，依 cookie 套用 51–54 漸層 icon。
 * 邏輯須與 src/utils/faviconGradient.js 保持一致。
 */
(function applyBootFavicon() {
  if (typeof document === 'undefined') return;

  var CENTER_DIAMOND_PATH =
    'M 120 80 A 40 40 0 0 0 160 120 A 40 40 0 0 0 120 160 A 40 40 0 0 0 80 120 A 40 40 0 0 0 120 80 Z';
  var DEFAULT_SECONDARY = '#666666';
  var DEFAULT_PRIMARY = '#333333';
  var DEFAULT_DIAMOND = '#ffffff';
  var COOKIE_NAME = 'myquiz_logo_gradients';
  var FAVICON_PNG_SIZE = 32;

  function readCookie(name) {
    var prefix = encodeURIComponent(name) + '=';
    var parts = document.cookie.split(';');
    for (var i = 0; i < parts.length; i += 1) {
      var trimmed = parts[i].trim();
      if (trimmed.indexOf(prefix) === 0) {
        return decodeURIComponent(trimmed.slice(prefix.length));
      }
    }
    return null;
  }

  function readLogoColorsFromCookie() {
    try {
      var raw = readCookie(COOKIE_NAME);
      if (!raw) return null;
      var data = JSON.parse(raw);
      var logoColors = data && data.logoColors;
      if (
        logoColors
        && logoColors.primaryGradient
        && logoColors.primaryGradient.stops
        && logoColors.primaryGradient.stops.length
        && logoColors.secondaryGradient
        && logoColors.secondaryGradient.stops
        && logoColors.secondaryGradient.stops.length
      ) {
        return logoColors;
      }
    } catch (e) {
      /* ignore */
    }
    return null;
  }

  function stopsMarkup(gradient) {
    return (gradient.stops || [])
      .map(function (stop) {
        return '<stop offset="' + stop.offset + '" stop-color="' + stop.color + '"/>';
      })
      .join('');
  }

  function linearGradientDefObjectBBox(id, gradient) {
    var x1 = gradient.x1 || '0%';
    var y1 = gradient.y1 || '0%';
    var x2 = gradient.x2 || '100%';
    var y2 = gradient.y2 || '100%';
    return (
      '<linearGradient id="' + id + '" gradientUnits="objectBoundingBox" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">'
      + stopsMarkup(gradient)
      + '</linearGradient>'
    );
  }

  function buildFaviconSvgString(logoColors) {
    var primary = logoColors && logoColors.primaryGradient;
    var secondary = logoColors && logoColors.secondaryGradient;
    var body;
    if (
      primary
      && primary.stops
      && primary.stops.length
      && secondary
      && secondary.stops
      && secondary.stops.length
    ) {
      body =
        '<defs>'
        + linearGradientDefObjectBBox('favicon-sec', secondary)
        + linearGradientDefObjectBBox('favicon-pri', primary)
        + '</defs>'
        + '<rect x="80" y="80" width="40" height="80" fill="url(#favicon-sec)"/>'
        + '<rect x="120" y="80" width="40" height="80" fill="url(#favicon-pri)"/>'
        + '<path fill="' + DEFAULT_DIAMOND + '" d="' + CENTER_DIAMOND_PATH + '"/>';
    } else {
      body =
        '<rect x="80" y="80" width="40" height="80" fill="' + DEFAULT_SECONDARY + '"/>'
        + '<rect x="120" y="80" width="40" height="80" fill="' + DEFAULT_PRIMARY + '"/>'
        + '<path fill="' + DEFAULT_DIAMOND + '" d="' + CENTER_DIAMOND_PATH + '"/>';
    }
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="80 80 80 80" role="img" aria-label="MyQuiz.ai">'
      + body
      + '</svg>'
    );
  }

  function removeAllFaviconLinks() {
    document.querySelectorAll('link[rel="icon"], link[rel="alternate icon"], link[rel="shortcut icon"]').forEach(function (el) {
      el.remove();
    });
  }

  function appendFaviconLink(href, type) {
    var link = document.createElement('link');
    link.rel = 'icon';
    link.type = type;
    link.sizes = FAVICON_PNG_SIZE + 'x' + FAVICON_PNG_SIZE;
    link.href = href;
    link.setAttribute('data-myquiz-dynamic-favicon', 'true');
    document.head.appendChild(link);
  }

  function svgToPngObjectUrl(svg, callback) {
    var svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    var svgUrl = URL.createObjectURL(svgBlob);
    var img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(svgUrl);
      var canvas = document.createElement('canvas');
      canvas.width = FAVICON_PNG_SIZE;
      canvas.height = FAVICON_PNG_SIZE;
      var ctx = canvas.getContext('2d');
      if (!ctx) {
        callback(null);
        return;
      }
      ctx.drawImage(img, 0, 0, FAVICON_PNG_SIZE, FAVICON_PNG_SIZE);
      canvas.toBlob(function (pngBlob) {
        if (!pngBlob) {
          callback(null);
          return;
        }
        callback(URL.createObjectURL(pngBlob));
      }, 'image/png');
    };
    img.onerror = function () {
      URL.revokeObjectURL(svgUrl);
      callback(null);
    };
    img.src = svgUrl;
  }

  var logoColors = readLogoColorsFromCookie();
  if (!logoColors) return;

  var svg = buildFaviconSvgString(logoColors);
  removeAllFaviconLinks();

  svgToPngObjectUrl(svg, function (pngUrl) {
    if (pngUrl) {
      appendFaviconLink(pngUrl, 'image/png');
      return;
    }
    appendFaviconLink('data:image/svg+xml,' + encodeURIComponent(svg), 'image/svg+xml');
  });
})();
