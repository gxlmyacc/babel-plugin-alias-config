import { declare } from "@babel/helper-plugin-utils";
import { types as t } from "@babel/core";
import { join, resolve, relative, isAbsolute, dirname } from "path";
import fs from "fs";
import isEmpty from "lodash.isempty";

const PLUGIN_KEY = "webpack alias config";
const REQUIRE = "require";
const DEFAULT_CONFIG_NAMES = [
  "alias.config.js",
  "webpack.config.js",
  "app.config.js"
];

let configPath;
let aliasConfig = {};
let aliases;

const fileExists = path => {
  try {
    return !fs.accessSync(path, fs.F_OK);
  } catch (e) {
    return false;
  }
};

const getConfigPath = configPaths => {
  let conf = null;

  // Try all config paths and return for the first found one
  configPaths.some(configPath => {
    const resolvedConfigPath = resolve(process.cwd(), configPath);

    if (resolvedConfigPath && fileExists(resolvedConfigPath)) {
      conf = resolvedConfigPath;
    }

    return conf;
  });

  return conf;
};

export default declare(api => {
  api.assertVersion(7);

  return {
    name: "webpack alias",
    pre(state) {
      const {
        opts: { plugins }
      } = state;

      const plugin = plugins.find(plugin => plugin.key === PLUGIN_KEY);
      const {
        options: { config }
      } = plugin;
      const configPaths =
        typeof config === "string"
          ? [config, ...DEFAULT_CONFIG_NAMES]
          : DEFAULT_CONFIG_NAMES;
      const configFn = typeof config === "function" ? config : null;

      // Get webpack config
      configPath = getConfigPath(configPaths);

      // If the config comes back as null, we didn't find it, so throw an exception.
      if (!configPath) {
        throw new Error(
          `Cannot find any of these configuration files: ${configPaths.join(
            ", "
          )}`
        );
      }

      // Require the config
      aliasConfig = require(configPath);

      if (Array.isArray(aliasConfig)) {
        // Uses webpacks multi-compiler option
        aliasConfig = aliasConfig.reduce((previous, current) => {
          const next = Object.assign({}, previous);
          const alias =
            current.alias || (current.resolve && current.resolve.alias);
          if (alias) {
            Object.assign(next, current.resolve.alias);
          }
          return next;
        }, {});
      } else if (!isEmpty(aliasConfig.resolve)) {
        aliasConfig = aliasConfig.resolve.alias;
      }

      // Exit if there's no alias config
      if (!configFn && isEmpty(aliasConfig)) {
        throw new Error(
          `The webpack config file at — ${configPath} — does not contain an alias configuration`
        );
      }

      aliases = Object.keys(aliasConfig);
    },
    visitor: {
      CallExpression(path, state) {
        const { arguments: nodeArguments } = path.node;
        const { filename = "" } = state;

        // Prevent @babel/register from running babel to run on the webpack config
        if (filename === resolve(configPath)) {
          return;
        }

        // If not a require statement do nothing
        if (!t.isIdentifier(path.node.callee, { name: REQUIRE })) {
          return;
        }

        // Make sure required value is a string
        if (
          nodeArguments.length === 0 ||
          !t.isStringLiteral(nodeArguments[0])
        ) {
          return;
        }

        // Get the path of the StringLiteral
        const [{ value: filePath }] = nodeArguments;

        const updateModule = aliasDestination => {
          // notModuleRegExp from https://github.com/webpack/enhanced-resolve/blob/master/lib/Resolver.js
          const notModuleRegExp = /^\.$|^\.[\\\/]|^\.\.$|^\.\.[\/\\]|^\/|^[A-Z]:[\\\/]/i;
          const isModule = !notModuleRegExp.test(aliasDestination);

          if (isModule) {
            path.node.arguments = [t.StringLiteral(aliasDestination)];
            return true;
          }

          // If the filepath is not absolute, make it absolute
          if (!isAbsolute(aliasDestination)) {
            aliasDestination = join(process.cwd(), aliasDestination);
          }
          let relativeFilePath = relative(dirname(filename), aliasDestination);

          // In case the file path is the root of the alias, need to put a dot to avoid having an absolute path
          if (relativeFilePath.length === 0) {
            relativeFilePath = ".";
          }

          let requiredFilePath = filePath.replace(alias, relativeFilePath);

          // If the file is requiring the current directory which is the alias, add an extra slash
          if (requiredFilePath === ".") {
            requiredFilePath = "./";
          }

          // In the case of a file requiring a child directory of the current directory, we need to add a dot slash
          if ([".", "/"].indexOf(requiredFilePath[0]) === -1) {
            requiredFilePath = `./${requiredFilePath}`;
          }

          // TODO: should honor enforceExtension and then use extensionConf to make sure extension

          path.node.arguments = [t.StringLiteral(requiredFilePath)];
          return true;
        };

        if (configFn) {
          let aliasDestination = configFn(filePath);
          if (aliasDestination) updateModule(aliasDestination);
          return;
        }

        for (const alias of aliases) {
          let aliasDestination = aliasConfig[alias];
          const regex = new RegExp(`^${alias}(\/|$)`);
          if (regex.test(filePath) && updateModule(aliasDestination)) return;
        }
      }
    }
  };
});
