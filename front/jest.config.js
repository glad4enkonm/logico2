module.exports = {
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
    '\\.txt$': '<rootDir>/tests/rawFileTransformer.js'
  },
  moduleNameMapper: {
    // Strip Parcel's `bundle-text:` scheme so the underlying .txt file is
    // resolved and transformed by tests/rawFileTransformer.js (raw import)
    '^(bundle-text:)(.*)$': '$2',
    '\\.(css|less)$': 'identity-obj-proxy'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@antv/g6|d3-interpolate|d3-color))'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom'
};