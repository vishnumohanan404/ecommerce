function tryParseJSON (jsonString){
    try {
        var o = JSON.parse(jsonString);

        if (o && typeof o === "object") {
            return o;
        }
    }
    catch (e) { }

    return null;
}


module.exports.safeJSONParse =tryParseJSON;

module.exports.encodeJSON =  function(obj) {

    obj = JSON.stringify(obj);

    return encodeURI(obj);
};

module.exports.decodeJSON = function(obj) {

    obj = decodeURI(obj);

    console.log(obj);

    return tryParseJSON(obj);
};