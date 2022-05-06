import { TransformPluginContext } from 'rollup'
import type { Alias, Plugin } from 'vite'
import MagicString from 'magic-string'
import { init, parse } from 'es-module-lexer'
import { Parser } from 'acorn'
import { Externals, Options, TransformModuleNameFn, UserOptions } from './types'
import { isObject } from './utils'
import { emptyDirSync, ensureDir, ensureFile, writeFile } from 'fs-extra'
import path from 'path'
import { resolveOptions } from './options'
import { CACHE_DIR, NODE_MODULES_FLAG } from './constant'
import * as ESTree from 'estree'
import { replaceImports, replaceRequires } from './replace'

export function viteExternalsPlugin(externals: Externals = {}, userOptions: UserOptions = {}): Plugin {
  let isBuild = false

  const options = resolveOptions(userOptions)
  const externalsKeys = Object.keys(externals)
  const isExternalEmpty = externalsKeys.length === 0
  const cachePath = path.join(process.cwd(), NODE_MODULES_FLAG, CACHE_DIR)

  const transformModuleName: TransformModuleNameFn = (externalValue) => {
    const { useWindow } = options
    if (useWindow === false) {
      return typeof externalValue === 'string' ? externalValue : externalValue.join('.')
    }
    if (typeof externalValue === 'string') {
      return `window['${externalValue}']`
    }
    const values = externalValue.map((val) => `['${val}']`).join('')
    return `window${values}`
  }

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
    async transform(code, id, _options) {
      const ssr = compatSsrInOptions(_options)
      if (!isNeedExternal.call(this, options, code, id, isBuild, ssr)) {
        return
      }
      let s: undefined | MagicString
      let hasError = false
      try {
        if (isBuild && id.includes(NODE_MODULES_FLAG)) {
          code = replaceRequires(code, externals, transformModuleName)
        }
        await init
        const [imports] = parse(code)
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
      } catch (error) {
        hasError = true
        if (userOptions.debug) {
          console.error(error)
        }
      }
      if (hasError || !s) {
        return { code, map: null }
      }
      return {
        code: s.toString(),
        map: s.generateMap(Object.assign({}, {
          source: id,
          includeContent: true,
          hires: true,
        }, userOptions.sourceMapOptions)),
      }
    },
  }
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

  return filter.call(this, code, id, ssr ?? false, isBuild)
}

function compatSsrInOptions(options: { ssr?: boolean } | undefined): boolean {
  if (typeof options === 'boolean') {
    return options
  }
  return options?.ssr ?? false
}
