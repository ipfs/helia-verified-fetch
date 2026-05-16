export function toExtendedAsciiString (id: Uint8Array): string {
  return String.fromCharCode(...id)
}

export function fromStringAsExtendedAscii (str: string): Uint8Array {
  const id = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) {
    id[i] = str.charCodeAt(i)
  }
  return id
}

export function constrainToExtendedAscii (str: string): string {
  return toExtendedAsciiString(fromStringAsExtendedAscii(str))
}
