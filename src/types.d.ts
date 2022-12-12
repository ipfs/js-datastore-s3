import type { S3Client } from 'aws-sdk/client-s3'

export interface S3DatastoreOptions {
  s3: S3Client
  bucket: string
  createIfMissing?: boolean
}
