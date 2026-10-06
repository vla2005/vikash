import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';
import { colors } from '../theme';

export default function Icon({ name, size = 24, color = colors.text }) {
  const props = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  const shapes = {
    trendUp: <><Polyline points="3,17 9,11 13,15 21,7" {...props} /><Polyline points="15,7 21,7 21,13" {...props} /></>,
    trendDown: <><Polyline points="3,7 9,13 13,9 21,17" {...props} /><Polyline points="15,17 21,17 21,11" {...props} /></>,
    creditCard: <><Rect x="2" y="4" width="20" height="16" rx="3" {...props} /><Path d="M2 9h20M6 15h4" {...props} /></>,
    archive: <><Path d="M3 8l2-5h14l2 5v12a1 1 0 01-1 1H4a1 1 0 01-1-1V8zM3 8h5l2 3h4l2-3h5" {...props} /></>,
    warning: <><Path d="M12 3L2 21h20zM12 9v5" {...props} /><Circle cx="12" cy="17.5" r="1" fill={color} /></>,
    home: <><Path d="M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z" {...props} /></>,
    statement: <><Path d="M5 3h10l4 4v14H5zM15 3v5h4M8 11h8M8 14h8M8 17h5" {...props} /></>,
    categories: <><Rect x="3" y="3" width="7" height="7" rx="2" {...props} /><Rect x="14" y="3" width="7" height="7" rx="2" {...props} /><Rect x="3" y="14" width="7" height="7" rx="2" {...props} /><Rect x="14" y="14" width="7" height="7" rx="2" {...props} /></>,
    microphone: <><Rect x="8" y="1" width="8" height="14" rx="4" fill={color} /><Path d="M4.5 10v2a7.5 7.5 0 0015 0v-2M12 19.5v3" {...props} /></>,
    walletFilled: <><Rect x="3" y="5" width="18" height="16" rx="3" fill={color} /><Path d="M4 8h16" stroke="#FFFFFF" strokeWidth="1.5" /><Rect x="15" y="12" width="6" height="5" rx="1" fill={color} /><Circle cx="17" cy="14.5" r="0.8" fill="#FFFFFF" /></>,
    arrow: <><Path d="M4 12h16M14 6l6 6-6 6" {...props} /></>,
    back: <Path d="M15 5l-7 7 7 7" {...props} />,
    eye: <><Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" {...props} /><Circle cx="12" cy="12" r="3" {...props} /></>,
    eyeOff: <><Path d="M3 3l18 18M10 5c7-1 12 7 12 7a18 18 0 01-4 4M6 6c-2 2-4 6-4 6s4 7 10 7c2 0 4-1 5-2" {...props} /></>,
    plus: <Path d="M12 4v16M4 12h16" {...props} />,
    check: <Path d="M5 12l4 4L19 6" {...props} />,
    edit: <><Path d="M14 4l6 6M3 21l2-7L16 3a2 2 0 013 0l2 2a2 2 0 010 3L10 19z" {...props} /></>,
    trash: <><Path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" {...props} /></>,
    bank: <><Path d="M3 9l9-6 9 6H3zM3 21h18M5 18V11M10 18V11M14 18V11M19 18V11" {...props} /></>,
    wallet: <><Rect x="3" y="6" width="18" height="15" rx="3" {...props} /><Path d="M3 8V5a2 2 0 012-2h12v3M21 12h-6v5h6" {...props} /><Circle cx="17" cy="14.5" r="0.6" fill={color} /></>,
    savings: <><Path d="M7 7l-2-3v6l-2 2v5h3l1 4h3l1-3h5l1 3h3l1-5v-5l-3-3c-3-3-7-3-11-1zM12 5V2" {...props} /><Circle cx="17" cy="11" r="1" fill={color} /></>,
    investment: <><Rect x="3" y="13" width="4" height="8" rx="1" fill={color} /><Rect x="10" y="8" width="4" height="13" rx="1" fill={color} /><Rect x="17" y="3" width="4" height="18" rx="1" fill={color} /></>,
    user: <><Circle cx="12" cy="7" r="4" {...props} /><Path d="M4 21v-2a8 8 0 0116 0v2" {...props} /></>,
    close: <><Line x1="6" y1="6" x2="18" y2="18" {...props} /><Line x1="18" y1="6" x2="6" y2="18" {...props} /></>,
    info: <><Circle cx="12" cy="12" r="9" {...props} /><Line x1="12" y1="11" x2="12" y2="16" {...props} /><Circle cx="12" cy="7" r="1" fill={color} /></>,
    chevron: <Polyline points="9,5 16,12 9,19" {...props} />,
    chevronDown: <Polyline points="5,9 12,16 19,9" {...props} />,
    search: <><Circle cx="10.5" cy="10.5" r="6.5" {...props} /><Path d="M16 16l5 5" {...props} /></>,
    filters: <><Path d="M3 6h18M3 12h18M3 18h18" {...props} /><Circle cx="8" cy="6" r="2" fill="#FFFFFF" {...props} /><Circle cx="16" cy="12" r="2" fill="#FFFFFF" {...props} /><Circle cx="10" cy="18" r="2" fill="#FFFFFF" {...props} /></>,
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>{shapes[name] || shapes.wallet}</Svg>;
}
