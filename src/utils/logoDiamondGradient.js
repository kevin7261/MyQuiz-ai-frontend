/** 中央菱形：隨機鮮豔二色線性漸層（TopView 品牌 icon、按鈕 LogoCenterMark 共用） */
export function createRandomLogoDiamondGradient() {
  const vividHues = [0, 18, 32, 48, 120, 155, 195, 220, 265, 290, 315, 340];
  const hue1 = vividHues[Math.floor(Math.random() * vividHues.length)]
    + Math.floor(Math.random() * 14) - 7;
  const hue2 = (hue1 + 55 + Math.floor(Math.random() * 95)) % 360;
  const sat = 96 + Math.floor(Math.random() * 4);
  const dirs = [
    { x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
    { x1: '0%', y1: '100%', x2: '100%', y2: '0%' },
    { x1: '0%', y1: '50%', x2: '100%', y2: '50%' },
    { x1: '50%', y1: '0%', x2: '50%', y2: '100%' },
  ];
  const dir = dirs[Math.floor(Math.random() * dirs.length)];
  return {
    ...dir,
    stops: [
      { offset: '0%', color: `hsl(${hue1}, ${sat}%, ${50 + Math.floor(Math.random() * 8)}%)` },
      { offset: '100%', color: `hsl(${hue2}, ${sat}%, ${44 + Math.floor(Math.random() * 10)}%)` },
    ],
  };
}
