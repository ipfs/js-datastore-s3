Full S3 Repo
======

This example leverages the code from https://github.com/ipfs-examples/js-ipfs-examples/tree/master/examples/ipfs-101,
but uses an instantiated S3 instance to serve as the entire backend for ipfs.

## Running
The S3 parameters must be updated with an existing Bucket and credentials with access to it:
```js
const s3 = new S3({
  params: {
    Bucket: 'my-bucket'
  },
  accessKeyId: 'myaccesskey',
  secretAccessKey: 'mysecretkey'
})
```

Once the S3 instance has its needed data, you can run the example:
```
npm install
node index.js
```
