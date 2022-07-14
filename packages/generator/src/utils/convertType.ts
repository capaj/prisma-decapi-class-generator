export const prismaTypes = [
  'String',
  'Int',
  'Float',
  'Boolean',
  'DateTime',
  'BigInt',
  'Decimal',
  'Json',
  'Bytes',
  'Decimal',
]

export const convertType = (type: string, modelName?: string) => {
  if (prismaTypes.includes(type)) {
    switch (type) {
      case 'String':
        return 'string'
      case 'Boolean':
        return 'boolean'
      case 'Int':
        return 'number'
      case 'BigInt':
        return 'number'
      case 'Float':
        return 'number'
      case 'DateTime':
        return 'Date'
      case 'Json':
        return 'Prisma.JsonValue'
      case 'Bytes':
        return 'Buffer'
      case 'Decimal':
        return 'Prisma.Decimal'
    }
  } else {
    return modelName
  }
}
