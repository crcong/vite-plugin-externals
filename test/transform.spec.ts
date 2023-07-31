/* eslint-disable quotes */
import { transformImports, transformRequires } from '../src/transform'
import { createTransformModuleName } from '../src/index'
import { defaultOptions } from '../src/options'

const transformModuleName = createTransformModuleName(defaultOptions)

describe('transformImports', () => {
  test('transform ImportDefaultSpecifier', () => {
    expect(
      transformImports(`import Vue from 'vue'`, 'Vue', transformModuleName),
    )
      .toBe(`const Vue = window['Vue']\n`)
  })

  test('transform ImportSpecifier', () => {
    expect(
      transformImports(`import { reactive, ref as r } from 'vue'`, 'Vue', transformModuleName),
    )
      .toBe(`const reactive = window['Vue'].reactive\nconst r = window['Vue'].ref\n`)
  })

  test('transform ImportNamespaceSpecifier', () => {
    expect(
      transformImports(`import * as vue from 'vue'`, 'Vue', transformModuleName),
    )
      .toBe(`const vue = window['Vue']\n`)
  })

  test('transform ExportSpecifier', () => {
    expect(
      transformImports(`export { default as Vue } from 'Vue'`, 'Vue', transformModuleName),
    )
      .toBe(`export const Vue = window['Vue']\n`)

    expect(
      transformImports(`export { default } from 'vue'`, 'Vue', transformModuleName),
    )
      .toBe(`export default window['Vue']\n`)

    expect(
      transformImports(`export { useState } from 'react'`, 'React', transformModuleName),
    )
      .toBe(`export const useState = window['React'].useState\n`)
    expect(
      transformImports(`export { useState as useState2 } from 'react'`, 'React', transformModuleName),
    )
      .toBe(`export const useState2 = window['React'].useState\n`)
  })
})

describe('transformRequire', () => {
  test('test transformRequires', () => {
    expect(
      transformRequires(`const Vue = require('vue');`, { vue: 'Vue' }, transformModuleName),
    )
      .toBe(`const Vue = window['Vue'];`)

    expect(
      transformRequires(`const { reactive, ref } = require('vue');`, { vue: 'Vue' }, transformModuleName),
    )
      .toBe(`const { reactive, ref } = window['Vue'];`)

    expect(
      transformRequires(`const { reactive, ref } = require('vue');`, { vue: ['$', 'Vue'] }, transformModuleName),
    )
      .toBe(`const { reactive, ref } = window['$']['Vue'];`)

    expect(
      transformRequires(`const { reactive, ref } = require('vue');`, { vue: ['$$', 'Vue'] }, transformModuleName),
    )
      .toBe(`const { reactive, ref } = window['$$']['Vue'];`)
  })
})
