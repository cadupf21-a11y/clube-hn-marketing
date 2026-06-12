// Gera os icones PWA (public/icons) como PNGs simples (fundo + letra "H"),
// sem depender de bibliotecas externas de imagem.
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const BG = [15, 23, 42, 255] // slate-900
const FG = [255, 255, 255, 255] // white

function buildPixels(size) {
  const pixels = Buffer.alloc(size * size * 4)

  const barWidth = Math.round(size * 0.14)
  const leftX = Math.round(size * 0.24)
  const rightX = Math.round(size * 0.62)
  const barTop = Math.round(size * 0.22)
  const barBottom = Math.round(size * 0.78)
  const midTop = Math.round(size * 0.43)
  const midBottom = midTop + barWidth

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      let color = BG

      const inLeftBar = x >= leftX && x < leftX + barWidth && y >= barTop && y < barBottom
      const inRightBar = x >= rightX && x < rightX + barWidth && y >= barTop && y < barBottom
      const inMidBar = x >= leftX && x < rightX + barWidth && y >= midTop && y < midBottom

      if (inLeftBar || inRightBar || inMidBar) {
        color = FG
      }

      pixels[idx] = color[0]
      pixels[idx + 1] = color[1]
      pixels[idx + 2] = color[2]
      pixels[idx + 3] = color[3]
    }
  }

  return pixels
}

function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function buildPNG(size) {
  const pixels = buildPixels(size)

  // adiciona o byte de filtro (0) no inicio de cada linha
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const idat = zlib.deflateSync(raw)
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const outDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

for (const size of [192, 512]) {
  const png = buildPNG(size)
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), png)
  console.log(`gerado icon-${size}.png (${png.length} bytes)`)
}
