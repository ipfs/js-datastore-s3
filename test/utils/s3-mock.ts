import sinon from 'sinon'
import type { S3 } from '@aws-sdk/client-s3'

export class S3Error extends Error {
  public code: string
  public statusCode?: number
  public $metadata?: { httpStatusCode: number }

  constructor (message: string, code?: number) {
    super(message)
    this.code = message
    this.statusCode = code

    this.$metadata = {
      httpStatusCode: code ?? 200
    }
  }
}

export const s3Resolve = (res?: any): any => {
  return Promise.resolve(res)
}

export const s3Reject = <T> (err: T): any => {
  return Promise.reject(err)
}

/**
 * Mocks out the s3 calls made by datastore-s3
 */
export function s3Mock (s3: S3): S3 {
  const mocks: any = {}
  const storage: Map<string, any> = new Map()

  mocks.send = sinon.replace(s3, 'send', (command) => {
    const commandName = command.constructor.name
    const input: any = command.input

    if (commandName === 'PutObjectCommand') {
      storage.set(input.Key, input.Body)
      return s3Resolve({})
    }

    if (commandName === 'HeadObjectCommand') {
      if (storage.has(input.Key)) {
        return s3Resolve({})
      }

      return s3Reject(new S3Error('NotFound', 404))
    }

    if (commandName === 'GetObjectCommand') {
      if (!storage.has(input.Key)) {
        return s3Reject(new S3Error('NotFound', 404))
      }

      return s3Resolve({
        Body: storage.get(input.Key)
      })
    }

    if (commandName === 'DeleteObjectCommand') {
      storage.delete(input.Key)
      return s3Resolve({})
    }

    if (commandName === 'ListObjectsV2Command') {
      const results: { Contents: Array<{ Key: string }> } = {
        Contents: []
      }

      for (const k of storage.keys()) {
        if (k.startsWith(`${input.Prefix ?? ''}`)) {
          results.Contents.push({
            Key: k
          })
        }
      }

      return s3Resolve(results)
    }

    return s3Reject(new S3Error('UnknownCommand', 400))
  })

  return s3
}
