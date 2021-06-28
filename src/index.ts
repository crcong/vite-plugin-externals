import { TransformPluginContext } from 'rollup'
import type { Plugin } from 'vite'
import MagicString from 'magic-string'
import { init, parse } from 'es-module-lexer'
import { Parser } from 'acorn'
import * as ESTree from 'estree'
import { Externals, Options } from './types'

type Specifiers = (ESTree.ImportSpecifier | ESTree.ImportDefaultSpecifier | ESTree.ImportNamespaceSpecifier)[]

// constants
const ID_FILTER_REG = /\.(js|ts|vue|jsx|tsx)$/
const NODE_MODULES_FLAG = 'node_modules'

export function viteExternalsPlugin(externals: Externals = {}, userOptions: Options = {}): Plugin {
  return {
    name: 'vite-plugin-externals',
    async transform(code, id, ssr) {
      if (!isNeedExternal.call(this, userOptions, code, id, ssr)) {
        return
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
        const newImportStr = replaceImports(specifiers, externalValue, userOptions)
        s.overwrite(statementStart, statementEnd, newImportStr)
      })
      if (!s) {
        return
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

function replaceImports(
  specifiers: Specifiers,
  externalValue: string,
  options: Options,
) {
  const { useWindow = true } = options
  const transformModuleName = (moduleId: string) => {
    if (!useWindow) {
      return moduleId
    }
    return `window['${moduleId}']`
  }
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
    }
    return s
  }, '')
}

function isNeedExternal(
  this: TransformPluginContext,
  options: Options,
  code: string,
  id: string,
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
      id.includes(NODE_MODULES_FLAG)
    ) {
      return false
    }
  }
  return true
}
