# babel-plugin-alias-config

> A Babel plugin that allows you to use webpack resolve aliases from alias configs in Babel.

**中文版本**: [README_CN.md](./README_CN.md)


## ✨ Features

- 🚀 Babel 7 support
- 🔧 Auto-detect multiple config file formats
- 📁 Support for relative and absolute path aliases
- 🎯 Dynamic import support
- ⚡ Smart config file discovery
- 🔄 Multiple config file format support

## 📦 Installation

```bash
npm install --save-dev babel-plugin-alias-config
```

Or using yarn:

```bash
yarn add -D babel-plugin-alias-config
```

## 🚀 Quick Start

### 1. Create Alias Configuration File

You can use one of the following configuration file formats:

#### Option 1: alias.config.js
```js
const path = require('path');

module.exports = {
  alias: {
    '@': path.resolve(__dirname, 'src'),
    '@components': path.resolve(__dirname, 'src/components'),
    '@utils': path.resolve(__dirname, 'src/utils'),
    '@assets': path.resolve(__dirname, 'src/assets'),
  },
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
};
```

#### Option 2: webpack.config.js
```js
const path = require('path');

module.exports = {
  // ... other config
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
    }
  }
};
```

#### Option 3: jsconfig.json (Recommended for VS Code)
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

#### Option 4: tsconfig.json
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"]
    }
  }
}
```

### 2. Configure Babel

Add the plugin to your `.babelrc` or `babel.config.js`:

```json
{
  "plugins": [
    "babel-plugin-alias-config"
  ]
}
```

Or using babel.config.js:

```js
module.exports = {
  plugins: [
    'babel-plugin-alias-config'
  ]
};
```

### 3. Use Aliases in Your Code

```js
// Using require
const utils = require('@utils/helper');
const component = require('@components/Button');

// Using import
import utils from '@utils/helper';
import Button from '@components/Button';

// Using dynamic import
const module = await import('@components/Modal');
```

## ⚙️ Configuration Options

### Basic Configuration

```js
{
  "plugins": [
    ["babel-plugin-alias-config", {
      "config": "./configs/webpack.config.js",
      "findConfig": false,
      "noOutputExtension": false,
      "dynamicImport": true
    }]
  ]
}
```

### Option Details

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `config` | string | `''` | Path to the alias configuration file |
| `findConfig` | boolean | `false` | Whether to automatically search upward from the current compiled file location to find the nearest alias configuration file to apply aliases |
| `noOutputExtension` | boolean | `false` | Whether the converted file path includes an extension |
| `dynamicImport` | boolean | `true` | Whether to handle webpack's dynamic import syntax |

### Advanced Configuration Examples

#### Environment-Specific Configuration
```js
module.exports = {
  plugins: [
    'babel-plugin-alias-config'
  ],
  env: {
    development: {
      plugins: [
        ['babel-plugin-alias-config', {
          config: './configs/webpack.dev.js'
        }]
      ]
    },
    production: {
      plugins: [
        ['babel-plugin-alias-config', {
          config: './configs/webpack.prod.js'
        }]
      ]
    },
    test: {
      plugins: [
        ['babel-plugin-alias-config', {
          config: './configs/webpack.test.js'
        }]
      ]
    }
  }
};
```

#### Auto Config File Discovery
```js
{
  "plugins": [
    ["babel-plugin-alias-config", {
      "findConfig": true
    }]
  ]
}
```

When setting `findConfig: true`, the plugin will search upward from the current compiled file location to find the nearest alias configuration file to apply aliases. This is very useful for automatically locating configuration files in complex project structures.

**Note**: A project can have multiple alias configuration files, for example:
```
src/
├── packages/
│   ├── project1/
│   │   ├── index.js
│   │   ├── alias.config.js
│   │   └── jsconfig.json
│   ├── project2/
│   │   ├── index.js
│   │   ├── alias.config.js
│   │   └── jsconfig.json
│   └── projectN/
│       ├── index.js
│       ├── alias.config.js
│       └── jsconfig.json
├── alias.config.js
├── jsconfig.json
```

You can create different alias configuration files in different directories to achieve similar monorepo project management functionality within a single build project.

## 📁 Supported File Formats

The plugin automatically searches for the following configuration files (in order of priority):

1. `alias.config.js`
2. `app.config.js`
3. `tsconfig.json`
4. `jsconfig.json`
5. `webpack.config.js`
6. `webpack.config.babel.js`

## 🔍 How It Works

1. **Config File Detection**: The plugin searches upward from the current compiled file to find the nearest alias configuration file
2. **Alias Resolution**: Parses the alias configuration from the config file
3. **Path Transformation**: Converts alias references in code to actual file paths
4. **Output Generation**: Generates the transformed code

**Note**: When using the `findConfig: true` option, the plugin intelligently searches upward from the current compiled file's directory, level by level through parent directories, until it finds the first matching configuration file.

## 📝 Usage Examples

### Before Transformation
```js
import Button from '@/components/Button';
import { formatDate } from '@utils/date';
const Modal = require('@components/Modal');
```

### After Transformation
```js
import Button from '/absolute/path/to/src/components/Button';
import { formatDate } from '/absolute/path/to/src/utils/date';
const Modal = require('/absolute/path/to/src/components/Modal');
```

## 🚨 Important Notes

### 1. Compatibility with require-extension-hooks

If using [require-extension-hooks](https://github.com/jackmellis/require-extension-hooks), you need to add your webpack config file to the hooks' `excludePattern`, otherwise the webpack config will always be required as empty.

```js
const hooks = require('require-extension-hooks');

hooks('js').excludePattern = /webpack\.config\.js$/;
```

### 2. File Extension Handling

- By default, the plugin preserves file extensions
- Set `noOutputExtension: true` to remove extensions
- It's recommended to explicitly specify the `extensions` array in your config file

### 3. Path Resolution

- Supports both relative and absolute paths
- Relative paths are resolved relative to the config file's directory
- Absolute paths are used directly

## 🤝 Contributing

Issues and Pull Requests are welcome!

## 📄 License

MIT License

---

