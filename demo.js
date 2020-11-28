function print(modules) {
  const black = '\033[40m  \033[0m'
  const white = '\033[47m  \033[0m'

  const rowLength = modules[0].length
  const border = Array(rowLength + 2)
    .fill(white)
    .join('')
  let output = border + '\n'

  modules.forEach((r) => {
    output += white
    output += r
      .map((i) => {
        if (i === null) return '  '
        return i ? black : white
      })
      .join('')
    output += white + '\n'
  })
  output += border
  console.log(output)
}

function printByUnicode(moduleData) {
  const WHITE_ALL = '\u2588'
  const WHITE_BLACK = '\u2580'
  const BLACK_WHITE = '\u2584'
  const BLACK_ALL = ' '
  moduleData = [...moduleData]
  const rowLength = moduleData[0].length

  const borderTop = Array(rowLength + 2)
    .fill(BLACK_WHITE)
    .join('')
  const borderBottom = Array(rowLength + 2)
    .fill(WHITE_BLACK)
    .join('')

  if (rowLength % 2) {
    moduleData.push(new Array(rowLength).fill(0))
  }

  let output = borderTop + '\n'
  for (let row = 0; row < rowLength; row += 2) {
    output += WHITE_ALL

    for (let col = 0; col < rowLength; col++) {
      if (!moduleData[row][col] && !moduleData[row + 1][col]) {
        output += WHITE_ALL
      } else if (!moduleData[row][col] && moduleData[row + 1][col]) {
        output += WHITE_BLACK
      } else if (moduleData[row][col] && !moduleData[row + 1][col]) {
        output += BLACK_WHITE
      } else {
        output += BLACK_ALL
      }
    }

    output += WHITE_ALL + '\n'
  }
  output += borderBottom
  console.log(output)
}

// printByUnicode([
//   [1, 0, 1, 0],
//   [0, 1, 0, 1],
//   [1, 0, 1, 0],
//   [0, 1, 0, 1],
// ])
// print([
//   [1, 0, 1, 0],
//   [0, 1, 0, 1],
//   [1, 0, 1, 0],
//   [0, 1, 0, 1],
// ])

const txt = 'hello world hello world'
const QRCode = require('./src/QRCode')

const modules = new QRCode(txt).make()
// console.log(modules)
print(modules)
// printByUnicode(modules)
