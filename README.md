#   babel-plugin-alias-config

> This Babel 7 plugin allows you to use webpack resolve aliases from alias configs in Babel.

## Example

`alias.config.js`
```js
var path = require('path');
...

module.exports = {
  ...
  alias: {
    '@libs': path.join(__dirname, '/myLibs/')
  }
  ...
};

```
or `webpack.config.js`
```js
var path = require('path');
...

module.exports = {
    ...
    resolve: {
        ...
        alias: {
            '@libs': path.join(__dirname, '/myLibs/')
        }
    }
    ...
};

```

Code:
```js
    const myLib = require('@libs/myLib');
```
Transpiles to:
```js
    const myLib = require('/myLibs/myLib');
```

## Installation
```console
    $ npm install --save-dev babel-plugin-alias-config
```

Add the plugin to your `.babelrc`.  Optionally, add a path to a webpack config file, otherwise the plugin will look for `alias.config.js` or `app.config.js` or `tsconfig.json` or `jsconfig.json` or `webpack.config.js` in the root where the build was run.  Setting the config option will transform all alias destinations to be relative to the custom config.

```json
    {
        "plugins": [
            "@babel/plugin-transform-strict-mode",
            "@babel/plugin-transform-parameters",
            "@babel/plugin-transform-destructuring",
            "@babel/plugin-transform-modules-commonjs",
            "@babel/plugin-proposal-object-rest-spread",
            "@babel/plugin-transform-spread",
            "@babel/plugin-proposal-export-default-from",
            "@babel/plugin-proposal-export-namespace-from"
        ],
        "env": {
            "test": {
                "plugins": [
                    [ "babel-plugin-alias-config", { "config": "./configs/webpack.config.test.js" } ]
                ]
            }
        }
    }
```
In this example, the plugin will only be run when `NODE_ENV` is set to `test`.

## Notes

- If using this plugin with [require-extension-hooks](https://github.com/jackmellis/require-extension-hooks) you'll need to add your webpack file to _hooks'_ [excludePattern](https://github.com/jackmellis/require-extension-hooks#excludepattern--fn) - otherwise the webpack config will always be required as empty.
