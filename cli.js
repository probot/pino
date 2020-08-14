const pump = require("pump");
const split = require("split2");

const { getTransformStream } = require("./");

pump(process.stdin, split(), getTransformStream(), process.stdout);
