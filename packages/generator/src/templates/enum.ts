export const ENUM_TEMPLATE = (
  ENUM: string,
  ENUMVALUES: string,
  REGISTEREDNAME: string,
) => `import { registerEnum } from 'decapi'

export enum ${ENUM} {
${ENUMVALUES}
}
registerEnum(${ENUM}, {
    name: '${REGISTEREDNAME}',
})
`
