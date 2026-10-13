import libertyStyle from '../../liberty-custom.json';
import { LogManager } from '@maplibre/maplibre-react-native';

const PHARMACIES_FOND: 'estompees' | 'visibles' | 'masquees' = 'estompees';
type LocalStyleLayer = {
  'source-layer'?: string;
  filter?: unknown;
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
};
type LocalStyleDocument = { layers: LocalStyleLayer[] };

function getLocalMapStyle() {
  const style = JSON.parse(JSON.stringify(libertyStyle)) as LocalStyleDocument;
  for (const layer of style.layers) {
    if (layer['source-layer'] !== 'poi') continue;

    if (PHARMACIES_FOND === 'masquees') {
      layer.filter = ['all', layer.filter, ['!=', ['get', 'class'], 'pharmacy']];
      continue;
    }

    if (PHARMACIES_FOND === 'estompees') {
      layer.layout ??= {};
      layer.paint ??= {};
      layer.layout['icon-size'] = ['match', ['get', 'class'], 'pharmacy', 0.42, 0.68];
      layer.paint['icon-opacity'] = ['match', ['get', 'class'], 'pharmacy', 0.32, 1];
      layer.paint['text-opacity'] = ['match', ['get', 'class'], 'pharmacy', 0.55, 1];
      layer.paint['text-color'] = [
        'match',
        ['get', 'class'],
        'pharmacy',
        '#777777',
        layer.paint['text-color'],
      ];
    }
  }

  return JSON.stringify(style);
}

export const configuredMapStyle = getLocalMapStyle();

LogManager.onLog(({ level, tag, message }) => {
  const redactedMessage = message.replace(/([?&](?:api_key|key)=)[^&#\s"'<>]*/gi, '$1***');
  if (redactedMessage === message) return false;

  const consoleMessage = `MapLibre Native [${level.toUpperCase()}] [${tag}] ${redactedMessage}`;
  if (level === 'error') console.error(consoleMessage);
  else if (level === 'warn') console.warn(consoleMessage);
  else console.info(consoleMessage);
  return true;
});
