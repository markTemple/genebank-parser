const fs = require('fs-extra');

const REGEX = {
  WHITESPACE: /\s/g,
  CHARACTER_AT_BEGINNING: /^(?=[A-Z])/mg,
  CHARACTER_AT_5_SPACES: /^\s{5}(?=\S)/mgi,
  WORD_AT_BEGINNING: /^[A-Z]+/,
  WHOLE_LINE: /^.+[\n|\r]*/,
  NEW_LINE_WHITESPACE: /\n\s*/,
  LAST_CHARACTERS: /\S+$/,
  FIRST_WHITESPACE_CHUNK: /\s+/
};

function getName (string) {
  const indexOfFirstWhiteSpace = string.trim().search(REGEX.WHITESPACE);
  return string.substr(0, indexOfFirstWhiteSpace);
}

function parseFeatures (rawFeatures) {
  const features = rawFeatures
    .replace(REGEX.WHOLE_LINE, '')
    .split(REGEX.CHARACTER_AT_5_SPACES)
    .map((rawFeature) => {
      const [description, ...information] = rawFeature.split(REGEX.NEW_LINE_WHITESPACE);
      const [type, location] = description
        .trim()
        .split(REGEX.FIRST_WHITESPACE_CHUNK, 2);
      return {
        type,
        location,
        information
      };
    });
  return features;
}
// start
async function parseFile (file) {
  const text = await fs.readFile(file, { encoding: 'utf8' });
  const mapping = text
    .split(REGEX.CHARACTER_AT_BEGINNING)
    // .splice(0, 4)
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

if (!module.parent) {
  parseFile(process.argv[2])
    .then((data) => {
      console.log(data.features);
      return fs.outputJson('./parsed-genebank-data.json', data, { spaces: 2 });
    })
    .catch(console.error);
}
module.exports = parseFile;
