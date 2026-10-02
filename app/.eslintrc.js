module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [{ files: ['**/*.test.js', '**/*.test.jsx'], env: { jest: true } }],
};
