const to_hex_array = [];
const to_byte_map = {};

for (let ord = 0; ord <= 0xff; ord++) {
    let s = ord.toString(16);
    if (s.length < 2) {
        s = "0" + s;
    }
    to_hex_array.push(s);
    to_byte_map[s] = ord;
}

function bytesToHex(buffer) {
    const hex_array = [];
    for (let i = 0; i < buffer.byteLength; i++) {
        hex_array.push(to_hex_array[buffer[i]]);
    }
    return hex_array.join("");
}

function hexToBytes(s) {
    s = s.toLowerCase();
    const length2 = s.length;
    if (length2 % 2 !== 0) {
        throw "hex string must have length a multiple of 2";
    }
    const length = length2 / 2;
    const result = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        const i2 = i * 2;
        const b = s.substring(i2, i2 + 2);
        if (!to_byte_map.hasOwnProperty(b)) throw new Error('invalid hex character ' + b);
        result[i] = to_byte_map[b];
    }
    return result;
}

export class AdnlAddress {

  constructor(anyForm) {
    if (!anyForm) throw new Error("Invalid address");

    if (anyForm instanceof AdnlAddress) {
      this.bytes = anyForm.bytes;
    } else if (anyForm instanceof Uint8Array) {
      if (anyForm.length !== 32) throw new Error("Invalid ADNL bytes length");
      this.bytes = anyForm;
    } else if (typeof anyForm === "string") {
      if (anyForm.length !== 64) throw new Error("Invalid ADNL hex length");
      this.bytes = hexToBytes(anyForm);
    } else {
      throw new Error("Unsupported type");
    }
  }

  toHex() {
    let hex = bytesToHex(this.bytes);
    while (hex.length < 64) {
      hex = "0" + hex;
    }
    return hex;
  }
}

export class StorageBagId {

  constructor(anyForm) {
    if (!anyForm) throw new Error("Invalid bag ID");

    if (anyForm instanceof StorageBagId) {
      this.bytes = anyForm.bytes;
    } else if (anyForm instanceof Uint8Array) {
      if (anyForm.length !== 32) throw new Error("Invalid bag ID bytes length");
      this.bytes = anyForm;
    } else if (typeof anyForm === "string") {
      if (anyForm.length !== 64) throw new Error("Invalid bag ID hex length");
      this.bytes = hexToBytes(anyForm);
    } else {
      throw new Error("Unsupported type");
    }
  }

  toHex() {
    let hex = bytesToHex(this.bytes);
    while (hex.length < 64) {
      hex = "0" + hex;
    }
    return hex;
  }
}
