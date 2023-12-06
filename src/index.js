const {
  join,
  resolve,
  relative,
  isAbsolute,
  dirname,
  basename
} = require('path');
const { declare } = require('@babel/helper-plugin-utils');
const { types: t } = require('@babel/core');
const fs = require('fs');
const template = require('lodash.template');
const some = require('lodash.some');
const findUp = require('find-up');
const escapeStringRegexp = require('escape-string-regexp');
const requireJSON5 = require('require-json5');

const REQUIRE = 'require';

const DEFAULT_CONFIG_NAMES = [
  'alias.config.js',
  'app.config.js',
  'tsconfig.json',
  'jsconfig.json',
  'webpack.config.js',
  'webpack.config.babel.js'
];

function fileExists(path) {
  try {
    return !fs.accessSync(path, fs.F_OK);
  } catch (e) {
    return false;
  }
}

function getConfigPath(filename, configPaths, findConfig) {
  let conf = null;

  // Try all config paths and return for the first found one
  some(configPaths, configPath => {
    if (!configPath) return false;

    // Compile config using environment variables
    const compiledConfigPath = template(configPath)(process.env);

    let resolvedConfigPath;
    if (!findConfig) {
      // Get webpack config
      resolvedConfigPath = resolve(process.cwd(), compiledConfigPath);
    } else {
      resolvedConfigPath = findUp.sync(compiledConfigPath, {
        cwd: dirname(filename),
        type: 'file'
      });
    }

    if (resolvedConfigPath && fileExists(resolvedConfigPath)) {
      conf = resolvedConfigPath;
    }

    return conf;
  }, false);

  return conf;
}

const cached = {};

/**
 *
 * @param {string} filename
 * @param {string} source
 * @param {{
 *   configPath?: string,
 *   findConfig?: boolean,
 *   noOutputExtension?: boolean,
 * }} options
 * @returns
 */
function resolveAlias(filename, source, {
  configPath = '',
  findConfig = false,
  noOutputExtension = false
} = {}) {
  const configPaths = configPath
    ? [configPath, ...DEFAULT_CONFIG_NAMES]
    : DEFAULT_CONFIG_NAMES;

  // Get webpack config
  const confPath = getConfigPath(filename, configPaths, findConfig);

  // If the config comes back as null, we didn't find it, so throw an exception.
  if (!confPath) return;

  // Because of babel-register, babel is actually run on webpack config files using themselves
  // as config, leading to odd errors
  if (filename === resolve(confPath)) return;

  const isTsconfig = /[jt]sconfig.json$/.test(confPath);
  let aliasConf;
  let extensionsConf;
  let cwd;
  let aliases;

  let cache = cached[confPath];
  if (cache) {
    if (!cache.conf) return;
    if (cache.error) throw cache.error;

    // eslint-disable-next-line
    aliasConf = cache.aliasConf;
    // eslint-disable-next-line
    extensionsConf = cache.extensionsConf;
    // eslint-disable-next-line
    cwd = cache.cwd;
    // eslint-disable-next-line
    aliases = cache.aliases;
  } else {
  // Require the config
    let conf = isTsconfig ? requireJSON5(confPath) : require(confPath);

    // if the object is empty, we might be in a dependency of the config - bail without warning
    if (!Object.keys(conf).length) {
      return;
    }

    cwd = dirname(confPath);

    cache = { conf, cwd };
    cached[confPath] = cache;

    // In the case the webpack config is an es6 config, we need to get the default
    // eslint-disable-next-line
    if (conf && conf.__esModule && conf.default) {
      conf = conf.default;
    }


    if (isTsconfig) {
      aliasConf = conf.compilerOptions && conf.compilerOptions.paths;
      const baseUrl = (conf.compilerOptions && conf.compilerOptions.baseUrl) || '.';
      if (aliasConf) {
        const tsconfigRegx = /(.*[^/*])(\/\*)?$/;
        aliasConf = Object.keys(aliasConf).reduce((p, key) => {
          const [, name, nameSuffix] = key.match(tsconfigRegx) || [];
          if (!name) return p;

          let aliasValue = aliasConf[key];
          if (Array.isArray(aliasValue)) aliasValue = aliasValue[0] || '';

          const [, value = '', valueSuffix = ''] = aliasValue.match(tsconfigRegx) || [];
          p[`${name}${nameSuffix && valueSuffix ? '' : '$'}`] = resolve(cwd, baseUrl, value);

          return p;
        }, {});
      }
      cache.extensionsConf = null;
    } else if (Array.isArray(conf)) { // Get the webpack alias config
      // the exported webpack config is an array ...
      // (i.e., the project is using webpack's multicompile feature) ...
      // reduce the configs to a single alias object
      aliasConf = conf.reduce((prev, curr) => {
        const next = Object.assign({}, prev);
        const alias = curr.alias || (curr.resolve && curr.resolve.alias);
        if (alias) {
          Object.assign(next, alias);
        }
        return next;
      }, {});

      // reduce the configs to a single extensions array
      extensionsConf = conf.reduce((prev, curr) => {
        const next = [].concat(prev);
        const extensions = curr.extensions
        || (curr.resolve && curr.resolve.extensions)
        || [];
        if (extensions.length) {
          extensions.forEach(ext => {
            if (next.indexOf(ext) === -1) {
              next.push(ext);
            }
          });
        }
        return next;
      }, []);

      if (!extensionsConf.length) {
        extensionsConf = null;
      }
    } else {
      // the exported webpack config is a single object...

      // use it's resolve.alias property
      aliasConf = conf.alias || (conf.resolve && conf.resolve.alias);

      // use it's resolve.extensions property, if available
      extensionsConf = conf.extensions
      || (conf.resolve && conf.resolve.extensions)
      || [];
      if (!extensionsConf) extensionsConf = null;
    }

    aliases = aliasConf ? Object.keys(aliasConf) : [];

    cache.aliases = aliases;
    cache.aliasConf = aliasConf;
    cache.extensionsConf = extensionsConf;
  }

  for (let alias of aliases) {
    let aliasDestination = aliasConf[alias];
    const isFull = /\$$/.test(alias);
    if (isFull) alias = alias.substr(0, alias.length - 1);
    const regex = new RegExp(`^${escapeStringRegexp(alias)}${isFull ? '$' : '(\/|$)'}`);

    if (regex.test(source)) {
    // notModuleRegExp from https://github.com/webpack/enhanced-resolve/blob/master/lib/Resolver.js
      const notModuleRegExp = /^\.$|^\.[\\\/]|^\.\.$|^\.\.[\/\\]|^\/|^[A-Z]:[\\\/]/i;
      const isModule = !notModuleRegExp.test(aliasDestination);

      if (isModule) {
        return source.replace(alias, aliasDestination);
      }

      if (!isAbsolute(aliasDestination)) {
        aliasDestination = join(cwd, aliasDestination);
      }

      let relativeFilePath = relative(
        dirname(filename),
        aliasDestination
      );

      // In case the file path is the root of the alias, need to put a dot to avoid having an absolute path
      if (relativeFilePath.length === 0) relativeFilePath = '.';

      let requiredFilePath = source.replace(alias, relativeFilePath);

      // If the file is requiring the current directory which is the alias, add an extra slash
      if (requiredFilePath === '.') requiredFilePath = './';

      // In the case of a file requiring a child directory of the current directory, we need to add a dot slash
      if (['.', '/'].indexOf(requiredFilePath[0]) === -1) {
        requiredFilePath = `./${requiredFilePath}`;
      }

      // TODO: should honor enforceExtension and then use extensionConf to make sure extension
      // In case the extension option is passed
      if (extensionsConf && !noOutputExtension) {
      // Get an absolute path to the file
        const absoluteRequire = join(aliasDestination, basename(source));

        let extension = null;
        some(extensionsConf, ext => {
          if (!ext) return false;

          // If the file with this extension exists set it
          if (fileExists(absoluteRequire + ext)) {
            extension = ext;
          }

          return extension;
        }, false);

        // Set the extension to the file path, or keep the original one
        requiredFilePath += extension || '';
      }

      return requiredFilePath.replace(/\\/g, '/');
    }
  }
}

const plugin = declare(api => {
  api.assertVersion(7);

  return {
    name: 'babel-plugin-alias-config',
    visitor: {
      ImportDeclaration(path, state) {
        const {
          filename, opts: {
            config: configPath = '',
            findConfig: findConfig = false,
            noOutputExtension = false
          } = {}
        } = state;
        const { node } = path;

        const filePath = node.source.value;
        const newFilename = resolveAlias(filename, filePath, {
          configPath, findConfig, noOutputExtension
        });
        if (newFilename) node.source = t.StringLiteral(newFilename);
      },
      CallExpression(
        path,
        {
          file: {
            opts: { filename }
          },
          opts: {
            config: configPath = '',
            findConfig: findConfig = false,
            noOutputExtension = false,
            dynamicImport = true
          } = {}
        }
      ) {
        const { arguments: nodeArguments } = path.node;

        // If not a require statement do nothing
        if (t.isIdentifier(path.node.callee, { name: REQUIRE })
         || (dynamicImport && path.node.callee.type === 'Import')) {
          // Make sure required value is a string
          if (
            nodeArguments.length === 0
          || !t.isStringLiteral(nodeArguments[0])
          ) {
            return;
          }

          const [{ value: filePath }] = nodeArguments;
          const newFilename = resolveAlias(filename, filePath, {
            configPath, findConfig, noOutputExtension
          });
          if (newFilename) path.node.arguments = [t.StringLiteral(newFilename)];
        }
      }
    }
  };
});

module.exports = plugin;
module.exports.resolveAlias = resolveAlias;
