'use client';
import {useRef,useState} from 'react';
import {Icon} from '@/components/ui/icon';
import type {InvoiceDraft,InvoiceDocument} from '@/types/invoice-workflow';
import {sanitizeDraft,validateUpload} from '@/lib/invoice-processing';
import {saveExtractedDocument,getInvoices} from '@/lib/invoice-registry';

type Tab='file'|'text';
const textExample=`FACTURA: SYN-2026-991\nProveedor: Nexa Software\nFecha de vencimiento: 28/10/2026\nMoneda: USD\nTotal: 620.00\nConcepto: Servicios de desarrollo de software (demo)`;

export function InvoiceImport({onComplete}:{onComplete:(invoiceId:string,count:number)=>void}){
  const [tab,setTab]=useState<Tab>('file');
  const [dragging,setDragging]=useState(false);
  const [selectedFiles,setSelectedFiles]=useState<File[]>([]);
  const [text,setText]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const inputRef=useRef<HTMLInputElement>(null);
  const selectFiles=(files:File[])=>{
    const candidates=files.slice(0,5);const invalid=candidates.map(validateUpload).find(Boolean);
    if(invalid){setMessage(invalid);return;}
    if(files.length>5){setMessage('Máximo 5 archivos por lote.');return;}
    setSelectedFiles(candidates);setMessage('');
  };
  const process=async()=>{
    if(busy)return;
    if(tab==='text'&&!text.trim()){setMessage('Pega primero el contenido de la factura.');return;}
    if(tab==='file'&&!selectedFiles.length){setMessage('Selecciona uno o varios documentos.');return;}
    setBusy(true);setMessage('');
    const candidates=tab==='file'?selectedFiles:[null];
    const done:string[]=[];const problems:string[]=[];
    try{
      for(const file of candidates){
        const payload=new FormData();
        if(file)payload.append('file',file);else payload.append('text',text);
        let draft:InvoiceDraft;
        try{
          const res=await fetch('/api/invoices/extract',{method:'POST',body:payload});
          const body=await res.json() as {draft?:InvoiceDraft;error?:string};
          if(!res.ok||!body.draft)throw new Error(body.error||'Error de extracción.');
          draft=sanitizeDraft(body.draft);
        }catch(err){
          const fallback=file?'Extracción automática no disponible. Completa los campos manualmente.': 'Extracción fallida. Completa la factura manualmente.';
          draft=sanitizeDraft({number:'',vendor:'',amount:null,currency:'USD',dueDate:'',issueDate:'',description:'',method:'manual',warnings:[fallback],evidence:{number:'',vendor:'',amount:'',currency:'',dueDate:''}});
          problems.push(`${file?.name??'Texto'}: ${err instanceof Error?err.message:fallback}`);
        }
        const contents=file?await file.arrayBuffer():new TextEncoder().encode(text);
        const digest=await crypto.subtle.digest('SHA-256',contents);
        const fingerprint=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
        if(getInvoices().some(x=>x.document?.fingerprint===fingerprint)){problems.push(`${file?.name??'Texto'}: contenido ya importado, se omitió.`);continue;}
        const source:InvoiceDocument={fileName:file?.name??'factura-correo.txt',mimeType:file?.type??'text/plain',bytes:file?.size??new TextEncoder().encode(text).byteLength,fingerprint,source:file?(file.type==='application/pdf'?'PDF':'Imagen'):'Correo',extractionMethod:draft.method,extractedAt:new Date().toISOString(),warnings:draft.warnings,evidence:draft.evidence};
        const item=saveExtractedDocument(draft,source);
        done.push(item.id);
      }
      if(done.length){setSelectedFiles([]);setText('');onComplete(done[0],done.length);}else setMessage(problems.join(' · ')||'No fue posible importar la factura.');
    }catch(error){setMessage(error instanceof Error?error.message:'No fue posible registrar los documentos.');}
    finally{setBusy(false);}
  };
  return <section className="iv-import" id="ingesta" aria-labelledby="iv-import-title">
    <div className="iv-import-top"><span className="iv-kicker">02 / DOCUMENT INGESTION</span><div className="iv-import-top-badge"><span/> CAPTURE MODULE</div></div>
    <h2 id="iv-import-title">Trae tus facturas<br/><em>a un solo lugar.</em></h2>
    <p className="iv-import-intro">Puedes subir documentos ficticios o pegar una cuenta de cobro. La extracción de PDF e imágenes se activa configurando la clave de IA en el servidor.</p>
    <div className="iv-tabs" role="tablist" aria-label="Origen del documento"><button type="button" role="tab" aria-selected={tab==='file'} className={tab==='file'?'is-active':''} onClick={()=>{setTab('file');setMessage('');}}><Icon name="file" size={16}/> PDF / Imagen</button><button type="button" role="tab" aria-selected={tab==='text'} className={tab==='text'?'is-active':''} onClick={()=>{setTab('text');setMessage('');}}><Icon name="receipt" size={16}/> Correo / Texto</button></div>
    {tab==='file'?<div role="tabpanel" className={`iv-dropzone ${dragging?'is-dragging':''}`} onDragEnter={e=>{e.preventDefault();setDragging(true);}} onDragOver={e=>e.preventDefault()} onDragLeave={e=>{e.preventDefault();setDragging(false);}} onDrop={e=>{e.preventDefault();setDragging(false);selectFiles(Array.from(e.dataTransfer.files));}}>
      <input ref={inputRef} className="iv-file-input" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" multiple onChange={e=>selectFiles(Array.from(e.target.files??[]))} aria-label="Seleccionar facturas PDF o imagen"/>
      <div className="iv-drop-symbol"><Icon name="plus" size={30}/></div><strong>Arrastra tus documentos aquí</strong><p>PDF, JPG, PNG o WEBP · máximo 5 MB por archivo · 5 por lote</p><button type="button" className="iv-button iv-button-outline" onClick={()=>inputRef.current?.click()}>Explorar archivos <Icon name="arrow" size={15}/></button>
      {!!selectedFiles.length&&<div className="iv-files-list">{selectedFiles.map((file,i)=><span key={`${file.name}-${i}`}><Icon name="file" size={13}/>{file.name} · {(file.size/1024).toFixed(0)} KB</span>)}</div>}
    </div>:<div role="tabpanel" className="iv-text-area"><label htmlFor="iv-invoice-text">Contenido de factura o cuenta de cobro</label><textarea id="iv-invoice-text" rows={8} value={text} maxLength={12000} onChange={e=>setText(e.target.value)} placeholder="Factura, beneficiario, importe, moneda, vencimiento…"/><div className="iv-text-meta"><button type="button" onClick={()=>setText(textExample)}><Icon name="sparkles" size={14}/> Usar ejemplo ficticio</button><span>{text.length.toLocaleString('es-CO')} / 12.000</span></div></div>}
    {message&&<div className="iv-inline-error" role="alert"><Icon name="alert" size={15}/><span>{message}</span></div>}
    <div className="iv-import-bottom"><span><Icon name="lock" size={15}/> Solo datos ficticios. Los documentos no se guardan en el navegador.</span><button type="button" className="iv-button iv-button-primary" disabled={busy || (tab==='file'?!selectedFiles.length:!text.trim())} onClick={process}><Icon name={busy?'refresh':'bolt'} size={16}/>{busy?'Extrayendo datos…':'Extraer y preparar'}<Icon name="arrowUp" size={15}/></button></div>
    <small className="iv-import-note">Ningún documento se autoriza durante la extracción. La persona operadora debe verificar los campos primero. Con IA activa, el documento ficticio se envía al proveedor de IA configurado.</small>
  </section>;
}
