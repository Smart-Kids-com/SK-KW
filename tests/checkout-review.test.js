'use strict';
const {test}=require('node:test'),http=require('node:http'),{once}=require('node:events');
test('checkout/mail presentation regression uses only a temporary database and fake transport',async()=>{
 const reserve=http.createServer().listen(0,'127.0.0.1');await once(reserve,'listening');process.env.REVIEW_PORT=String(reserve.address().port);await new Promise(r=>reserve.close(r));
 const demo=await require('../scripts/checkout-review-demo').start();try{await require('../scripts/check-checkout-review-browser').checkCheckoutReviewBrowser(demo.base)}finally{await demo.close()}
});
