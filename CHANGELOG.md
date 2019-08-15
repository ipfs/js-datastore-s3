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
