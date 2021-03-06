function compress(json) {

    json.UTF8Encoding = true;

    var features = json.features;
    if (!features) {
    return;
    }
    features.forEach(function (feature){
    var encodeOffsets = feature.geometry.encodeOffsets = [];
    var coordinates = feature.geometry.coordinates;
    if (feature.geometry.type === 'Polygon') {
        coordinates.forEach(function (coordinate, idx){
            coordinates[idx] = encodePolygon(
                coordinate, encodeOffsets[idx] = []
            );
        });
    } else if(feature.geometry.type === 'MultiPolygon') {
        coordinates.forEach(function (polygon, idx1){
            encodeOffsets[idx1] = [];
            polygon.forEach(function (coordinate, idx2) {
                coordinates[idx1][idx2] = encodePolygon(
                    coordinate, encodeOffsets[idx1][idx2] = []
                );
            });
        });
    }
    });

    return json;
}

function encodePolygon(coordinate, encodeOffsets) {

    var result = '';

    var prevX = quantize(coordinate[0][0]);
    var prevY = quantize(coordinate[0][1]);
    // Store the origin offset
    encodeOffsets[0] = prevX;
    encodeOffsets[1] = prevY;

    for (var i = 0; i < coordinate.length; i++) {
        var point = coordinate[i];
        result+=encode(point[0], prevX);
        result+=encode(point[1], prevY);

        prevX = quantize(point[0]);
        prevY = quantize(point[1]);
    }

    return result;
}

function quantize(val) {
    return Math.ceil(val * 1024);
}

function encode(val, prev){
    // Quantization
    val = quantize(val);
    // var tmp = val;
    // Delta
    val = val - prev;

    if (((val << 1) ^ (val >> 15)) + 64 === 8232) {
        //WTF, 8232 will get syntax error in js code
        val--;
    }
    // ZigZag
    val = (val << 1) ^ (val >> 15);
    // add offset and get unicode
    return String.fromCharCode(val+64);
    // var tmp = {'tmp' : str};
    // try{
    //     eval("(" + JSON.stringify(tmp) + ")");
    // }catch(e) {
    //     console.log(val + 64);
    // }
}

var specialArea = {
  中国七大区: {
    '南海诸岛': {              // 把海南诸岛加移到中国台湾右边
      left: 126,
      top: 20,
      width: 10
    }
  },
  '美国': {
    Alaska: {              // 把阿拉斯加移到美国主大陆左下方
      left: -131,
      top: 25,
      width: 15
    },
    Hawaii: {
      left: -110,        // 夏威夷
      top: 28,
      width: 5
    },
    'Puerto Rico': {       // 波多黎各
      left: -76,
      top: 26,
      width: 2
    }
  },
  '法国': {
    'Guadeloupe': {
      left: -4.8,
      top: 37,
      width: 1
    },
    'Martinique': {
      left: -1,
      top: 37,
      width: 1
    },
    'French Guiana': {
      left: 3.2,
      top: 37,
      width: 2
    },
    'Mayotte': {
      left: 9,
      top: 37,
      width: 1
    },
    'Réunion': {
      left: 11,
      top: 37,
      width: 1.5
    }
  }
};


// 不压缩，下载地图文件
function makeJs(geojson, mapName) {

  var specialAreaArrangements = "";
  if (mapName in specialArea){
    var arrangement = specialArea[mapName];
    specialAreaArrangements = "," + JSON.stringify(arrangement);
  }
  return "(function (root, factory) {"
    + "if (typeof define === 'function' && define.amd) {"
    +     "define(['exports', 'echarts'], factory);"
    + "} else if (typeof exports === 'object' "
    + "&& typeof exports.nodeName !== 'string') {"
    +     "factory(exports, require('echarts'));"
    + "} else {"
    +     "factory({}, root.echarts);"
    + "}"
    + "}(this, function (exports, echarts) {"
    + "var log = function (msg) {"
    +     "if (typeof console !== 'undefined') {"
    +         "console && console.error && console.error(msg);"
    +     "}"
    + "};"
    + "if (!echarts) {"
    +     "log('ECharts is not Loaded');"
    +     "return;"
    + "}"
    + "if (!echarts.registerMap) {"
    +     "log('ECharts Map is not loaded');"
    +     "return;"
    + "}"
    + "echarts.registerMap('" + mapName + "', "
    + JSON.stringify(geojson) + specialAreaArrangements +");}));";

}

module.exports = {
  compress: compress,
  makeJs: makeJs
}
