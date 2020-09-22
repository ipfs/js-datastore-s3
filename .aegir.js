'use strict'

module.exports = {
  webpack: {
    node: {
      // needed by core-util-is
      Buffer: true,

      // needed by nofilter
      stream: true
    }
  }
}
