/* @flow */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const Key = require('interface-datastore').Key
const utils = require('interface-datastore').utils
const ShardingStore = require('datastore-core').ShardingDatastore
const sh = require('datastore-core').shard

const S3Store = require('../src')

describe('S3Datastore', () => {

})
