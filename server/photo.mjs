import sharp from 'sharp';
import {ApiError} from './store.mjs';
export async function normalizePhoto(value){
 if(value===undefined||value===null)return null;
 if(typeof value!=='string'||value.length>1400000||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))throw new ApiError(400,'Photo invalide ou trop volumineuse.');
 try{
  const input=Buffer.from(value.split(',')[1],'base64');
  const image=sharp(input,{limitInputPixels:16000000,animated:false});
  const meta=await image.metadata();
  if(!['jpeg','png','webp'].includes(meta.format)||(meta.pages||1)>1)throw Error();
  return await image.rotate().resize(1280,1280,{fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).jpeg({quality:78}).toBuffer();
 }catch{throw new ApiError(400,'Impossible de lire cette photo. Choisissez une image JPEG, PNG ou WebP.');}
}
