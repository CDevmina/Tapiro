const ResponsePayload = function ResponsePayload(code, payload) {
  this.code = code;
  this.payload = payload;
};

exports.respondWithCode = function respondWithCode(code, payload) {
  return new ResponsePayload(code, payload);
};

const writeJson = function writeJson(response, arg1, arg2) {
  let code;
  let payload;

  if (arg1 && arg1 instanceof ResponsePayload) {
    writeJson(response, arg1.payload, arg1.code);
    return;
  }

  if (arg2 && Number.isInteger(arg2)) {
    code = arg2;
  } else if (arg1 && Number.isInteger(arg1)) {
    code = arg1;
  }
  if (code && arg1) {
    payload = arg1;
  } else if (arg1) {
    payload = arg1;
  }

  if (!code) {
    code = 200;
  }
  if (typeof payload === 'object') {
    payload = JSON.stringify(payload, null, 2);
  }
  response.writeHead(code, { 'Content-Type': 'application/json' });
  response.end(payload);
};

exports.writeJson = writeJson;
