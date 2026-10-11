'use strict';
const path=require('node:path');
const LOCAL_DATABASE_PATH=path.resolve(process.env.LOCAL_DATABASE_PATH || path.join(__dirname,'../orders.db'));
module.exports={LOCAL_DATABASE_PATH};
