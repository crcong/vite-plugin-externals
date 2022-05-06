
import { TransformPluginContext } from 'rollup'
import { SourceMapOptions } from 'magic-string'

export type ExternalValue = string | string[]

export type Externals = Record<string, ExternalValue>

export interface Options {
    /**
     * disable externals in serve
     * @default false
     */
     disableInServe: boolean
    /**
     * disable externals in ssr
     * @default true
     */
    disableSsr: boolean
    /**
     * filter does not require external function
     * return false is not external
     */
    filter: (this: TransformPluginContext, code: string, id: string, ssr: boolean, isBuild: boolean) => boolean
    /**
     * eg. externals: { vue: 'Vue' }
     * set `true`: import Vue from 'vue' => const Vue = window.Vue;
     * set `false`: eg. import Vue from 'vue' => const Vue = Vue;
     * @default true
     */
    useWindow: boolean
    /**
     * magic-string generateMap options
     */
    sourceMapOptions: Partial<SourceMapOptions>
    /**
     * debug console
     */
    debug: boolean
}

export type UserOptions = Partial<Options>

export type TransformModuleNameFn = (externalValue: ExternalValue) => string
