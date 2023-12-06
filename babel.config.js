// const path = require('path');

module.exports = {
  plugins: [
    // [path.resolve('./src/index.js'), { findConfig: true, noOutputExtension: true }],
    '@babel/plugin-transform-strict-mode',
    '@babel/plugin-transform-parameters',
    '@babel/plugin-transform-destructuring',
    '@babel/plugin-transform-modules-commonjs',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-transform-spread',
    '@babel/plugin-proposal-export-default-from',
    '@babel/plugin-proposal-export-namespace-from'
  ]
};
