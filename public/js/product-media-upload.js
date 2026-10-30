'use strict';
// Reuses the existing permanent, database-backed media service; no filesystem uploads.
document.getElementById('product-image-upload')?.addEventListener('change',async event=>{
  const input=event.target,file=input.files[0],status=document.getElementById('product-image-upload-status');if(!file)return;
  input.disabled=true;status.textContent='Uploading…';
  try{
    if(file.size>2*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose PNG, JPEG or WebP up to 2 MiB.');
    const bitmap=await createImageBitmap(file),width=bitmap.width,height=bitmap.height;bitmap.close();
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
    const response=await fetch('/api/theme/editor/assets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,mime:file.type,data,width,height})}),result=await response.json();
    if(!response.ok||!result.success)throw Error(result.error||'Upload failed.');
    addImageField(result.data.url);status.textContent='Uploaded. Save the product to keep this image in its gallery.';
  }catch(error){status.textContent=error.message||'Upload failed.';}
  finally{input.disabled=false;input.value='';}
});
