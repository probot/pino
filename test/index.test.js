const test = require("tap").test;

test("API", (t) => {
  t.test("getTransformStream", (t) => {
    const { getTransformStream } = require("..");
    t.isA(getTransformStream, Function);
    t.end();
  });

  t.end();
});
