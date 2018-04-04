'use strict'

const series = require('async/series')
const IPFS = require('ipfs')
const Repo = require('ipfs-repo')
const S3 = require('aws-sdk').S3
const S3Store = require('../../src')

let fileMultihash
const s3 = new S3({
  params: {
    Bucket: 'my-bucket'
  },
  accessKeyId: 'myaccesskey',
  secretAccessKey: 'mysecretkey'
})

const repo = new Repo('/tmp/test/.ipfs', {
  storageBackends: {
    root: S3Store,
    blocks: S3Store,
    keys: S3Store,
    datastore: S3Store
  },
  storageBackendOptions: {
    root: { s3 },
    blocks: { s3 },
    keys: { s3 },
    datastore: { s3 }
  }
})

let node = new IPFS({
  repo: repo
})

series([
  (cb) => node.on('ready', cb),
  (cb) => node.version((err, version) => {
    if (err) { return cb(err) }
    console.log('Version:', version.version)
    cb()
  }),
  (cb) => node.files.add({
    path: 'hello.txt',
    content: Buffer.from('Hello World 101')
  }, (err, filesAdded) => {
    if (err) { return cb(err) }

    console.log('\nAdded file:', filesAdded[0].path, filesAdded[0].hash)
    fileMultihash = filesAdded[0].hash
    cb()
  }),
  (cb) => node.files.cat(fileMultihash, (err, data) => {
    if (err) { return cb(err) }

    console.log('\nFile content:')
    process.stdout.write(data)
  })
])
