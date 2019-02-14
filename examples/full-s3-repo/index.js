'use strict'

const IPFS = require('ipfs')
const { createRepo } = require('datastore-s3')

// Create the repo
const s3Repo = createRepo({
  path: '/tmp/test/.ipfs'
}, {
  bucket: 'my-bucket',
  accessKeyId: 'myaccesskey',
  secretAccessKey: 'mysecretkey'
})

// Create a new IPFS node with our S3 backed Repo
let node = new IPFS({
  repo: s3Repo
})

console.log('Start the node')

// Test out the repo by sending and fetching some data
node.on('ready', () => {
  console.log('Ready')
  node.version()
    .then((version) => {
      console.log('Version:', version.version)
    })
    // Once we have the version, let's add a file to IPFS
    .then(() => {
      return node.add({
        path: 'data.txt',
        content: Buffer.from(require('crypto').randomBytes(1024 * 25))
      })
    })
    // Log out the added files metadata and cat the file from IPFS
    .then((filesAdded) => {
      console.log('\nAdded file:', filesAdded[0].path, filesAdded[0].hash)
      return node.cat(filesAdded[0].hash)
    })
    // Print out the files contents to console
    .then((data) => {
      console.log(`\nFetched file content containing ${data.byteLength} bytes`)
    })
    // Log out the error, if there is one
    .catch((err) => {
      console.log('File Processing Error:', err)
    })
    // After everything is done, shut the node down
    // We don't need to worry about catching errors here
    .then(() => {
      console.log('\n\nStopping the node')
      return node.stop()
    })
})
