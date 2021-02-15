const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.resolve(process.argv[2]);

const ROW_KEYCHAIN = 'keychain';
const ROW_VERSION = 'version';
const ROW_CLASS = 'class';
const ROW_ATTRIBUTES = 'attributes';
const ROW_ATTRIBUTE = 'attribute';
const ROW_DATA = 'data';
const ROW_PASSWORD = 'password';

const rows = [
  ROW_KEYCHAIN,
  ROW_VERSION,
  ROW_CLASS,
  ROW_ATTRIBUTES,
  ROW_ATTRIBUTE,
  ROW_DATA,
  ROW_PASSWORD,
];

const rField = /^(\w+):\s?(.*)$/;
const rAttrHex = /^\s+(0[xX][0-9a-fA-F]+)\s?<([^>]+)>=(.*)$/;
const rAttrAlpha = /^\s+"(.*)"\s?<([^>]+)>=(.*)$/;

const file = fs.readFileSync(INPUT_FILE);

let rowIndex = 0;
const data = [];
let entry = null;

const stripQuotes = (text) => {
  return text.replace(/^"(.*)"$/, '$1').trim();
};

const parseField = (line, expectedRow, lineIndex) => {
  const fieldMatch = line.match(rField);
  if (fieldMatch) {
    const [, field, value] = fieldMatch;

    // extra safety measures
    if (field !== expectedRow) {
      throw new Error(
        `Expected field "${expectedRow}", but found field "${field}" in: ${INPUT_FILE}:${
          lineIndex + 1
        }`
      );
    }

    // new entry
    if (expectedRow === ROW_KEYCHAIN) {
      // if we already accumulated data for a previous entry
      // push it to the collection
      entry && data.push(entry);
      entry = {};
    }

    if (expectedRow === ROW_ATTRIBUTES) {
      entry.attributes = {};
    } else {
      entry[field] = stripQuotes(value);
    }

    rowIndex += 1;
  } else {
    // is this the password?
    if (expectedRow === ROW_PASSWORD) {
      entry.password = stripQuotes(line);
      // reset the expected rows
      rowIndex = 0;
    } else {
      throw new Error(`Unexpected input: ${INPUT_FILE}:${lineIndex + 1}`);
    }
  }
};

const parseAttr = (line, expectedRow, lineIndex) => {
  // handle "attributes" section
  const attrMatch = line.match(rAttrHex) || line.match(rAttrAlpha);
  if (attrMatch) {
    const [, name, , value] = attrMatch;
    if (value !== '<NULL>') {
      entry.attributes[name] = stripQuotes(value);
    }
  } else {
    // maybe we read the last attribute on the previous line
    // and we're now on the "data" field
    rowIndex += 1;
    expectedRow = rows[rowIndex];
    if (expectedRow === ROW_DATA) {
      parseField(line, expectedRow, lineIndex);
    } else {
      throw new Error(
        `Expected field "${expectedRow}", but found field "${field}" in: ${INPUT_FILE}:${
          lineIndex + 1
        }`
      );
    }
  }
};

// parse file, line by line
file
  .toString()
  .split('\n')
  .forEach((line, lineIndex, lines) => {
    let expectedRow = rows[rowIndex];
    if (expectedRow !== ROW_ATTRIBUTE) {
      parseField(line, expectedRow, lineIndex);
    } else {
      parseAttr(line, expectedRow, lineIndex);
    }
  });

// export to bitwarden
const items = data
  .filter(
    (entry) => !!entry && (entry.class === 'genp' || entry.class === 'inet')
  )
  .map((entry) => {
    const { acct, desc, port, ptcl, srvr, svce } = entry.attributes;

    const portNumber = parseInt(port || '0x00000000', 16);

    let uri = '';
    ptcl && (uri += `${ptcl}://`);
    srvr && (uri += `${srvr}`);
    portNumber && (uri += `:${portNumber}`);

    return {
      name: svce || entry.attributes['0x00000007'],
      type: 1,
      favorite: false,
      notes: desc !== 'Network Password' ? desc : null,
      login: {
        uris: uri.length ? [uri] : [],
        username: acct,
        password: entry.password,
      },
    };
  });

const output = {
  encrypted: false,
  folders: [],
  items,
};

console.log(JSON.stringify(output, null, ' '));
