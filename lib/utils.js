var _ = require('underscore')
  , expect = require('chai').expect

// This reads PCM bytes from a readable `stream`, and uses a `BufferDecoder` to decode it.
// `format` is the same as for `BufferDecoder`.
// You can pull a decoded block from the stream by calling the method `pullBlock(done)`.
// Where `done` is a callback `done(err, block)`
var StreamDecoder = module.exports.StreamDecoder = function(stream, format, opts) {
  opts = this.opts = _.defaults(opts || {}, {
    // Size of one block in frames
    blockSize: null
  })
  var blockSize = opts.blockSize || 1024
  this.stream = stream
  this.format = format
  this._decoder = new BufferDecoder(format)
  this._byteBlockSize = blockSize * Math.round(format.bitDepth / 8) * format.numberOfChannels
  this.closed = false
}

_.extend(StreamDecoder.prototype, {

  pullBlock: function(done) {
    var self = this
      , data = this.stream.read(this._byteBlockSize) || this.stream.read()

    // If there's not enough data buffered in the stream,
    // we need to request more
    if (data === null) {
      var onEnd = function() {
        self.stream.removeListener('readable', onReadable)
        self.close()
        done(null, null)
      }
      var onReadable = function() {
        self.stream.removeListener('end', onEnd)
        self.pullBlock(done)
      }
      this.stream.once('end', onEnd)
      this.stream.once('readable', onReadable)

    // If there's enough, we just "return" it
    } else done(null, self._decoder(data))
  },

  close: function() {
    this.closed = true
  }

})

// This writes blocks to a writable `stream`. The PCM data in the stream is encoded using a `BufferEncoder`.
// `format` is the same as for `BufferEncoder`.
// You can push a block to the stream by calling the method `pushBlock(block, done)`.
// Where `done` is a callback `done(err)` which is called when it's safe to write again.
var StreamEncoder = module.exports.StreamEncoder = function(stream, format, opts) {
  this.stream = stream
  this.format = format
  this._encoder = new BufferEncoder(format)
}

_.extend(StreamEncoder.prototype, {

  pushBlock: function(block, done) {
    var bufferFree = this.stream.write(this._encoder(block))
    if (bufferFree) done()
    else this.stream.once('drain', done)
  }

})

// Creates and returns a function which decodes node `Buffer`
// to an array of `Float32Array`, each corresponding to one channel.
// `format` configures the decoder, and should contain `bitDepth` and `numberOfChannels`.
// !!! If the data contains some incomplete samples they will be dropped
// TODO : format.signed, pcmMax is different if unsigned
var BufferDecoder = module.exports.BufferDecoder = function(format) {
  format = validateFormat(format)
  var byteDepth = Math.round(format.bitDepth / 8)
    , numberOfChannels = format.numberOfChannels
    , pcmMax = Math.pow(2, format.bitDepth) / 2 - 1
    , decodeFunc = 'readInt' + (format.signed ? '' : 'U') + format.bitDepth + format.endianness
    , i, ch, chArray, array, frameCount

  return function(data) {
    frameCount = Math.round(data.length / (byteDepth * numberOfChannels))
    array = []

    // Push samples to each channel
    for (ch = 0; ch < numberOfChannels; ch++) {
      chArray = new Float32Array(frameCount)
      array.push(chArray)
      for (i = 0; i < frameCount; i++)
        chArray[i] = data[decodeFunc](byteDepth * (i * numberOfChannels + ch)) / pcmMax
    }
    return array
  }
}

// Creates and returns a function which encodes an array of Float32Array - each of them
// a separate channel - to a node `Buffer`.
// `format` configures the encoder, and should contain `bitDepth` and `numberOfChannels`.
// !!! This does not check that the data received matches the specified 'format'.
// TODO : format.signed, pcmMax is different if unsigned
var BufferEncoder = module.exports.BufferEncoder = function(format) {
  format = validateFormat(format)
  var byteDepth = Math.round(format.bitDepth / 8)
    , numberOfChannels = format.numberOfChannels
    , pcmMult = Math.pow(2, format.bitDepth) / 2
    , pcmMax = pcmMult - 1
    , pcmMin = -pcmMult
    , encodeFunc = 'writeInt' + (format.signed ? '' : 'U') + format.bitDepth + format.endianness
    , i, ch, chArray, buffer, frameCount

  return function(array) {
    frameCount = array[0].length
    buffer = new Buffer(frameCount * byteDepth * numberOfChannels)

    for (ch = 0; ch < numberOfChannels; ch++) {
      chArray = array[ch]
      for (i = 0; i < frameCount; i++)
        buffer[encodeFunc](Math.min(Math.round(chArray[i] * pcmMult), pcmMax), byteDepth * (i * numberOfChannels + ch))
    }

    return buffer
  }
}

var makeBlock = module.exports.makeBlock = function(numberOfChannels, length) {
  var block = [], ch
  for (ch = 0; ch < numberOfChannels; ch++)
    block.push(new Float32Array(length))
  return block
}

var concatBlocks = module.exports.concatBlocks = function(block1, block2) {
  var numberOfChannels = block1.length
    , block1Length = block1[0].length
    , newBlock = makeBlock(numberOfChannels, block1Length + block2[0].length)
    , ch, chArray
  for (ch = 0; ch < numberOfChannels; ch++) {
    chArray = newBlock[ch]
    chArray.set(block1[ch])
    chArray.set(block2[ch], block1Length)
  }
  return newBlock
}

var sliceBlock = module.exports.sliceBlock = function(block) {
  var sliceArgs = _.toArray(arguments).slice(1)
  return block.map(function(chArray) {
    return chArray.slice.apply(chArray, sliceArgs)
  })
}

var validateFormat = module.exports.validateFormat = function(format) {
  _.defaults(format, {
    bitDepth: 16,
    endianness: 'LE',
    signed: true
  })

  expect(format.bitDepth).to.be.a('number')
    .and.to.satisfy(_oneOf([8, 16, 32]))

  expect(format.numberOfChannels).to.be.a('number')
    .and.to.be.above(0)

  expect(format.endianness).to.be.a('string')
    .and.to.satisfy(_oneOf(['LE', 'BE']))

  expect(format.signed).to.be.a('boolean')
  return format
}

var _oneOf = function(values) {
  return function(val) {
    return _.contains(values, val)
  }
}