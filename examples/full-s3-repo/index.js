'use strict'

const IPFS = require('ipfs')
const { createRepo } = require('datastore-s3')
const toBuffer = require('it-to-buffer')

;(async () => {
  // Create the repo
  const s3Repo = createRepo({
    path: '/tmp/test/.ipfs'
  }, {
    bucket: 'my-bucket',
    accessKeyId: 'myaccesskey',
    secretAccessKey: 'mysecretkey'
  })

  // Create a new IPFS node with our S3 backed Repo
  console.log('Start ipfs')
  const node = await IPFS.create({
    repo: s3Repo
  })

  // Test out the repo by sending and fetching some data
  console.log('IPFS is ready')

  try {
    const version = await node.version()
    console.log('Version:', version.version)

    // Once we have the version, let's add a file to IPFS
    const { path, cid } = await node.add({
      path: 'data.txt',
      content: Buffer.from(require('crypto').randomBytes(1024 * 25))
    })

    console.log('\nAdded file:', path, cid)

    // Log out the added files metadata and cat the file from IPFS
    const data = await toBuffer(node.cat(cid))

    // Print out the files contents to console
    console.log(`\nFetched file content containing ${data.byteLength} bytes`)
  } catch (err) {
    // Log out the error
    console.log('File Processing Error:', err)
  }
  // After everything is done, shut the node down
  // We don't need to worry about catching errors here
  console.log('\n\nStopping the node')
  await node.stop()
})()
