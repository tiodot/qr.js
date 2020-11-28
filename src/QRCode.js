//实现一个最简单的二维码生成器 2-L模式
// 2-L 的数据为 [1, 44, 34] // 异常校验位，total, data

const EXP_TABLE = new Array(256)
const LOG_TABLE = new Array(256)

function initMathTable() {
  for (let i = 0; i < 8; i++) {
    EXP_TABLE[i] = 1 << i
  }
  for (let i = 8; i < 256; i++) {
    EXP_TABLE[i] =
      EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8]
  }
  for (let i = 0; i < 255; i++) {
    LOG_TABLE[EXP_TABLE[i]] = i
  }
}
initMathTable()
function getMathLog(n) {
  return LOG_TABLE[n]
}
function getMathExp(n) {
  n = n % 255
  if (n < 0) {
    n += 255
  }
  const exp = EXP_TABLE[n]
  if (exp === undefined) {
    console.log('n 有异常:', n)
  }
  return exp
}

class Polynomial {
  constructor(num = [], shift) {
    let offset = 0
    while (offset < num.length && num[offset] === 0) {
      offset++
    }
    this.num = new Array(num.length - offset + shift)
    for (let i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset]
    }
  }
  get(index) {
    return this.num[index]
  }
  getLength() {
    return this.num.length
  }
  multiply(e) {
    let num = new Array(this.getLength() + e.getLength() - 1)
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        const log = getMathLog(this.get(i)) + getMathLog(e.get(j))
        num[i + j] ^= getMathExp(log)
      }
    }
    return new Polynomial(num, 0)
  }
  mod(e) {
    if (this.getLength() - e.getLength() < 0) {
      return this
    }
    let ratio = getMathLog(this.get(0)) - getMathLog(e.get(0))
    let num = new Array(this.getLength())
    for (let i = 0; i < this.getLength(); i++) {
      num[i] = this.get(i)
    }
    for (let i = 0; i < e.getLength(); i++) {
      num[i] ^= getMathExp(getMathLog(e.get(i)) + ratio)
    }
    return new Polynomial(num, 0).mod(e)
  }
}

class QRCode {
  constructor(data) {
    this.data = data
    this.dataMode = 1 << 2 // 使用8bit-byte格式
    this.version = 2 // 使用version1 21 * 21 尺寸
    this.size = this.version * 4 + 17
    this.maskPattern = 7
    this.errorCorrectLevel = 1 // 1-L-01  0-M-00 3-Q-11 2-H-10
    // 生成二维数组存储数据
    this.modules = new Array(this.size)
    for (let i = 0; i < this.size; i++) {
      this.modules[i] = new Array(this.size).fill(null)
    }
  }
  make() {
    // 定位图案
    this.setPositionDetectionPattern()
    // 对齐图案
    this.setAlignmentPattern()
    // 时序图案
    this.setTimingPattern()
    // 版本信息&格式信息
    this.setTypeInfo()
    // 数据码&纠错码
    this.mapData(this.createData())
    return this.modules
  }
  // 三个角上面的定位图片, 左上，右上，左下
  /*
   [1, 1, 1, 1, 1, 1, 1]
   [1, 0, 0, 0, 0, 0, 1]
   [1, 0, 1, 1, 1, 0, 1]
   [1, 0, 1, 1, 1, 0, 1]
   [1, 0, 1, 1, 1, 0, 1]
   [1, 0, 0, 0, 0, 0, 1]
   [1, 1, 1, 1, 1, 1, 1]
   */
  setPositionDetectionPattern() {
    // 还需要处理各个白边情况
    const detection = [
      [1, 1, 1, 1, 1, 1, 1, 0],
      [1, 0, 0, 0, 0, 0, 1, 0],
      [1, 0, 1, 1, 1, 0, 1, 0],
      [1, 0, 1, 1, 1, 0, 1, 0],
      [1, 0, 1, 1, 1, 0, 1, 0],
      [1, 0, 0, 0, 0, 0, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ]
    // 根据detection数组替换modules中对应位置的0 -> 1
    for (let r = 0; r <= 7; r++) {
      const positions = detection[r]
      const row = this.modules[r]
      const lastRow = this.modules[this.size - r - 1]
      for (let c = 0; c <= 7; c++) {
        const val = positions[c]
        const lastCol = this.size - c - 1
        // 左上角
        row[c] = val
        // 右上角
        row[lastCol] = val
        // 左下角
        lastRow[c] = val
      }
    }
  }

  // 对齐图案，位置由 POSITION_TABLE 提供, 形式为
  /*
    [1,1,1,1,1]
    [1,0,0,0,1],
    [1,0,1,0,1]
    [1,0,0,0,1]
    [1,1,1,1,1]
   */
  setAlignmentPattern() {
    const POSITION_TABLE = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]]
    const [row, col] = POSITION_TABLE[this.version - 1]
    // 修改位置
    if (!row || !col) {
      throw new Error('版本', this.version, '不支持')
    }
    // [6, 18]表示的是组合，因为右上，坐上，左下都已经有定位图案，故只需要考虑 右下一种组合
    // 对齐图案的中心点为 col 和 col
    // 对应的起点位置为 col - 2, col - 2
    const alignment = [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
    ]
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const pRow = r + col - 2
        const pCol = c + col - 2
        this.modules[pRow][pCol] = alignment[r][c]
      }
    }
  }
  // 时序图案，连接三个定位图案的线
  setTimingPattern() {
    for (let i = 8; i < this.size - 8; i++) {
      // 正好是下标为偶数时需要为1
      const flag = (i - 1) % 2
      // 设置连接顶部两个定位图案的线
      this.modules[6][i] = flag
      // 设置连接左边两个定位图案的线
      this.modules[i][6] = flag
    }
  }

  // 设置二维码的格式信息，包含 5bits 的数据位 + 10bits 纠错位
  setTypeInfo() {
    // 数据位为 2bits 纠错等级 + 3bits蒙版
    // 通过位操作，a<<b a向左移动b位，例如 01 << 3 => 01000，后面三位位蒙版 可以通过 或操作直接添加
    const data = (this.errorCorrectLevel << 3) | this.maskPattern
    // 通过数据位 计算纠错位
    const bits = this.getBCHTypeInfo(data)
    // 设置格式信息，需要横向和纵向设置两次
    for (let i = 0; i < 15; i++) {
      // 当前位置的值
      const flag = (bits >> i) & 1
      // 横向设置
      if (i < 8) {
        this.modules[8][this.size - i - 1] = flag
      } else if (i < 9) {
        // 8 位置前还有一个对齐线
        this.modules[8][15 - i - 1 + 1] = flag
      } else {
        this.modules[8][15 - i - 1] = flag
      }
      // 设置纵向
      if (i < 6) {
        this.modules[i][8] = flag
      } else if (i < 8) {
        this.modules[i + 1][8] = flag
      } else {
        this.modules[this.size - 15 + i][8] = flag
      }
    }
    // 有个固定位置的黑块
    this.modules[this.size - 8][8] = 1
  }
  getBCHTypeInfo(data) {
    // 有10bits的纠错位
    let d = data << 10
    // 计算二进制数据的最大位数，
    const getBCHDigit = (num) => {
      let digit = 0
      while (num != 0) {
        digit++
        // 无符号右移， num = num >>> 1, 可以简单理解为抛弃小数位的除法操作
        num >>>= 1
      }
      return digit
    }
    // 不知道为啥要定义 G15 和 G15_MASK
    const G15 =
      (1 << 10) |
      (1 << 8) |
      (1 << 5) |
      (1 << 4) |
      (1 << 2) |
      (1 << 1) |
      (1 << 0)
    const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1)
    const G15Digit = getBCHDigit(G15)

    while (getBCHDigit(d) - G15Digit >= 0) {
      d ^= G15 << (getBCHDigit(d) - G15Digit)
    }
    // 最终得到的d为 10 的纠错码
    return ((data << 10) | d) ^ G15_MASK
  }

  createData() {
    // 实现的是 2-L 版本，直接可以查表格
    const rsBlocks = { totalCount: 44, dataCount: 34 }
    // 生成二进制数据
    let binaryData = ''
    // 编码数据格式
    binaryData += getBinary(this.dataMode, 4)
    // 数据长度
    binaryData += getBinary(this.data.length, 8)
    // 写入数据
    for (let i = 0; i < this.data.length; i++) {
      binaryData += getBinary(this.data.charCodeAt(i), 8)
    }
    const dataCount = rsBlocks.dataCount * 8
    if (binaryData.length > dataCount) {
      throw new Error('code length overflow')
    }
    // 结束符
    if (binaryData.length <= dataCount + 4) {
      binaryData += getBinary(0, 4)
    }
    if (binaryData.length % 8) {
      binaryData += getBinary('0', 8 - (binaryData.length % 8))
    }
    while (true) {
      if (binaryData.length >= dataCount) {
        break
      }
      binaryData += getBinary(0xec, 8)
      if (binaryData.length >= dataCount) {
        break
      }
      binaryData += getBinary(0x11, 8)
    }
    // 结合多项式生成最终的二维码数据
    // 通过二进制，生成数据
    const buffer = new Array(rsBlocks.dataCount)
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = 0xff & Number('0b' + binaryData.slice(i * 8, (i + 1) * 8))
    }

    const rsPoly = getErrorCorrectPolynomial(
      rsBlocks.totalCount - rsBlocks.dataCount
    )
    const rawPoly = new Polynomial(buffer, rsPoly.getLength() - 1)

    const modPoly = rawPoly.mod(rsPoly)

    const errorBuffer = new Array(rsPoly.getLength() - 1)
    for (let i = 0; i < errorBuffer.length; i++) {
      const modIndex = i + modPoly.getLength() - errorBuffer.length
      errorBuffer[i] = modIndex >= 0 ? modPoly.get(modIndex) : 0
    }
    // 生成数据
    return [...buffer, ...errorBuffer]
  }
  mapData(data) {
    let inc = -1
    let row = this.size - 1
    let bitIndex = 7
    let byteIndex = 0

    for (let col = row; col > 0; col -= 2) {
      if (col == 6) col--

      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[row][col - c] == null) {
            let dark = false

            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >>> bitIndex) & 1) == 1
            }

            let mask = getMask(this.maskPattern, row, col - c)

            if (mask) {
              dark = !dark
            }

            this.modules[row][col - c] = Number(dark)
            bitIndex--

            if (bitIndex == -1) {
              byteIndex++
              bitIndex = 7
            }
          }
        }

        row += inc

        if (row < 0 || this.size <= row) {
          row -= inc
          inc = -inc
          break
        }
      }
    }
  }
}

function getBinary(num, length) {
  const long = '00000000000000000000000000000000'
  const binary = num.toString(2)
  if (binary.length < length) {
    return long.slice(0, length - binary.length) + binary
  }
  return binary
}

function getErrorCorrectPolynomial(length) {
  let a = new Polynomial([1], 0)
  for (let i = 0; i < length; i++) {
    a = a.multiply(new Polynomial([1, getMathExp(i)], 0))
  }
  return a
}

function getMask(maskPattern, i, j) {
  switch (maskPattern) {
    case 0:
      return (i + j) % 2 == 0
    case 1:
      return i % 2 == 0
    case 2:
      return j % 3 == 0
    case 3:
      return (i + j) % 3 == 0
    case 4:
      return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0
    case 5:
      return ((i * j) % 2) + ((i * j) % 3) == 0
    case 6:
      return (((i * j) % 2) + ((i * j) % 3)) % 2 == 0
    case 7:
      return (((i * j) % 3) + ((i + j) % 2)) % 2 == 0

    default:
      throw new Error('bad maskPattern:' + maskPattern)
  }
}

module.exports = QRCode
