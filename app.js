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
    port: '8069',
    debug: true
});


var Emp = ds.createModel('crm.contact',{
    first_name: {type:String},
    last_name:  {type:String},
    title:  {type:String}
});


// Emp.find(
//     {
//                 // where:{
//                 //     "and":[
//                 //         {"id":"1"},
//                 //         {"last_name":{"neq" :"test2"}},
//                 //         {"last_name": "test3"},
//                 //         {"or" :[
//                 //             {"first_name":"last"},
//                 //             {"title":"IT1"},
//                 //             {"and":[
//                 //                 {"id":"3"},
//                 //                 {"last_name":{"neq" :"test3"}},
//                 //                 {"last_name": "test1"}
//                 //             ]}
//                 //             ]}
//                 //     ]
//                 // },
//         // where: {"id":"1"},
//         where: {id:{
//             nin:[1,2]
//         }},
//         // where:{
//         //     "or":[
//         //         {"id":"1"}
//         //     ]
//         // },
//         // where:{
//         //    "and":[
//         //             {"id":"6"},
//         //             {"last_name":{"neq" :"test3"}},
//         //             {"or":[{"first_name":"last"},{"title":"IT1"}]}
//         //         ]
//         // },
//         // where:{
//         //   "or":[
//         //       {"and":[
//         //           {"or":[
//         //               {a:5},
//         //               {b:6}
//         //           ]},
//         //           {c:7}
//         //       ]},
//         //       {"and":[
//         //           {d:1},
//         //           {e:2}
//         //       ]},
//         //       {"and":[
//         //           {f:3},
//         //           {g:4}
//         //       ]}
//         //   ]
//         // },
//         fields: {first_name:true,last_name:true,title:false},
//         // fields: {title:false},
//         limit:  1,
//         order:  'last_name DESC',//['last_name DESC','first_name ASC']
//         // order:  ['last_name DESC','first_name ASC'],
//         skip:   0}
//         ,function (err, emp) {
//     if(err) throw err;
//     // console.log(ds.connector);
//      console.dir(emp);
// });


Emp.findById(31,function (err,emp) {
    if (err) throw err;
    console.dir(emp);
});
        // Emp.create({
        //     first_name:'test2',
        //     last_name:'last',
        //     title:'sales'
        //     },function (err,response) {
        //     if(err) throw err;
        //     console.dir(response);
        //     response.updateAttribute('first_name','updated2',function (err, res) {
        //         if(err) throw err;
        //         console.dir(res);
        //     })
        // });
    // //
    // Emp.destroyById(2
    // ,function (err,response) {
    //     if(err) throw err;
    //     console.dir(response);
    // });

    // Emp.destroyAll({where:{id:1}}
    //     ,function (err,response) {
    //         if(err) throw err;
    //         console.dir(response);
    //     });
    //
    // Emp.updateAll({id:0},
    //     {title:222},function (err, response) {
    //         if(err) throw err;
    //         console.dir(response);
    //     }
    // )
// Emp.create({
//     first_name:'test2',
//     last_name:'last',
//     title:'sales'
//     },function (err,response) {
//     if(err) throw err;
//     console.dir(response);
//     console.dir(response.first_name);
//     response.save(function (err, res) {
//         if(err) throw err;
//         console.dir('save done')
//     })
// });