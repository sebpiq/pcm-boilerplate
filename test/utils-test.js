var _ = require('underscore')
  , fs = require('fs')
  , PassThrough = require('stream').PassThrough
  , assert = require('assert')
  , async = require('async')
  , utils = require('../lib/utils')

describe('utils', function() {
  
  var durationSec = 2

  // Test cases for the files "steps-*-mono.raw"
  var testStepsMono = function(blocks, helpers) {
    assert.equal(_.reduce(blocks, function(mem, arr) { return mem + arr[0].length }, 0), 44100 * durationSec + 4410)
    blocks.forEach(function(block) { assert.equal(block.length, 1) })

    helpers.assertAllValuesApprox(blocks[0][0], -1)
    helpers.assertAllValuesApprox(blocks[1][0], -0.9)
    helpers.assertAllValuesApprox(blocks[2][0], -0.8)
    helpers.assertAllValuesApprox(blocks[3][0], -0.7)
    helpers.assertAllValuesApprox(blocks[4][0], -0.6)
    helpers.assertAllValuesApprox(blocks[5][0], -0.5)
    helpers.assertAllValuesApprox(blocks[6][0], -0.4)
    helpers.assertAllValuesApprox(blocks[7][0], -0.3)
    helpers.assertAllValuesApprox(blocks[8][0], -0.2)
    helpers.assertAllValuesApprox(blocks[9][0], -0.1)
    helpers.assertAllValuesApprox(blocks[10][0], 0)
    helpers.assertAllValuesApprox(blocks[11][0], 0.1)
    helpers.assertAllValuesApprox(blocks[12][0], 0.2)
    helpers.assertAllValuesApprox(blocks[13][0], 0.3)
    helpers.assertAllValuesApprox(blocks[14][0], 0.4)
    helpers.assertAllValuesApprox(blocks[15][0], 0.5)
    helpers.assertAllValuesApprox(blocks[16][0], 0.6)
    helpers.assertAllValuesApprox(blocks[17][0], 0.7)
    helpers.assertAllValuesApprox(blocks[18][0], 0.8)
    helpers.assertAllValuesApprox(blocks[19][0], 0.9)
    helpers.assertAllValuesApprox(blocks[20][0], 1)
  }

  // Test cases for the files "steps-*-stereo.raw"
  var testStepsStereo = function(blocks, helpers) {
    assert.equal(_.reduce(blocks, function(mem, arr) { return mem + arr[0].length }, 0), 44100 * durationSec + 4410)
    blocks.forEach(function(block) { assert.equal(block.length, 2) })

    helpers.assertAllValuesApprox(blocks[0][0], -1)
    helpers.assertAllValuesApprox(blocks[0][1], 1)
    helpers.assertAllValuesApprox(blocks[1][0], -0.9)
    helpers.assertAllValuesApprox(blocks[1][1], 0.9)
    helpers.assertAllValuesApprox(blocks[2][0], -0.8)
    helpers.assertAllValuesApprox(blocks[2][1], 0.8)
    helpers.assertAllValuesApprox(blocks[3][0], -0.7)
    helpers.assertAllValuesApprox(blocks[3][1], 0.7)
    helpers.assertAllValuesApprox(blocks[4][0], -0.6)
    helpers.assertAllValuesApprox(blocks[4][1], 0.6)
    helpers.assertAllValuesApprox(blocks[5][0], -0.5)
    helpers.assertAllValuesApprox(blocks[5][1], 0.5)
    helpers.assertAllValuesApprox(blocks[6][0], -0.4)
    helpers.assertAllValuesApprox(blocks[6][1], 0.4)
    helpers.assertAllValuesApprox(blocks[7][0], -0.3)
    helpers.assertAllValuesApprox(blocks[7][1], 0.3)
    helpers.assertAllValuesApprox(blocks[8][0], -0.2)
    helpers.assertAllValuesApprox(blocks[8][1], 0.2)
    helpers.assertAllValuesApprox(blocks[9][0], -0.1)
    helpers.assertAllValuesApprox(blocks[9][1], 0.1)

    helpers.assertAllValuesApprox(blocks[10][0], 0)
    helpers.assertAllValuesApprox(blocks[10][1], 0)

    helpers.assertAllValuesApprox(blocks[11][0], 0.1)
    helpers.assertAllValuesApprox(blocks[11][1], -0.1)
    helpers.assertAllValuesApprox(blocks[12][0], 0.2)
    helpers.assertAllValuesApprox(blocks[12][1], -0.2)
    helpers.assertAllValuesApprox(blocks[13][0], 0.3)
    helpers.assertAllValuesApprox(blocks[13][1], -0.3)
    helpers.assertAllValuesApprox(blocks[14][0], 0.4)
    helpers.assertAllValuesApprox(blocks[14][1], -0.4)
    helpers.assertAllValuesApprox(blocks[15][0], 0.5)
    helpers.assertAllValuesApprox(blocks[15][1], -0.5)
    helpers.assertAllValuesApprox(blocks[16][0], 0.6)
    helpers.assertAllValuesApprox(blocks[16][1], -0.6)
    helpers.assertAllValuesApprox(blocks[17][0], 0.7)
    helpers.assertAllValuesApprox(blocks[17][1], -0.7)
    helpers.assertAllValuesApprox(blocks[18][0], 0.8)
    helpers.assertAllValuesApprox(blocks[18][1], -0.8)
    helpers.assertAllValuesApprox(blocks[19][0], 0.9)
    helpers.assertAllValuesApprox(blocks[19][1], -0.9)
    helpers.assertAllValuesApprox(blocks[20][0], 1)
    helpers.assertAllValuesApprox(blocks[20][1], -1)
  }



  describe('StreamDecoder', function() {

    var concatArrayBuffers = function(arr1, arr2) {
      var newArray = new Float32Array(arr1.length + arr2.length)
      newArray.set(arr1)
      newArray.set(arr1, arr1.length)
    }

    var helpers = require('./helpers')({approx: 0.001})

    describe('pullBlock', function() {

      it('should decode a stream of PCM data', function(done) {
        var fileStream = fs.createReadStream(__dirname + '/sounds/steps-mono-16b-44khz.raw')
          , format = {bitDepth: 16, numberOfChannels: 1}
          // We get blocks of 100 ms
          , streamDecoder = new utils.StreamDecoder(fileStream, format, {blockSize: 4410})
          , blocks = []
          , getFrameCount = function() {
            return _.reduce(allBlocks, function(mem, arr) {
              return mem + arr[0].length
            }, 0)
          }

        async.whilst(
          function() { return blocks[blocks.length - 1] !== null },
          function(next) {
            streamDecoder.pullBlock(function(err, block) {
              assert.ok(!err)
              blocks.push(block)
              next()
            })
          },
          function(err) {
            assert.equal(streamDecoder.closed, true)
            assert.equal(blocks[blocks.length - 1], null)

            // Prepare data for the test case, slice it in blocks of 4410 samples
            blocks = _.reduce(blocks.slice(0, -1), function(mem, block) {
              return utils.concatBlocks(mem, block)
            }, [new Float32Array(0)])
            blocks = _.range(21).map(function(i) {
              return utils.sliceBlock(blocks, 4410 * i, 4410 * (i + 1))
            })
            testStepsMono(blocks, helpers)
            done()
          }
        )
      })

    })

  })

  describe('StreamEncoder', function() {

    var blockFilledWith = function(value, numberOfChannels, length) {
      var block = utils.makeBlock(numberOfChannels, length)
        , i
      block.forEach(function(chArray) {
        for (i = 0; i < length; i++) chArray[i] = value
      })
      return block
    }

    describe('pushBlock', function() {

      var helpers = require('./helpers')({approx: 11})

      it('should encode the pushed data', function(done) {
        var stream = new PassThrough({highWaterMark: (11 * 4410) * 2})
          , format = {bitDepth: 16, numberOfChannels: 1}
          , streamEncoder = new utils.StreamEncoder(stream, format)
          , dataEncoded = new Buffer(0)

        stream.on('readable', function() {
          dataEncoded = Buffer.concat([dataEncoded, stream.read()])
        })

        async.series([
          function(next) { streamEncoder.pushBlock(blockFilledWith(-1, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(-0.9, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(-0.8, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(-0.7, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(-0.6, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(-0.5, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(-0.4, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(-0.3, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(-0.2, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(-0.1, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(0, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(0.1, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(0.2, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(0.3, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(0.4, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(0.5, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(0.6, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(0.7, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(0.8, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(0.9, 1, 4410), next) },
          function(next) { streamEncoder.pushBlock(blockFilledWith(1, 1, 4410), next) }
        ], function(err) {
          if (err) throw err
          var dataLeft = stream.read()
          if (dataLeft) dataEncoded = Buffer.concat([dataEncoded, dataLeft])
          fs.readFile(__dirname + '/sounds/steps-mono-16b-44khz.raw', function(err, testData) {
            assert.equal(dataEncoded.length, testData.length)
            _.range(21 * 4410).forEach(function(i) {
              helpers.assertApproxEqual(dataEncoded.readInt16LE(i * 2), testData.readInt16LE(i * 2))
            })
          })
          done()
        })
      })

    })

  })

  describe('BufferDecoder', function() {
    
    var helpers = require('./helpers')({approx: 0.001})

    it('should decode 16-bits mono', function(done) {
      fs.readFile(__dirname + '/sounds/steps-mono-16b-44khz.raw', function(err, data) {
        if (err) throw err
        var decode = utils.BufferDecoder({bitDepth: 16, numberOfChannels: 1})
          , byteDepth = 2
          , bufSlice
          , blocks = _.range(21).map(function(i) {
            bufSlice = data.slice(4410 * byteDepth * i, 4410 * byteDepth * (i + 1))
            return decode(bufSlice)
          })

        testStepsMono(blocks, helpers)
        done()
      })
    })
    
    it('should decode 32-bits mono', function(done) {
      fs.readFile(__dirname + '/sounds/steps-mono-32b-44khz.raw', function(err, data) {
        if (err) throw err
        var decode = utils.BufferDecoder({bitDepth: 32, numberOfChannels: 1})
          , byteDepth = 4
          , bufSlice
          , blocks = _.range(21).map(function(i) {
            bufSlice = data.slice(4410 * byteDepth * i, 4410 * byteDepth * (i + 1))
            return decode(bufSlice)
          })

        testStepsMono(blocks, helpers)        
        done()
      })
    })

    it('should decode 16-bits stereo', function(done) {

      // Opening a wav file, not caring too much about the headers.
      fs.readFile(__dirname + '/sounds/steps-stereo-16b-44khz.raw', function(err, data) {
        if (err) throw err
        var numberOfChannels = 2
          , decode = utils.BufferDecoder({bitDepth: 16, numberOfChannels: numberOfChannels})
          , byteDepth = 2
          , bufSlice
          , blocks = _.range(21).map(function(i) {
            bufSlice = data.slice(4410 * byteDepth * numberOfChannels * i, 4410 * byteDepth * numberOfChannels * (i + 1))
            return decode(bufSlice)
          })

        testStepsStereo(blocks, helpers)
        done()
      })
    })

    it('should decode 32-bits stereo', function(done) {

      // Opening a wav file, not caring too much about the headers.
      fs.readFile(__dirname + '/sounds/steps-stereo-32b-44khz.raw', function(err, data) {
        if (err) throw err
        var numberOfChannels = 2
          , decode = utils.BufferDecoder({bitDepth: 32, numberOfChannels: numberOfChannels})
          , byteDepth = 4
          , bufSlice
          , blocks = _.range(21).map(function(i) {
            bufSlice = data.slice(4410 * byteDepth * numberOfChannels * i, 4410 * byteDepth * numberOfChannels * (i + 1))
            return decode(bufSlice)
          })
        
        testStepsStereo(blocks, helpers)
        done()
      })
    })

  })

  describe('BufferEncoder', function() {
    
    var helpers = require('./helpers')({approx: 10})

    it('should encode to 16-bits mono', function(done) {
      fs.readFile(__dirname + '/sounds/noise32values-mono-16b-44khz.raw', function(err, data) {
        if (err) throw err
        var encode = utils.BufferEncoder({bitDepth: 16, numberOfChannels: 1})
          , array = [[0.48, 0.12, 0.52, -0.04, 0.1, 0.44, -0.62, 0.42, 0.8,
                      -1, -0.84, 0.76, -0.18, 0.66, 0.14, -0.02, -0.62, -0.26,
                      -0.26, -0.88, -0.36, -0.46, 0.52, -0.38, -0.4, -0.16, 0.18,
                      -0.06, 0.12, 0.28, -0.46, -0.18]]
          , encoded = encode(array)
        assert.equal(encoded.length, data.length)
        assert.equal(encoded.length, 32 * 2)
        _.range(32).forEach(function(i) {
          helpers.assertApproxEqual(encoded.readInt16LE(i * 2), data.readInt16LE(i * 2))
        })
        done()
      })
    })

    it('should encode to 16-bits stereo', function(done) {
      fs.readFile(__dirname + '/sounds/noise32values-stereo-16b-44khz.raw', function(err, data) {
        if (err) throw err
        var encode = utils.BufferEncoder({bitDepth: 16, numberOfChannels: 2})
          , array = [[0.48, 0.12, 0.52, -0.04, 0.1, 0.44, -0.62, 0.42, 0.8, -1,
                      -0.84, 0.76, -0.18, 0.66, 0.14, -0.02, -0.62, -0.26, -0.26, -0.88,
                      -0.36, -0.46, 0.52, -0.38, -0.4, -0.16, 0.18, -0.06, 0.12, 0.28,
                      -0.46, -0.18],
                     [0.84, 0.32, -0.8, 0.46, -0.24, -0.12, 0.16, 0.7, -0.5, 0.54,
                       -0.62, 0.42, 0.6, 0.04, 0.66, -0.64, -0.8, -0.6, -0.08, -0.64,
                       0.58, 0.96, -0.36, -0.78, 0.58, 0.28, -0.66, -0.28, -0.94, 0.1,
                       0.1, 0.64]]
          , encoded = encode(array)
        assert.equal(encoded.length, data.length)
        assert.equal(encoded.length, 32 * 2 * 2)
        _.range(64).forEach(function(i) {
          helpers.assertApproxEqual(encoded.readInt16LE(i * 2), data.readInt16LE(i * 2))
        })
        done()
      })
    })
    
  })

  describe('concatBlocks', function() {
    
    it('should concatenate 2 blocks into one', function() {
      var block1, block2, newBlock
      block1 = utils.makeBlock(2, 3) // 2 channels, 3 frames
      block2 = utils.makeBlock(2, 2) // 2 channels, 2 frames
      for (var i = 0; i < 3; i++) block1[0][i] = 66
      for (var i = 0; i < 3; i++) block1[1][i] = 77
      for (var i = 0; i < 2; i++) block2[0][i] = 88
      for (var i = 0; i < 2; i++) block2[1][i] = 99
      newBlock = utils.concatBlocks(block1, block2)
      assert.equal(newBlock.length, 2)
      assert.equal(newBlock[0].length, 5)
      assert.equal(newBlock[1].length, 5)
      assert.deepEqual(_.toArray(newBlock[0]), [66, 66, 66, 88, 88])
      assert.deepEqual(_.toArray(newBlock[1]), [77, 77, 77, 99, 99])
    })

  })

  describe('sliceBlock', function() {
    
    it('should slice block', function() {
      var block = utils.makeBlock(3, 5) // 3 channels, 5 frames
        , slice1, slice2
      for (var i = 0; i < 5; i++) block[0][i] = 11 * (i + 1)
      for (var i = 0; i < 5; i++) block[1][i] = 111 * (i + 1)
      for (var i = 0; i < 5; i++) block[2][i] = 1111 * (i + 1)

      slice1 = utils.sliceBlock(block, 1)
      assert.equal(slice1.length, 3)
      assert.deepEqual(_.toArray(slice1[0]), [22, 33, 44, 55])
      assert.deepEqual(_.toArray(slice1[1]), [222, 333, 444, 555])
      assert.deepEqual(_.toArray(slice1[2]), [2222, 3333, 4444, 5555])

      slice2 = utils.sliceBlock(block, 0, 2)
      assert.equal(slice2.length, 3)
      assert.deepEqual(_.toArray(slice2[0]), [11, 22])
      assert.deepEqual(_.toArray(slice2[1]), [111, 222])
      assert.deepEqual(_.toArray(slice2[2]), [1111, 2222])
    })

  })

  describe('validateFormat', function() {

    it('should validate valid formats', function() {
      assert.ok(utils.validateFormat({bitDepth: 8, endianness: 'LE', signed: false, numberOfChannels: 2}))
      assert.ok(utils.validateFormat({bitDepth: 16, endianness: 'BE', signed: true, numberOfChannels: 1}))
      assert.ok(utils.validateFormat({bitDepth: 32, endianness: 'LE', signed: true, numberOfChannels: 3}))
    })

    it('should reject invalid formats', function() {
      assert.throws(function() {
        utils.validateFormat({bitDepth: 8, endianness: 'ii', signed: false, numberOfChannels: 2})
      })
      assert.throws(function() {
        utils.validateFormat({bitDepth: 17, endianness: 'LE', signed: false, numberOfChannels: 2})
      })
      assert.throws(function() {
        utils.validateFormat({bitDepth: 8, endianness: 'LE', signed: '9', numberOfChannels: 2})
      })
      assert.throws(function() {
        utils.validateFormat({bitDepth: 8, endianness: 'LE', signed: false, numberOfChannels: 0})
      })
    })

    it('should set defaults', function() {
      var format = {numberOfChannels: 3}
      utils.validateFormat(format)
      assert.equal(format.numberOfChannels, 3)
      assert.equal(format.signed, true)
      assert.equal(format.bitDepth, 16)
      assert.equal(format.endianness, 'LE')
    })

  })

})