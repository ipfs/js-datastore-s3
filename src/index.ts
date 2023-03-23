import { Buffer } from 'buffer'
import filter from 'it-filter'
import { Key, KeyQuery, Pair, Query } from 'interface-datastore'
import { BaseDatastore } from 'datastore-core/base'
import * as Errors from 'datastore-core/errors'
import { fromString as unint8arrayFromString } from 'uint8arrays'
import toBuffer from 'it-to-buffer'
import type S3 from 'aws-sdk/clients/s3'
import type { AbortOptions } from 'interface-store'

export interface S3DatastoreInit {
  createIfMissing?: boolean
}

/**
 * A datastore backed by the file system.
 *
 * Keys need to be sanitized before use, as they are written
 * to the file system as is.
 */
export class S3Datastore extends BaseDatastore {
  public path: string
  public createIfMissing: boolean
  private readonly s3: S3
  private readonly bucket: string

  constructor (path: string, s3: S3, init?: S3DatastoreInit) {
    super()

    this.path = path
    this.s3 = s3

    if (s3.config.params?.Bucket == null) {
      throw new Error('An S3 instance with a predefined Bucket must be supplied. See the datastore-s3 README for examples.')
    }

    this.bucket = s3.config.params.Bucket
    this.createIfMissing = init?.createIfMissing ?? false
  }

  /**
   * Returns the full key which includes the path to the ipfs store
   */
  _getFullKey (key: Key): string {
    // Avoid absolute paths with s3
    return [this.path, key.toString()].join('/').replace(/\/\/+/g, '/')
  }

  /**
   * Store the given value under the key.
   */
  async put (key: Key, val: Uint8Array): Promise<Key> {
    try {
      await this.s3.upload({
        Bucket: this.bucket,
        Key: this._getFullKey(key),
        Body: Buffer.from(val, val.byteOffset, val.byteLength)
      }).promise()

      return key
    } catch (err: any) {
      if (err.code === 'NoSuchBucket' && this.createIfMissing) {
        await this.s3.createBucket({
          Bucket: this.bucket
        }).promise()
        return await this.put(key, val)
      }

      throw Errors.dbWriteFailedError(err)
    }
  }

  /**
   * Read from s3
   */
  async get (key: Key): Promise<Uint8Array> {
    try {
      const data = await this.s3.getObject({
        Bucket: this.bucket,
        Key: this._getFullKey(key)
      }).promise()

      if (data.Body == null) {
        throw new Error('Response had no body')
      }

      // If a body was returned, ensure it's a Uint8Array
      if (data.Body instanceof Uint8Array) {
        return data.Body
      }

      if (typeof data.Body === 'string') {
        return unint8arrayFromString(data.Body)
      }

      if (data.Body instanceof Blob) {
        const buf = await data.Body.arrayBuffer()

        return new Uint8Array(buf, 0, buf.byteLength)
      }

      // @ts-expect-error s3 types define their own Blob as an empty interface
      return await toBuffer(data.Body)
    } catch (err: any) {
      if (err.statusCode === 404) {
        throw Errors.notFoundError(err)
      }
      throw err
    }
  }

  /**
   * Check for the existence of the given key
   */
  async has (key: Key): Promise<boolean> {
    try {
      await this.s3.headObject({
        Bucket: this.bucket,
        Key: this._getFullKey(key)
      }).promise()
      return true
    } catch (err: any) {
      if (err.code === 'NotFound') {
        return false
      }
      throw err
    }
  }

  /**
   * Delete the record under the given key
   */
  async delete (key: Key): Promise<void> {
    try {
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: this._getFullKey(key)
      }).promise()
    } catch (err: any) {
      throw Errors.dbDeleteFailedError(err)
    }
  }

  /**
   * Recursively fetches all keys from s3
   */
  async * _listKeys (params: { Prefix?: string, StartAfter?: string }, options?: AbortOptions): AsyncIterable<Key> {
    try {
      const data = await this.s3.listObjectsV2({
        Bucket: this.bucket,
        ...params
      }).promise()

      if (options?.signal?.aborted === true) {
        return
      }

      if (data == null || data.Contents == null) {
        throw new Error('Not found')
      }

      for (const d of data.Contents) {
        if (d.Key == null) {
          throw new Error('Not found')
        }

        // Remove the path from the key
        yield new Key(d.Key.slice(this.path.length), false)
      }

      // If we didn't get all records, recursively query
      if (data.IsTruncated === true) {
        // If NextMarker is absent, use the key from the last result
        params.StartAfter = data.Contents[data.Contents.length - 1].Key

        // recursively fetch keys
        yield * this._listKeys(params)
      }
    } catch (err: any) {
      throw new Error(err.code)
    }
  }

  async * _all (q: Query, options?: AbortOptions): AsyncIterable<Pair> {
    for await (const key of this._allKeys({ prefix: q.prefix }, options)) {
      try {
        const res: Pair = {
          key,
          value: await this.get(key)
        }

        yield res
      } catch (err: any) {
        // key was deleted while we are iterating over the results
        if (err.statusCode !== 404) {
          throw err
        }
      }
    }
  }

  async * _allKeys (q: KeyQuery, options?: AbortOptions): AsyncIterable<Key> {
    const prefix = [this.path, q.prefix ?? ''].join('/').replace(/\/\/+/g, '/')

    // Get all the keys via list object, recursively as needed
    let it = this._listKeys({
      Prefix: prefix
    }, options)

    if (q.prefix != null) {
      it = filter(it, k => k.toString().startsWith(`${q.prefix ?? ''}`))
    }

    yield * it
  }

  /**
   * This will check the s3 bucket to ensure access and existence
   */
  async open (): Promise<void> {
    try {
      await this.s3.headObject({
        Bucket: this.bucket,
        Key: this.path
      }).promise()
    } catch (err: any) {
      if (err.statusCode !== 404) {
        throw Errors.dbOpenFailedError(err)
      }
    }
  }
}
