# js-datastore-s3

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![Build Status](https://travis-ci.org/ipfs/js-datastore-s3.svg)](https://travis-ci.org/ipfs/js-datastore-s3) [![Circle CI](https://circleci.com/gh/ipfs/js-datastore-s3.svg?style=svg)](https://circleci.com/gh/ipfs/js-datastore-s3)
[![Coverage Status](https://coveralls.io/repos/github/ipfs/js-datastore-s3/badge.svg?branch=master)](https://coveralls.io/github/ipfs/js-datastore-s3?branch=master) [![Dependency Status](https://david-dm.org/diasdavid/js-peer-id.svg?style=flat-square)](https://david-dm.org/ipfs/js-datastore-s3)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
![](https://img.shields.io/badge/npm-%3E%3D3.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D4.0.0-orange.svg?style=flat-square)

> Datastore implementation backed by s3.

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
A bucket must be created prior to using datastore-s3. Please see the AWS docs for information on how to configure the S3 instance. A bucket name is required to be set at the s3 instance level, see the below example.

```js
const S3 = require('aws-sdk').S3
const s3Instance = new S3({ params: { Bucket: 'my-ipfs-bucket' } }) 
const S3Store = require('datastore-s3')
const store = new S3Store('.ipfs/datastore', { 
  s3: s3Instance 
})     
```

## Contribute

PRs accepted.

Small note: If editing the Readme, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

MIT 2018 © IPFS
