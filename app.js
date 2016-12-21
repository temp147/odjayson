/**
 * Created by openerp on 12/5/16.
 */



var loopback = require('loopback');

var ds = loopback.createDataSource({
    connector: require("./index"),
    login : 'admin',
    password : 'admin',
    db : 'song',
    host : 'localhost',
    port: '8069'
});


var Emp = ds.createModel('crm.contact',{
    first_name: {type:String},
    last_name:  {type:String},
    title:  {type:String}
});


Emp.find(
    {
        where:{
            "and":[
                {"id":"1"},
                {"last_name":{"neq" :"test2"}},
                {"or" :[{"first_name":"last"},{"title":"IT1"}]}
            ]
        },
        // where: {"id":"1"},
        // where: {id:{
        //     nin:[1,2]
        // }},
        // where:{
        //     "or":[
        //         {"id":"1"},
        //         {"last_name":"test1"}
        //     ]
        // },
        fields: {first_name:true,last_name:true,title:true},
        limit:  1,
        order:  'last_name DESC',//['last_name DESC','first_name ASC']
        skip:   0}
        ,function (err, emp) {
    if(err) throw err;
    // console.log(ds.connector);
     console.dir(emp);
});
    //
    // Emp.create({
    //     first_name:'test2',
    //     last_name:'last',
    //     title:'sales'
    //     },function (err,response) {
    //     if(err) throw err;
    //     console.dir(response);
    // });
    //
    // Emp.destroyById(1
    // ,function (err,response) {
    //     if(err) throw err;
    //     console.dir(response);
    // });
    //
    // Emp.destroyAll({where:{id:1}}
    //     ,function (err,response) {
    //         if(err) throw err;
    //         console.dir(response);
    //     });
    //
    // Emp.updateAll(
    //     {id:2},function (err, response) {
    //         if(err) throw err;
    //         console.dir(response);
    //     }
    // )