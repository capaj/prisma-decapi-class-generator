import { generatorHandler, GeneratorOptions } from '@prisma/generator-helper'
import { logger } from '@prisma/sdk'
import fs from 'fs'
import path from 'path'
import { GENERATOR_NAME } from './constants'
import { ExtractFieldsModifications } from './utils/extractFieldsModifications'

import { mkdir } from './utils/mkdir'
import { spawn } from 'child_process'
import { ENUM_TEMPLATE } from './templates/enum'
import prettier from 'prettier'
import { format } from './utils/format'
import { genTest } from './gentest'
import { generateModelClass } from './generateModelClass'

const defaultModelsOutput = path.join(process.cwd(), './src/generated/models')
const defaultEnumsOutput = path.join(process.cwd(), './src/generated/enums')

export const installPackage = (useYarn: string, pkgName: string) => {
  const packageManager = useYarn ? 'yarn add' : 'npm i'

  const hasGraphQLScalars = fs
    .readFileSync(path.join(process.cwd(), './package.json'), 'utf-8')
    .includes(`"${pkgName}"`)

  if (hasGraphQLScalars) return

  logger.info(`${GENERATOR_NAME}:Installing ${pkgName}`)
  spawn(`${packageManager} ${pkgName}`, [], {
    shell: true,
    stdio: 'inherit'
  })
}

generatorHandler({
  onManifest: () => ({
    defaultOutput: '../src/generated/models',
    prettyName: GENERATOR_NAME,
    requiresGenerators: ['prisma-client-js']
  }),
  onGenerate: genTest(async (options: GeneratorOptions) => {
    const extractedData = ExtractFieldsModifications(options.datamodel)

    const exportedNameSuffix = options.generator.config.exportedNameSuffix || ''
    const exportedNamePrefix = options.generator.config.exportedNamePrefix || ''

    const modelsWriteLocation =
      options.generator.config.modelsOutput || defaultModelsOutput
    const enumWriteLocation =
      options.generator.config.enumsOutput || defaultEnumsOutput

    // Make Folders that doesn't exist
    await Promise.all([
      fs.promises.mkdir(modelsWriteLocation, { recursive: true }),
      fs.promises.mkdir(enumWriteLocation, { recursive: true })
    ])

    // ?Models
    const modelClasses = await Promise.all(
      options.dmmf.datamodel.models.map(
        generateModelClass(extractedData, options, {
          modelsWriteLocation,
          exportedNamePrefix,
          exportedNameSuffix,
          enumWriteLocation
        })
      )
    )
    await Promise.all(
      modelClasses.map(async ({ code, writeLocation }) =>
        fs.writeFileSync(writeLocation, await format(code))
      )
    )

    // ?Enums
    options.dmmf.datamodel.enums.map(async (prismaEnum) => {
      const fileName = prismaEnum.name + '.ts'

      const writeLocation = path.join(enumWriteLocation, fileName)

      const enumName = `${exportedNamePrefix}${prismaEnum.name}${exportedNameSuffix}`
      const generatedEnum = ENUM_TEMPLATE(
        enumName,
        prismaEnum.values.map((e) => `  ${e.name} = '${e.name}'`).join(',\n'),
        prismaEnum.name
      )

      fs.writeFileSync(writeLocation, await format(generatedEnum))
    })

    logger.info(`${GENERATOR_NAME}:Generated Successfuly!`)
  })
})

logger.info(`${GENERATOR_NAME}:Registered`)
