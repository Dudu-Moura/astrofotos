import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { generateVariants } from '../../utils/generateVariants.util.js'
import { miniatureFormat, webFormat } from '../../constants/format.constants.js'
import type { Format } from '../../types/format.types.js'
import type { NewPhoto } from '../../types/photo.types.js'

let fixturesDir: string

const fixturePath = (name: string) => join(fixturesDir, name)

const makePhoto = (fileName: string, mimeType: string): NewPhoto => ({
    originalName: fileName,
    fileName,
    mimeType,
    size: 1024,
    path: fixturePath(fileName)
})

const noisyImage = (width: number, height: number) => {
    const pixels = Buffer.alloc(width * height * 3)
    for (let i = 0; i < pixels.length; i++) pixels[i] = Math.floor(Math.random() * 256)
    return sharp(pixels, { raw: { width, height, channels: 3 } })
}

const isWebpBuffer = (buffer: Buffer) =>
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'

beforeAll(async () => {
    fixturesDir = await mkdtemp(join(tmpdir(), 'astrofotos-variants-'))

    await Promise.all([
        noisyImage(800, 800).png().toFile(fixturePath('square.png')),
        noisyImage(800, 800).jpeg().toFile(fixturePath('square.jpg')),
        noisyImage(800, 800).webp().toFile(fixturePath('square.webp')),
        noisyImage(800, 800).tiff().toFile(fixturePath('square.tiff')),
        noisyImage(800, 800).gif().toFile(fixturePath('square.gif')),
        noisyImage(2000, 1000).jpeg().toFile(fixturePath('landscape.jpg')),
        noisyImage(1000, 2000).jpeg().toFile(fixturePath('portrait.jpg')),
        noisyImage(100, 100).png().toFile(fixturePath('tiny.png')),
        writeFile(fixturePath('not-an-image.png'), 'isso não é uma imagem')
    ])
})

afterAll(async () => {
    await rm(fixturesDir, { recursive: true, force: true })
})

beforeEach(() => {
    vi.spyOn(console, 'time').mockImplementation(() => {})
    vi.spyOn(console, 'timeEnd').mockImplementation(() => {})
})

describe('generateVariants', () => {
    describe('estrutura do retorno', () => {
        test('retorna um item por variante, na mesma ordem e com o id da constante', async () => {
            const result = await generateVariants(makePhoto('square.png', 'image/png'), [miniatureFormat, webFormat])

            expect(result).toHaveLength(2)
            expect(result.map(v => v.id)).toEqual([miniatureFormat.id, webFormat.id])
        })

        test('cada item contém apenas id e buffer', async () => {
            const result = await generateVariants(makePhoto('square.png', 'image/png'), [miniatureFormat])

            expect(result[0]).toEqual({ id: 'M', buffer: expect.any(Buffer) })
            expect(Object.keys(result[0]!)).toEqual(['id', 'buffer'])
        })

        test('buffer não é vazio e pode ser lido novamente pelo sharp', async () => {
            const [variant] = await generateVariants(makePhoto('square.png', 'image/png'), [miniatureFormat])

            expect(Buffer.isBuffer(variant!.buffer)).toBe(true)
            expect(variant!.buffer.length).toBeGreaterThan(0)
            await expect(sharp(variant!.buffer).stats()).resolves.toBeDefined()
        })

        test('array de variantes vazio retorna array vazio', async () => {
            const result = await generateVariants(makePhoto('square.png', 'image/png'), [])

            expect(result).toEqual([])
        })

        test('gera cada variante uma única vez mesmo que esteja duplicada no array', async () => {
            const webpSpy = vi.spyOn(sharp.prototype, 'webp')

            const result = await generateVariants(
                makePhoto('square.png', 'image/png'),
                [miniatureFormat, webFormat, miniatureFormat, webFormat]
            )

            expect(result).toHaveLength(2)
            expect(result.map(v => v.id)).toEqual([miniatureFormat.id, webFormat.id])
            expect(webpSpy).toHaveBeenCalledTimes(2)
            webpSpy.mockRestore()
        })
    })

    describe('conversão para WebP', () => {
        test.each([
            ['square.png', 'image/png'],
            ['square.jpg', 'image/jpeg'],
            ['square.webp', 'image/webp'],
            ['square.tiff', 'image/tiff'],
            ['square.gif', 'image/gif']
        ])('converte %s (%s) para WebP', async (fileName, mimeType) => {
            const result = await generateVariants(makePhoto(fileName, mimeType), [miniatureFormat, webFormat])

            for (const { buffer } of result) {
                expect(isWebpBuffer(buffer)).toBe(true)
                expect((await sharp(buffer).metadata()).format).toBe('webp')
            }
        })

        test('mimeType informado não influencia o formato de saída', async () => {
            const [variant] = await generateVariants(makePhoto('square.jpg', 'image/png'), [miniatureFormat])

            expect((await sharp(variant!.buffer).metadata()).format).toBe('webp')
        })
    })

    describe('redimensionamento', () => {
        test.each([
            ['miniatura', miniatureFormat],
            ['web', webFormat]
        ])('variante %s tem largura e altura da constante', async (_, format) => {
            const [variant] = await generateVariants(makePhoto('square.png', 'image/png'), [format])
            const { width, height } = await sharp(variant!.buffer).metadata()

            expect(width).toBe(format.width)
            expect(height).toBe(format.height)
        })

        test('cada variante do array é redimensionada com suas próprias dimensões', async () => {
            const result = await generateVariants(makePhoto('square.png', 'image/png'), [miniatureFormat, webFormat])
            const sizes = await Promise.all(result.map(async v => {
                const { width, height } = await sharp(v.buffer).metadata()
                return { id: v.id, width, height }
            }))

            expect(sizes).toEqual([
                { id: 'M', width: 300, height: 300 },
                { id: 'W', width: 1600, height: 1600 }
            ])
        })

        test.each(['landscape.jpg', 'portrait.jpg'])(
            'imagem não quadrada (%s) é recortada para as dimensões exatas da variante',
            async fileName => {
                const [variant] = await generateVariants(makePhoto(fileName, 'image/jpeg'), [miniatureFormat])
                const { width, height } = await sharp(variant!.buffer).metadata()

                expect(width).toBe(miniatureFormat.width)
                expect(height).toBe(miniatureFormat.height)
            }
        )

        test('imagem menor que a variante é ampliada', async () => {
            const [variant] = await generateVariants(makePhoto('tiny.png', 'image/png'), [webFormat])
            const { width, height } = await sharp(variant!.buffer).metadata()

            expect(width).toBe(webFormat.width)
            expect(height).toBe(webFormat.height)
        })

        test('respeita variante com largura e altura diferentes', async () => {
            const banner: Format = { id: 'B', width: 640, height: 200, quality: 80 }
            const [variant] = await generateVariants(makePhoto('square.png', 'image/png'), [banner])
            const { width, height } = await sharp(variant!.buffer).metadata()

            expect(variant!.id).toBe('B')
            expect(width).toBe(640)
            expect(height).toBe(200)
        })
    })

    describe('qualidade', () => {
        test('qualidade menor gera buffer menor para as mesmas dimensões', async () => {
            const low: Format = { id: 'L', width: 500, height: 500, quality: 10 }
            const high: Format = { id: 'H', width: 500, height: 500, quality: 100 }

            const [lowVariant, highVariant] = await generateVariants(makePhoto('square.png', 'image/png'), [low, high])

            expect(lowVariant!.buffer.length).toBeLessThan(highVariant!.buffer.length)
        })

        test('passa a qualidade da variante para o encoder WebP', async () => {
            const webpSpy = vi.spyOn(sharp.prototype, 'webp')

            await generateVariants(makePhoto('square.png', 'image/png'), [miniatureFormat, webFormat])

            expect(webpSpy).toHaveBeenCalledWith({ quality: miniatureFormat.quality })
            expect(webpSpy).toHaveBeenCalledWith({ quality: webFormat.quality })
            webpSpy.mockRestore()
        })
    })

    describe('entradas inválidas', () => {
        test('rejeita quando o arquivo não existe', async () => {
            const photo = makePhoto('nao-existe.png', 'image/png')

            await expect(generateVariants(photo, [miniatureFormat])).rejects.toThrow()
        })

        test('rejeita quando o arquivo não é uma imagem válida', async () => {
            const photo = makePhoto('not-an-image.png', 'image/png')

            await expect(generateVariants(photo, [miniatureFormat])).rejects.toThrow()
        })

        test('rejeita quando a variante tem dimensões inválidas', async () => {
            const invalid: Format = { id: 'X', width: -10, height: 0, quality: 80 }

            await expect(generateVariants(makePhoto('square.png', 'image/png'), [invalid])).rejects.toThrow()
        })

        test('rejeita quando a qualidade está fora do intervalo 1-100', async () => {
            const invalid: Format = { id: 'X', width: 300, height: 300, quality: 150 }

            await expect(generateVariants(makePhoto('square.png', 'image/png'), [invalid])).rejects.toThrow()
        })
    })

    test('não altera o objeto da foto nem as constantes de variante', async () => {
        const photo = makePhoto('square.png', 'image/png')
        const photoSnapshot = structuredClone(photo)
        const variantsSnapshot = structuredClone([miniatureFormat, webFormat])

        await generateVariants(photo, [miniatureFormat, webFormat])

        expect(photo).toEqual(photoSnapshot)
        expect([miniatureFormat, webFormat]).toEqual(variantsSnapshot)
    })
})
