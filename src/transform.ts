import { Parser } from 'acorn'
import * as ESTree from 'estree'
import { ExternalValue, Externals, TransformModuleNameFn } from './types'

type Specifiers = (ESTree.ImportSpecifier | ESTree.ImportDefaultSpecifier | ESTree.ImportNamespaceSpecifier | ESTree.ExportSpecifier)[]

export const transformImports = (
  raw: string,
  externalValue: ExternalValue,
  transformModuleName: TransformModuleNameFn,
): string => {
  const ast = Parser.parse(raw, {
    ecmaVersion: 'latest',
    sourceType: 'module',
  }) as unknown as ESTree.Program
  const specifiers = (ast.body[0] as (ESTree.ImportDeclaration))?.specifiers as Specifiers
  if (!specifiers) {
    return ''
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
    } else if (specifier.type === 'ExportSpecifier') {
      /**
       * Re-export default import as named export
       * source code: export { default as React } from 'react'
       * transformed: export const React = window['React']
       *
       * Re-export default import as default export
       * source code: export { default } from 'react'
       * transformed: export default window['React']
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

export function transformRequires(
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
