import {pathToFileURL} from 'node:url';
import {resolve as pathResolve} from 'node:path';
export async function resolve(specifier,context,nextResolve){
  if(specifier.startsWith('@/'))return nextResolve(pathToFileURL(pathResolve(process.cwd(),'src',specifier.slice(2))+'.ts').href,context);
  return nextResolve(specifier,context);
}
