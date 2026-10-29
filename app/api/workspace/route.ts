import { NextRequest,NextResponse } from 'next/server';
import { requirePermission } from '@/server/security/auth';
import { workspaceSnapshot } from '@/server/workflows/workspace';
import { apiFailure } from '@/server/workflows/common';
export async function GET(request:NextRequest){const {denied}=await requirePermission(request,'read');if(denied)return denied;
 try{return NextResponse.json(await workspaceSnapshot(),{headers:{'Cache-Control':'no-store'}});}
 catch(e){const {status,message}=apiFailure(e);return NextResponse.json({error:message},{status});}
}
