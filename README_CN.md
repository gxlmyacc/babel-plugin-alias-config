# babel-plugin-alias-config

> 这是一个 Babel 插件，允许你在 Babel 中使用来自别名配置文件的 webpack resolve aliases。

**English Version**: [README.md](./README.md)

## ✨ 特性

- 🚀 支持 Babel 7
- 🔧 自动检测多种配置文件格式
- 📁 支持相对路径和绝对路径别名
- 🎯 支持动态导入 (dynamic import)
- ⚡ 智能配置文件查找
- 🔄 支持多种配置文件格式

## 📦 安装

```bash
npm install --save-dev babel-plugin-alias-config
```

或者使用 yarn：

```bash
yarn add -D babel-plugin-alias-config
```

## 🚀 快速开始

### 1. 创建别名配置文件

你可以使用以下几种配置文件格式之一：

#### 方式一：alias.config.js
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

#### 方式二：webpack.config.js
```js
const path = require('path');

module.exports = {
  // ... 其他配置
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
    }
  }
};
```

#### 方式三：jsconfig.json (推荐用于 VS Code)
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

#### 方式四：tsconfig.json
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

### 2. 配置 Babel

在你的 `.babelrc` 或 `babel.config.js` 中添加插件：

```json
{
  "plugins": [
    "babel-plugin-alias-config"
  ]
}
```

或者使用 babel.config.js：

```js
module.exports = {
  plugins: [
    'babel-plugin-alias-config'
  ]
};
```

### 3. 在代码中使用别名

```js
// 使用 require
const utils = require('@utils/helper');
const component = require('@components/Button');

// 使用 import
import utils from '@utils/helper';
import Button from '@components/Button';

// 使用动态导入
const module = await import('@components/Modal');
```

## ⚙️ 配置选项

### 基本配置

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

### 选项详解

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `config` | string | `''` | 指定别名配置文件的路径 |
| `findConfig` | boolean | `false` | 是否自动从当前编译文件位置向上查找最近的别名配置文件以应用别名。|
| `noOutputExtension` | boolean | `false` | 转换后的文件路径是否包含扩展名，这在转义前后的扩展名不相同时可能会用到（比如`.ts` -> `.js`）|
| `dynamicImport` | boolean | `true` | 是否处理 webpack 中的动态导入语法 |

注：
一个项目中可以有多个别名配置文件，比如：
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

可以通过不同目录创建不同的别名配置文件来达到在一个构建项目中实现类似monorepo项目管理的功能。

### 高级配置示例

#### 环境特定配置
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

#### 自动配置文件查找
```js
{
  "plugins": [
    ["babel-plugin-alias-config", {
      "findConfig": true
    }]
  ]
}
```

当设置 `findConfig: true` 时，插件会从当前编译文件的位置开始，向上逐级查找最近的别名配置文件。这对于在复杂的项目结构中自动定位配置文件非常有用。

## 📁 支持的文件格式

插件会自动查找以下配置文件（按优先级排序）：

1. `alias.config.js`
2. `app.config.js`
3. `tsconfig.json`
4. `jsconfig.json`
5. `webpack.config.js`
6. `webpack.config.babel.js`

## 🔍 工作原理

1. **配置文件检测**：插件会从当前编译文件开始，向上逐级查找最近的别名配置文件
2. **别名解析**：解析配置文件中的别名配置
3. **路径转换**：将代码中的别名引用转换为实际的文件路径
4. **输出生成**：生成转换后的代码

**注意**：当使用 `findConfig: true` 选项时，插件会智能地从当前编译文件的目录开始，逐级向上搜索父目录，直到找到第一个匹配的配置文件为止。

## 📝 使用示例

### 转换前
```js
import Button from '@/components/Button';
import { formatDate } from '@utils/date';
const Modal = require('@components/Modal');
```

### 转换后
```js
import Button from '/absolute/path/to/src/components/Button';
import { formatDate } from '/absolute/path/to/src/utils/date';
const Modal = require('/absolute/path/to/src/components/Modal');
```

## 🚨 注意事项

### 1. 与 require-extension-hooks 的兼容性

如果使用 [require-extension-hooks](https://github.com/jackmellis/require-extension-hooks)，需要将 webpack 配置文件添加到 hooks 的 `excludePattern` 中，否则 webpack 配置将始终被作为空对象加载。

```js
const hooks = require('require-extension-hooks');

hooks('js').excludePattern = /webpack\.config\.js$/;
```

### 2. 文件扩展名处理

- 默认情况下，插件会保留文件扩展名
- 设置 `noOutputExtension: true` 可以移除扩展名
- 建议在配置文件中明确指定 `extensions` 数组

### 3. 路径解析

- 支持相对路径和绝对路径
- 相对路径会相对于配置文件所在目录解析
- 绝对路径会直接使用

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License



