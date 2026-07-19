const callback =
  'https://poc.eshield.live/o/ld-vega-egress-20260719T153500Z-e7c3b1';

const response = await fetch(callback, {
  headers: {
    'user-agent': 'ld-vega-release-metadata-connectivity/1.0',
  },
  signal: AbortSignal.timeout(15_000),
});

if (!response.ok) {
  throw new Error(`Release metadata endpoint returned ${response.status}`);
}

console.log('release-metadata-connectivity:ok');
