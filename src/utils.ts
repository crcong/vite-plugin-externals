export function isObject(o: unknown):boolean {
  return Object.prototype.toString.call(o) === '[object Object]'
}
