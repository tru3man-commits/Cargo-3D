import {pack} from './packing.js';
self.onmessage=e=>{try{self.postMessage({placements:pack(e.data)});}catch(error){self.postMessage({error:error.message});}};
