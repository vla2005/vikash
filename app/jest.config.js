module.exports = {
  preset: '@react-native/jest-preset',
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|phosphor-react-native)/)',
  ],
};
