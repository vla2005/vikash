import { Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import React, { memo } from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';


// Drawing factories create only the selected SVG, without allocating the full catalog.
const shapes = {
    camera: ({ props }) => <><Path d="M3 7h4l2-3h6l2 3h4v14H3z" {...props} /><Circle cx="12" cy="13" r="4" {...props} /></>,
    image: ({ props }) => <><Rect x="3" y="3" width="18" height="18" rx="3" {...props} /><Circle cx="8" cy="8" r="1.5" {...props} /><Path d="M3 17l5-5 4 4 4-6 5 7" {...props} /></>,
    history: ({ props }) => <><Path d="M3 11a9 9 0 119 10M3 4v7h7M12 6v6l-4 3" {...props} /></>,
    arrowUp: ({ props }) => <Path d="M12 20V4M6 10l6-6 6 6" {...props} />,
    stop: ({ color }) => <Rect x="6" y="6" width="12" height="12" rx="2" fill={color} />,
    keyboard: ({ props }) => <><Rect x="2" y="5" width="20" height="14" rx="3" {...props} /><Path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" {...props} /></>,
    sparkles: ({ props }) => <><Path d="M10 6.5c.9 4.8 2.7 6.6 7.5 7.5-4.8.9-6.6 2.7-7.5 7.5-.9-4.8-2.7-6.6-7.5-7.5 4.8-.9 6.6-2.7 7.5-7.5Z" {...props} /><Path d="M17.5 4.5v6M14.5 7.5h6M4 19v3M2.5 20.5h3" {...props} /></>,
    sun: ({ props }) => <><Circle cx="12" cy="12" r="4" {...props} /><Path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" {...props} /></>,
    moon: ({ props }) => <Path d="M20 15.5A9 9 0 018.5 4 9 9 0 1020 15.5z" {...props} />,
    device: ({ props }) => <><Rect x="5" y="2" width="14" height="20" rx="3" {...props} /><Line x1="10" y1="18" x2="14" y2="18" {...props} /></>,
    trendUp: ({ props }) => <><Polyline points="3,17 9,11 13,15 21,7" {...props} /><Polyline points="15,7 21,7 21,13" {...props} /></>,
    trendDown: ({ props }) => <><Polyline points="3,7 9,13 13,9 21,17" {...props} /><Polyline points="15,17 21,17 21,11" {...props} /></>,
    creditCard: ({ props }) => <><Rect x="2" y="4" width="20" height="16" rx="3" {...props} /><Path d="M2 9h20M6 15h4" {...props} /></>,
    archive: ({ props }) => <><Path d="M3 8l2-5h14l2 5v12a1 1 0 01-1 1H4a1 1 0 01-1-1V8zM3 8h5l2 3h4l2-3h5" {...props} /></>,
    warning: ({ props, color }) => <><Path d="M12 3L2 21h20zM12 9v5" {...props} /><Circle cx="12" cy="17.5" r="1" fill={color} /></>,
    home: ({ props }) => <><Path d="M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z" {...props} /></>,
    statement: ({ props }) => <><Path d="M5 3h10l4 4v14H5zM15 3v5h4M8 11h8M8 14h8M8 17h5" {...props} /></>,
    categories: ({ props }) => <><Rect x="3" y="3" width="7" height="7" rx="2" {...props} /><Rect x="14" y="3" width="7" height="7" rx="2" {...props} /><Rect x="3" y="14" width="7" height="7" rx="2" {...props} /><Rect x="14" y="14" width="7" height="7" rx="2" {...props} /></>,
    microphone: ({ props, color }) => <><Rect x="8" y="1" width="8" height="14" rx="4" fill={color} /><Path d="M4.5 10v2a7.5 7.5 0 0015 0v-2M12 19.5v3" {...props} /></>,
    walletFilled: ({ stroke, color, colors }) => <><Rect x="3" y="5" width="18" height="16" rx="3" fill={color} /><Path d="M4 8h16" stroke={colors.surface} strokeWidth="1.5" /><Rect x="15" y="12" width="6" height="5" rx="1" fill={color} /><Circle cx="17" cy="14.5" r="0.8" fill={colors.surface} /></>,
    arrow: ({ props }) => <><Path d="M4 12h16M14 6l6 6-6 6" {...props} /></>,
    back: ({ props }) => <Path d="M15 5l-7 7 7 7" {...props} />,
    eye: ({ props }) => <><Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" {...props} /><Circle cx="12" cy="12" r="3" {...props} /></>,
    eyeOff: ({ props }) => <><Path d="M3 3l18 18M10 5c7-1 12 7 12 7a18 18 0 01-4 4M6 6c-2 2-4 6-4 6s4 7 10 7c2 0 4-1 5-2" {...props} /></>,
    plus: ({ props }) => <Path d="M12 4v16M4 12h16" {...props} />,
    check: ({ props }) => <Path d="M5 12l4 4L19 6" {...props} />,
    edit: ({ props }) => <><Path d="M14 4l6 6M3 21l2-7L16 3a2 2 0 013 0l2 2a2 2 0 010 3L10 19z" {...props} /></>,
    trash: ({ props }) => <><Path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" {...props} /></>,
    bank: ({ props }) => <><Path d="M3 9l9-6 9 6H3zM3 21h18M5 18V11M10 18V11M14 18V11M19 18V11" {...props} /></>,
    wallet: ({ props, color }) => <><Rect x="3" y="6" width="18" height="15" rx="3" {...props} /><Path d="M3 8V5a2 2 0 012-2h12v3M21 12h-6v5h6" {...props} /><Circle cx="17" cy="14.5" r="0.6" fill={color} /></>,
    savings: ({ props, color }) => <><Path d="M7 7l-2-3v6l-2 2v5h3l1 4h3l1-3h5l1 3h3l1-5v-5l-3-3c-3-3-7-3-11-1zM12 5V2" {...props} /><Circle cx="17" cy="11" r="1" fill={color} /></>,
    investment: ({ color }) => <><Rect x="3" y="13" width="4" height="8" rx="1" fill={color} /><Rect x="10" y="8" width="4" height="13" rx="1" fill={color} /><Rect x="17" y="3" width="4" height="18" rx="1" fill={color} /></>,
    user: ({ props }) => <><Circle cx="12" cy="7" r="4" {...props} /><Path d="M4 21v-2a8 8 0 0116 0v2" {...props} /></>,
    close: ({ props }) => <><Line x1="6" y1="6" x2="18" y2="18" {...props} /><Line x1="18" y1="6" x2="6" y2="18" {...props} /></>,
    restart: ({ props }) => <><Path d="M4 10a8 8 0 118 10M4 4v6h6" {...props} /></>,
    info: ({ props, color }) => <><Circle cx="12" cy="12" r="9" {...props} /><Line x1="12" y1="11" x2="12" y2="16" {...props} /><Circle cx="12" cy="7" r="1" fill={color} /></>,
    chevron: ({ props }) => <Polyline points="9,5 16,12 9,19" {...props} />,
    chevronDown: ({ props }) => <Polyline points="5,9 12,16 19,9" {...props} />,
    search: ({ props }) => <><Circle cx="10.5" cy="10.5" r="6.5" {...props} /><Path d="M16 16l5 5" {...props} /></>,
    filters: ({ props, colors }) => <><Path d="M3 6h18M3 12h18M3 18h18" {...props} /><Circle cx="8" cy="6" r="2" fill={colors.surface} {...props} /><Circle cx="16" cy="12" r="2" fill={colors.surface} {...props} /><Circle cx="10" cy="18" r="2" fill={colors.surface} {...props} /></>,
};

function Icon({ name, size = 24, color }) {
  const { colors } = useTheme();
  color ??= colors.text;
  const props = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  const shape = shapes[name] || shapes.wallet;
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={Platform.OS === 'web' ? undefined : false} aria-hidden={Platform.OS === 'web' || undefined}>{shape({ props, color, colors })}</Svg>;
}

export default memo(Icon);
