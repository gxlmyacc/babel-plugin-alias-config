const path = require('path');

module.exports = {
  alias: {
    '@': path.resolve(__dirname, '../src'),
  },
  extensions: ['.css', '.scss', '.less', '.js', '.json', '.jsx'],
};
