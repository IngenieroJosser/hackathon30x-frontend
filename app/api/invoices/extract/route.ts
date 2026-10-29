import { NextRequest,NextResponse } from 'next/server';
import { requirePermission } from '@/server/security/auth';
import { validateUpload } from '@/lib/invoice-processing';
import { checkDocumentSignature } from '@/lib/upload-security';
import { extractDocument } from '@/server/workflows/extraction';
import { apiFailure } from '@/server/workflows/common';
export const maxDuration=45;
/** Extracción sin persistencia para diagnóstico. El flujo principal es /api/invoices/intake. */
export async function POST(request:NextRequest){
 const {denied}=await requirePermission(request,'ingest');if(denied)return denied;
 if(Number(request.headers.get('content-length')??0)>7_500_000)return NextResponse.json({error:'Solicitud demasiado grande.'},{status:413});
 try{const form=await request.formData();const f=form.get('file');const file=f instanceof File?f:undefined;const raw=form.get('text');const text=typeof raw==='string'?raw.trim():'';
  if(!file&&!text)return NextResponse.json({error:'Adjunta un documento o texto.'},{status:400});
  if(text.length>12000)return NextResponse.json({error:'Texto demasiado largo.'},{status:413});
  if(file){
    const invalid=validateUpload(file);if(invalid)return NextResponse.json({error:invalid},{status:400});
    const signature=checkDocumentSignature(file,new Uint8Array(await file.arrayBuffer()));
    if(signature)return NextResponse.json({error:signature},{status:400});
  }
  const draft=await extractDocument({file,text});return NextResponse.json({draft,mode:draft.method,notice:'Comprueba la evidencia antes de evaluar.',paymentExecuted:false},{headers:{'Cache-Control':'no-store'}});
 }catch(e){const {status,message}=apiFailure(e);return NextResponse.json({error:message},{status});}
}
