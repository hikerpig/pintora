import {
  FileWithHandle,
  fileOpen as _fileOpen,
  fileSave as _fileSave,
  FileSystemHandle,
  supported as nativeFileSystemSupported,
} from 'browser-fs-access'
import { MIME_TYPES } from '../const'

type FileExtension = 'gif' | 'jpg' | 'png' | 'svg' | 'json' | 'pintora'

export const fileOpen = <M extends boolean | undefined = false>(opts: {
  extensions?: FileExtension[]
  description: string
  multiple?: M
}): Promise<M extends false | undefined ? FileWithHandle : FileWithHandle[]> => {
  // an unsafe TS hack, alas not much we can do AFAIK
  type RetType = M extends false | undefined ? FileWithHandle : FileWithHandle[]

  const mimeTypes = opts.extensions?.reduce((mimeTypes, type) => {
    mimeTypes.push(MIME_TYPES[type])

    return mimeTypes
  }, [] as string[])

  const extensions = opts.extensions?.reduce((acc, ext) => {
    if (ext === 'jpg') {
      return acc.concat('.jpg', '.jpeg')
    }
    return acc.concat(`.${ext}`)
  }, [] as string[])

  return _fileOpen({
    description: opts.description,
    extensions,
    mimeTypes,
    multiple: opts.multiple ?? false,
  }) as Promise<RetType>
}

export const fileSave = (
  blob: Blob,
  opts: {
    /** supply without the extension */
    name: string
    /** file extension */
    extension: FileExtension
    description: string
    /** existing FileSystemHandle */
    fileHandle?: FileSystemFileHandle | null
  },
) => {
  return _fileSave(
    blob,
    {
      fileName: `${opts.name}.${opts.extension}`,
      description: opts.description,
      extensions: [`.${opts.extension}`],
    },
    opts.fileHandle,
  )
}

export type { FileSystemHandle }
export { nativeFileSystemSupported }
