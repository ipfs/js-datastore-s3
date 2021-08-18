import type S3 from 'aws-sdk/clients/s3'

export interface S3DatastoreOptions {
  s3: S3
  createIfMissing?: boolean
}
