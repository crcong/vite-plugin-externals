# vite-plugin-externals

English | [简体中文](README.zh-CN.md)

use to external resources, like webpack externals, but only use in browser now.

Can be used in `production` mode without other `rollup` configuration.

but it will not take effect by default in `commonjs`, such as `ssr`.

## Usage

```bash
npm i vite-plugin-externals -D
```

Add it to `vite.config.js`

```js
// vite.config.js
import { viteExternalsPlugin } from 'vite-plugin-externals'

export default {
  plugins: [
    viteExternalsPlugin({
      vue: 'Vue',
      react: 'React',
      'react-dom': 'ReactDOM',
    }),
  ]
}
```
## How to work

transform source code of js file.

```js
// configuration
viteExternalsPlugin({
  vue: 'Vue',
}),
// source code
import Vue from 'vue'
// transformed
const Vue = window['Vue']

// source code
import { reactive, ref as r } from 'vue'
// transformed
const reactive = window['Vue'].reactive
const r = window['Vue'].ref
```

**Warning**: please use the plugin after converting to JS code, because the plugin only transform JS code. Eg.

```js
import vue from '@vitejs/plugin-vue'

export default {
  plugins: [
    vue(), // @vitejs/plugin-vue will transofrm SFC to JS code

    // It should be under @vitejs/plugin-vue
    viteExternalsPlugin({
      vue: 'Vue',
    }),
  ]
}
```

## Configuration

### filter

The files in `node_modules` are filtered by default, and only transform js/ts/vue/jsx/tsx file.

You can specify the `filter` function. Return `true` will be transform to external.

```js
viteExternalsPlugin({
  vue: 'Vue',
}, {
  filter(code, id, ssr) {
    // your code
    return false
  }
}),
```

### useWindow

set `false`, the `window` prefix will not be added.

**Warning**: If your module name has special characters, such as `/`, set useWindow option `false`, will throw error.

```js
viteExternalsPlugin({
  vue: 'Vue',
}, { useWindow: false }),

// source code
import Vue from 'vue'
// transformed, no `const Vue = window['Vue']`
const Vue = Vue
```
