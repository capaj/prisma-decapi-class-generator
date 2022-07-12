import { upperFirst, camelCase } from 'lodash'

export function toPascalCase(str: string) {
  return upperFirst(camelCase(str))
}
