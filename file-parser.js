const fs = require('fs-extra');

const REGEX = {
  WHITESPACE: /\s/g,
  CHARACTER_AT_BEGINNING: /^(?=[A-Z])/mg,
  CHARACTER_AT_5_SPACES: /^\s{5}(?=\S)/mgi,
  WORD_AT_BEGINNING: /^[A-Z]+/,
  WHOLE_LINE: /^.+[\n|\r]*/,
  NEW_LINE_WHITESPACE: /\n\s*/,
  LAST_CHARACTERS: /\S+$/,
  FIRST_WHITESPACE_CHUNK: /\s+/,
  QUOTES_START_OR_END: /(?:^(?:"|')|(?:"|')$)/gm,
  WHITESPACE_PIPES: /\s*\|\s*/gm,
  NON_TEXT: /[^a-z]/igm,
  CHARACTERS_PARENTHESES: /[a-z)(]/igm
};

function getName (string) {
  const indexOfFirstWhiteSpace = string.trim().search(REGEX.WHITESPACE);
  return string.substr(0, indexOfFirstWhiteSpace);
}

function removeQuotes (string) {
  return string.trim().replace(REGEX.QUOTES_START_OR_END, '');
}

function splitAtFirstCharacter (string, character = ',') {
  const index = string.indexOf(character);
  const key = string.substr(0, index);
  const value = string.substr(index + 1);
  return [key, value];
}

// eslint-disable-next-line camelcase
function snake_case (string) {
  return string.toLowerCase().replace(REGEX.NON_TEXT, '_');
}

function informationParsers (key, value, object) {
  switch (key) {
    case 'db_xref': {
      // eslint-disable-next-line camelcase
      const db_xref = object[key] || (object[key] = []);
      db_xref.push(removeQuotes(value));
      break;
    }
    case 'nomenclature': {
      const values = removeQuotes(value).split(REGEX.WHITESPACE_PIPES);
      const nomenclature = object[key] = {};
      for (const string of values) {
        const [key, value] = splitAtFirstCharacter(string, ':');
        nomenclature[snake_case(key)] = value.trim();
      }
      break;
    }
    default: {
      object[key] = removeQuotes(value);
      break;
    }
  }
}

function parseInformation (information) {
  const object = {};
  for (const string of information) {
    const [key, value] = splitAtFirstCharacter(string, '=');
    informationParsers(key, value, object);
  }
  return object;
}

function parseLocation (location) {
  return location
    .replace(REGEX.CHARACTERS_PARENTHESES, '')
    .split(',')
    .map((string) => string.split('..'));
}

function parseFeatures (rawFeatures) {
  const features = rawFeatures
    .replace(REGEX.WHOLE_LINE, '')
    .split(REGEX.CHARACTER_AT_5_SPACES)
    .splice(1)
    .map((rawFeature) => {
      const [description, ...splitInformation] = rawFeature.split(REGEX.NEW_LINE_WHITESPACE);

      const [, ...information] = splitInformation
        .join(' ')
        .split(/\//gm);

      const [type, location] = description
        .trim()
        .split(REGEX.FIRST_WHITESPACE_CHUNK, 2);

      return {
        type,
        location: parseLocation(location),
        information: parseInformation(information)
      };
    });
  return features;
}

// start
async function parseFile (file) {
  const text = await fs.readFile(file, { encoding: 'utf8' });
  const mapping = text
    .split(REGEX.CHARACTER_AT_BEGINNING)
    .reduce((mapping, string) => {
      const name = getName(string).toLowerCase();
      mapping[name] = string
        .replace(REGEX.WORD_AT_BEGINNING, '')
        .trim();
      return mapping;
    }, {});

  mapping.features = parseFeatures(mapping.features);
  return mapping;
}

// This allows the parseFile function to be used as a commadn line tool.
if (!module.parent) {
  parseFile(process.argv[2])
    .then((data) => {
      console.log(data.features);
      return fs.outputJson('./parsed-genebank-data.json', data, { spaces: 2 });
    })
    .catch(console.error);
}
module.exports = parseFile;
