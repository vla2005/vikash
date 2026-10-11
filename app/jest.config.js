module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.native-mocks.js'],
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|phosphor-react-native)/)',
  ],
};
