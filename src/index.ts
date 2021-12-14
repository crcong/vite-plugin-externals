import { TransformPluginContext } from 'rollup'
import type { Plugin, Alias } from 'vite'
import MagicString from 'magic-string'
import { init, parse } from 'es-module-lexer'
import { Parser } from 'acorn'
import * as ESTree from 'estree'
import { Externals, ExternalValue, Options } from './types'
import { isObject } from './utils'
import { ensureFile, writeFile, ensureDir, emptyDirSync } from 'fs-extra'
import path from 'path'

type Specifiers = (ESTree.ImportSpecifier | ESTree.ImportDefaultSpecifier | ESTree.ImportNamespaceSpecifier | ESTree.ExportSpecifier)[]
type TransformModuleNameFn = (externalValue: ExternalValue) => string

// constants
const ID_FILTER_REG = /\.(js|ts|vue|jsx|tsx)$/
const NODE_MODULES_FLAG = 'node_modules'
const CACHE_DIR = '.vite-plugin-externals'

export function viteExternalsPlugin(externals: Externals = {}, userOptions: Options = {}): Plugin {
  let isBuild = false

  const externalsKeys = Object.keys(externals)
  const isExternalEmpty = externalsKeys.length === 0
  const cachePath = path.join(process.cwd(), NODE_MODULES_FLAG, CACHE_DIR)

  const transformModuleName: TransformModuleNameFn = ((useWindow) => {
    return (externalValue: ExternalValue) => {
      if (useWindow === false) {
        return typeof externalValue === 'string' ? externalValue : externalValue.join('.')
      }
      if (typeof externalValue === 'string') {
        return `window['${externalValue}']`
      }
      const vals = externalValue.map((val) => `['${val}']`).join('')
      return `window${vals}`
    }
  })(userOptions.useWindow ?? true)

  return {
    name: 'vite-plugin-externals',
    async config(config, { mode, command }) {
      isBuild = command === 'build'

      if (mode !== 'development') {
        return
      }
      if (isExternalEmpty) {
        return
      }
      const newAlias: Alias[] = []
      const alias = config.resolve?.alias ?? {}
      if (isObject(alias)) {
        Object.keys(alias).forEach((aliasKey) => {
          newAlias.push({ find: aliasKey, replacement: (alias as Record<string, string>)[aliasKey] })
        })
      } else if (Array.isArray(alias)) {
        newAlias.push(...alias)
      }

      await ensureDir(cachePath)
      await emptyDirSync(cachePath)

      for await (const externalKey of externalsKeys) {
        const externalCachePath = path.join(cachePath, `${externalKey}.js`)
        newAlias.push({ find: new RegExp(`^${externalKey}$`), replacement: externalCachePath })
        await ensureFile(externalCachePath)
        await writeFile(
          externalCachePath,
          `module.exports = ${transformModuleName(externals[externalKey])};`,
        )
      }

      config.resolve = {
        ...(config.resolve ?? {}),
        alias: newAlias,
      }

      return config
    },
    async transform(code, id, options) {
      const ssr = compatSsrInOptions(options)
      if (!isNeedExternal.call(this, userOptions, code, id, isBuild, ssr)) {
        return
      }
      if (isBuild && id.includes(NODE_MODULES_FLAG)) {
        code = replaceRequires(code, externals, transformModuleName)
      }
      await init
      const [imports] = parse(code)
      let s: undefined | MagicString
      imports.forEach(({
        d: dynamic,
        n: dependence,
        ss: statementStart,
        se: statementEnd,
      }) => {
        // filter dynamic import
        if (dynamic !== -1) {
          return
        }

        if (!dependence) {
          return
        }

        const externalValue = externals[dependence]
        if (!externalValue) {
          return
        }

        s = s || (s = new MagicString(code))

        const raw = code.substring(statementStart, statementEnd)
        const ast = Parser.parse(raw, {
          ecmaVersion: 'latest',
          sourceType: 'module',
        }) as unknown as ESTree.Program
        const specifiers = (ast.body[0] as (ESTree.ImportDeclaration))?.specifiers
        if (!specifiers) {
          return
        }
        const newImportStr = replaceImports(specifiers, externalValue, transformModuleName)
        s.overwrite(statementStart, statementEnd, newImportStr)
      })
      if (!s) {
        return { code, map: null }
      }
      return {
        code: s.toString(),
        map: s.generateMap({
          source: id,
          includeContent: true,
          hires: true,
        }),
      }
    },
  }
}

function replaceRequires(
  code: string,
  externals: Externals,
  transformModuleName: TransformModuleNameFn,
) {
  // It's not a good method, but I feel it can cover most scenes
  return Object.keys(externals).reduce((code, externalKey) => {
    const r = new RegExp(`require\\((["'\`])\\s*${externalKey}\\s*(\\1)\\)`, 'g')
    return code.replace(r, transformModuleName(externals[externalKey]))
  }, code)
}

function replaceImports(
  specifiers: Specifiers,
  externalValue: ExternalValue,
  transformModuleName: TransformModuleNameFn,
) {
  return specifiers.reduce((s, specifier) => {
    const { local } = specifier
    if (specifier.type === 'ImportDefaultSpecifier') {
      /**
       * source code: import Vue from 'vue'
       * transformed: const Vue = window['Vue']
       */
      s += `const ${local.name} = ${transformModuleName(externalValue)}\n`
    } else if (specifier.type === 'ImportSpecifier') {
      /**
       * source code:
       * import { reactive, ref as r } from 'vue'
       * transformed:
       * const reactive = window['Vue'].reactive
       * const r = window['Vue'].ref
       */
      const { imported } = specifier
      s += `const ${local.name} = ${transformModuleName(externalValue)}.${imported.name}\n`
    } else if (specifier.type === 'ImportNamespaceSpecifier') {
      /**
       * source code: import * as vue from 'vue'
       * transformed: const vue = window['Vue']
       */
      s += `const ${local.name} = ${transformModuleName(externalValue)}\n`
    } else if (specifier.type === 'ExportSpecifier') {
      /**
       * Re-export default import as named export
       * source code: export { default as React } from 'react'
       * transformed: export const React = window['React']
       *
       * Re-export default import as default export
       * source code: export { default } from 'react'
       * transformed: export default = window['React']
       *
       * Re-export named import
       * source code: export { useState } from 'react'
       * transformed: export const useState = window['React'].useState
       *
       * Re-export named import as renamed export
       * source code: export { useState as useState2 } from 'react'
       * transformed: export const useState2 = window['React'].useState
       */
      const { exported } = specifier
      const value = `${transformModuleName(externalValue)}${local.name !== 'default' ? `.${local.name}` : ''}`
      if (exported.name === 'default') {
        s += `export default ${value}\n`
      } else {
        s += `export const ${exported.name} = ${value}\n`
      }
    }
    return s
  }, '')
}

function isNeedExternal(
  this: TransformPluginContext,
  options: Options,
  code: string,
  id: string,
  isBuild: boolean,
  ssr?: boolean,
): boolean {
  const {
    disableSsr = true,
    filter,
  } = options
  // filter ssr env
  if (disableSsr && ssr) {
    return false
  }

  if (typeof filter === 'function') {
    if (!filter.call(this, code, id, ssr)) {
      return false
    }
  } else {
    if (
      !ID_FILTER_REG.test(id) ||
      (id.includes(NODE_MODULES_FLAG) && !isBuild)
    ) {
      return false
    }
  }
  return true
}

function compatSsrInOptions(options: { ssr?: boolean } | undefined): boolean {
  if (typeof options === 'boolean') {
    return options
  }
  return options?.ssr ?? false
}
