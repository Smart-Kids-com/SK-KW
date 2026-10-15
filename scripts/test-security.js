'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=fs.realpathSync(os.tmpdir());
const environment=Object.fromEntries(Object.entries(process.env).filter(([key])=>/^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|APPDATA|LOCALAPPDATA|HOME)$/i.test(key)));
const files=process.argv.includes('--all')?['tests/request-origin.test.js','tests/security.test.js','tests/order-pricing.test.js','tests/backend.test.js','tests/store-maintenance.test.js']:
  [process.argv.includes('--collections-editor')?'tests/collections-editor.test.js':process.argv.includes('--orders-list')?'tests/orders-list.test.js':process.argv.includes('--products')?'tests/products-list.test.js':process.argv.includes('--theme')?'tests/theme-editor.test.js':process.argv.includes('--backend')?'tests/backend.test.js':process.argv.includes('--orders')?'tests/order-pricing.test.js':'tests/security.test.js'];
let status=0;
for(const file of files){
  const directory=fs.mkdtempSync(path.join(root,'sk-security-test-'));
  try{
    const patternIndex=process.argv.indexOf('--name');
    const result=spawnSync(process.execPath,['--test',...(patternIndex>=0?['--test-name-pattern='+process.argv[patternIndex+1]]:process.argv.includes('--orders-scroll')?['--test-name-pattern=Orders scroll']:process.argv.includes('--orders-appearance')?['--test-name-pattern=Orders appearance']:[]),file],{cwd:path.join(__dirname,'..'),
      env:{...environment,SK_SECURITY_TEST_DIRECTORY:directory,...(process.argv.includes('--scroll-baseline')?{SK_SCROLL_BASELINE:'1'}:{}),...(process.argv.includes('--browser')?{SK_ORDER_BROWSER:'1'}:{})},stdio:'inherit'});
    if(result.status!==0)status=1;
  }finally{
    const resolved=fs.realpathSync(directory);
    if(path.dirname(resolved)!==root||!path.basename(resolved).startsWith('sk-security-test-'))throw new Error('Unsafe test cleanup path');
    fs.rmSync(resolved,{recursive:true,force:true,maxRetries:3,retryDelay:100});
  }
}
process.exitCode=status;
