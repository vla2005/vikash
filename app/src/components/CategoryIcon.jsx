import { colors } from '../theme';
import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

export default function CategoryIcon({ name, size = 28, color = colors.text, solid = false }) {
  const stroke = { stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  const shapes = {
    health: <Path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill={color} />,
    house: <Path d="M2 11L12 2l10 9h-3v11h-5v-8h-4v8H5V11z" fill={color} />,
    paw: <><Ellipse cx="5" cy="9" rx="2.5" ry="3.5" fill={color} /><Ellipse cx="10" cy="5" rx="2.5" ry="3.5" fill={color} /><Ellipse cx="16" cy="5" rx="2.5" ry="3.5" fill={color} /><Ellipse cx="21" cy="10" rx="2.5" ry="3.5" fill={color} /><Path d="M6 17c0-3 4-7 6-7s7 5 7 8c0 5-5 2-7 2s-6 3-6-3z" fill={color} /></>,
    basket: <><Path d="M3 9h18l-3 12H6zM7 9l4-7M17 9l-4-7M9 13v4M15 13v4" {...stroke} /></>,
    food: <><Path d="M4 2v7c0 4 6 4 6 0V2M7 2v20M19 13v9" {...stroke} /><Ellipse cx="19" cy="7" rx="3.5" ry="6" fill={color} /></>,
    car: <><Path d="M3 10l3-7h12l3 7v10H3z" {...stroke} /><Path d="M4 10h16M6 20v2M18 20v2" {...stroke} /><Circle cx="7" cy="15" r="1.5" fill={color} /><Circle cx="17" cy="15" r="1.5" fill={color} /></>,
    ticket: <Path d="M3 6h18v4a2 2 0 000 4v4H3v-4a2 2 0 000-4zM15 7v2m0 2v2m0 2v2" {...stroke} />,
    gift: <><Rect x="3" y="9" width="18" height="12" rx="1" fill={color} /><Path d="M12 9v12" stroke="#FFFFFF" strokeWidth="2" /><Path d="M12 8C1 8 5-2 10 4l2 4c10 0 8-10 3-5l-3 5z" {...stroke} /></>,
    suitcase: <><Rect x="4" y="6" width="16" height="16" rx="2" fill={color} /><Path d="M9 6V2h6v4" {...stroke} /><Path d="M8 8v12M16 8v12" stroke="#FFFFFF" strokeWidth="1.5" /></>,
    book: <Path d="M12 5C8 2 4 2 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-2-6-2-10 1zM12 5v16" {...stroke} />,
    dumbbell: <><Path d="M8 12h8M3 8v8M7 5v14M17 5v14M21 8v8" {...stroke} /></>,
    game: <><Path d="M6 6h12c3 0 6 13 2 14l-5-5H9l-5 5C0 19 3 6 6 6z" {...stroke} /><Path d="M6 9v5M3.5 11.5h5" {...stroke} /><Circle cx="17" cy="10" r="1" fill={color} /><Circle cx="19" cy="13" r="1" fill={color} /></>,
    heart: <Path d="M12 22L3 12C-3 3 8-2 12 5c4-7 15-2 9 7z" fill={color} />,
    bag: <><Path d="M4 7h16l2 15H2z" fill={color} /><Path d="M8 8V5a4 4 0 018 0v3" {...stroke} /></>,
    coffee: <><Path d="M3 3h13v8a6.5 6.5 0 01-13 0z" fill={color} /><Path d="M16 4h3c6 0 3 9-3 9M2 21h16" {...stroke} /></>,
    music: <><Path d="M9 18V5l12-3v13M9 8l12-3" {...stroke} /><Ellipse cx="5" cy="19" rx="4" ry="3" fill={color} /><Ellipse cx="17" cy="17" rx="4" ry="3" fill={color} /></>,
    leaf: <><Path d="M3 20C-2 8 13 1 22 2c0 14-7 23-19 18z" fill={color} /><Path d="M4 20L17 7" stroke="#FFFFFF" strokeWidth="1.5" /></>,
    plane: <Path d="M22 3L2 10l8 3 3 8 9-18zM10 13l6-6" {...stroke} />,
    bus: <><Rect x="4" y="2" width="16" height="18" rx="3" {...stroke} /><Path d="M4 11h16M12 3v8M7 20v2M17 20v2" {...stroke} /><Circle cx="8" cy="16" r="1" fill={color} /><Circle cx="16" cy="16" r="1" fill={color} /></>,
    train: <><Rect x="5" y="2" width="14" height="16" rx="4" {...stroke} /><Path d="M5 10h14M12 3v7M8 18l-3 4M16 18l3 4M7 21h10" {...stroke} /><Circle cx="9" cy="14" r="1" fill={color} /><Circle cx="15" cy="14" r="1" fill={color} /></>,
    bike: <><Circle cx="5" cy="17" r="4" {...stroke} /><Circle cx="19" cy="17" r="4" {...stroke} /><Path d="M5 17l5-9 5 9H5M10 8h6l3 9M8 5h4M16 8V4h3" {...stroke} /></>,
    fuel: <><Rect x="3" y="3" width="11" height="18" rx="1" {...stroke} /><Path d="M5 6h7v5H5zM2 21h13M14 12h2v6a2 2 0 004 0V8l-3-3M18 7h2v4h-2" {...stroke} /></>,
    wallet: <><Rect x="2" y="5" width="20" height="16" rx="3" {...stroke} /><Path d="M3 5l15-3v3M22 11h-7v5h7" {...stroke} /><Circle cx="18" cy="13.5" r="1" fill={color} /></>,
    card: <><Rect x="2" y="4" width="20" height="16" rx="3" {...stroke} /><Path d="M2 9h20M6 15h4M14 15h3" {...stroke} /></>,
    bank: <Path d="M2 8l10-6 10 6H2zM4 11v8M9 11v8M15 11v8M20 11v8M2 22h20" {...stroke} />,
    briefcase: <><Rect x="2" y="7" width="20" height="14" rx="2" {...stroke} /><Path d="M8 7V3h8v4M2 12l10 4 10-4M12 13v4" {...stroke} /></>,
    graduation: <><Path d="M1 8l11-5 11 5-11 5L1 8zM5 10v7c4 4 10 4 14 0v-7M23 8v9" {...stroke} /></>,
    phone: <><Rect x="6" y="2" width="12" height="20" rx="3" {...stroke} /><Path d="M10 5h4M11 19h2" {...stroke} /></>,
    laptop: <><Rect x="4" y="3" width="16" height="13" rx="1" {...stroke} /><Path d="M4 16l-3 5h22l-3-5M9 19h6" {...stroke} /></>,
    wifi: <><Path d="M2 8a16 16 0 0120 0M5 12a11 11 0 0114 0M8 16a6 6 0 018 0" {...stroke} /><Circle cx="12" cy="20" r="1.5" fill={color} /></>,
    lightbulb: <><Path d="M8 17v-2a7 7 0 118 0v2H8zM9 20h6M10 23h4M12 17v-6M9 9l3 2 3-2" {...stroke} /></>,
    water: <Path d="M12 2S4 11 4 15a8 8 0 0016 0c0-4-8-13-8-13zM8 15a4 4 0 004 4" {...stroke} />,
    tools: <Path d="M14 3a6 6 0 00-7 7L2 15a3 3 0 004 4l5-5a6 6 0 007-7l-4 4-4-4 4-4z" {...stroke} />,
    shirt: <Path d="M8 3L2 6l-1 6 5 1v9h12v-9l5-1-1-6-6-3a4 4 0 01-8 0z" {...stroke} />,
    baby: <><Circle cx="12" cy="13" r="9" {...stroke} /><Path d="M12 4c-4-5 4-4 2 0M8 16c2 3 6 3 8 0" {...stroke} /><Circle cx="8" cy="11" r="1" fill={color} /><Circle cx="16" cy="11" r="1" fill={color} /></>,
    beauty: <><Rect x="7" y="13" width="10" height="9" rx="1" {...stroke} /><Path d="M9 13V5l6-3v11M7 17h10" {...stroke} /></>,
  };
  const solidShapes = {
    book: <Path d="M11 5C8 2 4 2 2 4v16c4-2 7-1 9 1V5zM13 5c3-3 7-3 9-1v16c-4-2-7-1-9 1V5z" fill={color} />,
    bus: <><Rect x="5" y="1" width="14" height="19" rx="3" fill={color} /><Rect x="7" y="4" width="10" height="7" rx="1" fill="#FFFFFF" /><Circle cx="8" cy="16" r="1.5" fill="#FFFFFF" /><Circle cx="16" cy="16" r="1.5" fill="#FFFFFF" /><Path d="M7 20v2M17 20v2" {...stroke} /></>,
    ticket: <Path d="M3 6h18v4a2 2 0 000 4v4H3v-4a2 2 0 000-4z" fill={color} transform="rotate(-35 12 12)" />,
    briefcase: <><Rect x="2" y="7" width="20" height="14" rx="2" fill={color} /><Path d="M8 7V3h8v4" {...stroke} /><Path d="M2 12h20M12 10v5" stroke="#FFFFFF" strokeWidth="1.5" /></>,
    dumbbell: <Path d="M2 9h3v6H2zM5 5h4v14H5zM9 10h6v4H9zM15 5h4v14h-4zM19 9h3v6h-3z" fill={color} />,
    plane: <Path d="M21 2c-1-1-2 0-3 1l-5 5-9-2-2 2 7 4-4 5-3-1-1 1 4 2 2 4 1-1-1-3 5-4 4 7 2-2-2-9 5-5c1-1 2-2 1-3z" fill={color} />,
  };
  const ellipsis = <><Circle cx="4" cy="12" r="2" fill={color} /><Circle cx="12" cy="12" r="2" fill={color} /><Circle cx="20" cy="12" r="2" fill={color} /></>;
  const shape = name === 'ellipsis' ? ellipsis : (solid && solidShapes[name]) || shapes[name] || shapes.paw;
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>{shape}</Svg>;
}
