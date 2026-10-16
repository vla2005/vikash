import { dock } from '../theme/silver';
export const assistantMotion = { openDuration:680, closeDuration:560, compactDuration:280 };
const valid = r => r && ['x','y','width','height'].every(k => Number.isFinite(r[k])) && r.width > 0 && r.height > 0;
export function measureAssistantNode(node) {
  if (!node) return Promise.resolve(null);
  return new Promise(resolve => {
    let settled = false;
    const finish = rect => { if (!settled) { settled = true; clearTimeout(timer); resolve(valid(rect) ? rect : null); } };
    const timer = setTimeout(() => finish(null), 100);
    try {
      if (node.getBoundingClientRect) {
        const r = node.getBoundingClientRect(); finish({ x:r.x, y:r.y, width:r.width, height:r.height });
      } else if (node.measureInWindow) node.measureInWindow((x,y,width,height) => finish({x,y,width,height}));
      else finish(null);
    } catch { finish(null); }
  });
}
export function assistantReturnGeometry({ source, target, frame, width, height, bottom=0, collapsed=false, compact=false }) {
  const root = valid(frame) ? frame : { x:0,y:0,width:Math.min(width,460),height };
  const available = root.width - dock.margin * 2;
  const rail = Math.max(210, available - dock.height - dock.gap);
  const anchor = valid(target) && target.viewport ? {
    x:root.x+target.x, y:root.y+root.height-(target.viewport.height-target.y-target.height)-target.height,
    width:Math.max(1,root.width-target.x-(target.viewport.width-target.x-target.width)),height:target.height,
  } : target;
  const end = valid(anchor) ? anchor : { x:root.x+dock.margin+(collapsed ? 64 : 0),
    y:root.y+height-Math.max(bottom,12)-4-116+(collapsed ? 62 : 0),
    width:rail-(collapsed ? 64 : 0),height:dock.voiceHeight };
  const start = valid(source) ? source : { x:root.x+16,y:root.y+root.height-Math.max(bottom,8)-12-(compact ? 128 : 178),width:Math.max(1,root.width-32),height:compact ? 128 : 178 };
  const local = r => ({ x:r.x-root.x,y:r.y-root.y,width:r.width,height:r.height });
  return { from:local(start),to:local(end) };
}

export function assistantOpenGeometry(options) {
  const {from,to} = assistantReturnGeometry(options);
  return {from:to,to:from,direction:'open'};
}

// Each native window has its own origin (notably Android translucent modals).
// Save distances within the app, then project them into the full modal viewport.
export function assistantDockAnchor(rect, viewport) {
  if (!valid(rect) || !valid(viewport)) return rect;
  return {...rect,x:rect.x-viewport.x,y:rect.y-viewport.y,
    viewport:{width:viewport.width,height:viewport.height}};
}
