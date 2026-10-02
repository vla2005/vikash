import React from 'react';

export function SafeAreaProvider({ children }) { return <>{children}</>; }
export function useSafeAreaInsets() { return { top: 0, bottom: 0, left: 0, right: 0 }; }
