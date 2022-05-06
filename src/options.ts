import { Options, UserOptions } from './types'
import { ID_FILTER_REG, NODE_MODULES_FLAG } from './constant'

const defaultOptions: Options = {
  disableSsr: true,
  filter(_, id, __, isBuild) {
    if (
      !ID_FILTER_REG.test(id) ||
      (id.includes(NODE_MODULES_FLAG) && !isBuild)
    ) {
      return false
    }
    return true
  },
  useWindow: true,
  sourceMapOptions: {},
  debug: false,
}

export function resolveOptions(userOptions: UserOptions): Options {
  return Object.assign({}, defaultOptions, userOptions)
}
