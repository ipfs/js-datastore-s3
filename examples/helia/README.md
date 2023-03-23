Use with Helia
======

This example uses a Datastore S3 instance to serve as the entire backend for Helia.

## Running
The S3 parameters must be updated with an existing Bucket and credentials with access to it:
```js
// Configure S3 as normal
const s3 = new S3({
  region: 'region',
  credentials: {
    accessKeyId: 'myaccesskey',
    secretAccessKey: 'mysecretkey'
  }
})

const datastore = new DatastoreS3(s3, 'my-bucket')
```

Once the S3 instance has its needed data, you can run the example:
```
npm install
node index.js
```
