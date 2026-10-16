// Metro prioritizes TSX over JSX for directory entry points.
// Reuse the web renderer instead of loading Skia/CanvasKit in the browser.
export { default } from './index.web.jsx';
export * from './index.web.jsx';
