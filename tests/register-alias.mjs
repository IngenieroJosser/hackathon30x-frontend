import {register} from 'node:module';
register('./alias-loader.mjs',new URL('./',import.meta.url));
