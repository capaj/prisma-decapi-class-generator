import { generatorHandler, GeneratorOptions } from '@prisma/generator-helper'
import { logger } from './utils/logger'
import fs from 'fs'
import path from 'path'
import { GENERATOR_NAME } from './constants'
import { INDEX_TEMPLATE } from './templates'
import { DECORATOR_TEMPLATE } from './templates/decorator'
import { FIELD_TEMPLATE } from './templates/field'
import { IMPORT_TEMPLATE } from './templates/import'
import { MODEL_TEMPLATE } from './templates/model'
import { convertType } from './utils/convertType'
import { ExtractFieldsModifications } from './utils/extractFieldsModifications'
import { HideOrPrivate } from './utils/hideOrPrivate'
import { mkdir } from './utils/mkdir'
import { modulesThatIsUsed } from './utils/modulesThatIsUsed'
import { objToString } from './utils/objectToString'
import { spawn } from 'child_process'
import { ENUM_TEMPLATE } from './templates/enum'
import { replaceAll } from './utils/replaceAll'
import { restoreClassChanges } from './utils/restoreClassChanges'
import { restoreImportsChanges } from './utils/restoreImportsSection'
import { restoreDecoratorObjects } from './utils/restoreDecoratorObjects'
import { format } from './utils/format'
import { toPascalCase } from './utils/toPascalCase'

const defaultModelsOutput = path.join(process.cwd(), './src/generated/models')
const defaultEnumsOutput = path.join(process.cwd(), './src/generated/enums')

const installPackage = (useYarn: string, pkgName: string) => {
  const packageManager = useYarn ? 'yarn add' : 'npm i'

  const hasGraphQLScalars = fs
    .readFileSync(path.join(process.cwd(), './package.json'), 'utf-8')
    .includes(`"${pkgName}"`)

  if (hasGraphQLScalars) return

  logger.info(`${GENERATOR_NAME}:Installing ${pkgName}`)
  spawn(`${packageManager} ${pkgName}`, [], {
    shell: true,
    stdio: 'inherit',
  })
}

const { version } = require('../package.json')

generatorHandler({
  onManifest: () => ({
    defaultOutput: '../src/generated/models',
    prettyName: GENERATOR_NAME,
    version,
  }),
  onGenerate: async (options: GeneratorOptions) => {
    const extractedData = ExtractFieldsModifications(options.datamodel)

    const splitScalars =
      !!options.generator.config.splitScalarAndObjectTypeFields
    const { config } = options.generator
    const exportedNameSuffix = config.exportedNameSuffix || ''
    const exportedNamePrefix = config.exportedNamePrefix || ''
    const pascalCaseModelNames = !!config.pascalCaseModelNames

    const modelsWriteLocation = config.modelsOutput || defaultModelsOutput
    const enumWriteLocation = config.enumsOutput || defaultEnumsOutput

    // ?Models
    options.dmmf.datamodel.models.map(async (model) => {
      const getModelName = (name: string) =>
        `${exportedNamePrefix}${
          pascalCaseModelNames ? toPascalCase(name) : name
        }${exportedNameSuffix}`
      const modelName = getModelName(model.name)
      const fileName = modelName + '.ts'

      const writeLocation = path.join(modelsWriteLocation, fileName)

      const allFields: { field: string; type: string }[] = []

      model.fields.map((field) => {
        const tsScalarType = `${convertType(field.type as string)}${
          field.isRequired ? '' : ' | null'
        }`

        const fieldType = `${
          tsScalarType ? tsScalarType : getModelName(field.type)
        }${field.isList ? '[]' : ''}`
        allFields.push({ field: field.name, type: fieldType })
      })

      const decoratorObjects = restoreDecoratorObjects(
        writeLocation,
        allFields.map((e) => ({
          field: e.field.replace('?', ''),
          type: e.type,
        })),
        modelName,
      )

      let dynamicImports = ''

      const formattedFields = model.fields.map((field) => {
        const { isHide, isPrivate } = HideOrPrivate(
          extractedData,
          field.name,
          model.name,
        )

        if (isHide) return { hide: true, type: field.type }

        const tsScalarType = convertType(field.type as string)
        const fieldType = `${
          tsScalarType ? tsScalarType : getModelName(field.type)
        }${field.isList ? '[]' : ''}${field.isRequired ? '' : ' | null'}`

        const decoratorType = () => {
          // Special Cases
          const type = (type: string) =>
            `(${
              options.generator.config.removeTypeInFieldDecorator ? '' : '_type'
            }) => ${type}`

          const modifiedFieldType =
            field.kind === 'scalar' ? field.type : getModelName(field.type)

          const addDynamicImports = (exported: string) => {
            if (dynamicImports.split(',').find((e) => e.trim() === exported)) {
              return
            }
            dynamicImports += `, ${exported}`
          }
          const getEquivalentType = () => {
            const convertedType = convertType(field.type as string)

            if (field.isId && field.type === 'String') {
              addDynamicImports('ID')
              return 'ID'
            } else if (field.type === 'Int') {
              addDynamicImports('Int')
              return 'Int'
            } else if (field.type === 'Float') {
              addDynamicImports('Float')
              return 'Float'
            } else if (field.type === 'DateTime') {
              addDynamicImports('GraphQLISODateTime')
              return 'GraphQLISODateTime'
            } else if (field.type === 'BigInt') {
              return 'GraphQLScalars.BigIntResolver'
            } else if (convertedType === 'Prisma.JsonValue') {
              return 'GraphQLScalars.JSONResolver'
            } else if (convertedType === 'Buffer') {
              return 'GraphQLScalars.ByteResolver'
            } else if (convertedType === 'Prisma.Decimal') {
              return 'GraphQLDecimal'
            } else {
              return modifiedFieldType
            }
          }

          const typeGraphQLType = getEquivalentType()

          if (field.isList) {
            return type(`[${typeGraphQLType}]`)
          } else if (field.kind === 'object' && !field.isList) {
            return type(modifiedFieldType as string)
          }

          if (
            (typeGraphQLType as string).length === 0 ||
            (field.kind === 'scalar' &&
              field.isRequired &&
              !field.isId &&
              field.type !== 'Json' &&
              field.type !== 'Bytes' &&
              !dynamicImports
                .split(',')
                .find((e) => e.trim() === typeGraphQLType))
          ) {
            return ''
          }

          return type(typeGraphQLType as string)
        }

        const fieldName = field.name

        const decoratorObject = () => {
          let object: any = {}

          const editedOptions = decoratorObjects?.find(
            (e) => e.field === field.name.replace('?', ''),
          )

          if (editedOptions) {
            // Remove undefined keys
            Object.keys(editedOptions.decorator).forEach(
              (key) =>
                editedOptions.decorator[key] === undefined &&
                delete editedOptions.decorator[key],
            )
          }

          if (
            editedOptions &&
            Object.keys(editedOptions?.decorator || {}).length > 0
          ) {
            const value = editedOptions.decorator

            object = { ...object, ...value }
          }

          if (!field.isRequired || isPrivate) {
            object.nullable = true
          } else {
            object.nullable = undefined
          }

          // Remove undefined keys
          Object.keys(object).forEach(
            (key) => object[key] === undefined && delete object[key],
          )

          if (Object.keys(object).length === 0) {
            return undefined
          }

          return objToString(object)
        }

        const Decorator = DECORATOR_TEMPLATE(decoratorType(), decoratorObject())
        const Field = FIELD_TEMPLATE(Decorator, '\n  ' + fieldName, fieldType)

        return { field: Field, kind: field.kind }
      })

      const hidden = formattedFields.filter((e) => {
        if (e?.hide) return true
        else return false
      })

      const scalarFields = formattedFields
        .filter((e) => {
          if (!e?.field || e.kind === 'object') return false
          else return true
        })
        .map((e) => e.field)

      const objectsFields = formattedFields
        .filter((e) => {
          if (!e?.field || e.kind === 'scalar' || e.kind === 'enum')
            return false
          else return true
        })
        .map((e) => e.field)

      const mergedFields = formattedFields
        .filter((e) => {
          if (!e?.field) return false
          else return true
        })
        .map((e) => e.field)

      const dependsOn = modulesThatIsUsed(
        options.dmmf.datamodel.models,
        model.name,
      )

      let imports: string[] = []

      // Import TypeGraphQL Stuff
      imports.push(
        IMPORT_TEMPLATE(
          `{ Field, ObjectType${dynamicImports} }`,
          `type-graphql`,
        ),
      )

      imports = [
        ...imports,
        ...(dependsOn
          .map(({ kind, name }) => {
            if (!hidden.find((e: any) => e.type === name)) {
              if (kind === 'object') {
                const importModelName = getModelName(name)

                // If the Model referenced itself -> return
                if (importModelName === modelName) {
                  return
                }

                return IMPORT_TEMPLATE(
                  `{ ${importModelName} }`,
                  `./${getModelName(name)}`,
                )
              } else if (kind === 'enum') {
                const relativePathToEnums = replaceAll(
                  path.relative(
                    path.join(process.cwd(), modelsWriteLocation),
                    path.join(process.cwd(), enumWriteLocation),
                  ),
                  '\\',
                  '/',
                )
                const enumName = `${exportedNamePrefix}${name}${exportedNameSuffix}`
                return IMPORT_TEMPLATE(
                  `{ ${enumName} }`,
                  `${relativePathToEnums}/${name}`,
                )
              }
            } else {
              return 'remove'
            }
          })
          .filter((e) => e !== 'remove') as string[]),
      ]

      const scalarsJoined = scalarFields.join('\n')
      if (scalarsJoined.includes('Prisma.')) {
        imports.push(
          IMPORT_TEMPLATE(
            `{ Prisma }`,
            // on some projects I had trouble with the @prisma/client import
            options.generator.config.useDotPrismaImport
              ? `.prisma/client`
              : `@prisma/client`,
          ),
        )
      }

      // Install needed Packages
      if (scalarsJoined.includes('GraphQLScalars.')) {
        installPackage(options.generator.config.useYarn, 'graphql-scalars')
        imports.push(IMPORT_TEMPLATE(`* as GraphQLScalars`, `graphql-scalars`))
      }

      if (scalarsJoined.includes('GraphQLDecimal')) {
        imports.push(
          IMPORT_TEMPLATE(`{ GraphQLDecimal }`, 'prisma-graphql-type-decimal'),
        )
      }

      const classChanges = restoreClassChanges(writeLocation)
      const importsChanges = restoreImportsChanges(writeLocation, modelName)

      if (!importsChanges) {
        imports.push(`\n@ObjectType()`)
      }

      const actualImportsThatChanged = importsChanges
        ? (
            await format(
              importsChanges
                .split('\n')
                .filter((e) => {
                  return e.includes('import ') || e.includes('require(')
                })
                .join('\n'),
            )
          ).split('\n')
        : null

      const otherCodeThatChanged = importsChanges
        ? '\n' +
          importsChanges
            ?.split('\n')
            .filter((e) => {
              return !e.includes('import ') && !e.includes('require(')
            })
            .join('\n')
        : ''

      let mergedImports = !importsChanges
        ? imports
        : [
            ...new Set([
              ...actualImportsThatChanged!,
              ...(await format(imports.join('\n'))).split('\n'),
            ]),
          ]

      // Add empty line between imports and code
      const codeSplitted = (
        mergedImports.join('\n') + otherCodeThatChanged
      ).split('\n')

      const ObjectTypeIndex = codeSplitted.findIndex((e) =>
        e.includes('@ObjectType'),
      )

      if (codeSplitted[ObjectTypeIndex - 1].length !== 0) {
        if (otherCodeThatChanged.length) {
          mergedImports.push('')
        }
      }

      let generatedModel: string
      if (splitScalars) {
        const scalarsClass = MODEL_TEMPLATE(
          `${modelName}Scalars`,
          scalarFields.join('\n'),
          '\n}',
        )

        const objectsClass = MODEL_TEMPLATE(
          modelName,
          objectsFields.join('\n'),
          classChanges,
          ` extends ${modelName}Scalars`,
        )

        generatedModel = INDEX_TEMPLATE(
          [scalarsClass, objectsClass].join('\n\n'),
          mergedImports.join('\n') + otherCodeThatChanged,
        )
      } else {
        const wholeClass = MODEL_TEMPLATE(
          modelName,
          mergedFields.join('\n'),
          classChanges,
        )

        generatedModel = INDEX_TEMPLATE(
          wholeClass,
          mergedImports.filter((e) => e !== '').join('\n') +
            otherCodeThatChanged,
        )
      }

      // Make Folders that doesn't exist
      mkdir(writeLocation, fileName)

      fs.writeFileSync(writeLocation, await format(generatedModel))
    })

    // ?Enums
    options.dmmf.datamodel.enums.map(async (prismaEnum) => {
      const fileName = prismaEnum.name + '.ts'

      const writeLocation = path.join(enumWriteLocation, fileName)

      const enumName = `${exportedNamePrefix}${prismaEnum.name}${exportedNameSuffix}`
      const generatedEnum = ENUM_TEMPLATE(
        enumName,
        prismaEnum.values.map((e) => `  ${e.name} = '${e.name}'`).join(',\n'),
        prismaEnum.name,
      )

      // Make Folders that doesn't exist
      mkdir(writeLocation, fileName)

      fs.writeFileSync(writeLocation, await format(generatedEnum))
    })

    logger.info(`${GENERATOR_NAME}:Generated Successfully!`)
  },
})

logger.info(`${GENERATOR_NAME}:Registered`)
