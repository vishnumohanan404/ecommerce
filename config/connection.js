const mongoClient         = require('mongodb').MongoClient;
const state               = {db:null}
var env                   = require('dotenv');

//configurations for variables
env.config()

module.exports.connect    = function(done){
    const url= process.env.URL;
    const dbname= process.env.MONGO_DB_DATABASE;

    mongoClient.connect(url,{ useNewUrlParser: true, useUnifiedTopology: true },(err,data)=>{
        if (err) return done(err)
        state.db=data.db(dbname);
    })
    done()
}

module.exports.get=()=>{
    return state.db
}