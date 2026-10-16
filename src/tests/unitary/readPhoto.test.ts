import { beforeEach, describe, expect, test, vi } from 'vitest'
import fs from 'node:fs/promises'
import exifr from 'exifr'
import { readPhoto } from '../../utils/readPhoto.util.js'
import type { Photo } from '../../types/photo.types.js'

vi.mock('exifr', () => ({ default: { parse: vi.fn() } }))
vi.mock('node:fs/promises', () => ({ default: { readFile: vi.fn() } }))

const parseMock = vi.mocked(exifr.parse)
const readFileMock = vi.mocked(fs.readFile)

const makePhoto = (overrides: Partial<Photo> = {}): Photo => ({
    id: '6f1c2a8e-0000-4000-8000-000000000001',
    originalName: 'andromeda.jpg',
    fileName: 'a1b2c3d4e5',
    mimeType: 'image/jpeg',
    size: 2048,
    path: '.uploads/a1b2c3d4e5',
    ...overrides
})

const fakeBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])

const fakeMetadata = {
    Make: 'Canon',
    Model: 'EOS Ra',
    ExposureTime: 30,
    ISO: 3200,
    FNumber: 2.8,
    DateTimeOriginal: new Date('2026-08-12T02:30:00Z')
}

beforeEach(() => {
    vi.resetAllMocks()
    parseMock.mockResolvedValue(fakeMetadata)
    readFileMock.mockResolvedValue(fakeBuffer)
})

describe('readPhoto', () => {
    describe('caminho feliz', () => {
        test('retorna o buffer da imagem e os metadados EXIF', async () => {
            const result = await readPhoto(makePhoto())

            expect(result).toEqual({ photo: fakeBuffer, metadata: fakeMetadata })
        })

        test('retorna apenas as chaves photo e metadata', async () => {
            const result = await readPhoto(makePhoto())

            expect(Object.keys(result).sort()).toEqual(['metadata', 'photo'])
        })

        test('photo é exatamente o buffer lido do disco, sem cópia ou alteração', async () => {
            const { photo } = await readPhoto(makePhoto())

            expect(Buffer.isBuffer(photo)).toBe(true)
            expect(photo).toBe(fakeBuffer)
        })

        test('metadata é exatamente o objeto retornado pelo exifr', async () => {
            const { metadata } = await readPhoto(makePhoto())

            expect(metadata).toBe(fakeMetadata)
        })
    })

    describe('caminhos usados', () => {
        test('lê o buffer a partir de file.path', async () => {
            await readPhoto(makePhoto({ path: '/app/.uploads/xyz' }))

            expect(readFileMock).toHaveBeenCalledTimes(1)
            expect(readFileMock).toHaveBeenCalledWith('/app/.uploads/xyz')
        })

        test('extrai o EXIF a partir de file.path', async () => {
            await readPhoto(makePhoto({ fileName: 'abc123', path: '/app/.uploads/xyz' }))

            expect(parseMock).toHaveBeenCalledTimes(1)
            expect(parseMock).toHaveBeenCalledWith('/app/.uploads/xyz')
        })

        test('não usa originalName para localizar o arquivo', async () => {
            await readPhoto(makePhoto({ originalName: 'nome-original.jpg' }))

            expect(parseMock).not.toHaveBeenCalledWith(expect.stringContaining('nome-original'))
            expect(readFileMock).not.toHaveBeenCalledWith(expect.stringContaining('nome-original'))
        })
    })

    describe('imagem sem EXIF', () => {
        test('metadata vem undefined quando o exifr não encontra EXIF', async () => {
            parseMock.mockResolvedValue(undefined)

            const result = await readPhoto(makePhoto())

            expect(result.metadata).toBeUndefined()
            expect(result.photo).toBe(fakeBuffer)
        })

        test('metadata vem como objeto vazio quando o EXIF existe mas não tem campos', async () => {
            parseMock.mockResolvedValue({})

            const { metadata } = await readPhoto(makePhoto())

            expect(metadata).toEqual({})
        })

        test('ainda lê o buffer mesmo sem EXIF', async () => {
            parseMock.mockResolvedValue(undefined)

            await readPhoto(makePhoto())

            expect(readFileMock).toHaveBeenCalledTimes(1)
        })
    })

    describe('buffer', () => {
        test('rejeita quando o arquivo está vazio (buffer de tamanho 0)', async () => {
            readFileMock.mockResolvedValue(Buffer.alloc(0))

            await expect(readPhoto(makePhoto())).rejects.toThrow()
        })
    })

    describe('erros', () => {
        test('propaga erro quando o exifr falha (arquivo corrompido ou formato não suportado)', async () => {
            parseMock.mockRejectedValue(new Error('Unknown file format'))

            await expect(readPhoto(makePhoto())).rejects.toThrow('Unknown file format')
        })

        test('propaga ENOENT quando o arquivo não existe em file.path', async () => {
            const enoent = Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' })
            readFileMock.mockRejectedValue(enoent)

            await expect(readPhoto(makePhoto())).rejects.toMatchObject({ code: 'ENOENT' })
        })

        test('propaga EACCES quando não há permissão de leitura', async () => {
            const eacces = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' })
            readFileMock.mockRejectedValue(eacces)

            await expect(readPhoto(makePhoto())).rejects.toMatchObject({ code: 'EACCES' })
        })
    })

    test('não altera o objeto da foto recebido', async () => {
        const photo = makePhoto()
        const snapshot = structuredClone(photo)

        await readPhoto(photo)

        expect(photo).toEqual(snapshot)
    })
})
