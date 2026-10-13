import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DockContext } from '../../contexts/DockContext';

export default function DockProvider({
  sceneKey,
  bottomInset = 0,
  headerHeight = 0,
  children,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const blurTarget = useRef(null);
  useEffect(() => {
    setCollapsed(false);
  }, [sceneKey]);
  const value = useMemo(
    () => ({
      collapsed,
      blurTarget,
      bottomInset,
      headerHeight,
      setCollapsed,
      expand: () => setCollapsed(false),
    }),
    [collapsed, bottomInset, headerHeight],
  );
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}
