# ⛔️ This module is now part of https://github.com/ipfs/js-stores

# datastore-s3 <!-- omit in toc -->

[![ipfs.tech](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](https://ipfs.tech)
[![Discuss](https://img.shields.io/discourse/https/discuss.ipfs.tech/posts.svg?style=flat-square)](https://discuss.ipfs.tech)
[![codecov](https://img.shields.io/codecov/c/github/ipfs/js-datastore-s3.svg?style=flat-square)](https://codecov.io/gh/ipfs/js-datastore-s3)
[![CI](https://img.shields.io/github/actions/workflow/status/ipfs/js-datastore-s3/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/ipfs/js-datastore-s3/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> IPFS datastore implementation backed by s3

## Table of contents <!-- omit in toc -->

- [Install](#install)
  - [Browser `<script>` tag](#browser-script-tag)
- [Usage](#usage)
  - [Create a Repo](#create-a-repo)
  - [Examples](#examples)
- [License](#license)
- [Contribute](#contribute)

## Install

```console
$ npm i datastore-s3
```

### Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `DatastoreS3` in the global namespace.

```html
<script src="https://unpkg.com/datastore-s3/dist/index.min.js"></script>
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

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribute

Contributions welcome! Please check out [the issues](https://github.com/ipfs/js-datastore-s3/issues).

Also see our [contributing document](https://github.com/ipfs/community/blob/master/CONTRIBUTING_JS.md) for more information on how we work, and about contributing in general.

Please be aware that all interactions related to this repo are subject to the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/CONTRIBUTING.md)
