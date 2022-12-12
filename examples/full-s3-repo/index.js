import IPFS from 'ipfs-core'
import toBuffer from 'it-to-buffer'
import { createS3Repo } from './create-s3-repo'
import S3 from 'aws-sdk/clients/s3.js'
import { S3Lock } from './s3-lock'

const bucket = 'my-bucket'

async function main() {
  // Configure S3 as normal
  const s3 = new S3({
    accessKeyId: 'myaccesskey',
    secretAccessKey: 'mysecretkey'
  })

  // Prevents concurrent access to the repo, you can also use the memory or fs locks
  // bundled with ipfs-repo though they will not prevent processes running on two
  // machines accessing the same repo in parallel
  const repoLock = new S3Lock(s3, bucket)

  // Create the repo
  const s3Repo = createS3Repo('/', s3, bucket, repoLock)

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
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
