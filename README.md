# datastore-s3 <!-- omit in toc -->

[![ipfs.io](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io)
[![IRC](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Discord](https://img.shields.io/discord/806902334369824788?style=flat-square)](https://discord.gg/ipfs)
[![codecov](https://img.shields.io/codecov/c/github/ipfs/js-datastore-s3.svg?style=flat-square)](https://codecov.io/gh/ipfs/js-datastore-s3)
[![CI](https://img.shields.io/github/workflow/status/ipfs/js-datastore-s3/test%20&%20maybe%20release/master?style=flat-square)](https://github.com/ipfs/js-datastore-s3/actions/workflows/js-test-and-release.yml)

> IPFS datastore implementation backed by s3

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Usage](#usage)
  - [Create a Repo](#create-a-repo)
  - [Examples](#examples)
- [Contribute](#contribute)
- [License](#license)
- [Contribute](#contribute-1)

## Install

```console
$ npm i datastore-s3
```

## Usage

If the flag `createIfMissing` is not set or is false, then the bucket must be created prior to using datastore-s3. Please see the AWS docs for information on how to configure the S3 instance. A bucket name is required to be set at the s3 instance level, see the below example.

```js
import S3 from 'aws-sdk/clients/s3.js'
import { S3Datastore } from 'datastore-s3'

const s3Instance = new S3({ params: { Bucket: 'my-ipfs-bucket' } })
const store = new S3Datastore('.ipfs/datastore', {
  s3: s3Instance
  createIfMissing: false
})
```

### Create a Repo

See [examples/full-s3-repo](./examples/full-s3-repo) for how to quickly create an S3 backed repo using the `createRepo` convenience function.

### Examples

You can see examples of S3 backed ipfs in the [examples folder](examples/)

## Contribute

PRs accepted.

Small note: If editing the Readme, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/ipfs/js-ipfs-unixfs-importer/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/CONTRIBUTING.md)
