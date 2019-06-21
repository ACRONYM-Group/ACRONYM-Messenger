function encrypt(data, key) {
  var newData = ""
  key = key % 2560;
  key = key*2;
  key = BigInt(key);
  var r = key * BigInt(10);
  r = (r**key)%BigInt(123);
  var rOrig = r;

  var y = 0;
  var x = 0;
  var yMax = data.length - 1;

  while (y <= yMax) {
    var characterInt = utf16ToDig(data.charAt(y));
    newData += intToChar((BigInt(characterInt) + (r%BigInt(256))) % BigInt(256));
    
    var factor = key + BigInt(1);
    var factor2 = r / key;
    factor = factor + factor2;
    factor = factor % BigInt(250);

    r = r * factor;

    if (r >= 10000000 || r <= 0) {
      r = rOrig;
    }

    y = y + 1;
    x = x + 1;
  }

  return newData;
}

function decrypt(data, key) {
  var newData = ""
  key = key % 2560;
  key = key*2;
  key = BigInt(key);
  var r = key * BigInt(10);
  r = (r**key) % BigInt(123);
  var rOrig = r;

  var y = 0;
  var x = 0;
  var yMax = BigInt(data.length) - BigInt(1);

  while (y <= yMax) {
    var oldVal = BigInt(utf16ToDig(data[y]));
    oldVal = oldVal - (r%(BigInt(256)));
    oldVal = Number(oldVal.toString());

    if (oldVal < 0) {
      oldVal = BigInt(oldVal)+BigInt(256);
    }

    newData = newData + intToChar(oldVal);
  
    var factor = key + BigInt(1);
    var factor2 = r / key;
    factor = factor + factor2;
    factor = factor % BigInt(250);

    r = r * factor;
    if (r >= 10000000 || r <= 0) {
      r = rOrig
    }
    y = y + 1;
    x = x + 1;
  }

  return newData;
}

function convertCharListToInt(charList) {
  var result = 0;
  for (var i = 0; i < charList.length; i++) {
    result *= 256;
    result += charList[i];
  }

  return result;
}

function stringToBytes(str) {
  var ch, st, re = [];
  for (var i = 0; i < str.length; i++ ) {
    ch = str.charCodeAt(i);  // get char 
    st = [];                 // set up "stack"
    do {
      st.push( ch & 0xFF );  // push byte to stack
      ch = ch >> 8;          // shift value down by 1 byte
    }  
    while ( ch );
    // add stack contents to result
    // done because chars have "wrong" endianness
    re = re.concat( st.reverse() );
  }
  // return an array of bytes
  return re;
}

function intToChar(integer) {
  integer = Number(integer)
  return String.fromCharCode(integer)
}

function charToInt(char) {
  return char.charCodeAt(0)
}

var utf16ToDig = function(s) {
  var length = s.length;
  var index = -1;
  var result = "";
  var hex;
  while (++index < length) {
      hex = s.charCodeAt(index).toString(16).toUpperCase();
      result += ('0000' + hex).slice(-4);
  }
  return parseInt(result, 16);
}

function intToRawBin(int) {
  num = Math.ceil(logCustomBase(int, 256));

  data = intToChar(num);

  for (i = num; i >= 0; i--) {
    var current = Math.floor(Math.floor(int/(Math.pow(256,i)))%256)

    data += intToChar(current);
  }

  return data;
}

function logCustomBase(num, logBase) {
  return Math.log(num)/Math.log(logBase);
}

try{
  module.exports.encrypt = encrypt;
  module.exports.decrypt = decrypt; 
} catch(e) {

}