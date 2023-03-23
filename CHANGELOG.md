## [11.0.0](https://github.com/ipfs/js-datastore-s3/compare/v10.0.1...v11.0.0) (2023-03-23)


### ⚠ BREAKING CHANGES

* this module is now ESM-only and uses the v3 @aws-sdk/s3-client

### Features

* convert to typescript and publish as ESM only ([#106](https://github.com/ipfs/js-datastore-s3/issues/106)) ([0f372e1](https://github.com/ipfs/js-datastore-s3/commit/0f372e180ae22d0c53eaeedcf3975007e1f12466))

## [10.0.1](https://github.com/ipfs/js-datastore-s3/compare/v10.0.0...v10.0.1) (2022-10-18)


### Dependencies

* bump it-filter from 1.0.3 to 2.0.0 ([#79](https://github.com/ipfs/js-datastore-s3/issues/79)) ([edb6264](https://github.com/ipfs/js-datastore-s3/commit/edb6264e61c0bcde9e10afb66f80077dca3ad769))
* bump it-to-buffer from 2.0.2 to 3.0.0 ([#80](https://github.com/ipfs/js-datastore-s3/issues/80)) ([fa9bf96](https://github.com/ipfs/js-datastore-s3/commit/fa9bf963ab0a14bb43d729fd9aecf67e7c9cc437))
* bump uint8arrays from 3.1.1 to 4.0.2 ([#78](https://github.com/ipfs/js-datastore-s3/issues/78)) ([53af2c6](https://github.com/ipfs/js-datastore-s3/commit/53af2c61cfa72e7e3aa823e6fd41da0c91d99027))
* bump uint8arrays to 4.0.3 ([40a1444](https://github.com/ipfs/js-datastore-s3/commit/40a1444c37d4f71c73f4bfc8dd5a131691ac4391))

## [10.0.0](https://github.com/ipfs/js-datastore-s3/compare/v9.0.0...v10.0.0) (2022-08-12)


### ⚠ BREAKING CHANGES

* this module used to be published as ESM/CJS now it is just ESM

### Features

* publish as ESM only ([#75](https://github.com/ipfs/js-datastore-s3/issues/75)) ([dca5704](https://github.com/ipfs/js-datastore-s3/commit/dca57045fa52498245c6e85c2c03cf9a6a9ff177))


### Trivial Changes

* Update .github/workflows/stale.yml [skip ci] ([b6cbc38](https://github.com/ipfs/js-datastore-s3/commit/b6cbc38b2d8d9dfad58bcaefd21621cd48345263))

## [9.0.0](https://github.com/ipfs/js-datastore-s3/compare/v8.0.0...v9.0.0) (2022-01-19)


### ⚠ BREAKING CHANGES

* updates config to use unified ci

### Trivial Changes

* fix IPFS-101 example URL ([#40](https://github.com/ipfs/js-datastore-s3/issues/40)) ([0044df3](https://github.com/ipfs/js-datastore-s3/commit/0044df35dbc6fd2a2b01eaaf9e9432796fd9525e))
* switch to unified ci ([#41](https://github.com/ipfs/js-datastore-s3/issues/41)) ([a969b40](https://github.com/ipfs/js-datastore-s3/commit/a969b404293ca6122ce8d26c000e36724e8186fd))

# [8.0.0](https://github.com/ipfs/js-datastore-s3/compare/v7.0.0...v8.0.0) (2021-09-09)


### chore

* switch to esm ([#37](https://github.com/ipfs/js-datastore-s3/issues/37)) ([25f4dce](https://github.com/ipfs/js-datastore-s3/commit/25f4dceaf3e6678756b4c93b56a082c0282cc9f6))


### BREAKING CHANGES

* only uses named exports



# [7.0.0](https://github.com/ipfs/js-datastore-s3/compare/v6.0.0...v7.0.0) (2021-08-20)



# [6.0.0](https://github.com/ipfs/js-datastore-s3/compare/v4.0.0...v6.0.0) (2021-07-06)


### chore

* update deps ([be4fec6](https://github.com/ipfs/js-datastore-s3/commit/be4fec68ba1854acab5d2eec24f2719f685546fd))


### Features

* split .query into .query and .queryKeys ([#34](https://github.com/ipfs/js-datastore-s3/issues/34)) ([29423d1](https://github.com/ipfs/js-datastore-s3/commit/29423d13acc4ca137f9708578fe50764b33e0970))


### BREAKING CHANGES

* uses new interface-datastore types



# [5.0.0](https://github.com/ipfs/js-datastore-s3/compare/v4.0.0...v5.0.0) (2021-04-15)


### Features

* split .query into .query and .queryKeys ([#34](https://github.com/ipfs/js-datastore-s3/issues/34)) ([29423d1](https://github.com/ipfs/js-datastore-s3/commit/29423d13acc4ca137f9708578fe50764b33e0970))



# [4.0.0](https://github.com/ipfs/js-datastore-s3/compare/v3.0.0...v4.0.0) (2021-04-12)



<a name="3.0.0"></a>
# [3.0.0](https://github.com/ipfs/js-datastore-s3/compare/v2.0.0...v3.0.0) (2020-09-22)


### Bug Fixes

* convert input to buffers before passing to aws-sdk ([#30](https://github.com/ipfs/js-datastore-s3/issues/30)) ([b844c63](https://github.com/ipfs/js-datastore-s3/commit/b844c63))


### BREAKING CHANGES

* - Returns Uint8Arrays only where before it was node Buffers

* chore: configure pin store

* docs: update example

Co-authored-by: Jacob Heun <jacobheun@gmail.com>



<a name="2.0.0"></a>
# [2.0.0](https://github.com/ipfs/js-datastore-s3/compare/v1.0.0...v2.0.0) (2020-06-19)



<a name="1.0.0"></a>
# [1.0.0](https://github.com/ipfs/js-datastore-s3/compare/v0.3.0...v1.0.0) (2020-05-08)


### Bug Fixes

* **ci:** add empty commit to fix lint checks on master ([4251456](https://github.com/ipfs/js-datastore-s3/commit/4251456))


### Features

* adds interface-datastore streaming api ([6c74394](https://github.com/ipfs/js-datastore-s3/commit/6c74394))



<a name="0.3.0"></a>
# [0.3.0](https://github.com/ipfs/js-datastore-s3/compare/v0.2.4...v0.3.0) (2019-08-15)


### Code Refactoring

* callbacks -> async / await ([#17](https://github.com/ipfs/js-datastore-s3/issues/17)) ([629dba7](https://github.com/ipfs/js-datastore-s3/commit/629dba7))


### BREAKING CHANGES

* All places in the API that used callbacks are now replaced with async/await



<a name="0.2.4"></a>
## [0.2.4](https://github.com/ipfs/js-datastore-s3/compare/v0.2.3...v0.2.4) (2019-03-27)


### Bug Fixes

* **create-repo:** pass sub paths in repo to each store ([1113c61](https://github.com/ipfs/js-datastore-s3/commit/1113c61))



<a name="0.2.3"></a>
## [0.2.3](https://github.com/ipfs/js-datastore-s3/compare/v0.2.2...v0.2.3) (2019-02-14)


### Bug Fixes

* aws-sdk should be a peer dependency ([836355c](https://github.com/ipfs/js-datastore-s3/commit/836355c))



<a name="0.2.2"></a>
## [0.2.2](https://github.com/ipfs/js-datastore-s3/compare/v0.2.1...v0.2.2) (2019-02-14)


### Features

* add createRepo utility ([0f5021c](https://github.com/ipfs/js-datastore-s3/commit/0f5021c))



<a name="0.2.1"></a>
## [0.2.1](https://github.com/ipfs/js-datastore-s3/compare/v0.2.0...v0.2.1) (2019-02-07)


### Bug Fixes

* use once to prevent multiple callback calls ([db99ae8](https://github.com/ipfs/js-datastore-s3/commit/db99ae8))


### Features

* have the s3 lock cleanup gracefully ([7f6b2c8](https://github.com/ipfs/js-datastore-s3/commit/7f6b2c8))



<a name="0.2.0"></a>
# 0.2.0 (2018-10-01)


### Bug Fixes

* **flow:** make flow pass and fix query abort call ([46e8e5e](https://github.com/ipfs/js-datastore-s3/commit/46e8e5e))
* add windows support ([feaed0d](https://github.com/ipfs/js-datastore-s3/commit/feaed0d))
* linting ([e00974f](https://github.com/ipfs/js-datastore-s3/commit/e00974f))
* resolve an issue where a new repo wouldnt init properly ([104d6e9](https://github.com/ipfs/js-datastore-s3/commit/104d6e9))


### Features

* add basic error codes and update test ([#8](https://github.com/ipfs/js-datastore-s3/issues/8)) ([31ba28a](https://github.com/ipfs/js-datastore-s3/commit/31ba28a))
* add querying and make all tests pass ([0c89c78](https://github.com/ipfs/js-datastore-s3/commit/0c89c78))
* initial featureset aside from querying ([b710421](https://github.com/ipfs/js-datastore-s3/commit/b710421))



<a name="0.1.0"></a>
# 0.1.0 (2018-05-07)
