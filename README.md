# js-datastore-s3

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](https://protocol.ai/)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Build Status](https://travis-ci.com/ipfs/js-datastore-s3.svg)](https://travis-ci.com/ipfs/js-datastore-s3) [![codecov](https://codecov.io/gh/ipfs/js-datastore-s3/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs/js-datastore-s3)
[![Dependency Status](https://david-dm.org/diasdavid/js-peer-id.svg?style=flat-square)](https://david-dm.org/ipfs/js-datastore-s3)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> Datastore implementation backed by s3.

## Lead Maintainer
[Jacob Heun](https://github.com/jacobheun)

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Contribute](#contribute)
- [License](#license)

## Install

```
$ npm install datastore-s3
```

## Usage
If the flag `createIfMissing` is not set or is false, then the bucket must be created prior to using datastore-s3. Please see the AWS docs for information on how to configure the S3 instance. A bucket name is required to be set at the s3 instance level, see the below example.

```js
const S3 = require('aws-sdk').S3
const s3Instance = new S3({ params: { Bucket: 'my-ipfs-bucket' } })
const S3Store = require('datastore-s3')
const store = new S3Store('.ipfs/datastore', {
  s3: s3Instance
  createIfMissing: false
})
```

### Create a Repo
You can quickly create an S3 backed repo using the `createRepo` convenience function.

```js
const IPFS = require('ipfs')
const { createRepo } = require('datastore-s3')

const ipfs = new IPFS({
  repo: createRepo({
    path: '/my/ipfs'
  }, {
    bucket: 'MyS3Bucket'
  })
})
```

### Examples
You can see examples of S3 backed ipfs in the [examples folder](examples/)

## Contribute

PRs accepted.

Small note: If editing the Readme, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

MIT 2018 © IPFS
