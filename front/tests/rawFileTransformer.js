/**
 * Jest transformer that exports a file's raw content as its default export.
 * This emulates Parcel's `bundle-text:` scheme in the test environment,
 * so modules importing `bundle-text:.../*.txt` also work under Jest.
 */
const fs = require('fs');

module.exports = {
  process(_src, filename) {
    return {
      code: `module.exports = ${JSON.stringify(fs.readFileSync(filename, 'utf8'))};`,
    };
  },
};