import { NextRequest,NextResponse } from 'next/server';
import { requirePermission } from '@/server/security/auth';
import { validateUpload } from '@/lib/invoice-processing';
import { extractDocument } from '@/server/workflows/extraction';
import { registerIntake } from '@/server/workflows/invoice';
import { apiFailure } from '@/server/workflows/common';
export const maxDuration=45;
export async function POST(request:NextRequest){
 const {actor,denied}=await requirePermission(request,'ingest');if(denied)return denied;
 if(Number(request.headers.get('content-length')||0)>7_500_000)return NextResponse.json({error:'Documento demasiado grande.'},{status:413});
 try{
  const form=await request.formData();const f=form.get('file'),raw=form.get('text');const text=typeof raw==='string'?raw.trim():'';
  const file=f instanceof File?f:undefined;
  if(!file&&!text)return NextResponse.json({error:'Adjunta un documento o texto.'},{status:400});
  if(text.length>12000)return NextResponse.json({error:'Texto demasiado largo.'},{status:413});
  if(file){const invalid=validateUpload(file);if(invalid)return NextResponse.json({error:invalid},{status:400});}
  const draft=await extractDocument({file,text});
  const bytes=file?Buffer.from(await file.arrayBuffer()):undefined;
  const source=file?.type==='application/pdf'?'PDF':file?'IMAGE':'TEXT';
  const invoice=await registerIntake({draft,source,file:file&&bytes?{name:file.name,type:file.type,bytes}:undefined,rawText:text},actor.id);
  return NextResponse.json({invoice,draft,mode:draft.method,persisted:true,paymentExecuted:false},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch(e){const {status,message}=apiFailure(e);return NextResponse.json({error:message},{status});}
}
