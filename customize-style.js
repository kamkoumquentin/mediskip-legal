const fs = require('node:fs');
const path = require('node:path');

const SHIFT = 2;
const INPUT_PATH = path.join(__dirname, 'liberty.json');
const OUTPUT_PATH = path.join(__dirname, 'liberty-custom.json');

const style = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));

console.log('Couches symbol avant personnalisation :');
for (const layer of style.layers) {
  if (layer.type !== 'symbol') continue;
  console.log(
    `- ${layer.id} | source-layer: ${layer['source-layer'] ?? '(absent)'} | minzoom: ${layer.minzoom ?? '(défaut 0)'}`,
  );
}

const modifiedLayers = [];
for (const layer of style.layers) {
  if (layer.type !== 'symbol') continue;

  const id = layer.id ?? '';
  const sourceLayer = layer['source-layer'];
  const isRoadLabel = id.startsWith('highway-name');
  const isPlaceLabel = sourceLayer === 'place' || id.startsWith('label');
  const isPoiLabel = sourceLayer === 'poi' || id.startsWith('poi');
  if (!isRoadLabel && !isPlaceLabel && !isPoiLabel) continue;

  const oldMinzoom = layer.minzoom;
  let newMinzoom = oldMinzoom;
  if (typeof oldMinzoom === 'number') {
    const floor = isRoadLabel && !id.startsWith('highway-name-major')
      ? Math.min(oldMinzoom, 13)
      : 0;
    newMinzoom = Math.max(floor, oldMinzoom - SHIFT);
    layer.minzoom = newMinzoom;
  }

  layer.layout ??= {};
  layer.layout['text-padding'] = 1;
  modifiedLayers.push({
    id,
    oldMinzoom: oldMinzoom ?? '(défaut 0)',
    newMinzoom: newMinzoom ?? '(défaut 0)',
  });
}

style.name = 'liberty-custom';
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(style, null, 2)}\n`);

console.log('\nCouches modifiées (id | ancien minzoom | nouveau minzoom) :');
for (const layer of modifiedLayers) {
  console.log(`- ${layer.id} | ${layer.oldMinzoom} | ${layer.newMinzoom}`);
}
console.log(`\nStyle personnalisé écrit dans ${OUTPUT_PATH}`);
