/**
 * Created by openerp on 12/5/16.
 */



var loopback = require('loopback');

var ds = loopback.createDataSource({
    connector: require("./index"),
    login : 'system',
    password : 'admin',
    db : 'openerp',
    host : 'localhost',
    port: '8069'
});


Model = ds.createModel('hr.employee');

// setTimeout(console.log(ds.connector),2000);

Model.findById(1,function (err, model) {
    if(err)throw err;
    // console.log(ds.connector);
     console.dir(model);
})