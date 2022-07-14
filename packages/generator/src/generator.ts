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

import { ENUM_TEMPLATE } from './templates/enum'
import { replaceAll } from './utils/replaceAll'
import { restoreClassChanges } from './utils/restoreClassChanges'
import { restoreImportsChanges } from './utils/restoreImportsSection'
import { restoreDecoratorObjects } from './utils/restoreDecoratorObjects'

import { format } from './utils/format'
import { toPascalCase } from './utils/toPascalCase'

const defaultModelsOutput = path.join(process.cwd(), './src/generated/models')
const defaultEnumsOutput = path.join(process.cwd(), './src/generated/enums')

generatorHandler({
  onManifest: () => ({
    defaultOutput: '../src/generated/models',
    prettyName: GENERATOR_NAME,
    requiresGenerators: ['prisma-client-js'],
  }),
  onGenerate: async (options: GeneratorOptions) => {
    const extractedData = ExtractFieldsModifications(options.datamodel)

    const splitScalars =
      !!options.generator.config.splitScalarAndObjectTypeFields

    const pascalCaseModelNames = !!options.generator.config.pascalCaseModelNames

    const exportedNameSuffix = options.generator.config.exportedNameSuffix || ''
    const exportedNamePrefix = options.generator.config.exportedNamePrefix || ''

    const modelsWriteLocation =
      options.generator.config.modelsOutput || defaultModelsOutput
    const enumWriteLocation =
      options.generator.config.enumsOutput || defaultEnumsOutput

    // ?Models
    options.dmmf.datamodel.models.map(async (model) => {
      const getModelName = (name: string) =>
        `${exportedNamePrefix}${
          pascalCaseModelNames ? toPascalCase(name) : name
        }${exportedNameSuffix}`
      const modelName = getModelName(model.name)
      const fileName = modelName + '.ts'

      const writeLocation = path.join(modelsWriteLocation, fileName)

      let dynamicImports = ''

      const formattedFields = model.fields.map((field) => {
        const { isHide, isPrivate } = HideOrPrivate(
          extractedData,
          field.name,
          model.name,
        )

        if (isHide) return { hide: true, type: field.type }
        const optionalCondition = !field.isRequired

        const fieldType = `${convertType(
          field.type as string,
          getModelName(field.type),
        )!}${field.isList ? '[]' : ''}${optionalCondition ? ' | null' : ''}`

        const decoratorType = () => {
          // Special Cases
          const type = (type: string) => `{ type: ${type} }`

          const addDynamicImports = (exported: string) => {
            if (dynamicImports.split(',').find((e) => e.trim() === exported)) {
              return
            }
            dynamicImports += `, ${exported}`
          }
          const getEquivalentGraphqlScalar = () => {
            const convertedType = convertType(field.type as string)

            if (field.isId && field.type !== 'Int') {
              addDynamicImports('ID')
              return 'ID'
            } else if (field.type === 'Int') {
              addDynamicImports('Int')
              return 'Int'
            } else if (field.type === 'Float') {
              addDynamicImports('Float')
              return 'Float'
            } else if (convertedType === 'Prisma.JsonValue') {
              return 'GraphQLScalars.JSONResolver'
            } else if (convertedType === 'Prisma.Decimal') {
              return 'GraphQLDecimal'
            } else if (convertedType === 'Buffer') {
              return 'GraphQLScalars.ByteResolver'
            } else {
              return null
            }
          }

          const graphqlScalar = getEquivalentGraphqlScalar()

          if (!graphqlScalar) {
            return ''
          }

          if (field.isList) {
            return ''
          } else if (field.kind === 'object' && !field.isList) {
            return ''
          }

          return type(graphqlScalar as string)
        }

        const fieldName = field.name

        const Decorator = DECORATOR_TEMPLATE(decoratorType(), '')
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
        IMPORT_TEMPLATE(`{ Field, ObjectType${dynamicImports} }`, `decapi`),
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

      if (scalarFields.join('\n').includes('Prisma.')) {
        imports.push(IMPORT_TEMPLATE(`{ Prisma }`, `@prisma/client`))
      }

      const joinedFields = scalarFields.join('\n')
      // Install needed Packages
      if (joinedFields.includes('GraphQLScalars.')) {
        // installPackage(options.generator.config.useYarn, 'graphql-scalars')
        imports.push(IMPORT_TEMPLATE(`* as GraphQLScalars`, `graphql-scalars`))
      }
      if (joinedFields.includes('GraphQLDecimal')) {
        // installPackage(options.generator.config.useYarn, 'graphql-scalars')
        imports.push(
          IMPORT_TEMPLATE(`{ GraphQLDecimal }`, `prisma-graphql-type-decimal`),
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
      console.log(`Generated ${writeLocation}`)
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
