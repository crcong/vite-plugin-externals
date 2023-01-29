# vite-plugin-externals

<p>
  <a href="https://www.npmjs.com/package/vite-plugin-externals" target="_blank">
    <img alt="NPM package" src="https://img.shields.io/npm/v/vite-plugin-externals.svg?style=flat">
  </a>
  <a href="https://www.npmjs.com/package/vite-plugin-externals" target="_blank">
    <img alt="downloads" src="https://img.shields.io/npm/dt/vite-plugin-externals.svg?style=flat">
  </a>
  <a href="https://github.com/vitejs/awesome-vite#helpers" target="_blank">
    <img src="https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg" alt="Awesome">
  </a>
</p>

[English](README.md) | 简体中文

使用外部库，类似webpack的externals，但现在只支持浏览器环境。

可以不另外配置 `rollup` 的选项，就可以使用在生产环境。

但是在默认配置下在 `commonjs` 环境中不生效，例如 `ssr`。

## 用法

```bash
npm i vite-plugin-externals -D
```

增加配置在 `vite.config.js`

```js
// vite.config.js
import { viteExternalsPlugin } from 'vite-plugin-externals'

export default {
  plugins: [
    viteExternalsPlugin({
      vue: 'Vue',
      react: 'React',
      'react-dom': 'ReactDOM',
      // 支持值链式取值，会转换成 window['React']['lazy']
      lazy: ['React', 'lazy']
    }),
  ]
}
```

**警告**: 如果你在开发环境中，引入了生产环境的库, 可能会使得 `HMR` 失败。

你也可以使用 `disableInServe: true` 避免在 serve 模式中转换。

例如：
```html
<!-- 可能会使 HMR 失败 -->
<script src="./vue.global.prod.js"></script>

<!-- 这样不会 -->
<script src="./vue.global.js"></script>
```

## 原理

转换js的源代码。

```js
// 选项
viteExternalsPlugin({
  vue: 'Vue',
}),
// 源代码
import Vue from 'vue'
// 转换后
const Vue = window['Vue']

// 源代码
import { reactive, ref as r } from 'vue'
// 转换后
const reactive = window['Vue'].reactive
const r = window['Vue'].ref

// 源代码
import * as vue from 'vue'
// 转换后
const vue = window['Vue']

// 源代码
export { useState as _useState } from 'react'
// 转换后
export const _useState = window['React'].useState
```

**注意**: 请使用该插件前，需要把代码转换成js，因为此插件只能解析js代码，例如：

```js
import vue from '@vitejs/plugin-vue'

export default {
  plugins: [
    vue(), // @vitejs/plugin-vue 将会把SFC的代码转换成js代码

    // 所以这插件要放在@vitejs/plugin-vue的下面
    viteExternalsPlugin({
      vue: 'Vue',
    }),
  ]
}
```

如果出现异常报错，可以查看是否因为插件顺序引起的报错。

## 配置选项

### disableInServe

在 `serve` 模式中禁止转换 `external` 代码。

```js
viteExternalsPlugin({
  vue: 'Vue',
}, { disableInServe: true })
```

### enforce

vite 插件顺序。 解决由于 vite 插件顺序引起的异常。 例如 [#21](https://github.com/crcong/vite-plugin-externals/issues/21).

详细可以查看 [https://vitejs.dev/guide/api-plugin.html#plugin-ordering](https://vitejs.dev/guide/api-plugin.html#plugin-ordering) 。

### filter

此插件会默认过滤 `node_modules` 下的文件，只转换 js/ts/vue/jsx/tsx 文件。

你可以指定 `filter` 函数，返回 `true` 将会进行转换成外部变量。

```js
viteExternalsPlugin({
  vue: 'Vue',
}, {
  filter(code, id, ssr) {
    // 你的代码
    return false
  }
}),
```

### useWindow

默认为 `true` , 设置 `false` , `window` 的作用域将不会加上。

**注意**: 如果模块名有特殊字符，例如 `/`，设置useWindow选项 `false` 将引发错误。

```js
viteExternalsPlugin({
  vue: 'Vue',
}, { useWindow: false }),

// 源代码
import Vue from 'vue'
// 转换后, 不是 `const Vue = window['Vue']`
const Vue = Vue
```

### sourceMapOptions

转换后代码sourceMap的配置项，库是 `magic-string` 。
