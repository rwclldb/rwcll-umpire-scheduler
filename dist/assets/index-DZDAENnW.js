(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=Symbol.for(`@supabase/supabase-js.traceContextExtractor`);function t(){return globalThis[e]}function n(e,t){var n={};for(var r in e)Object.prototype.hasOwnProperty.call(e,r)&&t.indexOf(r)<0&&(n[r]=e[r]);if(e!=null&&typeof Object.getOwnPropertySymbols==`function`)for(var i=0,r=Object.getOwnPropertySymbols(e);i<r.length;i++)t.indexOf(r[i])<0&&Object.prototype.propertyIsEnumerable.call(e,r[i])&&(n[r[i]]=e[r[i]]);return n}function r(e,t,n,r){function i(e){return e instanceof n?e:new n(function(t){t(e)})}return new(n||=Promise)(function(n,a){function o(e){try{c(r.next(e))}catch(e){a(e)}}function s(e){try{c(r.throw(e))}catch(e){a(e)}}function c(e){e.done?n(e.value):i(e.value).then(o,s)}c((r=r.apply(e,t||[])).next())})}var i=e=>e?(...t)=>e(...t):(...e)=>fetch(...e),a=class extends Error{constructor(e,t=`FunctionsError`,n){super(e),this.name=t,this.context=n}toJSON(){return{name:this.name,message:this.message,context:this.context}}},o=class extends a{constructor(e){super(`Failed to send a request to the Edge Function`,`FunctionsFetchError`,e)}},s=class extends a{constructor(e){super(`Relay Error invoking the Edge Function`,`FunctionsRelayError`,e)}},c=class extends a{constructor(e){super(`Edge Function returned a non-2xx status code`,`FunctionsHttpError`,e)}},l;(function(e){e.Any=`any`,e.ApNortheast1=`ap-northeast-1`,e.ApNortheast2=`ap-northeast-2`,e.ApSouth1=`ap-south-1`,e.ApSoutheast1=`ap-southeast-1`,e.ApSoutheast2=`ap-southeast-2`,e.CaCentral1=`ca-central-1`,e.EuCentral1=`eu-central-1`,e.EuWest1=`eu-west-1`,e.EuWest2=`eu-west-2`,e.EuWest3=`eu-west-3`,e.SaEast1=`sa-east-1`,e.UsEast1=`us-east-1`,e.UsWest1=`us-west-1`,e.UsWest2=`us-west-2`})(l||={});var u=class{constructor(e,{headers:t={},customFetch:n,region:r=l.Any}={}){this.url=e,this.headers=t,this.region=r,this.fetch=i(n)}setAuth(e){this.headers.Authorization=`Bearer ${e}`}invoke(e){return r(this,arguments,void 0,function*(e,t={}){var n;let r,i,a;try{let{headers:n,method:l,body:u,signal:d,timeout:f}=t,p={},{region:m}=t;m||=this.region;let h=new URL(`${this.url}/${e}`);m&&m!==`any`&&(p[`x-region`]=m,h.searchParams.set(`forceFunctionRegion`,m));let g,_=!!n&&Object.keys(n).some(e=>e.toLowerCase()===`content-type`);u&&!_?typeof Blob<`u`&&u instanceof Blob||u instanceof ArrayBuffer?(p[`Content-Type`]=u.type||`application/octet-stream`,g=u):typeof u==`string`?(p[`Content-Type`]=`text/plain`,g=u):typeof FormData<`u`&&u instanceof FormData?g=u:(p[`Content-Type`]=`application/json`,g=JSON.stringify(u)):g=u&&typeof u!=`string`&&!(typeof Blob<`u`&&u instanceof Blob)&&!(u instanceof ArrayBuffer)&&!(typeof FormData<`u`&&u instanceof FormData)?JSON.stringify(u):u;let v=d;f&&(i=new AbortController,r=setTimeout(()=>i.abort(),f),d?(v=i.signal,a=()=>i.abort(),d.addEventListener(`abort`,a)):v=i.signal);let y=yield this.fetch(h.toString(),{method:l||`POST`,headers:Object.assign(Object.assign(Object.assign({},p),this.headers),n),body:g,signal:v}).catch(e=>{throw new o(e)}),b=y.headers.get(`x-relay-error`);if(b&&b===`true`)throw new s(y);if(!y.ok)throw new c(y);let x=(y.headers.get(`Content-Type`)??`text/plain`).split(`;`)[0].trim().toLowerCase(),S;return S=x===`application/json`?yield y.json():x===`application/octet-stream`||x===`application/pdf`?yield y.blob():x===`text/event-stream`?y:x===`multipart/form-data`?yield y.formData():yield y.text(),{data:S,error:null,response:y}}catch(e){return{data:null,error:e,response:e instanceof c||e instanceof s?e.context:void 0}}finally{r&&clearTimeout(r),a&&((n=t.signal)==null||n.removeEventListener(`abort`,a))}})}},d=class extends Error{constructor(e){super(e.message),this.name=`PostgrestError`,this.details=e.details,this.hint=e.hint,this.code=e.code}toJSON(){return{name:this.name,message:this.message,details:this.details,hint:this.hint,code:this.code}}},f=3,p=e=>Math.min(1e3*2**e,3e4),m=[520,503],h=[`GET`,`HEAD`,`OPTIONS`];function g(e){"@babel/helpers - typeof";return g=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},g(e)}function _(e,t){if(g(e)!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t||`default`);if(g(r)!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}function v(e){var t=_(e,`string`);return g(t)==`symbol`?t:t+``}function y(e,t,n){return(t=v(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function b(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),n.push.apply(n,r)}return n}function x(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]==null?{}:arguments[t];t%2?b(Object(n),!0).forEach(function(t){y(e,t,n[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):b(Object(n)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))})}return e}function S(e,t){return new Promise(n=>{if(t?.aborted){n();return}let r=setTimeout(()=>{t?.removeEventListener(`abort`,i),n()},e);function i(){clearTimeout(r),n()}t?.addEventListener(`abort`,i)})}function C(e,t,n,r){return!(!r||n>=f||!h.includes(e)||!m.includes(t))}async function w(e,t,n,r){let i=0;for(;;){let a=x({},n.headers);i>0&&(a[`X-Retry-Count`]=String(i));let o;try{o=await e(t,{method:n.method,headers:a,body:n.body,signal:n.signal})}catch(e){if(e?.name===`AbortError`||e?.code===`ABORT_ERR`||e?.name===`TimeoutError`&&n.signal?.aborted||!h.includes(n.method))throw e;if(r&&i<f){let e=p(i);i++,await S(e,n.signal);continue}throw e}if(C(n.method,o.status,i,r)){let e=o.headers?.get(`Retry-After`)??null,t=e===null?p(i):Math.max(0,parseInt(e,10)||0)*1e3;await o.text(),i++,await S(t,n.signal)}else return o}}var T=class{constructor(e){this.shouldThrowOnError=!1,this.retryEnabled=!0,this.method=e.method,this.url=e.url,this.headers=new Headers(e.headers),this.schema=e.schema,this.body=e.body,this.shouldThrowOnError=e.shouldThrowOnError??!1,this.signal=e.signal,this.isMaybeSingle=e.isMaybeSingle??!1,this.shouldStripNulls=e.shouldStripNulls??!1,this.urlLengthLimit=e.urlLengthLimit??8e3,this.retryEnabled=e.retry??!0,this.fetch=e.fetch?e.fetch:fetch}throwOnError(){return this.shouldThrowOnError=!0,this}stripNulls(){if(this.headers.get(`Accept`)===`text/csv`)throw Error(`stripNulls() cannot be used with csv()`);return this.shouldStripNulls=!0,this}setHeader(e,t){return this.headers=new Headers(this.headers),this.headers.set(e,t),this}retry(e){return this.retryEnabled=e,this}then(e,t){var n=this;if(this.schema===void 0||([`GET`,`HEAD`].includes(this.method)?this.headers.set(`Accept-Profile`,this.schema):this.headers.set(`Content-Profile`,this.schema)),this.method!==`GET`&&this.method!==`HEAD`&&this.headers.set(`Content-Type`,`application/json`),this.shouldStripNulls){let e=this.headers.get(`Accept`);e===`application/vnd.pgrst.object+json`?this.headers.set(`Accept`,`application/vnd.pgrst.object+json;nulls=stripped`):e&&e!==`application/json`||this.headers.set(`Accept`,`application/vnd.pgrst.array+json;nulls=stripped`)}let r=this.fetch,i=(async()=>{let e={};n.headers.forEach((t,n)=>{e[n]=t});let t=await w(r,n.url.toString(),{method:n.method,headers:e,body:JSON.stringify(n.body,(e,t)=>typeof t==`bigint`?t.toString():t),signal:n.signal},n.retryEnabled);return await n.processResponse(t)})();return this.shouldThrowOnError||(i=i.catch(e=>{let t=``,n=``,r=``,i=e?.cause;if(i){let n=i?.message??``,r=i?.code??``;t=`${e?.name??`FetchError`}: ${e?.message}`,t+=`\n\nCaused by: ${i?.name??`Error`}: ${n}`,r&&(t+=` (${r})`),i?.stack&&(t+=`\n${i.stack}`)}else t=e?.stack??``;let a=this.url.toString().length;return e?.name===`AbortError`||e?.code===`ABORT_ERR`?(r=``,n=`Request was aborted (timeout or manual cancellation)`,a>this.urlLengthLimit&&(n+=`. Note: Your request URL is ${a} characters, which may exceed server limits. If selecting many fields, consider using views. If filtering with large arrays (e.g., .in('id', [many IDs])), consider using an RPC function to pass values server-side.`)):(i?.name===`HeadersOverflowError`||i?.code===`UND_ERR_HEADERS_OVERFLOW`)&&(r=``,n=`HTTP headers exceeded server limits (typically 16KB)`,a>this.urlLengthLimit&&(n+=`. Your request URL is ${a} characters. If selecting many fields, consider using views. If filtering with large arrays (e.g., .in('id', [200+ IDs])), consider using an RPC function instead.`)),{success:!1,error:{message:`${e?.name??`FetchError`}: ${e?.message}`,details:t,hint:n,code:r},data:null,count:null,status:0,statusText:``}})),i.then(e,t)}async processResponse(e){var t=this;let n=null,r=null,i=null,a=e.status,o=e.statusText;if(e.ok){if(t.method!==`HEAD`){let i=await e.text();if(i!==``){if(t.headers.get(`Accept`)===`text/csv`)r=i;else if(t.headers.get(`Accept`)&&t.headers.get(`Accept`)?.includes(`application/vnd.pgrst.plan+text`))r=i;else try{r=JSON.parse(i)}catch{if(n={message:i},r=null,t.shouldThrowOnError)throw new d({message:i,details:``,hint:``,code:``})}}}let s=t.headers.get(`Prefer`)?.match(/count=(exact|planned|estimated)/),c=e.headers.get(`content-range`)?.split(`/`);if(s&&c&&c.length>1&&(i=parseInt(c[1])),t.isMaybeSingle&&Array.isArray(r)){if(r.length>1){if(n={code:`PGRST116`,details:`Results contain ${r.length} rows, application/vnd.pgrst.object+json requires 1 row`,hint:null,message:`JSON object requested, multiple (or no) rows returned`},r=null,i=null,a=406,o=`Not Acceptable`,t.shouldThrowOnError)throw new d(x(x({},n),{},{hint:n.hint??``}))}else r=r.length===1?r[0]:null}}else{let i=await e.text();try{n=JSON.parse(i),Array.isArray(n)&&e.status===404&&(r=[],n=null,a=200,o=`OK`)}catch{e.status===404&&i===``?(a=204,o=`No Content`):n={message:i}}if(n&&t.shouldThrowOnError)throw new d(n)}return{success:n===null,error:n,data:r,count:i,status:a,statusText:o}}returns(){return this}overrideTypes(){return this}},E=class extends T{throwOnError(){return super.throwOnError()}select(e){let t=!1,n=(e??`*`).split(``).map(e=>/\s/.test(e)&&!t?``:(e===`"`&&(t=!t),e)).join(``);return this.url.searchParams.set(`select`,n),this.headers.append(`Prefer`,`return=representation`),this}order(e,{ascending:t=!0,nullsFirst:n,foreignTable:r,referencedTable:i=r}={}){let a=i?`${i}.order`:`order`,o=this.url.searchParams.get(a);return this.url.searchParams.set(a,`${o?`${o},`:``}${e}.${t?`asc`:`desc`}${n===void 0?``:n?`.nullsfirst`:`.nullslast`}`),this}limit(e,{foreignTable:t,referencedTable:n=t}={}){let r=n===void 0?`limit`:`${n}.limit`;return this.url.searchParams.set(r,`${e}`),this}range(e,t,{foreignTable:n,referencedTable:r=n}={}){let i=r===void 0?`offset`:`${r}.offset`,a=r===void 0?`limit`:`${r}.limit`;return this.url.searchParams.set(i,`${e}`),this.url.searchParams.set(a,`${t-e+1}`),this}abortSignal(e){return this.signal=e,this}single(){return this.headers.set(`Accept`,`application/vnd.pgrst.object+json`),this}maybeSingle(){return this.isMaybeSingle=!0,this}csv(){return this.headers.set(`Accept`,`text/csv`),this}geojson(){return this.headers.set(`Accept`,`application/geo+json`),this}explain({analyze:e=!1,verbose:t=!1,settings:n=!1,buffers:r=!1,wal:i=!1,format:a=`text`}={}){let o=[e?`analyze`:null,t?`verbose`:null,n?`settings`:null,r?`buffers`:null,i?`wal`:null].filter(Boolean).join(`|`),s=this.headers.get(`Accept`)??`application/json`;return this.headers.set(`Accept`,`application/vnd.pgrst.plan+${a}; for="${s}"; options=${o};`),this}rollback(){return this.headers.append(`Prefer`,`tx=rollback`),this}returns(){return this}maxAffected(e){return this.headers.append(`Prefer`,`handling=strict`),this.headers.append(`Prefer`,`max-affected=${e}`),this}},D=RegExp(`[,()]`),O=class extends E{throwOnError(){return super.throwOnError()}eq(e,t){return this.url.searchParams.append(e,`eq.${t}`),this}neq(e,t){return this.url.searchParams.append(e,`neq.${t}`),this}gt(e,t){return this.url.searchParams.append(e,`gt.${t}`),this}gte(e,t){return this.url.searchParams.append(e,`gte.${t}`),this}lt(e,t){return this.url.searchParams.append(e,`lt.${t}`),this}lte(e,t){return this.url.searchParams.append(e,`lte.${t}`),this}like(e,t){return this.url.searchParams.append(e,`like.${t}`),this}likeAllOf(e,t){return this.url.searchParams.append(e,`like(all).{${t.join(`,`)}}`),this}likeAnyOf(e,t){return this.url.searchParams.append(e,`like(any).{${t.join(`,`)}}`),this}ilike(e,t){return this.url.searchParams.append(e,`ilike.${t}`),this}ilikeAllOf(e,t){return this.url.searchParams.append(e,`ilike(all).{${t.join(`,`)}}`),this}ilikeAnyOf(e,t){return this.url.searchParams.append(e,`ilike(any).{${t.join(`,`)}}`),this}regexMatch(e,t){return this.url.searchParams.append(e,`match.${t}`),this}regexIMatch(e,t){return this.url.searchParams.append(e,`imatch.${t}`),this}is(e,t){return this.url.searchParams.append(e,`is.${t}`),this}isDistinct(e,t){return this.url.searchParams.append(e,`isdistinct.${t}`),this}in(e,t){let n=Array.from(new Set(t)).map(e=>typeof e==`string`&&D.test(e)?`"${e}"`:`${e}`).join(`,`);return this.url.searchParams.append(e,`in.(${n})`),this}notIn(e,t){let n=Array.from(new Set(t)).map(e=>typeof e==`string`&&D.test(e)?`"${e}"`:`${e}`).join(`,`);return this.url.searchParams.append(e,`not.in.(${n})`),this}contains(e,t){return typeof t==`string`?this.url.searchParams.append(e,`cs.${t}`):Array.isArray(t)?this.url.searchParams.append(e,`cs.{${t.join(`,`)}}`):this.url.searchParams.append(e,`cs.${JSON.stringify(t)}`),this}containedBy(e,t){return typeof t==`string`?this.url.searchParams.append(e,`cd.${t}`):Array.isArray(t)?this.url.searchParams.append(e,`cd.{${t.join(`,`)}}`):this.url.searchParams.append(e,`cd.${JSON.stringify(t)}`),this}rangeGt(e,t){return this.url.searchParams.append(e,`sr.${t}`),this}rangeGte(e,t){return this.url.searchParams.append(e,`nxl.${t}`),this}rangeLt(e,t){return this.url.searchParams.append(e,`sl.${t}`),this}rangeLte(e,t){return this.url.searchParams.append(e,`nxr.${t}`),this}rangeAdjacent(e,t){return this.url.searchParams.append(e,`adj.${t}`),this}overlaps(e,t){return typeof t==`string`?this.url.searchParams.append(e,`ov.${t}`):this.url.searchParams.append(e,`ov.{${t.join(`,`)}}`),this}textSearch(e,t,{config:n,type:r}={}){let i=``;r===`plain`?i=`pl`:r===`phrase`?i=`ph`:r===`websearch`&&(i=`w`);let a=n===void 0?``:`(${n})`;return this.url.searchParams.append(e,`${i}fts${a}.${t}`),this}match(e){return Object.entries(e).filter(([e,t])=>t!==void 0).forEach(([e,t])=>{this.url.searchParams.append(e,`eq.${t}`)}),this}not(e,t,n){return this.url.searchParams.append(e,`not.${t}.${n}`),this}or(e,{foreignTable:t,referencedTable:n=t}={}){let r=n?`${n}.or`:`or`;return this.url.searchParams.append(r,`(${e})`),this}filter(e,t,n){return this.url.searchParams.append(e,`${t}.${n}`),this}},ee=class{constructor(e,{headers:t={},schema:n,fetch:r,urlLengthLimit:i=8e3,retry:a}){this.url=e,this.headers=new Headers(t),this.schema=n,this.fetch=r,this.urlLengthLimit=i,this.retry=a}cloneRequestState(){return{url:new URL(this.url.toString()),headers:new Headers(this.headers)}}select(e,t){let{head:n=!1,count:r}=t??{},i=n?`HEAD`:`GET`,a=!1,o=(e??`*`).split(``).map(e=>/\s/.test(e)&&!a?``:(e===`"`&&(a=!a),e)).join(``),{url:s,headers:c}=this.cloneRequestState();return s.searchParams.set(`select`,o),r&&c.append(`Prefer`,`count=${r}`),new O({method:i,url:s,headers:c,schema:this.schema,fetch:this.fetch,urlLengthLimit:this.urlLengthLimit,retry:this.retry})}insert(e,{count:t,defaultToNull:n=!0}={}){let{url:r,headers:i}=this.cloneRequestState();if(t&&i.append(`Prefer`,`count=${t}`),n||i.append(`Prefer`,`missing=default`),Array.isArray(e)){let t=e.reduce((e,t)=>e.concat(Object.keys(t)),[]);if(t.length>0){let e=[...new Set(t)].map(e=>`"${e}"`);r.searchParams.set(`columns`,e.join(`,`))}}return new O({method:`POST`,url:r,headers:i,schema:this.schema,body:e,fetch:this.fetch??fetch,urlLengthLimit:this.urlLengthLimit,retry:this.retry})}upsert(e,{onConflict:t,ignoreDuplicates:n=!1,count:r,defaultToNull:i=!0}={}){let{url:a,headers:o}=this.cloneRequestState();if(o.append(`Prefer`,`resolution=${n?`ignore`:`merge`}-duplicates`),t!==void 0&&a.searchParams.set(`on_conflict`,t),r&&o.append(`Prefer`,`count=${r}`),i||o.append(`Prefer`,`missing=default`),Array.isArray(e)){let t=e.reduce((e,t)=>e.concat(Object.keys(t)),[]);if(t.length>0){let e=[...new Set(t)].map(e=>`"${e}"`);a.searchParams.set(`columns`,e.join(`,`))}}return new O({method:`POST`,url:a,headers:o,schema:this.schema,body:e,fetch:this.fetch??fetch,urlLengthLimit:this.urlLengthLimit,retry:this.retry})}update(e,{count:t}={}){let{url:n,headers:r}=this.cloneRequestState();return t&&r.append(`Prefer`,`count=${t}`),new O({method:`PATCH`,url:n,headers:r,schema:this.schema,body:e,fetch:this.fetch??fetch,urlLengthLimit:this.urlLengthLimit,retry:this.retry})}delete({count:e}={}){let{url:t,headers:n}=this.cloneRequestState();return e&&n.append(`Prefer`,`count=${e}`),new O({method:`DELETE`,url:t,headers:n,schema:this.schema,fetch:this.fetch??fetch,urlLengthLimit:this.urlLengthLimit,retry:this.retry})}};function te(e,t){try{let t=JSON.parse(e);if(t&&typeof t==`object`&&!Array.isArray(t))return new d({message:String(t.message??e),details:t.details??``,hint:t.hint??``,code:t.code??``})}catch{}return new d({message:e||t,details:``,hint:``,code:``})}function ne(e,t,n){let r=e;return{success:!1,error:new d({message:`${r?.name??`FetchError`}: ${r?.message}`,details:``,hint:``,code:``}),data:null,count:null,status:t,statusText:n}}var re=class e{constructor(e,{headers:t={},schema:n,fetch:r,timeout:i,urlLengthLimit:a=8e3,retry:o}={}){this.url=e,this.headers=new Headers(t),this.schemaName=n,this.urlLengthLimit=a;let s=r??globalThis.fetch;this.fetch=i!==void 0&&i>0?(e,t)=>{let n=new AbortController,r=setTimeout(()=>n.abort(),i),a=t?.signal;if(a){if(a.aborted)return clearTimeout(r),s(e,t);let i=()=>{clearTimeout(r),n.abort()};return a.addEventListener(`abort`,i,{once:!0}),s(e,x(x({},t),{},{signal:n.signal})).finally(()=>{clearTimeout(r),a.removeEventListener(`abort`,i)})}return s(e,x(x({},t),{},{signal:n.signal})).finally(()=>clearTimeout(r))}:s,this.retry=o}from(e){if(!e||typeof e!=`string`||e.trim()===``)throw Error(`Invalid relation name: relation must be a non-empty string.`);return new ee(new URL(`${this.url}/${e}`),{headers:new Headers(this.headers),schema:this.schemaName,fetch:this.fetch,urlLengthLimit:this.urlLengthLimit,retry:this.retry})}schema(t){return new e(this.url,{headers:this.headers,schema:t,fetch:this.fetch,urlLengthLimit:this.urlLengthLimit,retry:this.retry})}async getOpenApiSpec(){var e=this;let t=new Headers(e.headers);t.set(`Accept`,`application/openapi+json`),e.schemaName&&t.set(`Accept-Profile`,e.schemaName);let n={};t.forEach((e,t)=>{n[t]=e});let r=e.fetch??globalThis.fetch,i;try{i=await w(r,`${e.url}/`,{method:`GET`,headers:n},e.retry??!0)}catch(e){return ne(e,0,``)}let a;try{a=await i.text()}catch(e){return ne(e,i.status,i.statusText)}if(i.ok)try{return{success:!0,error:null,data:JSON.parse(a),count:null,status:i.status,statusText:i.statusText}}catch{}return{success:!1,error:te(a,i.statusText),data:null,count:null,status:i.status,statusText:i.statusText}}rpc(e,t={},{head:n=!1,get:r=!1,count:i}={}){let a,o=new URL(`${this.url}/rpc/${e}`),s,c=e=>typeof e==`object`&&!!e&&(!Array.isArray(e)||e.some(c)),l=n&&Object.values(t).some(c);l?(a=`POST`,s=t):n||r?(a=n?`HEAD`:`GET`,Object.entries(t).filter(([e,t])=>t!==void 0).map(([e,t])=>[e,Array.isArray(t)?`{${t.join(`,`)}}`:`${t}`]).forEach(([e,t])=>{o.searchParams.append(e,t)})):(a=`POST`,s=t);let u=new Headers(this.headers);return l?u.set(`Prefer`,i?`count=${i},return=minimal`:`return=minimal`):i&&u.set(`Prefer`,`count=${i}`),new O({method:a,url:o,headers:u,schema:this.schemaName,body:s,fetch:this.fetch??fetch,urlLengthLimit:this.urlLengthLimit,retry:this.retry})}},ie=class{constructor(){}static detectEnvironment(){if(typeof WebSocket<`u`)return{type:`native`,wsConstructor:WebSocket};let e=globalThis;if(typeof globalThis<`u`&&e.WebSocket!==void 0)return{type:`native`,wsConstructor:e.WebSocket};let t=typeof global<`u`?global:void 0;if(t&&t.WebSocket!==void 0)return{type:`native`,wsConstructor:t.WebSocket};if(typeof globalThis<`u`&&e.WebSocketPair!==void 0&&globalThis.WebSocket===void 0)return{type:`cloudflare`,error:`Cloudflare Workers detected. WebSocket clients are not supported in Cloudflare Workers.`,workaround:`Use Cloudflare Workers WebSocket API for server-side WebSocket handling, or deploy to a different runtime.`};if(typeof globalThis<`u`&&e.EdgeRuntime||typeof navigator<`u`&&navigator.userAgent?.includes(`Vercel-Edge`))return{type:`unsupported`,error:`Edge runtime detected (Vercel Edge/Netlify Edge). WebSockets are not supported in edge functions.`,workaround:`Use serverless functions or a different deployment target for WebSocket functionality.`};let n=globalThis.process;if(n){let e=n.versions;if(e&&e.node)return{type:`unsupported`,error:`Node.js detected but native WebSocket not found.`,workaround:`Ensure you are running Node.js 22+ or provide a WebSocket implementation via the transport option.`}}return{type:`unsupported`,error:`Unknown JavaScript runtime without WebSocket support.`,workaround:`Ensure you're running in a supported environment (browser, Node.js, Deno) or provide a custom WebSocket implementation.`}}static getWebSocketConstructor(){let e=this.detectEnvironment();if(e.wsConstructor)return e.wsConstructor;let t=e.error||`WebSocket not supported in this environment.`;throw e.workaround&&(t+=`\n\nSuggested solution: ${e.workaround}`),Error(t)}static isWebSocketSupported(){try{return this.detectEnvironment().type===`native`}catch{return!1}}},ae=`realtime-js/2.118.0`,oe=`1.0.0`,se=`2.0.0`,ce=se,le=1e4,ue=15e3,de=1e4,fe={closed:`closed`,errored:`errored`,joined:`joined`,joining:`joining`,leaving:`leaving`},pe={close:`phx_close`,error:`phx_error`,join:`phx_join`,reply:`phx_reply`,leave:`phx_leave`,access_token:`access_token`},me={connecting:`connecting`,open:`open`,closing:`closing`,closed:`closed`},he=class{constructor(e){this.HEADER_LENGTH=1,this.USER_BROADCAST_PUSH_META_LENGTH=6,this.KINDS={userBroadcastPush:3,userBroadcast:4},this.BINARY_ENCODING=0,this.JSON_ENCODING=1,this.BROADCAST_EVENT=`broadcast`,this.allowedMetadataKeys=[],this.allowedMetadataKeys=e??[]}encode(e,t){if(e.event===this.BROADCAST_EVENT&&!(e.payload instanceof ArrayBuffer)&&typeof e.payload.event==`string`)return t(this._binaryEncodeUserBroadcastPush(e));let n=[e.join_ref,e.ref,e.topic,e.event,e.payload];return t(JSON.stringify(n))}_binaryEncodeUserBroadcastPush(e){return this._isArrayBuffer(e.payload?.payload)?this._encodeBinaryUserBroadcastPush(e):this._encodeJsonUserBroadcastPush(e)}_encodeBinaryUserBroadcastPush(e){let t=e.payload?.payload??new ArrayBuffer(0);return this._encodeUserBroadcastPush(e,this.BINARY_ENCODING,t)}_encodeJsonUserBroadcastPush(e){let t=e.payload?.payload??{},n=new TextEncoder().encode(JSON.stringify(t)).buffer;return this._encodeUserBroadcastPush(e,this.JSON_ENCODING,n)}_encodeUserBroadcastPush(e,t,n){let r=new TextEncoder,i=r.encode(e.topic),a=r.encode(e.ref??``),o=r.encode(e.join_ref??``),s=r.encode(e.payload.event),c=this.allowedMetadataKeys?this._pick(e.payload,this.allowedMetadataKeys):{},l=r.encode(Object.keys(c).length===0?``:JSON.stringify(c));if(o.length>255)throw Error(`joinRef length ${o.length} exceeds maximum of 255`);if(a.length>255)throw Error(`ref length ${a.length} exceeds maximum of 255`);if(i.length>255)throw Error(`topic length ${i.length} exceeds maximum of 255`);if(s.length>255)throw Error(`userEvent length ${s.length} exceeds maximum of 255`);if(l.length>255)throw Error(`metadata length ${l.length} exceeds maximum of 255`);let u=this.USER_BROADCAST_PUSH_META_LENGTH+o.length+a.length+i.length+s.length+l.length,d=new ArrayBuffer(this.HEADER_LENGTH+u),f=new DataView(d),p=new Uint8Array(d),m=0;f.setUint8(m++,this.KINDS.userBroadcastPush),f.setUint8(m++,o.length),f.setUint8(m++,a.length),f.setUint8(m++,i.length),f.setUint8(m++,s.length),f.setUint8(m++,l.length),f.setUint8(m++,t),p.set(o,m),m+=o.length,p.set(a,m),m+=a.length,p.set(i,m),m+=i.length,p.set(s,m),m+=s.length,p.set(l,m),m+=l.length;var h=new Uint8Array(d.byteLength+n.byteLength);return h.set(new Uint8Array(d),0),h.set(new Uint8Array(n),d.byteLength),h.buffer}decode(e,t){if(this._isArrayBuffer(e))return t(this._binaryDecode(e));if(typeof e==`string`){let[n,r,i,a,o]=JSON.parse(e);return t({join_ref:n,ref:r,topic:i,event:a,payload:o})}return t({})}_binaryDecode(e){let t=new DataView(e),n=t.getUint8(0),r=new TextDecoder;switch(n){case this.KINDS.userBroadcast:return this._decodeUserBroadcast(e,t,r)}}_decodeUserBroadcast(e,t,n){let r=t.getUint8(1),i=t.getUint8(2),a=t.getUint8(3),o=t.getUint8(4),s=this.HEADER_LENGTH+4,c=n.decode(e.slice(s,s+r));s+=r;let l=n.decode(e.slice(s,s+i));s+=i;let u=n.decode(e.slice(s,s+a));s+=a;let d=e.slice(s,e.byteLength),f=o===this.JSON_ENCODING?JSON.parse(n.decode(d)):d,p={type:this.BROADCAST_EVENT,event:l,payload:f};return a>0&&(p.meta=JSON.parse(u)),{join_ref:null,ref:null,topic:c,event:this.BROADCAST_EVENT,payload:p}}_isArrayBuffer(e){return e instanceof ArrayBuffer||e?.constructor?.name===`ArrayBuffer`}_pick(e,t){return!e||typeof e!=`object`?{}:Object.fromEntries(Object.entries(e).filter(([e])=>t.includes(e)))}},k;(function(e){e.abstime=`abstime`,e.bool=`bool`,e.date=`date`,e.daterange=`daterange`,e.float4=`float4`,e.float8=`float8`,e.int2=`int2`,e.int4=`int4`,e.int4range=`int4range`,e.int8=`int8`,e.int8range=`int8range`,e.json=`json`,e.jsonb=`jsonb`,e.money=`money`,e.numeric=`numeric`,e.oid=`oid`,e.reltime=`reltime`,e.text=`text`,e.time=`time`,e.timestamp=`timestamp`,e.timestamptz=`timestamptz`,e.timetz=`timetz`,e.tsrange=`tsrange`,e.tstzrange=`tstzrange`})(k||={});var ge=(e,t,n={})=>{let r=n.skipTypes??[];return t?Object.keys(t).reduce((n,i)=>(n[i]=_e(i,e,t,r),n),{}):{}},_e=(e,t,n,r)=>{let i=t.find(t=>t.name===e)?.type,a=n[e];return i&&!r.includes(i)?ve(i,a):ye(a)},ve=(e,t)=>{if(e.charAt(0)===`_`)return Ce(t,e.slice(1,e.length));switch(e){case k.bool:return be(t);case k.float4:case k.float8:case k.int2:case k.int4:case k.int8:case k.numeric:case k.oid:return xe(t);case k.json:case k.jsonb:return Se(t);case k.timestamp:return we(t);case k.abstime:case k.date:case k.daterange:case k.int4range:case k.int8range:case k.money:case k.reltime:case k.text:case k.time:case k.timestamptz:case k.timetz:case k.tsrange:case k.tstzrange:return ye(t);default:return ye(t)}},ye=e=>e,be=e=>{switch(e){case`t`:return!0;case`f`:return!1;default:return e}},xe=e=>{if(typeof e==`string`){let t=parseFloat(e);if(!Number.isNaN(t))return t}return e},Se=e=>{if(typeof e==`string`)try{return JSON.parse(e)}catch{return e}return e},Ce=(e,t)=>{if(typeof e!=`string`)return e;let n=e.length-1,r=e[n];if(e[0]===`{`&&r===`}`){let r,i=e.slice(1,n);try{r=JSON.parse(`[`+i+`]`)}catch{r=i?i.split(`,`):[]}return r.map(e=>ve(t,e))}return e},we=e=>typeof e==`string`?e.replace(` `,`T`):e,Te=e=>{let t=new URL(e);return t.protocol=t.protocol.replace(/^ws/i,`http`),t.pathname=t.pathname.replace(/\/+$/,``).replace(/\/socket\/websocket$/i,``).replace(/\/socket$/i,``).replace(/\/websocket$/i,``),t.pathname===``||t.pathname===`/`?t.pathname=`/api/broadcast`:t.pathname+=`/api/broadcast`,t.href},Ee=e=>typeof e==`function`?e:function(){return e},De=typeof self<`u`?self:null,Oe=typeof window<`u`?window:null,ke=De||Oe||globalThis,Ae=`2.0.0`,je=1e4,Me=1e3,Ne=100,Pe={connecting:0,open:1,closing:2,closed:3},Fe={closed:`closed`,errored:`errored`,joined:`joined`,joining:`joining`,leaving:`leaving`},Ie={close:`phx_close`,error:`phx_error`,join:`phx_join`,reply:`phx_reply`,leave:`phx_leave`},Le={longpoll:`longpoll`,websocket:`websocket`},Re={complete:4},ze=`base64url.bearer.phx.`,Be=class{constructor(e,t,n,r){this.channel=e,this.event=t,this.payload=n||function(){return{}},this.receivedResp=null,this.timeout=r,this.timeoutTimer=null,this.recHooks=[],this.sent=!1,this.ref=void 0}resend(e){this.timeout=e,this.reset(),this.send()}send(){this.hasReceived(`timeout`)||(this.startTimeout(),this.sent=!0,this.channel.socket.push({topic:this.channel.topic,event:this.event,payload:this.payload(),ref:this.ref,join_ref:this.channel.joinRef()}))}receive(e,t){return this.hasReceived(e)&&t(this.receivedResp.response),this.recHooks.push({status:e,callback:t}),this}reset(){this.cancelRefEvent(),this.ref=null,this.refEvent=null,this.receivedResp=null,this.sent=!1}destroy(){this.cancelRefEvent(),this.cancelTimeout()}matchReceive({status:e,response:t,_ref:n}){this.recHooks.filter(t=>t.status===e).forEach(e=>e.callback(t))}cancelRefEvent(){this.refEvent&&this.channel.off(this.refEvent)}cancelTimeout(){clearTimeout(this.timeoutTimer),this.timeoutTimer=null}startTimeout(){this.timeoutTimer&&this.cancelTimeout(),this.ref=this.channel.socket.makeRef(),this.refEvent=this.channel.replyEventName(this.ref),this.channel.on(this.refEvent,e=>{this.cancelRefEvent(),this.cancelTimeout(),this.receivedResp=e,this.matchReceive(e)}),this.timeoutTimer=setTimeout(()=>{this.trigger(`timeout`,{})},this.timeout)}hasReceived(e){return this.receivedResp&&this.receivedResp.status===e}trigger(e,t){this.channel.trigger(this.refEvent,{status:e,response:t})}},Ve=class{constructor(e,t){this.callback=e,this.timerCalc=t,this.timer=void 0,this.tries=0}reset(){this.tries=0,clearTimeout(this.timer)}scheduleTimeout(){clearTimeout(this.timer),this.timer=setTimeout(()=>{this.tries+=1,this.callback()},this.timerCalc(this.tries+1))}},He=class{constructor(e,t,n){this.state=Fe.closed,this.topic=e,this.params=Ee(t||{}),this.socket=n,this.bindings=[],this.bindingRef=0,this.timeout=this.socket.timeout,this.joinedOnce=!1,this.joinPush=new Be(this,Ie.join,this.params,this.timeout),this.pushBuffer=[],this.stateChangeRefs=[],this.rejoinTimer=new Ve(()=>{this.socket.isConnected()&&this.rejoin()},this.socket.rejoinAfterMs),this.stateChangeRefs.push(this.socket.onError(()=>this.rejoinTimer.reset())),this.stateChangeRefs.push(this.socket.onOpen(()=>{this.rejoinTimer.reset(),this.isErrored()&&this.rejoin()})),this.joinPush.receive(`ok`,()=>{this.state=Fe.joined,this.rejoinTimer.reset(),this.pushBuffer.forEach(e=>e.send()),this.pushBuffer=[]}),this.joinPush.receive(`error`,e=>{this.state=Fe.errored,this.socket.hasLogger()&&this.socket.log(`channel`,`error ${this.topic}`,e),this.socket.isConnected()&&this.rejoinTimer.scheduleTimeout()}),this.onClose(()=>{this.rejoinTimer.reset(),this.socket.hasLogger()&&this.socket.log(`channel`,`close ${this.topic}`),this.state=Fe.closed,this.socket.remove(this)}),this.onError(e=>{this.socket.hasLogger()&&this.socket.log(`channel`,`error ${this.topic}`,e),this.isJoining()&&this.joinPush.reset(),this.state=Fe.errored,this.socket.isConnected()&&this.rejoinTimer.scheduleTimeout()}),this.joinPush.receive(`timeout`,()=>{this.socket.hasLogger()&&this.socket.log(`channel`,`timeout ${this.topic}`,this.joinPush.timeout),new Be(this,Ie.leave,Ee({}),this.timeout).send(),this.state=Fe.errored,this.joinPush.reset(),this.socket.isConnected()&&this.rejoinTimer.scheduleTimeout()}),this.on(Ie.reply,(e,t)=>{this.trigger(this.replyEventName(t),e)})}join(e=this.timeout){if(this.joinedOnce)throw Error(`tried to join multiple times. 'join' can only be called a single time per channel instance`);return this.timeout=e,this.joinedOnce=!0,this.rejoin(),this.joinPush}teardown(){this.pushBuffer.forEach(e=>e.destroy()),this.pushBuffer=[],this.rejoinTimer.reset(),this.joinPush.destroy(),this.state=Fe.closed,this.bindings=[]}onClose(e){this.on(Ie.close,e)}onError(e){return this.on(Ie.error,t=>e(t))}on(e,t){let n=this.bindingRef++;return this.bindings.push({event:e,ref:n,callback:t}),n}off(e,t){this.bindings=this.bindings.filter(n=>n.event!==e||t!==void 0&&t!==n.ref)}canPush(){return this.socket.isConnected()&&this.isJoined()}push(e,t,n=this.timeout){if(t||={},!this.joinedOnce)throw Error(`tried to push '${e}' to '${this.topic}' before joining. Use channel.join() before pushing events`);let r=new Be(this,e,function(){return t},n);return this.canPush()?r.send():(r.startTimeout(),this.pushBuffer.push(r)),r}leave(e=this.timeout){this.rejoinTimer.reset(),this.joinPush.cancelTimeout(),this.state=Fe.leaving;let t=()=>{this.socket.hasLogger()&&this.socket.log(`channel`,`leave ${this.topic}`),this.trigger(Ie.close,`leave`)},n=new Be(this,Ie.leave,Ee({}),e);return n.receive(`ok`,()=>t()).receive(`timeout`,()=>t()),n.send(),this.canPush()||n.trigger(`ok`,{}),n}onMessage(e,t,n){return t}filterBindings(e,t,n){return!0}isMember(e,t,n,r){return this.topic===e?r&&r!==this.joinRef()?(this.socket.hasLogger()&&this.socket.log(`channel`,`dropping outdated message`,{topic:e,event:t,payload:n,joinRef:r}),!1):!0:!1}joinRef(){return this.joinPush.ref}rejoin(e=this.timeout){this.isLeaving()||(this.socket.leaveOpenTopic(this.topic),this.state=Fe.joining,this.joinPush.resend(e))}trigger(e,t,n,r){let i=this.onMessage(e,t,n,r);if(t&&!i)throw Error(`channel onMessage callbacks must return the payload, modified or unmodified`);let a=this.bindings.filter(r=>r.event===e&&this.filterBindings(r,t,n));for(let e=0;e<a.length;e++)a[e].callback(i,n,r||this.joinRef())}replyEventName(e){return`chan_reply_${e}`}isClosed(){return this.state===Fe.closed}isErrored(){return this.state===Fe.errored}isJoined(){return this.state===Fe.joined}isJoining(){return this.state===Fe.joining}isLeaving(){return this.state===Fe.leaving}},Ue=class{static request(e,t,n,r,i,a,o){if(ke.XDomainRequest){let n=new ke.XDomainRequest;return this.xdomainRequest(n,e,t,r,i,a,o)}if(ke.XMLHttpRequest){let s=new ke.XMLHttpRequest;return this.xhrRequest(s,e,t,n,r,i,a,o)}if(ke.fetch&&ke.AbortController)return this.fetchRequest(e,t,n,r,i,a,o);throw Error(`No suitable XMLHttpRequest implementation found`)}static fetchRequest(e,t,n,r,i,a,o){let s={method:e,headers:n,body:r},c=null;return i&&(c=new AbortController,setTimeout(()=>c.abort(),i),s.signal=c.signal),ke.fetch(t,s).then(e=>e.text()).then(e=>this.parseJSON(e)).then(e=>o&&o(e)).catch(e=>{e.name===`AbortError`&&a?a():o&&o(null)}),c}static xdomainRequest(e,t,n,r,i,a,o){return e.timeout=i,e.open(t,n),e.onload=()=>{let t=this.parseJSON(e.responseText);o&&o(t)},a&&(e.ontimeout=a),e.onprogress=()=>{},e.send(r),e}static xhrRequest(e,t,n,r,i,a,o,s){e.open(t,n,!0),e.timeout=a;for(let[t,n]of Object.entries(r))e.setRequestHeader(t,n);return e.onerror=()=>s&&s(null),e.onreadystatechange=()=>{e.readyState===Re.complete&&s&&s(this.parseJSON(e.responseText))},o&&(e.ontimeout=o),e.send(i),e}static parseJSON(e){if(!e||e===``)return null;try{return JSON.parse(e)}catch{return console&&console.log(`failed to parse JSON response`,e),null}}static serialize(e,t){let n=[];for(var r in e){if(!Object.prototype.hasOwnProperty.call(e,r))continue;let i=t?`${t}[${r}]`:r,a=e[r];typeof a==`object`?n.push(this.serialize(a,i)):n.push(encodeURIComponent(i)+`=`+encodeURIComponent(a))}return n.join(`&`)}static appendParams(e,t){return Object.keys(t).length===0?e:`${e}${e.match(/\?/)?`&`:`?`}${this.serialize(t)}`}},We=e=>{let t=``,n=new Uint8Array(e),r=n.byteLength;for(let e=0;e<r;e++)t+=String.fromCharCode(n[e]);return btoa(t)},Ge=class{constructor(e,t){t&&t.length===2&&t[1].startsWith(ze)&&(this.authToken=atob(t[1].slice(ze.length))),this.endPoint=null,this.token=null,this.skipHeartbeat=!0,this.reqs=new Set,this.awaitingBatchAck=!1,this.currentBatch=null,this.currentBatchTimer=null,this.batchBuffer=[],this.onopen=function(){},this.onerror=function(){},this.onmessage=function(){},this.onclose=function(){},this.pollEndpoint=this.normalizeEndpoint(e),this.readyState=Pe.connecting,setTimeout(()=>this.poll(),0)}normalizeEndpoint(e){return e.replace(`ws://`,`http://`).replace(`wss://`,`https://`).replace(RegExp(`(.*)/`+Le.websocket),`$1/`+Le.longpoll)}endpointURL(){return Ue.appendParams(this.pollEndpoint,{token:this.token})}closeAndRetry(e,t,n){this.close(e,t,n),this.readyState=Pe.connecting}ontimeout(){this.onerror(`timeout`),this.closeAndRetry(1005,`timeout`,!1)}isActive(){return this.readyState===Pe.open||this.readyState===Pe.connecting}poll(){let e={Accept:`application/json`};this.authToken&&(e[`X-Phoenix-AuthToken`]=this.authToken),this.ajax(`GET`,e,null,()=>this.ontimeout(),e=>{if(e){var{status:t,token:n,messages:r}=e;if(t===410&&this.token!==null){this.onerror(410),this.closeAndRetry(3410,`session_gone`,!1);return}this.token=n}else t=0;switch(t){case 200:r.forEach(e=>{setTimeout(()=>this.onmessage({data:e}),0)}),this.poll();break;case 204:this.poll();break;case 410:this.readyState=Pe.open,this.onopen({}),this.poll();break;case 403:this.onerror(403),this.close(1008,`forbidden`,!1);break;case 0:case 500:this.onerror(500),this.closeAndRetry(1011,`internal server error`,500);break;default:throw Error(`unhandled poll status ${t}`)}})}send(e){typeof e!=`string`&&(e=We(e)),this.currentBatch?this.currentBatch.push(e):this.awaitingBatchAck?this.batchBuffer.push(e):(this.currentBatch=[e],this.currentBatchTimer=setTimeout(()=>{this.batchSend(this.currentBatch),this.currentBatch=null},0))}batchSend(e,t=0){this.awaitingBatchAck=!0;let n=t+Ne,r=e.slice(t,n);this.ajax(`POST`,{"Content-Type":`application/x-ndjson`},r.join(`
`),()=>this.onerror(`timeout`),t=>{!t||t.status!==200?(this.awaitingBatchAck=!1,this.onerror(t&&t.status),this.closeAndRetry(1011,`internal server error`,!1)):n<e.length?this.batchSend(e,n):this.batchBuffer.length>0?(this.batchSend(this.batchBuffer),this.batchBuffer=[]):this.awaitingBatchAck=!1})}close(e,t,n){for(let e of this.reqs)e.abort();this.readyState=Pe.closed;let r=Object.assign({code:1e3,reason:void 0,wasClean:!0},{code:e,reason:t,wasClean:n});this.batchBuffer=[],clearTimeout(this.currentBatchTimer),this.currentBatchTimer=null,typeof CloseEvent<`u`?this.onclose(new CloseEvent(`close`,r)):this.onclose(r)}ajax(e,t,n,r,i){let a;a=Ue.request(e,this.endpointURL(),t,n,this.timeout,()=>{this.reqs.delete(a),r()},e=>{this.reqs.delete(a),this.isActive()&&i(e)}),this.reqs.add(a)}},Ke=class e{constructor(t,n={}){let r=n.events||{state:`presence_state`,diff:`presence_diff`};this.state=Object.create(null),this.pendingDiffs=[],this.channel=t,this.joinRef=null,this.caller={onJoin:function(){},onLeave:function(){},onSync:function(){}},this.channel.on(r.state,t=>{let{onJoin:n,onLeave:r,onSync:i}=this.caller;this.joinRef=this.channel.joinRef(),this.state=e.syncState(this.state,t,n,r),this.pendingDiffs.forEach(t=>{this.state=e.syncDiff(this.state,t,n,r)}),this.pendingDiffs=[],i()}),this.channel.on(r.diff,t=>{let{onJoin:n,onLeave:r,onSync:i}=this.caller;this.inPendingSyncState()?this.pendingDiffs.push(t):(this.state=e.syncDiff(this.state,t,n,r),i())})}onJoin(e){this.caller.onJoin=e}onLeave(e){this.caller.onLeave=e}onSync(e){this.caller.onSync=e}list(t){return e.list(this.state,t)}inPendingSyncState(){return!this.joinRef||this.joinRef!==this.channel.joinRef()}static syncState(e,t,n,r){let i=this.toNullProtoObj(this.clone(e));t=this.toNullProtoObj(t);let a=Object.create(null),o=Object.create(null);return this.map(i,(e,n)=>{t[e]||(o[e]=n)}),this.map(t,(e,t)=>{let n=i[e];if(n){let r=t.metas.map(e=>e.phx_ref),i=n.metas.map(e=>e.phx_ref),s=t.metas.filter(e=>i.indexOf(e.phx_ref)<0),c=n.metas.filter(e=>r.indexOf(e.phx_ref)<0);s.length>0&&(a[e]=t,a[e].metas=s),c.length>0&&(o[e]=this.clone(n),o[e].metas=c)}else a[e]=t}),this.syncDiff(i,{joins:a,leaves:o},n,r)}static syncDiff(e,t,n,r){e=this.toNullProtoObj(e);let{joins:i,leaves:a}=this.clone(t);return n||=function(){},r||=function(){},this.map(i,(t,r)=>{let i=e[t];if(e[t]=this.clone(r),i){let n=e[t].metas.map(e=>e.phx_ref),r=i.metas.filter(e=>n.indexOf(e.phx_ref)<0);e[t].metas.unshift(...r)}n(t,i,r)}),this.map(a,(t,n)=>{let i=e[t];if(!i)return;let a=n.metas.map(e=>e.phx_ref);i.metas=i.metas.filter(e=>a.indexOf(e.phx_ref)<0),r(t,i,n),i.metas.length===0&&delete e[t]}),e}static list(e,t){return t||=function(e,t){return t},this.map(e,(e,n)=>t(e,n))}static map(e,t){return Object.getOwnPropertyNames(e).map(n=>t(n,e[n]))}static toNullProtoObj(e){if(Object.getPrototypeOf(e)===null)return e;let t=Object.create(null);return Object.getOwnPropertyNames(e).forEach(n=>{t[n]=e[n]}),t}static clone(e){return JSON.parse(JSON.stringify(e))}},qe={HEADER_LENGTH:1,META_LENGTH:4,KINDS:{push:0,reply:1,broadcast:2},encode(e,t){if(e.payload.constructor===ArrayBuffer)return t(this.binaryEncode(e));{let n=[e.join_ref,e.ref,e.topic,e.event,e.payload];return t(JSON.stringify(n))}},decode(e,t){if(e.constructor===ArrayBuffer)return t(this.binaryDecode(e));{let[n,r,i,a,o]=JSON.parse(e);return t({join_ref:n,ref:r,topic:i,event:a,payload:o})}},binaryEncode(e){let{join_ref:t,ref:n,event:r,topic:i,payload:a}=e,o=new TextEncoder,s=o.encode(t),c=o.encode(n),l=o.encode(i),u=o.encode(r);this.assertFieldSize(s.byteLength,`join_ref`),this.assertFieldSize(c.byteLength,`ref`),this.assertFieldSize(l.byteLength,`topic`),this.assertFieldSize(u.byteLength,`event`);let d=this.META_LENGTH+s.byteLength+c.byteLength+l.byteLength+u.byteLength,f=new ArrayBuffer(this.HEADER_LENGTH+d),p=new Uint8Array(f),m=new DataView(f),h=0;m.setUint8(h++,this.KINDS.push),m.setUint8(h++,s.byteLength),m.setUint8(h++,c.byteLength),m.setUint8(h++,l.byteLength),m.setUint8(h++,u.byteLength),p.set(s,h),h+=s.byteLength,p.set(c,h),h+=c.byteLength,p.set(l,h),h+=l.byteLength,p.set(u,h),h+=u.byteLength;var g=new Uint8Array(f.byteLength+a.byteLength);return g.set(p,0),g.set(new Uint8Array(a),f.byteLength),g.buffer},assertFieldSize(e,t){if(e>255)throw Error(`unable to convert ${t} to binary: must be less than or equal to 255 bytes, but is ${e} bytes`)},binaryDecode(e){let t=new DataView(e),n=t.getUint8(0),r=new TextDecoder;switch(n){case this.KINDS.push:return this.decodePush(e,t,r);case this.KINDS.reply:return this.decodeReply(e,t,r);case this.KINDS.broadcast:return this.decodeBroadcast(e,t,r)}},decodePush(e,t,n){let r=t.getUint8(1),i=t.getUint8(2),a=t.getUint8(3),o=this.HEADER_LENGTH+this.META_LENGTH-1,s=n.decode(e.slice(o,o+r));o+=r;let c=n.decode(e.slice(o,o+i));o+=i;let l=n.decode(e.slice(o,o+a));return o+=a,{join_ref:s,ref:null,topic:c,event:l,payload:e.slice(o,e.byteLength)}},decodeReply(e,t,n){let r=t.getUint8(1),i=t.getUint8(2),a=t.getUint8(3),o=t.getUint8(4),s=this.HEADER_LENGTH+this.META_LENGTH,c=n.decode(e.slice(s,s+r));s+=r;let l=n.decode(e.slice(s,s+i));s+=i;let u=n.decode(e.slice(s,s+a));s+=a;let d=n.decode(e.slice(s,s+o));s+=o;let f={status:d,response:e.slice(s,e.byteLength)};return{join_ref:c,ref:l,topic:u,event:Ie.reply,payload:f}},decodeBroadcast(e,t,n){let r=t.getUint8(1),i=t.getUint8(2),a=this.HEADER_LENGTH+2,o=n.decode(e.slice(a,a+r));a+=r;let s=n.decode(e.slice(a,a+i));return a+=i,{join_ref:null,ref:null,topic:o,event:s,payload:e.slice(a,e.byteLength)}}},Je=class{constructor(e,t={}){this.stateChangeCallbacks={open:[],close:[],error:[],message:[]},this.channels=[],this.sendBuffer=[],this.ref=0,this.fallbackRef=null,this.timeout=t.timeout||je,this.transport=t.transport||ke.WebSocket||Ge,this.conn=void 0,this.primaryPassedHealthCheck=!1,this.longPollFallbackMs=t.longPollFallbackMs,this.fallbackTimer=null;let n=null;try{n=ke&&ke.sessionStorage}catch{}this.sessionStore=t.sessionStorage||n,this.establishedConnections=0,this.defaultEncoder=qe.encode.bind(qe),this.defaultDecoder=qe.decode.bind(qe),this.closeWasClean=!0,this.disconnecting=!1,this.binaryType=t.binaryType||`arraybuffer`,this.connectClock=1,this.pageHidden=!1,this.encode=void 0,this.decode=void 0,this.transport===Ge?(this.encode=this.defaultEncoder,this.decode=this.defaultDecoder):(this.encode=t.encode||this.defaultEncoder,this.decode=t.decode||this.defaultDecoder);let r=null;Oe&&Oe.addEventListener&&(Oe.addEventListener(`pagehide`,e=>{this.conn&&(this.disconnect(),r=this.connectClock)}),Oe.addEventListener(`pageshow`,e=>{r===this.connectClock&&(r=null,this.connect())}),Oe.addEventListener(`visibilitychange`,()=>{document.visibilityState===`hidden`?this.pageHidden=!0:(this.pageHidden=!1,!this.isConnected()&&!this.closeWasClean&&this.teardown(()=>this.connect()))})),this.heartbeatIntervalMs=t.heartbeatIntervalMs||3e4,this.autoSendHeartbeat=t.autoSendHeartbeat??!0,this.heartbeatCallback=t.heartbeatCallback??(()=>{}),this.rejoinAfterMs=e=>t.rejoinAfterMs?t.rejoinAfterMs(e):[1e3,2e3,5e3][e-1]||1e4,this.reconnectAfterMs=e=>t.reconnectAfterMs?t.reconnectAfterMs(e):[10,50,100,150,200,250,500,1e3,2e3][e-1]||5e3,this.logger=t.logger||null,!this.logger&&t.debug&&(this.logger=(e,t,n)=>{console.log(`${e}: ${t}`,n)}),this.longpollerTimeout=t.longpollerTimeout||2e4,this.params=Ee(t.params||{}),this.endPoint=`${e}/${Le.websocket}`,this.vsn=t.vsn||Ae,this.heartbeatTimeoutTimer=null,this.heartbeatTimer=null,this.heartbeatSentAt=null,this.pendingHeartbeatRef=null,this.reconnectTimer=new Ve(()=>{this.pageHidden?(this.log(`Not reconnecting as page is hidden!`),this.teardown()):this.teardown(async()=>{t.beforeReconnect&&await t.beforeReconnect(),this.connect()})},this.reconnectAfterMs),this.authToken=t.authToken&&Ee(t.authToken)}getLongPollTransport(){return Ge}replaceTransport(e){this.connectClock++,this.closeWasClean=!0,clearTimeout(this.fallbackTimer),this.reconnectTimer.reset(),this.conn&&=(this.conn.close(),null),this.transport=e}protocol(){return location.protocol.match(/^https/)?`wss`:`ws`}endPointURL(){let e=Ue.appendParams(Ue.appendParams(this.endPoint,this.params()),{vsn:this.vsn});return e.charAt(0)===`/`?e.charAt(1)===`/`?`${this.protocol()}:${e}`:`${this.protocol()}://${location.host}${e}`:e}disconnect(e,t,n){this.connectClock++,this.disconnecting=!0,this.closeWasClean=!0,clearTimeout(this.fallbackTimer),this.reconnectTimer.reset(),this.teardown(()=>{this.disconnecting=!1,e&&e()},t,n)}connect(e){e&&(console&&console.log(`passing params to connect is deprecated. Instead pass :params to the Socket constructor`),this.params=Ee(e)),(!this.conn||this.disconnecting)&&(this.longPollFallbackMs&&this.transport!==Ge?this.connectWithFallback(Ge,this.longPollFallbackMs):this.transportConnect())}log(e,t,n){this.logger&&this.logger(e,t,n)}hasLogger(){return this.logger!==null}onOpen(e){let t=this.makeRef();return this.stateChangeCallbacks.open.push([t,e]),t}onClose(e){let t=this.makeRef();return this.stateChangeCallbacks.close.push([t,e]),t}onError(e){let t=this.makeRef();return this.stateChangeCallbacks.error.push([t,e]),t}onMessage(e){let t=this.makeRef();return this.stateChangeCallbacks.message.push([t,e]),t}onHeartbeat(e){this.heartbeatCallback=e}ping(e){if(!this.isConnected())return!1;let t=this.makeRef(),n=Date.now();this.push({topic:`phoenix`,event:`heartbeat`,payload:{},ref:t});let r=this.onMessage(i=>{i.ref===t&&(this.off([r]),e(Date.now()-n))});return!0}transportName(e){switch(e){case Ge:return`LongPoll`;default:return e.name}}transportConnect(){this.connectClock++,this.closeWasClean=!1;let e;this.authToken&&(e=[`phoenix`,`${ze}${btoa(this.authToken()).replace(/=/g,``)}`]),this.conn=new this.transport(this.endPointURL(),e),this.conn.binaryType=this.binaryType,this.conn.timeout=this.longpollerTimeout,this.conn.onopen=()=>this.onConnOpen(),this.conn.onerror=e=>this.onConnError(e),this.conn.onmessage=e=>this.onConnMessage(e),this.conn.onclose=e=>this.onConnClose(e)}getSession(e){return this.sessionStore&&this.sessionStore.getItem(e)}storeSession(e,t){this.sessionStore&&this.sessionStore.setItem(e,t)}connectWithFallback(e,t=2500){clearTimeout(this.fallbackTimer);let n=!1,r=!0,i,a,o=this.transportName(e),s=t=>{this.log(`transport`,`falling back to ${o}...`,t),this.off([i,a]),r=!1,this.replaceTransport(e),this.transportConnect()};if(this.getSession(`phx:fallback:${o}`))return s(`memorized`);this.fallbackTimer=setTimeout(s,t),a=this.onError(e=>{this.log(`transport`,`error`,e),r&&!n&&(clearTimeout(this.fallbackTimer),s(e))}),this.fallbackRef&&this.off([this.fallbackRef]),this.fallbackRef=this.onOpen(()=>{if(n=!0,!r){let t=this.transportName(e);return this.primaryPassedHealthCheck||this.storeSession(`phx:fallback:${t}`,`true`),this.log(`transport`,`established ${t} fallback`)}clearTimeout(this.fallbackTimer),this.fallbackTimer=setTimeout(s,t),this.ping(e=>{this.log(`transport`,`connected to primary after`,e),this.primaryPassedHealthCheck=!0,clearTimeout(this.fallbackTimer)})}),this.transportConnect()}clearHeartbeats(){clearTimeout(this.heartbeatTimer),clearTimeout(this.heartbeatTimeoutTimer)}onConnOpen(){this.hasLogger()&&this.log(`transport`,`connected to ${this.endPointURL()}`),this.closeWasClean=!1,this.disconnecting=!1,this.establishedConnections++,this.flushSendBuffer(),this.reconnectTimer.reset(),this.autoSendHeartbeat&&this.resetHeartbeat(),this.triggerStateCallbacks(`open`)}heartbeatTimeout(){if(this.pendingHeartbeatRef){this.pendingHeartbeatRef=null,this.heartbeatSentAt=null,this.hasLogger()&&this.log(`transport`,`heartbeat timeout. Attempting to re-establish connection`);try{this.heartbeatCallback(`timeout`)}catch(e){this.log(`error`,`error in heartbeat callback`,e)}this.triggerChanError(Error(`heartbeat timeout`)),this.closeWasClean=!1,this.teardown(()=>this.reconnectTimer.scheduleTimeout(),Me,`heartbeat timeout`)}}resetHeartbeat(){this.conn&&this.conn.skipHeartbeat||(this.pendingHeartbeatRef=null,this.clearHeartbeats(),this.heartbeatTimer=setTimeout(()=>this.sendHeartbeat(),this.heartbeatIntervalMs))}teardown(e,t,n){if(!this.conn)return e&&e();let r=this.conn;this.waitForBufferDone(r,()=>{t?r.close(t,n||``):r.close(),this.waitForSocketClosed(r,()=>{this.conn===r&&(this.conn.onopen=function(){},this.conn.onerror=function(){},this.conn.onmessage=function(){},this.conn.onclose=function(){},this.conn=null),e&&e()})})}waitForBufferDone(e,t,n=1){n===5||!e.bufferedAmount?t():setTimeout(()=>{this.waitForBufferDone(e,t,n+1)},150*n)}waitForSocketClosed(e,t,n=1){n===5||e.readyState===Pe.closed?t():setTimeout(()=>{this.waitForSocketClosed(e,t,n+1)},150*n)}onConnClose(e){this.conn&&(this.conn.onclose=()=>{}),this.hasLogger()&&this.log(`transport`,`close`,e),this.triggerChanError(e),this.clearHeartbeats(),this.closeWasClean||this.reconnectTimer.scheduleTimeout(),this.triggerStateCallbacks(`close`,e)}onConnError(e){this.hasLogger()&&this.log(`transport`,`error`,e);let t=this.transport,n=this.establishedConnections;this.triggerStateCallbacks(`error`,e,t,n),(t===this.transport||n>0)&&this.triggerChanError(e)}triggerChanError(e){this.channels.forEach(t=>{t.isErrored()||t.isLeaving()||t.isClosed()||t.trigger(Ie.error,e)})}connectionState(){switch(this.conn&&this.conn.readyState){case Pe.connecting:return`connecting`;case Pe.open:return`open`;case Pe.closing:return`closing`;default:return`closed`}}isConnected(){return this.connectionState()===`open`}remove(e){this.off(e.stateChangeRefs),this.channels=this.channels.filter(t=>t!==e)}off(e){for(let t in this.stateChangeCallbacks)this.stateChangeCallbacks[t]=this.stateChangeCallbacks[t].filter(([t])=>e.indexOf(t)===-1)}channel(e,t={}){let n=new He(e,t,this);return this.channels.push(n),n}push(e){if(this.hasLogger()){let{topic:t,event:n,payload:r,ref:i,join_ref:a}=e;this.log(`push`,`${t} ${n} (${a}, ${i})`,r)}this.isConnected()?this.encode(e,e=>this.conn.send(e)):this.sendBuffer.push(()=>this.encode(e,e=>this.conn.send(e)))}makeRef(){let e=this.ref+1;return this.ref=e===this.ref?0:e,this.ref.toString()}sendHeartbeat(){if(!this.isConnected())try{this.heartbeatCallback(`disconnected`)}catch(e){this.log(`error`,`error in heartbeat callback`,e)}else if(this.pendingHeartbeatRef)this.heartbeatTimeout();else{this.pendingHeartbeatRef=this.makeRef(),this.heartbeatSentAt=Date.now(),this.push({topic:`phoenix`,event:`heartbeat`,payload:{},ref:this.pendingHeartbeatRef});try{this.heartbeatCallback(`sent`)}catch(e){this.log(`error`,`error in heartbeat callback`,e)}this.heartbeatTimeoutTimer=setTimeout(()=>this.heartbeatTimeout(),this.heartbeatIntervalMs)}}flushSendBuffer(){this.isConnected()&&this.sendBuffer.length>0&&(this.sendBuffer.forEach(e=>e()),this.sendBuffer=[])}onConnMessage(e){this.decode(e.data,e=>{let{topic:t,event:n,payload:r,ref:i,join_ref:a}=e;if(i&&i===this.pendingHeartbeatRef){let e=this.heartbeatSentAt?Date.now()-this.heartbeatSentAt:void 0;this.clearHeartbeats();try{this.heartbeatCallback(r.status===`ok`?`ok`:`error`,e)}catch(e){this.log(`error`,`error in heartbeat callback`,e)}this.pendingHeartbeatRef=null,this.heartbeatSentAt=null,this.autoSendHeartbeat&&(this.heartbeatTimer=setTimeout(()=>this.sendHeartbeat(),this.heartbeatIntervalMs))}this.hasLogger()&&this.log(`receive`,`${r.status||``} ${t} ${n} ${i&&`(`+i+`)`||``}`.trim(),r);for(let e=0;e<this.channels.length;e++){let o=this.channels[e];o.isMember(t,n,r,a)&&o.trigger(n,r,i,a)}this.triggerStateCallbacks(`message`,e)})}triggerStateCallbacks(e,...t){try{this.stateChangeCallbacks[e].forEach(([n,r])=>{try{r(...t)}catch(t){this.log(`error`,`error in ${e} callback`,t)}})}catch(t){this.log(`error`,`error triggering ${e} callbacks`,t)}}leaveOpenTopic(e){let t=this.channels.find(t=>t.topic===e&&(t.isJoined()||t.isJoining()));t&&(this.hasLogger()&&this.log(`transport`,`leaving duplicate topic "${e}"`),t.leave())}},Ye=class e{constructor(t,n){let r=Qe(n);this.presence=new Ke(t.getChannel(),r),this.presence.onJoin((n,r,i)=>{let a=e.onJoinPayload(n,r,i);t.getChannel().trigger(`presence`,a)}),this.presence.onLeave((n,r,i)=>{let a=e.onLeavePayload(n,r,i);t.getChannel().trigger(`presence`,a)}),this.presence.onSync(()=>{t.getChannel().trigger(`presence`,{event:`sync`})})}get state(){return e.transformState(this.presence.state)}static transformState(e){return e=Ze(e),Object.getOwnPropertyNames(e).reduce((t,n)=>{let r=e[n];return t[n]=Xe(r),t},{})}static onJoinPayload(e,t,n){return{event:`join`,key:e,currentPresences:$e(t),newPresences:Xe(n)}}static onLeavePayload(e,t,n){return{event:`leave`,key:e,currentPresences:$e(t),leftPresences:Xe(n)}}};function Xe(e){return e.metas.map(e=>{let t=Object.getOwnPropertyDescriptors(e),n=Object.defineProperties({},t);return n.presence_ref=n.phx_ref,delete n.phx_ref,delete n.phx_ref_prev,n})}function Ze(e){return JSON.parse(JSON.stringify(e))}function Qe(e){return e?.events&&{events:e.events}}function $e(e){return e?.metas?Xe(e):[]}var et;(function(e){e.SYNC=`sync`,e.JOIN=`join`,e.LEAVE=`leave`})(et||={});var tt=class{get state(){return this.presenceAdapter.state}constructor(e,t){this.channel=e,this.presenceAdapter=new Ye(this.channel.channelAdapter,t)}};function nt(e){if(e instanceof Error)return e;if(typeof e==`string`)return Error(e);if(e&&typeof e==`object`){let t=e;if(typeof t.code==`number`){let n=typeof t.reason==`string`&&t.reason?` (${t.reason})`:``;return Error(`socket closed: ${t.code}${n}`,{cause:e})}return Error(`channel error: transport failure`,{cause:e})}return Error(`channel error: connection lost`)}var rt=class{constructor(e,t,n){let r=it(n);this.channel=e.getSocket().channel(t,r),this.socket=e}get state(){return this.channel.state}set state(e){this.channel.state=e}get joinedOnce(){return this.channel.joinedOnce}get joinPush(){return this.channel.joinPush}get rejoinTimer(){return this.channel.rejoinTimer}on(e,t){return this.channel.on(e,t)}off(e,t){this.channel.off(e,t)}subscribe(e){return this.channel.join(e)}unsubscribe(e){return this.channel.leave(e)}teardown(){this.channel.teardown()}onClose(e){this.channel.onClose(e)}onError(e){return this.channel.onError(e)}push(e,t,n){let r;try{r=this.channel.push(e,t,n)}catch{throw Error(`tried to push '${e}' to '${this.channel.topic}' before joining. Use channel.subscribe() before pushing events`)}if(this.channel.pushBuffer.length>100){let e=this.channel.pushBuffer.shift();e.cancelTimeout(),this.socket.log(`channel`,`discarded push due to buffer overflow: ${e.event}`,e.payload())}return r}updateJoinPayload(e){let t=this.channel.joinPush.payload();this.channel.joinPush.payload=()=>Object.assign(Object.assign({},t),e)}canPush(){return this.socket.isConnected()&&this.state===fe.joined}isJoined(){return this.state===fe.joined}isJoining(){return this.state===fe.joining}isClosed(){return this.state===fe.closed}isLeaving(){return this.state===fe.leaving}updateFilterBindings(e){this.channel.filterBindings=e}updatePayloadTransform(e){this.channel.onMessage=e}getChannel(){return this.channel}};function it(e){return{config:Object.assign({broadcast:{ack:!1,self:!1},presence:{key:``,enabled:!1},private:!1},e.config)}}var at=/[,()"\\]/,ot=e=>at.test(e)||e!==e.trim(),st=e=>`"${e.replace(/\\/g,`\\\\`).replace(/"/g,`\\"`)}"`,ct=e=>{let t=e===null?`null`:String(e);return ot(t)?st(t):t},lt=e=>e===null?`null`:String(e),ut=(e,t)=>{if(e===`in`){let e=Array.isArray(t)?t:[t];if(e.length===0)throw Error("Realtime `in` filter requires at least one value.");return`in.(${Array.from(new Set(e)).map(e=>ct(e)).join(`,`)})`}return e===`is`?`is.${lt(t)}`:`${e}.${ct(t)}`},dt=class{constructor(){this.filters=[]}add(e,t,n,r=!1){let i=r?`not.`:``;return this.filters.push(`${e}=${i}${ut(t,n)}`),this}eq(e,t){return this.add(e,`eq`,t)}neq(e,t){return this.add(e,`neq`,t)}gt(e,t){return this.add(e,`gt`,t)}gte(e,t){return this.add(e,`gte`,t)}lt(e,t){return this.add(e,`lt`,t)}lte(e,t){return this.add(e,`lte`,t)}in(e,t){return this.add(e,`in`,t)}like(e,t){return this.add(e,`like`,t)}ilike(e,t){return this.add(e,`ilike`,t)}match(e,t){return this.add(e,`match`,t)}imatch(e,t){return this.add(e,`imatch`,t)}is(e,t){return this.add(e,`is`,t)}isDistinct(e,t){return this.add(e,`isdistinct`,t)}not(e,t,n){return this.add(e,t,n,!0)}build(){return this.filters.join(`,`)}toString(){return this.build()}},ft;(function(e){e.ALL=`*`,e.INSERT=`INSERT`,e.UPDATE=`UPDATE`,e.DELETE=`DELETE`})(ft||={});var pt;(function(e){e.BROADCAST=`broadcast`,e.PRESENCE=`presence`,e.POSTGRES_CHANGES=`postgres_changes`,e.SYSTEM=`system`})(pt||={});var mt;(function(e){e.SUBSCRIBED=`SUBSCRIBED`,e.TIMED_OUT=`TIMED_OUT`,e.CLOSED=`CLOSED`,e.CHANNEL_ERROR=`CHANNEL_ERROR`})(mt||={});var ht=class e{get state(){return this.channelAdapter.state}set state(e){this.channelAdapter.state=e}get joinedOnce(){return this.channelAdapter.joinedOnce}get timeout(){return this.socket.timeout}get joinPush(){return this.channelAdapter.joinPush}get rejoinTimer(){return this.channelAdapter.rejoinTimer}constructor(e,t={config:{}},n){if(this.topic=e,this.params=t,this.socket=n,this.bindings={},this.subTopic=e.replace(/^realtime:/i,``),this.params.config=Object.assign({broadcast:{ack:!1,self:!1},presence:{key:``,enabled:!1},private:!1},t.config),this.channelAdapter=new rt(this.socket.socketAdapter,e,this.params),this.presence=new tt(this),this._onClose(()=>{this.socket._remove(this)}),this._updateFilterTransform(),this.broadcastEndpointURL=Te(this.socket.socketAdapter.endPointURL()),this.private=this.params.config.private||!1,!this.private&&this.params.config?.broadcast?.replay)throw Error(`tried to use replay on public channel '${this.topic}'. It must be a private channel.`)}subscribe(e,t=this.timeout){if(this.socket.isConnected()||this.socket.connect(),this.channelAdapter.isClosed()){let{config:{broadcast:n,presence:r,private:i,postgres_changes_options:a}}=this.params,o=this.bindings.postgres_changes?.map(e=>e.filter)??[],s=!!this.bindings[pt.PRESENCE]&&this.bindings[pt.PRESENCE].length>0||this.params.config.presence?.enabled===!0,c={},l=Object.assign({broadcast:n,presence:Object.assign(Object.assign({},r),{enabled:s}),postgres_changes:o,private:i},a?{postgres_changes_options:a}:{});this.socket.accessTokenValue&&(c.access_token=this.socket.accessTokenValue),this._onError(t=>{e?.(mt.CHANNEL_ERROR,nt(t))}),this._onClose(()=>e?.(mt.CLOSED)),this.updateJoinPayload(Object.assign({config:l},c)),this._updateFilterMessage();let u=a?.wait&&o.length>0?Math.max(t,(a.timeout??ue)+de):t;this.channelAdapter.subscribe(u).receive(`ok`,async({postgres_changes:t})=>{this.socket._isManualToken()||this.socket.setAuth(),t===void 0?e?.(mt.SUBSCRIBED):this._updatePostgresBindings(t,e)}).receive(`error`,t=>{this.state=fe.errored;let n=Object.values(t).join(`, `)||`error`;e?.(mt.CHANNEL_ERROR,Error(n,{cause:t}))}).receive(`timeout`,()=>{e?.(mt.TIMED_OUT)})}return this}_updatePostgresBindings(t,n){let r=this.bindings.postgres_changes,i=r?.length??0,a=[];for(let o=0;o<i;o++){let i=r[o],{filter:{event:s,schema:c,table:l,filter:u}}=i,d=t&&t[o];if(d&&d.event===s&&e.isFilterValueEqual(d.schema,c)&&e.isFilterValueEqual(d.table,l)&&e.isFilterValueEqual(d.filter,u))a.push(Object.assign(Object.assign({},i),{id:d.id}));else{this.unsubscribe(),this.state=fe.errored,n?.(mt.CHANNEL_ERROR,Error(`mismatch between server and client bindings for postgres changes`));return}}this.bindings.postgres_changes=a,this.state!=fe.errored&&n&&n(mt.SUBSCRIBED)}presenceState(){return this.presence.state}async track(e,t={}){return await this.send({type:`presence`,event:`track`,payload:e},t)}async untrack(e={}){return await this.send({type:`presence`,event:`untrack`},e)}on(e,t,n){let r=this.channelAdapter.isJoined()||this.channelAdapter.isJoining(),i=e===pt.PRESENCE||e===pt.POSTGRES_CHANGES;if(r&&i)throw this.socket.log(`channel`,`cannot add \`${e}\` callbacks for ${this.topic} after \`subscribe()\`.`),Error(`cannot add \`${e}\` callbacks for ${this.topic} after \`subscribe()\`.`);return this._on(e,t,n)}async httpSend(e,t,n={}){if(t==null)return Promise.reject(Error(`Payload is required for httpSend()`));let r=t instanceof ArrayBuffer||ArrayBuffer.isView(t),i={apikey:this.socket.apiKey?this.socket.apiKey:``,"Content-Type":r?`application/octet-stream`:`application/json`};this.socket.accessTokenValue&&(i.Authorization=`Bearer ${this.socket.accessTokenValue}`);let a=new URL(this.broadcastEndpointURL);a.pathname+=`/${encodeURIComponent(this.subTopic)}/events/${encodeURIComponent(e)}`,this.private&&a.searchParams.set(`private`,`true`);let o={method:`POST`,headers:i,body:r?t:JSON.stringify(t)},s=await this._fetchWithTimeout(a.toString(),o,n.timeout??this.timeout);if(s.status===202)return{success:!0};if(s.status===404)return Promise.reject(Error(`httpSend() requires Realtime server v2.97.0 or newer; the endpoint returned 404. Update your Supabase CLI to a recent version, or upgrade the Realtime server in your self-hosted setup. See https://github.com/supabase/supabase-js/blob/master/packages/core/realtime-js/migrations/httpsend-server-version.md`));let c=s.statusText;try{let e=await s.json();c=e.error||e.message||c}catch{}return Promise.reject(Error(c))}async send(e,t={}){if(!this.channelAdapter.canPush()&&e.type===`broadcast`){let n=`Realtime send() is automatically falling back to REST API. This behavior will be deprecated in the future. Please use httpSend() explicitly for REST delivery.`;this.socket.hasLogger()?this.socket.log(`channel`,n):console.warn(n);let{event:r,payload:i}=e,a={apikey:this.socket.apiKey?this.socket.apiKey:``,"Content-Type":`application/json`};this.socket.accessTokenValue&&(a.Authorization=`Bearer ${this.socket.accessTokenValue}`);let o={method:`POST`,headers:a,body:JSON.stringify({messages:[{topic:this.subTopic,event:r,payload:i,private:this.private}]})};try{let e=await this._fetchWithTimeout(this.broadcastEndpointURL,o,t.timeout??this.timeout);return await e.body?.cancel(),e.ok?`ok`:`error`}catch(e){return e instanceof Error&&e.name===`AbortError`?`timed out`:`error`}}return new Promise(n=>{let r=this.channelAdapter.push(e.type,e,t.timeout||this.timeout);e.type===`broadcast`&&!this.params?.config?.broadcast?.ack&&n(`ok`),r.receive(`ok`,()=>n(`ok`)),r.receive(`error`,()=>n(`error`)),r.receive(`timeout`,()=>n(`timed out`))})}updateJoinPayload(e){this.channelAdapter.updateJoinPayload(e)}async unsubscribe(e=this.timeout){return new Promise(t=>{this.channelAdapter.unsubscribe(e).receive(`ok`,()=>t(`ok`)).receive(`timeout`,()=>t(`timed out`)).receive(`error`,()=>t(`error`))})}teardown(){this.channelAdapter.teardown()}async _fetchWithTimeout(e,t,n){let r=new AbortController,i=setTimeout(()=>r.abort(),n),a=await this.socket.fetch(e,Object.assign(Object.assign({},t),{signal:r.signal}));return clearTimeout(i),a}_on(t,n,r){let i=t.toLocaleLowerCase(),a=n?.filter;if((a instanceof dt||typeof a==`object`&&a&&typeof a.build==`function`)&&(n=Object.assign(Object.assign({},n),{filter:a.build()})),i===pt.POSTGRES_CHANGES&&this.bindings[i]?.find(t=>e.isSamePostgresFilter(t.filter,n)))return this.socket.log(`error`,`duplicate \`postgres_changes\` binding for ${this.topic} ignored`,n),this;let o=this.channelAdapter.on(t,r),s={type:i,filter:n,callback:r,ref:o};return this.bindings[i]?this.bindings[i].push(s):this.bindings[i]=[s],this._updateFilterMessage(),this}_onClose(e){this.channelAdapter.onClose(e)}_onError(e){this.channelAdapter.onError(e)}_updateFilterMessage(){this.channelAdapter.updateFilterBindings((e,t,n)=>{let r=e.event.toLocaleLowerCase();if(this._notThisChannelEvent(r,n))return!1;let i=this.bindings[r]?.find(t=>t.ref===e.ref);if(!i)return!0;if([`broadcast`,`presence`,`postgres_changes`].includes(r)){if(`id`in i){let e=i.id,n=i.filter?.event;return e&&t.ids?.includes(e)&&(n===`*`||n?.toLocaleLowerCase()===t.data?.type.toLocaleLowerCase())}{let e=(i?.filter?.event)?.toLocaleLowerCase();return e===`*`||e===(t?.event)?.toLocaleLowerCase()}}return i.type.toLocaleLowerCase()===r})}_notThisChannelEvent(e,t){let{close:n,error:r,leave:i,join:a}=pe;return t&&[n,r,i,a].includes(e)&&t!==this.joinPush.ref}_updateFilterTransform(){this.channelAdapter.updatePayloadTransform((e,t,n)=>{if(typeof t==`object`&&`ids`in t){let e=t.data,{schema:n,table:r,commit_timestamp:i,type:a,errors:o}=e;return Object.assign(Object.assign({},{schema:n,table:r,commit_timestamp:i,eventType:a,new:{},old:{},errors:o}),this._getPayloadRecords(e))}return t})}copyBindings(e){if(this.joinedOnce)throw Error(`cannot copy bindings into joined channel`);for(let t in e.bindings)for(let n of e.bindings[t])this._on(n.type,n.filter,n.callback)}static isFilterValueEqual(e,t){return(e??void 0)===(t??void 0)}static isSamePostgresFilter(t,n){let r=(t?.select)?.join()??void 0,i=(n?.select)?.join()??void 0;return t?.event===n?.event&&e.isFilterValueEqual(t?.schema,n?.schema)&&e.isFilterValueEqual(t?.table,n?.table)&&e.isFilterValueEqual(t?.filter,n?.filter)&&r===i}_getPayloadRecords(e){let t={new:{},old:{}};return(e.type===`INSERT`||e.type===`UPDATE`)&&(t.new=ge(e.columns,e.record)),(e.type===`UPDATE`||e.type===`DELETE`)&&(t.old=ge(e.columns,e.old_record)),t}},gt=class{constructor(e,t){this.socket=new Je(e,t)}get timeout(){return this.socket.timeout}get endPoint(){return this.socket.endPoint}get transport(){return this.socket.transport}get heartbeatIntervalMs(){return this.socket.heartbeatIntervalMs}get heartbeatCallback(){return this.socket.heartbeatCallback}set heartbeatCallback(e){this.socket.heartbeatCallback=e}get heartbeatTimer(){return this.socket.heartbeatTimer}get pendingHeartbeatRef(){return this.socket.pendingHeartbeatRef}get reconnectTimer(){return this.socket.reconnectTimer}get vsn(){return this.socket.vsn}get encode(){return this.socket.encode}get decode(){return this.socket.decode}get reconnectAfterMs(){return this.socket.reconnectAfterMs}get sendBuffer(){return this.socket.sendBuffer}get stateChangeCallbacks(){return this.socket.stateChangeCallbacks}connect(){this.socket.connect()}disconnect(e,t,n,r=1e4){return new Promise(i=>{setTimeout(()=>i(`timeout`),r),this.socket.disconnect(()=>{e(),i(`ok`)},t,n)})}push(e){this.socket.push(e)}log(e,t,n){this.socket.log(e,t,n)}hasLogger(){return this.socket.hasLogger()}makeRef(){return this.socket.makeRef()}onOpen(e){this.socket.onOpen(e)}onClose(e){this.socket.onClose(e)}onError(e){this.socket.onError(e)}onMessage(e){this.socket.onMessage(e)}isConnected(){return this.socket.isConnected()}isConnecting(){return this.socket.connectionState()==me.connecting}isDisconnecting(){return this.socket.connectionState()==me.closing}connectionState(){return this.socket.connectionState()}endPointURL(){return this.socket.endPointURL()}sendHeartbeat(){this.socket.sendHeartbeat()}getSocket(){return this.socket}},_t={HEARTBEAT_INTERVAL:25e3,RECONNECT_DELAY:10,HEARTBEAT_TIMEOUT_FALLBACK:100},vt=[1e3,2e3,5e3,1e4],yt=1e4;function bt(){let e=new Map;return{get length(){return e.size},clear(){e.clear()},getItem(t){return e.has(t)?e.get(t):null},key(t){return Array.from(e.keys())[t]??null},removeItem(t){e.delete(t)},setItem(t,n){e.set(t,String(n))}}}function xt(){try{if(typeof globalThis<`u`&&globalThis.sessionStorage)return globalThis.sessionStorage}catch{}return bt()}var St=`
  addEventListener("message", (e) => {
    if (e.data.event === "start") {
      setInterval(() => postMessage({ event: "keepAlive" }), e.data.interval);
    }
  });`,Ct=class{get endPoint(){return this.socketAdapter.endPoint}get timeout(){return this.socketAdapter.timeout}get transport(){return this.socketAdapter.transport}get heartbeatCallback(){return this.socketAdapter.heartbeatCallback}get heartbeatIntervalMs(){return this.socketAdapter.heartbeatIntervalMs}get heartbeatTimer(){return this.worker?this._workerHeartbeatTimer:this.socketAdapter.heartbeatTimer}get pendingHeartbeatRef(){return this.worker?this._pendingWorkerHeartbeatRef:this.socketAdapter.pendingHeartbeatRef}get reconnectTimer(){return this.socketAdapter.reconnectTimer}get vsn(){return this.socketAdapter.vsn}get encode(){return this.socketAdapter.encode}get decode(){return this.socketAdapter.decode}get reconnectAfterMs(){return this.socketAdapter.reconnectAfterMs}get sendBuffer(){return this.socketAdapter.sendBuffer}get stateChangeCallbacks(){return this.socketAdapter.stateChangeCallbacks}constructor(e,t){if(this.channels=[],this.accessTokenValue=null,this.accessToken=null,this.apiKey=null,this.httpEndpoint=``,this.headers={},this.params={},this.ref=0,this.serializer=new he,this._manuallySetToken=!1,this._authPromise=null,this._authGeneration=0,this._workerHeartbeatTimer=void 0,this._pendingWorkerHeartbeatRef=null,this._pendingDisconnectTimer=null,this._disconnectOnEmptyChannelsAfterMs=0,this._resolveFetch=e=>e?(...t)=>e(...t):(...e)=>fetch(...e),!t?.params?.apikey)throw Error(`API key is required to connect to Realtime`);this.apiKey=t.params.apikey;let n=this._initializeOptions(t);this.socketAdapter=new gt(e,n),this.httpEndpoint=Te(e),this.fetch=this._resolveFetch(t?.fetch)}connect(){if(!(this.isConnecting()||this.isDisconnecting()||this.isConnected())){this.accessToken&&!this._authPromise&&this._setAuthSafely(`connect`),this._setupConnectionHandlers();try{this.socketAdapter.connect()}catch(e){let t=e.message;throw Error(`WebSocket not available: ${t}`)}this._handleNodeJsRaceCondition()}}endpointURL(){return this.socketAdapter.endPointURL()}async disconnect(e,t){return this._cancelPendingDisconnect(),this.isDisconnecting()?`ok`:await this.socketAdapter.disconnect(()=>{clearInterval(this._workerHeartbeatTimer),this._terminateWorker()},e,t)}getChannels(){return this.channels}async removeChannel(e){let t=await e.unsubscribe();return t===`ok`&&e.teardown(),t}async removeAllChannels(){let e=this.channels.map(async e=>{let t=await e.unsubscribe();return e.teardown(),t}),t=await Promise.all(e);return await this.disconnect(),t}log(e,t,n){this.socketAdapter.log(e,t,n)}hasLogger(){return this.socketAdapter.hasLogger()}connectionState(){return this.socketAdapter.connectionState()||me.closed}isConnected(){return this.socketAdapter.isConnected()}isConnecting(){return this.socketAdapter.isConnecting()}isDisconnecting(){return this.socketAdapter.isDisconnecting()}channel(e,t={config:{}}){let n=`realtime:${e}`,r=this.getChannels().find(e=>e.topic===n);if(r)return r;{let n=new ht(`realtime:${e}`,t,this);return this._cancelPendingDisconnect(),this.channels.push(n),n}}push(e){this.socketAdapter.push(e)}async setAuth(e=null){let t=++this._authGeneration,n=this._performAuth(e,t);t===this._authGeneration&&(this._authPromise=n);try{await n}finally{this._authPromise===n&&(this._authPromise=null)}}_isManualToken(){return this._manuallySetToken}async sendHeartbeat(){this.socketAdapter.sendHeartbeat()}onHeartbeat(e){this.socketAdapter.heartbeatCallback=this._wrapHeartbeatCallback(e)}_makeRef(){return this.socketAdapter.makeRef()}_remove(e){this.channels=this.channels.filter(t=>t.topic!==e.topic),this.channels.length===0&&(this.log(`transport`,`no channels remaining, scheduling disconnect`),this._schedulePendingDisconnect())}_schedulePendingDisconnect(){this._cancelPendingDisconnect(),this._disconnectOnEmptyChannelsAfterMs===0?(this.log(`transport`,`disconnecting immediately - no channels`),this.disconnect()):(this._pendingDisconnectTimer=setTimeout(()=>{this._pendingDisconnectTimer=null,this.channels.length===0&&(this.log(`transport`,`deferred disconnect fired - no channels, disconnecting`),this.disconnect())},this._disconnectOnEmptyChannelsAfterMs),this.log(`transport`,`deferred disconnect scheduled in ${this._disconnectOnEmptyChannelsAfterMs}ms`))}_cancelPendingDisconnect(){this._pendingDisconnectTimer!==null&&(this.log(`transport`,`pending disconnect cancelled - channel activity detected`),clearTimeout(this._pendingDisconnectTimer),this._pendingDisconnectTimer=null)}async _performAuth(e,t){let n,r=!1;if(e)n=e,r=!0;else if(this.accessToken)try{n=await this.accessToken()}catch(e){this.log(`error`,`Error fetching access token from callback`,e),n=this.accessTokenValue}else n=this.accessTokenValue;t===this._authGeneration&&(this.accessToken?this._manuallySetToken=!1:r&&(this._manuallySetToken=!0),this.accessTokenValue!=n&&(this.accessTokenValue=n,this.channels.forEach(e=>{let t={access_token:n,version:ae};e.updateJoinPayload(t),e.joinedOnce&&e.channelAdapter.isJoined()&&e.channelAdapter.push(pe.access_token,{access_token:n})})))}async _waitForAuthIfNeeded(){this._authPromise&&await this._authPromise}_setAuthSafely(e=`general`){this._isManualToken()||this.setAuth().catch(t=>{this.log(`error`,`Error setting auth in ${e}`,t)})}_setupConnectionHandlers(){this.socketAdapter.onOpen(()=>{(this._authPromise||(this.accessToken&&!this.accessTokenValue?this.setAuth():Promise.resolve())).catch(e=>{this.log(`error`,`error waiting for auth on connect`,e)}),this.worker&&!this.workerRef&&this._startWorkerHeartbeat()}),this.socketAdapter.onClose(()=>{this.worker&&this.workerRef&&this._terminateWorker()}),this.socketAdapter.onMessage(e=>{e.ref&&e.ref===this._pendingWorkerHeartbeatRef&&(this._pendingWorkerHeartbeatRef=null)})}_handleNodeJsRaceCondition(){this.socketAdapter.isConnected()&&this.socketAdapter.getSocket().onConnOpen()}_wrapHeartbeatCallback(e){return(t,n)=>{t!==`disconnected`&&(t==`sent`&&this._setAuthSafely(),e&&e(t,n))}}_startWorkerHeartbeat(){this.workerUrl?this.log(`worker`,`starting worker for from ${this.workerUrl}`):this.log(`worker`,`starting default worker`);let e=this._workerObjectUrl(this.workerUrl);this.workerRef=new Worker(e),this.workerRef.onerror=e=>{this.log(`worker`,`worker error`,e.message),this._terminateWorker(),this.disconnect()},this.workerRef.onmessage=e=>{e.data.event===`keepAlive`&&this.sendHeartbeat()},this.workerRef.postMessage({event:`start`,interval:this.heartbeatIntervalMs})}_terminateWorker(){this.workerRef&&=(this.log(`worker`,`terminating worker`),this.workerRef.terminate(),void 0)}_workerObjectUrl(e){let t;if(e)t=e;else{let e=new Blob([St],{type:`application/javascript`});t=URL.createObjectURL(e)}return t}_initializeOptions(e){this.worker=e?.worker??!1,this.accessToken=e?.accessToken??null;let t={};t.timeout=e?.timeout??le,t.heartbeatIntervalMs=e?.heartbeatIntervalMs??_t.HEARTBEAT_INTERVAL,this._disconnectOnEmptyChannelsAfterMs=e?.disconnectOnEmptyChannelsAfterMs??2*(e?.heartbeatIntervalMs??_t.HEARTBEAT_INTERVAL),t.transport=e?.transport??ie.getWebSocketConstructor(),t.params=e?.params,t.logger=e?.logger,t.heartbeatCallback=this._wrapHeartbeatCallback(e?.heartbeatCallback),t.sessionStorage=e?.sessionStorage??xt(),t.reconnectAfterMs=e?.reconnectAfterMs??(e=>vt[e-1]||yt);let n,r,i=e?.vsn??ce;switch(i){case oe:n=(e,t)=>t(JSON.stringify(e)),r=(e,t)=>t(JSON.parse(e));break;case se:n=this.serializer.encode.bind(this.serializer),r=this.serializer.decode.bind(this.serializer);break;default:throw Error(`Unsupported serializer version: ${t.vsn}`)}if(t.vsn=i,t.encode=e?.encode??n,t.decode=e?.decode??r,t.beforeReconnect=this._reconnectAuth.bind(this),(e?.logLevel||e?.log_level)&&(this.logLevel=e.logLevel||e.log_level,t.params=Object.assign(Object.assign({},t.params),{log_level:this.logLevel})),this.worker){if(typeof window<`u`&&!window.Worker)throw Error(`Web Worker is not supported`);this.workerUrl=e?.workerUrl,t.autoSendHeartbeat=!this.worker}return t}async _reconnectAuth(){await this._waitForAuthIfNeeded(),this.isConnected()||this.connect()}},wt=class extends Error{constructor(e,t){super(e),this.name=`IcebergError`,this.status=t.status,this.icebergType=t.icebergType,this.icebergCode=t.icebergCode,this.details=t.details,this.isCommitStateUnknown=t.icebergType===`CommitStateUnknownException`||[500,502,504].includes(t.status)&&t.icebergType?.includes(`CommitState`)===!0}isNotFound(){return this.status===404}isConflict(){return this.status===409}isAuthenticationTimeout(){return this.status===419}};function Tt(e,t,n){let r=new URL(t,e);if(n)for(let[e,t]of Object.entries(n))t!==void 0&&r.searchParams.set(e,t);return r.toString()}async function Et(e){return!e||e.type===`none`?{}:e.type===`bearer`?{Authorization:`Bearer ${e.token}`}:e.type===`header`?{[e.name]:e.value}:e.type===`custom`?await e.getHeaders():{}}function Dt(e){let t=e.fetchImpl??globalThis.fetch;return{async request({method:n,path:r,query:i,body:a,headers:o}){let s=Tt(e.baseUrl,r,i),c=await Et(e.auth),l=await t(s,{method:n,headers:{...a?{"Content-Type":`application/json`}:{},...c,...o},body:a?JSON.stringify(a):void 0}),u=await l.text(),d=(l.headers.get(`content-type`)||``).includes(`application/json`),f=d&&u?JSON.parse(u):u;if(!l.ok){let e=d?f:void 0,t=e?.error;throw new wt(t?.message??`Request failed with status ${l.status}`,{status:l.status,icebergType:t?.type,icebergCode:t?.code,details:e})}return{status:l.status,headers:l.headers,data:f}}}}function Ot(e){return e.join(``)}var kt=class{constructor(e,t=``){this.client=e,this.prefix=t}async listNamespaces(e){let t=e?{parent:Ot(e.namespace)}:void 0;return(await this.client.request({method:`GET`,path:`${this.prefix}/namespaces`,query:t})).data.namespaces.map(e=>({namespace:e}))}async createNamespace(e,t){let n={namespace:e.namespace,properties:t?.properties};return(await this.client.request({method:`POST`,path:`${this.prefix}/namespaces`,body:n})).data}async dropNamespace(e){await this.client.request({method:`DELETE`,path:`${this.prefix}/namespaces/${Ot(e.namespace)}`})}async loadNamespaceMetadata(e){return{properties:(await this.client.request({method:`GET`,path:`${this.prefix}/namespaces/${Ot(e.namespace)}`})).data.properties}}async namespaceExists(e){try{return await this.client.request({method:`HEAD`,path:`${this.prefix}/namespaces/${Ot(e.namespace)}`}),!0}catch(e){if(e instanceof wt&&e.status===404)return!1;throw e}}async createNamespaceIfNotExists(e,t){try{return await this.createNamespace(e,t)}catch(e){if(e instanceof wt&&e.status===409)return;throw e}}};function At(e){return e.join(``)}var jt=class{constructor(e,t=``,n){this.client=e,this.prefix=t,this.accessDelegation=n}async listTables(e){return(await this.client.request({method:`GET`,path:`${this.prefix}/namespaces/${At(e.namespace)}/tables`})).data.identifiers}async createTable(e,t){let n={};return this.accessDelegation&&(n[`X-Iceberg-Access-Delegation`]=this.accessDelegation),(await this.client.request({method:`POST`,path:`${this.prefix}/namespaces/${At(e.namespace)}/tables`,body:t,headers:n})).data.metadata}async updateTable(e,t){let n=await this.client.request({method:`POST`,path:`${this.prefix}/namespaces/${At(e.namespace)}/tables/${e.name}`,body:t});return{"metadata-location":n.data[`metadata-location`],metadata:n.data.metadata}}async dropTable(e,t){await this.client.request({method:`DELETE`,path:`${this.prefix}/namespaces/${At(e.namespace)}/tables/${e.name}`,query:{purgeRequested:String(t?.purge??!1)}})}async loadTable(e){let t={};return this.accessDelegation&&(t[`X-Iceberg-Access-Delegation`]=this.accessDelegation),(await this.client.request({method:`GET`,path:`${this.prefix}/namespaces/${At(e.namespace)}/tables/${e.name}`,headers:t})).data.metadata}async tableExists(e){let t={};this.accessDelegation&&(t[`X-Iceberg-Access-Delegation`]=this.accessDelegation);try{return await this.client.request({method:`HEAD`,path:`${this.prefix}/namespaces/${At(e.namespace)}/tables/${e.name}`,headers:t}),!0}catch(e){if(e instanceof wt&&e.status===404)return!1;throw e}}async createTableIfNotExists(e,t){try{return await this.createTable(e,t)}catch(n){if(n instanceof wt&&n.status===409)return await this.loadTable({namespace:e.namespace,name:t.name});throw n}}},Mt=class{constructor(e){let t=`v1`;e.catalogName&&(t+=`/${e.catalogName}`);let n=e.baseUrl.endsWith(`/`)?e.baseUrl:`${e.baseUrl}/`;this.client=Dt({baseUrl:n,auth:e.auth,fetchImpl:e.fetch}),this.accessDelegation=e.accessDelegation?.join(`,`),this.namespaceOps=new kt(this.client,t),this.tableOps=new jt(this.client,t,this.accessDelegation)}async listNamespaces(e){return this.namespaceOps.listNamespaces(e)}async createNamespace(e,t){return this.namespaceOps.createNamespace(e,t)}async dropNamespace(e){await this.namespaceOps.dropNamespace(e)}async loadNamespaceMetadata(e){return this.namespaceOps.loadNamespaceMetadata(e)}async listTables(e){return this.tableOps.listTables(e)}async createTable(e,t){return this.tableOps.createTable(e,t)}async updateTable(e,t){return this.tableOps.updateTable(e,t)}async dropTable(e,t){await this.tableOps.dropTable(e,t)}async loadTable(e){return this.tableOps.loadTable(e)}async namespaceExists(e){return this.namespaceOps.namespaceExists(e)}async tableExists(e){return this.tableOps.tableExists(e)}async createNamespaceIfNotExists(e,t){return this.namespaceOps.createNamespaceIfNotExists(e,t)}async createTableIfNotExists(e,t){return this.tableOps.createTableIfNotExists(e,t)}};function Nt(e){"@babel/helpers - typeof";return Nt=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},Nt(e)}function Pt(e,t){if(Nt(e)!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t||`default`);if(Nt(r)!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}function Ft(e){var t=Pt(e,`string`);return Nt(t)==`symbol`?t:t+``}function It(e,t,n){return(t=Ft(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function Lt(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),n.push.apply(n,r)}return n}function A(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]==null?{}:arguments[t];t%2?Lt(Object(n),!0).forEach(function(t){It(e,t,n[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):Lt(Object(n)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))})}return e}var Rt=class extends Error{constructor(e,t=`storage`,n,r){super(e),this.__isStorageError=!0,this.namespace=t,this.name=t===`vectors`?`StorageVectorsError`:`StorageError`,this.status=n,this.statusCode=r}toJSON(){return{name:this.name,message:this.message,status:this.status,statusCode:this.statusCode}}};function zt(e){return typeof e==`object`&&!!e&&`__isStorageError`in e}var Bt=class extends Rt{constructor(e,t,n,r=`storage`,i){super(e,r,t,n),this.name=r===`vectors`?`StorageVectorsApiError`:`StorageApiError`,this.status=t,this.statusCode=n,this.code=i}toJSON(){return A(A({},super.toJSON()),{},{code:this.code})}},Vt=class extends Rt{constructor(e,t,n=`storage`){super(e,n),this.name=n===`vectors`?`StorageVectorsUnknownError`:`StorageUnknownError`,this.originalError=t}};function Ht(e,t,n){let r=A({},e),i=t.toLowerCase();for(let e of Object.keys(r))e.toLowerCase()===i&&delete r[e];return r[i]=n,r}function Ut(e){let t={};for(let[n,r]of Object.entries(e))t[n.toLowerCase()]=r;return t}var Wt=e=>e?(...t)=>e(...t):(...e)=>fetch(...e),Gt=e=>{if(typeof e!=`object`||!e)return!1;let t=Object.getPrototypeOf(e);return(t===null||t===Object.prototype||Object.getPrototypeOf(t)===null)&&!(Symbol.toStringTag in e)&&!(Symbol.iterator in e)},Kt=e=>{if(Array.isArray(e))return e.map(e=>Kt(e));if(typeof e==`function`||e!==Object(e))return e;let t={};return Object.entries(e).forEach(([e,n])=>{let r=e.replace(/([-_][a-z])/gi,e=>e.toUpperCase().replace(/[-_]/g,``));t[r]=Kt(n)}),t},qt=e=>!e||typeof e!=`string`||e.length===0||e.length>100||e.trim()!==e||e.includes(`/`)||e.includes(`\\`)?!1:/^[\w!.\*'() &$@=;:+,?-]+$/.test(e),Jt=e=>e.split(`/`).map(encodeURIComponent).join(`/`),Yt=e=>{if(typeof e==`object`&&e){let t=e;if(typeof t.msg==`string`)return t.msg;if(typeof t.message==`string`)return t.message;if(typeof t.error_description==`string`)return t.error_description;if(typeof t.error==`string`)return t.error;if(typeof t.error==`object`&&t.error!==null){let e=t.error;if(typeof e.message==`string`)return e.message}}return JSON.stringify(e)},Xt=async(e,t,n,r)=>{if(typeof e==`object`&&e&&`json`in e&&typeof e.json==`function`){let n=e,i=parseInt(String(n.status),10);Number.isFinite(i)||(i=500),n.json().then(e=>{let n=e?.statusCode||e?.code||i+``;t(new Bt(Yt(e),i,n,r,e?.code))}).catch(()=>{let e=i+``;t(new Bt(n.statusText||`HTTP ${i} error`,i,e,r))})}else t(new Vt(Yt(e),e,r))},Zt=(e,t,n,r)=>{let i={method:e,headers:t?.headers||{}};if(e===`GET`||e===`HEAD`||!r)return A(A({},i),n);if(Gt(r)){let e=t?.headers||{},n;for(let[t,r]of Object.entries(e))t.toLowerCase()===`content-type`&&(n=r);i.headers=Ht(e,`Content-Type`,n??`application/json`),i.body=JSON.stringify(r)}else i.body=r;return t?.duplex&&(i.duplex=t.duplex),A(A({},i),n)};async function Qt(e,t,n,r,i,a,o){return new Promise((s,c)=>{e(n,Zt(t,r,i,a)).then(e=>{if(!e.ok)throw e;if(r?.noResolveJson)return e;if(o===`vectors`){let t=e.headers.get(`content-type`);if(e.headers.get(`content-length`)===`0`||e.status===204||!t||!t.includes(`application/json`))return{}}return e.json()}).then(e=>s(e)).catch(e=>Xt(e,c,r,o))})}function $t(e=`storage`){return{get:async(t,n,r,i)=>Qt(t,`GET`,n,r,i,void 0,e),post:async(t,n,r,i,a)=>Qt(t,`POST`,n,i,a,r,e),put:async(t,n,r,i,a)=>Qt(t,`PUT`,n,i,a,r,e),head:async(t,n,r,i)=>Qt(t,`HEAD`,n,A(A({},r),{},{noResolveJson:!0}),i,void 0,e),remove:async(t,n,r,i,a)=>Qt(t,`DELETE`,n,i,a,r,e)}}var{get:en,post:tn,put:nn,head:rn,remove:an}=$t(`storage`),on=$t(`vectors`),sn=class{constructor(e,t={},n,r=`storage`){this.shouldThrowOnError=!1,this.url=e,this.headers=Ut(t),this.fetch=Wt(n),this.namespace=r}throwOnError(){return this.shouldThrowOnError=!0,this}setHeader(e,t){return this.headers=Ht(this.headers,e,t),this}async handleOperation(e){var t=this;try{return{data:await e(),error:null}}catch(e){if(t.shouldThrowOnError)throw e;if(zt(e))return{data:null,error:e};throw e}}},cn=Symbol.toStringTag,ln=class{constructor(e,t){this.downloadFn=e,this.shouldThrowOnError=t,this[cn]=`StreamDownloadBuilder`,this.promise=null}then(e,t){return this.getPromise().then(e,t)}catch(e){return this.getPromise().catch(e)}finally(e){return this.getPromise().finally(e)}getPromise(){return this.promise||=this.execute(),this.promise}async execute(){var e=this;try{return{data:(await e.downloadFn()).body,error:null}}catch(t){if(e.shouldThrowOnError)throw t;if(zt(t))return{data:null,error:t};throw t}}},un=Symbol.toStringTag,dn=class{constructor(e,t){this.downloadFn=e,this.shouldThrowOnError=t,this[un]=`BlobDownloadBuilder`,this.promise=null}asStream(){return new ln(this.downloadFn,this.shouldThrowOnError)}then(e,t){return this.getPromise().then(e,t)}catch(e){return this.getPromise().catch(e)}finally(e){return this.getPromise().finally(e)}getPromise(){return this.promise||=this.execute(),this.promise}async execute(){var e=this;try{return{data:await(await e.downloadFn()).blob(),error:null}}catch(t){if(e.shouldThrowOnError)throw t;if(zt(t))return{data:null,error:t};throw t}}},fn={limit:100,offset:0,sortBy:{column:`name`,order:`asc`}},pn={cacheControl:`3600`,contentType:`text/plain;charset=UTF-8`,upsert:!1},mn=class extends sn{constructor(e,t={},n,r){super(e,t,r,`storage`),this.bucketId=n}async uploadOrUpdate(e,t,n,r){var i=this;return i.handleOperation(async()=>{let a,o=A(A({},pn),r),s=A(A({},i.headers),e===`POST`&&{"x-upsert":String(o.upsert)}),c=o.metadata;if(typeof Blob<`u`&&n instanceof Blob||typeof FormData<`u`&&n instanceof FormData?a=i.prepareUploadFormData(n,o):(a=n,s[`cache-control`]=`max-age=${o.cacheControl}`,s[`content-type`]=o.contentType,o.contentEncoding&&(s[`content-encoding`]=o.contentEncoding),c&&(s[`x-metadata`]=i.toBase64(i.encodeMetadata(c))),(typeof ReadableStream<`u`&&a instanceof ReadableStream||a&&typeof a==`object`&&`pipe`in a&&typeof a.pipe==`function`)&&!o.duplex&&(o.duplex=`half`)),r?.headers)for(let[e,t]of Object.entries(r.headers))s=Ht(s,e,t);let l=i._removeEmptyFolders(t),u=i._getFinalPath(l),d=await(e==`PUT`?nn:tn)(i.fetch,`${i.url}/object/${u}`,a,A({headers:s},o?.duplex?{duplex:o.duplex}:{}));return{path:l,id:d.Id,fullPath:d.Key}})}async upload(e,t,n){return this.uploadOrUpdate(`POST`,e,t,n)}async uploadToSignedUrl(e,t,n,r){var i=this;let a=i._removeEmptyFolders(e),o=i._getFinalPath(a),s=new URL(i.url+`/object/upload/sign/${o}`);return s.searchParams.set(`token`,t),i.handleOperation(async()=>{let e,t=A(A({},pn),r),o=A(A({},i.headers),{"x-upsert":String(t.upsert)}),c=t.metadata;if(typeof Blob<`u`&&n instanceof Blob||typeof FormData<`u`&&n instanceof FormData?e=i.prepareUploadFormData(n,t):(e=n,o[`cache-control`]=`max-age=${t.cacheControl}`,o[`content-type`]=t.contentType,t.contentEncoding&&(o[`content-encoding`]=t.contentEncoding),c&&(o[`x-metadata`]=i.toBase64(i.encodeMetadata(c))),(typeof ReadableStream<`u`&&e instanceof ReadableStream||e&&typeof e==`object`&&`pipe`in e&&typeof e.pipe==`function`)&&!t.duplex&&(t.duplex=`half`)),r?.headers)for(let[e,t]of Object.entries(r.headers))o=Ht(o,e,t);return{path:a,fullPath:(await nn(i.fetch,s.toString(),e,A({headers:o},t?.duplex?{duplex:t.duplex}:{}))).Key}})}async createSignedUploadUrl(e,t){var n=this;return n.handleOperation(async()=>{let r=n._getFinalPath(e),i=A({},n.headers);t?.upsert&&(i[`x-upsert`]=`true`);let a=await tn(n.fetch,`${n.url}/object/upload/sign/${r}`,{},{headers:i}),o=new URL(n.url+a.url),s=o.searchParams.get(`token`);if(!s)throw new Rt(`No token returned by API`);return{signedUrl:o.toString(),path:e,token:s}})}async update(e,t,n){return this.uploadOrUpdate(`PUT`,e,t,n)}async move(e,t,n){var r=this;return r.handleOperation(async()=>await tn(r.fetch,`${r.url}/object/move`,{bucketId:r.bucketId,sourceKey:e,destinationKey:t,destinationBucket:n?.destinationBucket,sourceVersionId:n?.sourceVersionId},{headers:r.headers}))}async copy(e,t,n){var r=this;return r.handleOperation(async()=>{let i=n;return{path:(await tn(r.fetch,`${r.url}/object/copy`,{bucketId:r.bucketId,sourceKey:e,destinationKey:t,destinationBucket:n?.destinationBucket,sourceVersionId:n?.sourceVersionId,copyMetadata:typeof i?.copyMetadata==`boolean`?i.copyMetadata:void 0,metadata:i?.copyMetadata===!1?i.metadata:void 0},{headers:r.headers})).Key}})}async createSignedUrl(e,t,n){var r=this;return r.handleOperation(async()=>{let i=r._getFinalPath(e),a=typeof n?.transform==`object`&&n.transform!==null&&Object.keys(n.transform).length>0,o=await tn(r.fetch,`${r.url}/object/sign/${i}`,A(A({expiresIn:t},a?{transform:n.transform}:{}),n?.versionId==null?{}:{versionId:n.versionId}),{headers:r.headers}),s=new URLSearchParams;n?.download&&s.set(`download`,n.download===!0?``:n.download),n?.cacheNonce!=null&&s.set(`cacheNonce`,String(n.cacheNonce));let c=s.toString();return{signedUrl:encodeURI(`${r.url}${o.signedURL}${c?`&${c}`:``}`)}})}async createSignedUrls(e,t,n){var r=this;return r.handleOperation(async()=>{let i=await tn(r.fetch,`${r.url}/object/sign/${r.bucketId}`,{expiresIn:t,paths:e},{headers:r.headers}),a=new URLSearchParams;n?.download&&a.set(`download`,n.download===!0?``:n.download),n?.cacheNonce!=null&&a.set(`cacheNonce`,String(n.cacheNonce));let o=a.toString();return i.map(e=>A(A({},e),{},{signedUrl:e.signedURL?encodeURI(`${r.url}${e.signedURL}${o?`&${o}`:``}`):null}))})}download(e,t,n){let r=typeof t?.transform==`object`&&t.transform!==null&&Object.keys(t.transform).length>0?`render/image/authenticated`:`object`,i=new URLSearchParams;t?.transform&&this.applyTransformOptsToQuery(i,t.transform),t?.cacheNonce!=null&&i.set(`cacheNonce`,String(t.cacheNonce)),t?.versionId!=null&&i.set(`versionId`,String(t.versionId));let a=i.toString(),o=this._getFinalPath(e);return new dn(()=>en(this.fetch,`${this.url}/${r}/${o}${a?`?${a}`:``}`,{headers:this.headers,noResolveJson:!0},n),this.shouldThrowOnError)}async info(e,t){var n=this;let r=n._getFinalPath(e),i=new URLSearchParams;t?.versionId!=null&&i.set(`versionId`,String(t.versionId));let a=i.toString();return n.handleOperation(async()=>Kt(await en(n.fetch,`${n.url}/object/info/${r}${a?`?${a}`:``}`,{headers:n.headers})))}async exists(e){var t=this;let n=t._getFinalPath(e);try{return await rn(t.fetch,`${t.url}/object/${n}`,{headers:t.headers}),{data:!0,error:null}}catch(e){if(t.shouldThrowOnError)throw e;if(zt(e)){let t=e instanceof Bt?e.status:e instanceof Vt?e.originalError?.status:void 0;if(t!==void 0&&[400,404].includes(t))return{data:!1,error:e}}throw e}}getPublicUrl(e,t){let n=this._getFinalPath(e),r=new URLSearchParams;t?.download&&r.set(`download`,t.download===!0?``:t.download),t?.transform&&this.applyTransformOptsToQuery(r,t.transform),t?.cacheNonce!=null&&r.set(`cacheNonce`,String(t.cacheNonce)),t?.versionId!=null&&r.set(`versionId`,String(t.versionId));let i=r.toString(),a=typeof t?.transform==`object`&&t.transform!==null&&Object.keys(t.transform).length>0?`render/image`:`object`;return{data:{publicUrl:encodeURI(`${this.url}/${a}/public/${n}`)+(i?`?${i}`:``)}}}async remove(e){var t=this;return t.handleOperation(async()=>await an(t.fetch,`${t.url}/object/${t.bucketId}`,{prefixes:e},{headers:t.headers}))}async purgeCache(e,t,n){var r=this;return r.handleOperation(async()=>{let i=Jt(r._getFinalPath(e)),a=new URLSearchParams;t?.transformations&&a.set(`transformations`,`true`);let o=a.toString();return await an(r.fetch,`${r.url}/cdn/${i}${o?`?${o}`:``}`,{},{headers:r.headers},n)})}async list(e,t,n){var r=this;return r.handleOperation(async()=>{let i=t?.sortBy?A(A({},fn.sortBy),t.sortBy):fn.sortBy,a=A(A(A({},fn),t),{},{sortBy:i,prefix:e||``});return await tn(r.fetch,`${r.url}/object/list/${r.bucketId}`,a,{headers:r.headers},n)})}async listV2(e,t){var n=this;return n.handleOperation(async()=>{let r=A({},e);return await tn(n.fetch,`${n.url}/object/list-v2/${n.bucketId}`,r,{headers:n.headers},t)})}prepareUploadFormData(e,t){let n=new FormData,r=[];e instanceof FormData?e.forEach((e,t)=>{typeof e==`string`?n.append(t,e):r.push([t,e])}):r.push([``,e]),n.has(`cacheControl`)||n.append(`cacheControl`,t.cacheControl),t.metadata&&!n.has(`metadata`)&&n.append(`metadata`,this.encodeMetadata(t.metadata)),t.contentEncoding&&!n.has(`contentEncoding`)&&n.append(`contentEncoding`,t.contentEncoding);for(let[e,t]of r)n.append(e,t);return n}encodeMetadata(e){return JSON.stringify(e)}toBase64(e){return typeof Buffer<`u`?Buffer.from(e).toString(`base64`):btoa(e)}_getFinalPath(e){return`${this.bucketId}/${e.replace(/^\/+/,``)}`}_removeEmptyFolders(e){return e.replace(/^\/|\/$/g,``).replace(/\/+/g,`/`)}applyTransformOptsToQuery(e,t){return t.width&&e.set(`width`,t.width.toString()),t.height&&e.set(`height`,t.height.toString()),t.resize&&e.set(`resize`,t.resize),t.format&&e.set(`format`,t.format),t.quality&&e.set(`quality`,t.quality.toString()),e}},hn={"X-Client-Info":`storage-js/2.118.0`},gn=class extends sn{constructor(e,t={},n,r){let i=new URL(e);r?.useNewHostname&&/supabase\.(co|in|red)$/.test(i.hostname)&&!i.hostname.includes(`storage.supabase.`)&&(i.hostname=i.hostname.replace(`supabase.`,`storage.supabase.`));let a=i.href.replace(/\/$/,``),o=A(A({},hn),t);super(a,o,n,`storage`)}async listBuckets(e){var t=this;return t.handleOperation(async()=>{let n=t.listBucketOptionsToQueryString(e);return await en(t.fetch,`${t.url}/bucket${n}`,{headers:t.headers})})}async getBucket(e){var t=this;return t.handleOperation(async()=>await en(t.fetch,`${t.url}/bucket/${e}`,{headers:t.headers}))}async createBucket(e,t={public:!1}){var n=this;return n.handleOperation(async()=>await tn(n.fetch,`${n.url}/bucket`,{id:e,name:e,type:t.type,public:t.public,file_size_limit:t.fileSizeLimit,allowed_mime_types:t.allowedMimeTypes,versioning_status:t.versioningStatus},{headers:n.headers}))}async updateBucket(e,t){var n=this;return n.handleOperation(async()=>await nn(n.fetch,`${n.url}/bucket/${e}`,{id:e,name:e,public:t.public,file_size_limit:t.fileSizeLimit,allowed_mime_types:t.allowedMimeTypes,versioning_status:t.versioningStatus},{headers:n.headers}))}async emptyBucket(e){var t=this;return t.handleOperation(async()=>await tn(t.fetch,`${t.url}/bucket/${e}/empty`,{},{headers:t.headers}))}async deleteBucket(e){var t=this;return t.handleOperation(async()=>await an(t.fetch,`${t.url}/bucket/${e}`,{},{headers:t.headers}))}async getBucketLifecycle(e){var t=this;return t.handleOperation(async()=>await en(t.fetch,t.bucketLifecycleUrl(e),{headers:t.headers}))}async updateBucketLifecycle(e,t){var n=this;return n.handleOperation(async()=>await nn(n.fetch,n.bucketLifecycleUrl(e),t,{headers:n.headers}))}async deleteBucketLifecycle(e){var t=this;return t.handleOperation(async()=>await an(t.fetch,t.bucketLifecycleUrl(e),{},{headers:t.headers}))}async purgeBucketCache(e,t,n){var r=this;return r.handleOperation(async()=>{let i=new URLSearchParams;t?.transformations&&i.set(`transformations`,`true`);let a=i.toString();return await an(r.fetch,`${r.url}/cdn/${Jt(e)}${a?`?${a}`:``}`,{},{headers:r.headers},n)})}bucketLifecycleUrl(e){return`${this.url}/bucket/${Jt(e)}/lifecycle`}listBucketOptionsToQueryString(e){let t={};return e&&(`limit`in e&&(t.limit=String(e.limit)),`offset`in e&&(t.offset=String(e.offset)),e.search&&(t.search=e.search),e.sortColumn&&(t.sortColumn=e.sortColumn),e.sortOrder&&(t.sortOrder=e.sortOrder)),Object.keys(t).length>0?`?`+new URLSearchParams(t).toString():``}},_n=class extends sn{constructor(e,t={},n){let r=e.replace(/\/$/,``),i=A(A({},hn),t);super(r,i,n,`storage`)}async createBucket(e){var t=this;return t.handleOperation(async()=>await tn(t.fetch,`${t.url}/bucket`,{name:e},{headers:t.headers}))}async listBuckets(e){var t=this;return t.handleOperation(async()=>{let n=new URLSearchParams;e?.limit!==void 0&&n.set(`limit`,e.limit.toString()),e?.offset!==void 0&&n.set(`offset`,e.offset.toString()),e?.sortColumn&&n.set(`sortColumn`,e.sortColumn),e?.sortOrder&&n.set(`sortOrder`,e.sortOrder),e?.search&&n.set(`search`,e.search);let r=n.toString(),i=r?`${t.url}/bucket?${r}`:`${t.url}/bucket`;return await en(t.fetch,i,{headers:t.headers})})}async deleteBucket(e){var t=this;return t.handleOperation(async()=>await an(t.fetch,`${t.url}/bucket/${e}`,{},{headers:t.headers}))}from(e){var t=this;if(!qt(e))throw new Rt(`Invalid bucket name: File, folder, and bucket names must follow AWS object key naming guidelines and should avoid the use of any other characters.`);let n=new Mt({baseUrl:this.url,catalogName:e,auth:{type:`custom`,getHeaders:async()=>t.headers},fetch:this.fetch}),r=this.shouldThrowOnError;return new Proxy(n,{get(e,t){let n=e[t];return typeof n==`function`?async(...t)=>{try{return{data:await n.apply(e,t),error:null}}catch(e){if(r)throw e;return{data:null,error:e}}}:n}})}},vn=class extends sn{constructor(e,t={},n){let r=e.replace(/\/$/,``),i=A(A({},hn),{},{"Content-Type":`application/json`},t);super(r,i,n,`vectors`)}async createIndex(e){var t=this;return t.handleOperation(async()=>await on.post(t.fetch,`${t.url}/CreateIndex`,e,{headers:t.headers})||{})}async getIndex(e,t){var n=this;return n.handleOperation(async()=>await on.post(n.fetch,`${n.url}/GetIndex`,{vectorBucketName:e,indexName:t},{headers:n.headers}))}async listIndexes(e){var t=this;return t.handleOperation(async()=>await on.post(t.fetch,`${t.url}/ListIndexes`,e,{headers:t.headers}))}async deleteIndex(e,t){var n=this;return n.handleOperation(async()=>await on.post(n.fetch,`${n.url}/DeleteIndex`,{vectorBucketName:e,indexName:t},{headers:n.headers})||{})}},yn=class extends sn{constructor(e,t={},n){let r=e.replace(/\/$/,``),i=A(A({},hn),{},{"Content-Type":`application/json`},t);super(r,i,n,`vectors`)}async putVectors(e){var t=this;if(e.vectors.length<1||e.vectors.length>500)throw Error(`Vector batch size must be between 1 and 500 items`);return t.handleOperation(async()=>await on.post(t.fetch,`${t.url}/PutVectors`,e,{headers:t.headers})||{})}async getVectors(e){var t=this;return t.handleOperation(async()=>await on.post(t.fetch,`${t.url}/GetVectors`,e,{headers:t.headers}))}async listVectors(e){var t=this;if(e.segmentCount!==void 0){if(e.segmentCount<1||e.segmentCount>16)throw Error(`segmentCount must be between 1 and 16`);if(e.segmentIndex!==void 0&&(e.segmentIndex<0||e.segmentIndex>=e.segmentCount))throw Error(`segmentIndex must be between 0 and ${e.segmentCount-1}`)}return t.handleOperation(async()=>await on.post(t.fetch,`${t.url}/ListVectors`,e,{headers:t.headers}))}async queryVectors(e){var t=this;return t.handleOperation(async()=>await on.post(t.fetch,`${t.url}/QueryVectors`,e,{headers:t.headers}))}async deleteVectors(e){var t=this;if(e.keys.length<1||e.keys.length>500)throw Error(`Keys batch size must be between 1 and 500 items`);return t.handleOperation(async()=>await on.post(t.fetch,`${t.url}/DeleteVectors`,e,{headers:t.headers})||{})}},bn=class extends sn{constructor(e,t={},n){let r=e.replace(/\/$/,``),i=A(A({},hn),{},{"Content-Type":`application/json`},t);super(r,i,n,`vectors`)}async createBucket(e){var t=this;return t.handleOperation(async()=>await on.post(t.fetch,`${t.url}/CreateVectorBucket`,{vectorBucketName:e},{headers:t.headers})||{})}async getBucket(e){var t=this;return t.handleOperation(async()=>await on.post(t.fetch,`${t.url}/GetVectorBucket`,{vectorBucketName:e},{headers:t.headers}))}async listBuckets(e={}){var t=this;return t.handleOperation(async()=>await on.post(t.fetch,`${t.url}/ListVectorBuckets`,e,{headers:t.headers}))}async deleteBucket(e){var t=this;return t.handleOperation(async()=>await on.post(t.fetch,`${t.url}/DeleteVectorBucket`,{vectorBucketName:e},{headers:t.headers})||{})}},xn=class extends bn{constructor(e,t={}){super(e,t.headers||{},t.fetch)}from(e){return new Sn(this.url,this.headers,e,this.fetch)}async createBucket(e){var t=()=>super.createBucket,n=this;return t().call(n,e)}async getBucket(e){var t=()=>super.getBucket,n=this;return t().call(n,e)}async listBuckets(e={}){var t=()=>super.listBuckets,n=this;return t().call(n,e)}async deleteBucket(e){var t=()=>super.deleteBucket,n=this;return t().call(n,e)}},Sn=class extends vn{constructor(e,t,n,r){super(e,t,r),this.vectorBucketName=n}async createIndex(e){var t=()=>super.createIndex,n=this;return t().call(n,A(A({},e),{},{vectorBucketName:n.vectorBucketName}))}async listIndexes(e={}){var t=()=>super.listIndexes,n=this;return t().call(n,A(A({},e),{},{vectorBucketName:n.vectorBucketName}))}async getIndex(e){var t=()=>super.getIndex,n=this;return t().call(n,n.vectorBucketName,e)}async deleteIndex(e){var t=()=>super.deleteIndex,n=this;return t().call(n,n.vectorBucketName,e)}index(e){return new Cn(this.url,this.headers,this.vectorBucketName,e,this.fetch)}},Cn=class extends yn{constructor(e,t,n,r,i){super(e,t,i),this.vectorBucketName=n,this.indexName=r}async putVectors(e){var t=()=>super.putVectors,n=this;return t().call(n,A(A({},e),{},{vectorBucketName:n.vectorBucketName,indexName:n.indexName}))}async getVectors(e){var t=()=>super.getVectors,n=this;return t().call(n,A(A({},e),{},{vectorBucketName:n.vectorBucketName,indexName:n.indexName}))}async listVectors(e={}){var t=()=>super.listVectors,n=this;return t().call(n,A(A({},e),{},{vectorBucketName:n.vectorBucketName,indexName:n.indexName}))}async queryVectors(e){var t=()=>super.queryVectors,n=this;return t().call(n,A(A({},e),{},{vectorBucketName:n.vectorBucketName,indexName:n.indexName}))}async deleteVectors(e){var t=()=>super.deleteVectors,n=this;return t().call(n,A(A({},e),{},{vectorBucketName:n.vectorBucketName,indexName:n.indexName}))}},wn=class extends gn{constructor(e,t={},n,r){super(e,t,n,r)}from(e){return new mn(this.url,this.headers,e,this.fetch)}get vectors(){return new xn(this.url+`/vector`,{headers:this.headers,fetch:this.fetch})}get analytics(){return new _n(this.url+`/iceberg`,this.headers,this.fetch)}},Tn=`2.118.0`,En=3e4,Dn=3*En,On=2*En,kn=`http://localhost:9999`,An=`supabase.auth.token`,jn={"X-Client-Info":`gotrue-js/${Tn}`},Mn=`X-Supabase-Api-Version`,Nn={"2024-01-01":{timestamp:Date.parse(`2024-01-01T00:00:00.0Z`),name:`2024-01-01`}},Pn=/^([a-z0-9_-]{4})*($|[a-z0-9_-]{3}$|[a-z0-9_-]{2}$)$/i,Fn=`sb_flow_id`,In=class extends Error{constructor(e,t,n){super(e),this.__isAuthError=!0,this.name=`AuthError`,this.status=t,this.code=n}toJSON(){return{name:this.name,message:this.message,status:this.status,code:this.code}}};function j(e){return typeof e==`object`&&!!e&&`__isAuthError`in e}var Ln=class extends In{constructor(e,t,n){super(e,t,n),this.name=`AuthApiError`,this.status=t,this.code=n}};function Rn(e){return j(e)&&e.name===`AuthApiError`}var zn=class extends In{constructor(e,t){super(e),this.name=`AuthUnknownError`,this.originalError=t}},Bn=class extends In{constructor(e,t,n,r){super(e,n,r),this.name=t,this.status=n}},M=class extends Bn{constructor(){super(`Auth session missing!`,`AuthSessionMissingError`,400,void 0)}};function Vn(e){return j(e)&&e.name===`AuthSessionMissingError`}var Hn=class extends Bn{constructor(){super(`Auth session or user missing`,`AuthInvalidTokenResponseError`,500,void 0)}},Un=class extends Bn{constructor(e){super(e,`AuthInvalidCredentialsError`,400,void 0)}},Wn=class extends Bn{constructor(e,t=null){super(e,`AuthImplicitGrantRedirectError`,500,void 0),this.details=null,this.details=t}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{details:this.details})}};function Gn(e){return j(e)&&e.name===`AuthImplicitGrantRedirectError`}var Kn=class extends Bn{constructor(e,t=null){super(e,`AuthPKCEGrantCodeExchangeError`,500,void 0),this.details=null,this.details=t}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{details:this.details})}},qn=class extends Bn{constructor(){super(`PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device, or if the storage was cleared. For SSR frameworks (Next.js, SvelteKit, etc.), use @supabase/ssr on both the server and client to store the code verifier in cookies.`,`AuthPKCECodeVerifierMissingError`,400,`pkce_code_verifier_not_found`)}},Jn=class extends Bn{constructor(e,t){super(e,`AuthRetryableFetchError`,t,void 0)}};function Yn(e){return j(e)&&e.name===`AuthRetryableFetchError`}var Xn=class extends Bn{constructor(e=`Refresh result discarded: session state changed mid-flight (e.g., concurrent signOut)`){super(e,`AuthRefreshDiscardedError`,409,void 0)}};function Zn(e){return j(e)&&e.name===`AuthRefreshDiscardedError`}var Qn=class extends Bn{constructor(e,t,n){super(e,`AuthWeakPasswordError`,t,`weak_password`),this.reasons=n}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{reasons:this.reasons})}},$n=class extends Bn{constructor(e){super(e,`AuthInvalidJwtError`,400,`invalid_jwt`)}},er=`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_`.split(``),tr=` 	
\r=`.split(``),nr=(()=>{let e=Array(128);for(let t=0;t<e.length;t+=1)e[t]=-1;for(let t=0;t<tr.length;t+=1)e[tr[t].charCodeAt(0)]=-2;for(let t=0;t<er.length;t+=1)e[er[t].charCodeAt(0)]=t;return e})();function rr(e,t,n){if(e!==null)for(t.queue=t.queue<<8|e,t.queuedBits+=8;t.queuedBits>=6;)n(er[t.queue>>t.queuedBits-6&63]),t.queuedBits-=6;else if(t.queuedBits>0)for(t.queue<<=6-t.queuedBits,t.queuedBits=6;t.queuedBits>=6;)n(er[t.queue>>t.queuedBits-6&63]),t.queuedBits-=6}function ir(e,t,n){let r=nr[e];if(r>-1)for(t.queue=t.queue<<6|r,t.queuedBits+=6;t.queuedBits>=8;)n(t.queue>>t.queuedBits-8&255),t.queuedBits-=8;else if(r===-2)return;else throw Error(`Invalid Base64-URL character "${String.fromCharCode(e)}"`)}function ar(e){let t=[],n=e=>{t.push(String.fromCodePoint(e))},r={utf8seq:0,codepoint:0},i={queue:0,queuedBits:0},a=e=>{cr(e,r,n)};for(let t=0;t<e.length;t+=1)ir(e.charCodeAt(t),i,a);return t.join(``)}function or(e,t){if(e<=127)t(e);else if(e<=2047)t(192|e>>6),t(128|e&63);else if(e<=65535)t(224|e>>12),t(128|e>>6&63),t(128|e&63);else if(e<=1114111)t(240|e>>18),t(128|e>>12&63),t(128|e>>6&63),t(128|e&63);else throw Error(`Unrecognized Unicode codepoint: ${e.toString(16)}`)}function sr(e,t){for(let n=0;n<e.length;n+=1){let r=e.charCodeAt(n);if(r>55295&&r<=56319){let t=(r-55296)*1024&65535;r=(e.charCodeAt(n+1)-56320&65535|t)+65536,n+=1}or(r,t)}}function cr(e,t,n){if(t.utf8seq===0){if(e<=127){n(e);return}for(let n=1;n<6;n+=1)if(!(e>>7-n&1)){t.utf8seq=n;break}if(t.utf8seq===2)t.codepoint=e&31;else if(t.utf8seq===3)t.codepoint=e&15;else if(t.utf8seq===4)t.codepoint=e&7;else throw Error(`Invalid UTF-8 sequence`);--t.utf8seq}else if(t.utf8seq>0){if(e<=127)throw Error(`Invalid UTF-8 sequence`);t.codepoint=t.codepoint<<6|e&63,--t.utf8seq,t.utf8seq===0&&n(t.codepoint)}}function lr(e){let t=[],n={queue:0,queuedBits:0},r=e=>{t.push(e)};for(let t=0;t<e.length;t+=1)ir(e.charCodeAt(t),n,r);return new Uint8Array(t)}function ur(e){let t=[];return sr(e,e=>t.push(e)),new Uint8Array(t)}function dr(e){let t=[],n={queue:0,queuedBits:0},r=e=>{t.push(e)};return e.forEach(e=>rr(e,n,r)),rr(null,n,r),t.join(``)}function fr(e){return Math.round(Date.now()/1e3)+e}function pr(){return Symbol(`auth-callback`)}var N=()=>typeof window<`u`&&typeof document<`u`,mr={tested:!1,writable:!1},hr=()=>{if(!N())return!1;try{if(typeof globalThis.localStorage!=`object`)return!1}catch{return!1}if(mr.tested)return mr.writable;let e=`lswt-${Math.random()}${Math.random()}`;try{globalThis.localStorage.setItem(e,e),globalThis.localStorage.removeItem(e),mr.tested=!0,mr.writable=!0}catch{mr.tested=!0,mr.writable=!1}return mr.writable};function gr(e){let t={},n=new URL(e);if(n.hash&&n.hash[0]===`#`)try{new URLSearchParams(n.hash.substring(1)).forEach((e,n)=>{t[n]=e})}catch{}return n.searchParams.forEach((e,n)=>{t[n]=e}),t}var _r=e=>e?(...t)=>e(...t):(...e)=>fetch(...e),vr=e=>typeof e==`object`&&!!e&&`status`in e&&`ok`in e&&`json`in e&&typeof e.json==`function`,yr=async(e,t,n)=>{await e.setItem(t,JSON.stringify(n))},P=async(e,t)=>{let n=await e.getItem(t);if(!n)return null;try{return JSON.parse(n)}catch{return null}},br=async(e,t)=>{await e.removeItem(t)},xr=class e{constructor(){this.promise=new e.promiseConstructor((e,t)=>{this.resolve=e,this.reject=t})}};xr.promiseConstructor=Promise;function Sr(e){let t=e.split(`.`);if(t.length!==3)throw new $n(`Invalid JWT structure`);for(let e=0;e<t.length;e++)if(!Pn.test(t[e]))throw new $n(`JWT not in base64url format`);return{header:JSON.parse(ar(t[0])),payload:JSON.parse(ar(t[1])),signature:lr(t[2]),raw:{header:t[0],payload:t[1]}}}async function Cr(e){return await new Promise(t=>{setTimeout(()=>t(null),e)})}function wr(e,t){return new Promise((n,r)=>{(async()=>{for(let i=0;i<1/0;i++)try{let r=await e(i);if(!t(i,null,r)){n(r);return}}catch(e){if(!t(i,e)){r(e);return}}})()})}function Tr(e){return(`0`+e.toString(16)).substr(-2)}function Er(){let e=new Uint32Array(56);if(typeof crypto>`u`){let e=``;for(let t=0;t<56;t++)e+=`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~`.charAt(Math.floor(Math.random()*66));return e}return crypto.getRandomValues(e),Array.from(e,Tr).join(``)}async function Dr(e){let t=new TextEncoder().encode(e),n=await crypto.subtle.digest(`SHA-256`,t),r=new Uint8Array(n);return Array.from(r).map(e=>String.fromCharCode(e)).join(``)}async function Or(e){if(typeof crypto>`u`||crypto.subtle===void 0||typeof TextEncoder>`u`)return console.warn(`WebCrypto API is not supported. Code challenge method will default to use plain instead of sha256.`),e;let t=await Dr(e);return btoa(t).replace(/\+/g,`-`).replace(/\//g,`_`).replace(/=+$/,``)}var kr=/^[a-zA-Z0-9_-]{8,64}$/;function Ar(e){return typeof e==`string`&&kr.test(e)?e:null}function jr(){if(typeof crypto<`u`&&typeof crypto.getRandomValues==`function`){let e=new Uint8Array(16);return crypto.getRandomValues(e),Array.from(e,Tr).join(``)}let e=``;for(let t=0;t<32;t++)e+=Math.floor(Math.random()*16).toString(16);return e}var Mr=(e,t)=>`${e}-flow-${t}-code-verifier`,Nr=e=>`${e}-flows-code-verifier`;async function Pr(e,t){let n=await P(e,Nr(t));return Array.isArray(n)?n.filter(e=>Ar(e)!==null):[]}async function Fr(e,t,n,r,i){await yr(e,Mr(t,n),r);let a=(await Pr(e,t)).filter(e=>e!==n);for(a.push(n);a.length>5;){let n=a.shift();await br(e,Mr(t,n)),i?.(n)}await yr(e,Nr(t),a),await yr(e,`${t}-code-verifier`,r)}async function Ir(e,t,n){if(n){let r=await P(e,Mr(t,n));return{verifier:typeof r==`string`?r:null,flowId:n}}let r=await P(e,`${t}-code-verifier`);return{verifier:typeof r==`string`?r:null,flowId:null}}async function Lr(e,t,n){let r=`${t}-code-verifier`;if(!n){await br(e,r);return}let i=Mr(t,n),a=await P(e,i);await br(e,i);let o=await Pr(e,t),s=o.filter(e=>e!==n);s.length!==o.length&&(s.length>0?await yr(e,Nr(t),s):await br(e,Nr(t))),a!=null&&a===await P(e,r)&&await br(e,r)}async function Rr(e,t){let n=await Pr(e,t);for(let r of n)await br(e,Mr(t,r));await br(e,Nr(t)),await br(e,`${t}-code-verifier`)}function zr(e,t){let n=e.indexOf(`#`),r=n===-1?e:e.slice(0,n),i=n===-1?``:e.slice(n),a=r.indexOf(`?`);if(a!==-1){let e=r.slice(0,a),t=r.slice(a+1).split(`&`).filter(e=>e!==``&&e!==`sb_flow_id`&&!e.startsWith(`sb_flow_id=`));r=t.length>0?`${e}?${t.join(`&`)}`:e}let o=r.includes(`?`)?`&`:`?`;return`${r}${o}${Fn}=${encodeURIComponent(t)}${i}`}async function Br(e,t,n=!1,r){let i=Er(),a=i;n&&(a+=`/recovery`);let o=jr();await Fr(e,t,o,a,r);let s=await Or(i);return[s,i===s?`plain`:`s256`,o]}var Vr=/^2[0-9]{3}-(0[1-9]|1[0-2])-(0[1-9]|1[0-9]|2[0-9]|3[0-1])$/i;function Hr(e){let t=e.headers.get(Mn);if(!t||!t.match(Vr))return null;try{return new Date(`${t}T00:00:00.0Z`)}catch{return null}}function Ur(e){if(!e)throw Error(`Missing exp claim`);if(e<=Math.floor(Date.now()/1e3))throw Error(`JWT has expired`)}function Wr(e){switch(e){case`RS256`:return{name:`RSASSA-PKCS1-v1_5`,hash:{name:`SHA-256`}};case`ES256`:return{name:`ECDSA`,namedCurve:`P-256`,hash:{name:`SHA-256`}};default:throw Error(`Invalid alg claim`)}}var Gr=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;function Kr(e){if(!Gr.test(e))throw Error(`@supabase/auth-js: Expected parameter to be UUID but is not`)}function qr(e){if(!e.recoveryCodes)throw Error("@supabase/auth-js: the MFA recovery codes API is experimental and disabled by default. Enable it by passing `auth: { experimental: { recoveryCodes: true } }` to createClient (or to the GoTrueClient constructor).")}function Jr(){return new Proxy({},{get:(e,t)=>{if(t===`__isUserNotAvailableProxy`)return!0;if(typeof t==`symbol`){let e=t.toString();if(e===`Symbol(Symbol.toPrimitive)`||e===`Symbol(Symbol.toStringTag)`||e===`Symbol(util.inspect.custom)`)return}throw Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Accessing the "${t}" property of the session object is not supported. Please use getUser() instead.`)},set:(e,t)=>{throw Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Setting the "${t}" property of the session object is not supported. Please use getUser() to fetch a user object you can manipulate.`)},deleteProperty:(e,t)=>{throw Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Deleting the "${t}" property of the session object is not supported. Please use getUser() to fetch a user object you can manipulate.`)}})}function Yr(e,t){return new Proxy(e,{get:(e,n,r)=>{if(n===`__isInsecureUserWarningProxy`)return!0;if(typeof n==`symbol`){let t=n.toString();if(t===`Symbol(Symbol.toPrimitive)`||t===`Symbol(Symbol.toStringTag)`||t===`Symbol(util.inspect.custom)`||t===`Symbol(nodejs.util.inspect.custom)`)return Reflect.get(e,n,r)}return!t.value&&typeof n==`string`&&(console.warn(`Using the user object as returned from supabase.auth.getSession() or from some supabase.auth.onAuthStateChange() events could be insecure! This value comes directly from the storage medium (usually cookies on the server) and may not be authentic. Use supabase.auth.getUser() instead which authenticates the data by contacting the Supabase Auth server.`),t.value=!0),Reflect.get(e,n,r)}})}function Xr(e){return JSON.parse(JSON.stringify(e))}var Zr=e=>{if(typeof e==`object`&&e){let t=e;if(typeof t.msg==`string`)return t.msg;if(typeof t.message==`string`)return t.message;if(typeof t.error_description==`string`)return t.error_description;if(typeof t.error==`string`)return t.error}return JSON.stringify(e)},Qr=[500,501,502,503,504,520,521,522,523,524,525,526,527,528,529,530];async function $r(e){if(!vr(e))throw new Jn(Zr(e),0);let t;try{t=await e.json()}catch(t){throw Qr.includes(e.status)?new Jn(e.statusText||`HTTP ${e.status}`,e.status):new zn(Zr(t),t)}if(Qr.includes(e.status))throw new Jn(Zr(t),e.status);let n,r=Hr(e);if(r&&r.getTime()>=Nn[`2024-01-01`].timestamp&&typeof t==`object`&&t&&typeof t.code==`string`?n=t.code:typeof t==`object`&&t&&typeof t.error_code==`string`&&(n=t.error_code),!n){if(typeof t==`object`&&t&&typeof t.weak_password==`object`&&t.weak_password&&Array.isArray(t.weak_password.reasons)&&t.weak_password.reasons.length&&t.weak_password.reasons.reduce((e,t)=>e&&typeof t==`string`,!0))throw new Qn(Zr(t),e.status,t.weak_password.reasons)}else if(n===`weak_password`)throw new Qn(Zr(t),e.status,t.weak_password?.reasons||[]);else if(n===`session_not_found`)throw new M;throw new Ln(Zr(t),e.status||500,n)}var ei=(e,t,n,r)=>{let i={method:e,headers:t?.headers||{}};return e===`GET`?i:(i.headers=Object.assign({"Content-Type":`application/json;charset=UTF-8`},t?.headers),i.body=JSON.stringify(r),Object.assign(Object.assign({},i),n))};async function F(e,t,n,r){let i=Object.assign({},r?.headers);i[`X-Supabase-Api-Version`]||(i[Mn]=Nn[`2024-01-01`].name),r?.jwt&&(i.Authorization=`Bearer ${r.jwt}`);let a=r?.query??{};r?.redirectTo&&(a.redirect_to=r.redirectTo);let o=await ti(e,t,n+(Object.keys(a).length?`?`+new URLSearchParams(a).toString():``),{headers:i,noResolveJson:r?.noResolveJson},{},r?.body);return r?.xform?r?.xform(o):{data:Object.assign({},o),error:null}}async function ti(e,t,n,r,i,a){let o=ei(t,r,i,a),s;try{s=await e(n,Object.assign({},o))}catch(e){throw new Jn(Zr(e),0)}if(s.ok||await $r(s),r?.noResolveJson)return s;try{return await s.json()}catch(e){await $r(e)}}function ni(e){let t=null;ci(e)&&(t=Object.assign({},e),e.expires_at||(t.expires_at=fr(e.expires_in)));let n=e.user??(typeof e?.id==`string`?e:null);return{data:{session:t,user:n},error:null}}function ri(e){let t=ni(e);return!t.error&&e.weak_password&&typeof e.weak_password==`object`&&Array.isArray(e.weak_password.reasons)&&e.weak_password.reasons.length&&e.weak_password.message&&typeof e.weak_password.message==`string`&&e.weak_password.reasons.reduce((e,t)=>e&&typeof t==`string`,!0)&&(t.data.weak_password=e.weak_password),t}function ii(e){return{data:{user:e.user??e},error:null}}function ai(e){return{data:e,error:null}}function oi(e){let{action_link:t,email_otp:r,hashed_token:i,redirect_to:a,verification_type:o}=e,s=n(e,[`action_link`,`email_otp`,`hashed_token`,`redirect_to`,`verification_type`]);return{data:{properties:{action_link:t,email_otp:r,hashed_token:i,redirect_to:a,verification_type:o},user:Object.assign({},s)},error:null}}function si(e){return e}function ci(e){return!!e.access_token&&!!e.refresh_token&&!!e.expires_in}var li=[`global`,`local`,`others`],ui=class{constructor({url:e=``,headers:t={},fetch:n,experimental:r}){this.url=e,this.headers=t,this.fetch=_r(n),this.experimental=r??{},this.mfa={listFactors:this._listFactors.bind(this),deleteFactor:this._deleteFactor.bind(this)},this.oauth={listClients:this._listOAuthClients.bind(this),createClient:this._createOAuthClient.bind(this),getClient:this._getOAuthClient.bind(this),updateClient:this._updateOAuthClient.bind(this),deleteClient:this._deleteOAuthClient.bind(this),regenerateClientSecret:this._regenerateOAuthClientSecret.bind(this)},this.customProviders={listProviders:this._listCustomProviders.bind(this),createProvider:this._createCustomProvider.bind(this),getProvider:this._getCustomProvider.bind(this),updateProvider:this._updateCustomProvider.bind(this),deleteProvider:this._deleteCustomProvider.bind(this)},this.passkey={listPasskeys:this._adminListPasskeys.bind(this),deletePasskey:this._adminDeletePasskey.bind(this)}}async signOut(e,t=li[0]){if(li.indexOf(t)<0)throw Error(`@supabase/auth-js: Parameter scope must be one of ${li.join(`, `)}`);try{return await F(this.fetch,`POST`,`${this.url}/logout?scope=${t}`,{headers:this.headers,jwt:e,noResolveJson:!0}),{data:null,error:null}}catch(e){if(j(e))return{data:null,error:e};throw e}}async inviteUserByEmail(e,t={}){try{return await F(this.fetch,`POST`,`${this.url}/invite`,{body:{email:e,data:t.data},headers:this.headers,redirectTo:t.redirectTo,xform:ii})}catch(e){if(j(e))return{data:{user:null},error:e};throw e}}async generateLink(e){try{let{options:t}=e,r=n(e,[`options`]),i=Object.assign(Object.assign({},r),t);return`newEmail`in r&&(i.new_email=r?.newEmail,delete i.newEmail),await F(this.fetch,`POST`,`${this.url}/admin/generate_link`,{body:i,headers:this.headers,xform:oi,redirectTo:t?.redirectTo})}catch(e){if(j(e))return{data:{properties:null,user:null},error:e};throw e}}async createUser(e){try{return await F(this.fetch,`POST`,`${this.url}/admin/users`,{body:e,headers:this.headers,xform:ii})}catch(e){if(j(e))return{data:{user:null},error:e};throw e}}async listUsers(e){try{let t={nextPage:null,lastPage:0,total:0},n=await F(this.fetch,`GET`,`${this.url}/admin/users`,{headers:this.headers,noResolveJson:!0,query:{page:(e?.page)?.toString()??``,per_page:(e?.perPage)?.toString()??``},xform:si});if(n.error)throw n.error;let r=await n.json(),i=n.headers.get(`x-total-count`)??0,a=n.headers.get(`link`)?.split(`,`)??[];return a.length>0&&(a.forEach(e=>{let n=parseInt(e.split(`;`)[0].split(`=`)[1].substring(0,1)),r=JSON.parse(e.split(`;`)[1].split(`=`)[1]);t[`${r}Page`]=n}),t.total=parseInt(i)),{data:Object.assign(Object.assign({},r),t),error:null}}catch(e){if(j(e))return{data:{users:[]},error:e};throw e}}async getUserById(e){Kr(e);try{return await F(this.fetch,`GET`,`${this.url}/admin/users/${e}`,{headers:this.headers,xform:ii})}catch(e){if(j(e))return{data:{user:null},error:e};throw e}}async updateUserById(e,t){Kr(e);try{return await F(this.fetch,`PUT`,`${this.url}/admin/users/${e}`,{body:t,headers:this.headers,xform:ii})}catch(e){if(j(e))return{data:{user:null},error:e};throw e}}async deleteUser(e,t=!1){Kr(e);try{return await F(this.fetch,`DELETE`,`${this.url}/admin/users/${e}`,{headers:this.headers,body:{should_soft_delete:t},xform:ii})}catch(e){if(j(e))return{data:{user:null},error:e};throw e}}async _listFactors(e){Kr(e.userId);try{let{data:t,error:n}=await F(this.fetch,`GET`,`${this.url}/admin/users/${e.userId}/factors`,{headers:this.headers,xform:e=>({data:{factors:e},error:null})});return{data:t,error:n}}catch(e){if(j(e))return{data:null,error:e};throw e}}async _deleteFactor(e){Kr(e.userId),Kr(e.id);try{return{data:await F(this.fetch,`DELETE`,`${this.url}/admin/users/${e.userId}/factors/${e.id}`,{headers:this.headers}),error:null}}catch(e){if(j(e))return{data:null,error:e};throw e}}async _listOAuthClients(e){try{let t={nextPage:null,lastPage:0,total:0},n=await F(this.fetch,`GET`,`${this.url}/admin/oauth/clients`,{headers:this.headers,noResolveJson:!0,query:{page:(e?.page)?.toString()??``,per_page:(e?.perPage)?.toString()??``},xform:si});if(n.error)throw n.error;let r=await n.json(),i=n.headers.get(`x-total-count`)??0,a=n.headers.get(`link`)?.split(`,`)??[];return a.length>0&&(a.forEach(e=>{let n=parseInt(e.split(`;`)[0].split(`=`)[1].substring(0,1)),r=JSON.parse(e.split(`;`)[1].split(`=`)[1]);t[`${r}Page`]=n}),t.total=parseInt(i)),{data:Object.assign(Object.assign({},r),t),error:null}}catch(e){if(j(e))return{data:{clients:[]},error:e};throw e}}async _createOAuthClient(e){try{return await F(this.fetch,`POST`,`${this.url}/admin/oauth/clients`,{body:e,headers:this.headers,xform:e=>({data:e,error:null})})}catch(e){if(j(e))return{data:null,error:e};throw e}}async _getOAuthClient(e){try{return await F(this.fetch,`GET`,`${this.url}/admin/oauth/clients/${e}`,{headers:this.headers,xform:e=>({data:e,error:null})})}catch(e){if(j(e))return{data:null,error:e};throw e}}async _updateOAuthClient(e,t){try{return await F(this.fetch,`PUT`,`${this.url}/admin/oauth/clients/${e}`,{body:t,headers:this.headers,xform:e=>({data:e,error:null})})}catch(e){if(j(e))return{data:null,error:e};throw e}}async _deleteOAuthClient(e){try{return await F(this.fetch,`DELETE`,`${this.url}/admin/oauth/clients/${e}`,{headers:this.headers,noResolveJson:!0}),{data:null,error:null}}catch(e){if(j(e))return{data:null,error:e};throw e}}async _regenerateOAuthClientSecret(e){try{return await F(this.fetch,`POST`,`${this.url}/admin/oauth/clients/${e}/regenerate_secret`,{headers:this.headers,xform:e=>({data:e,error:null})})}catch(e){if(j(e))return{data:null,error:e};throw e}}async _listCustomProviders(e){try{let t={};return e?.type&&(t.type=e.type),await F(this.fetch,`GET`,`${this.url}/admin/custom-providers`,{headers:this.headers,query:t,xform:e=>({data:{providers:e?.providers??[]},error:null})})}catch(e){if(j(e))return{data:{providers:[]},error:e};throw e}}async _createCustomProvider(e){try{return await F(this.fetch,`POST`,`${this.url}/admin/custom-providers`,{body:e,headers:this.headers,xform:e=>({data:e,error:null})})}catch(e){if(j(e))return{data:null,error:e};throw e}}async _getCustomProvider(e){try{return await F(this.fetch,`GET`,`${this.url}/admin/custom-providers/${e}`,{headers:this.headers,xform:e=>({data:e,error:null})})}catch(e){if(j(e))return{data:null,error:e};throw e}}async _updateCustomProvider(e,t){try{return await F(this.fetch,`PUT`,`${this.url}/admin/custom-providers/${e}`,{body:t,headers:this.headers,xform:e=>({data:e,error:null})})}catch(e){if(j(e))return{data:null,error:e};throw e}}async _deleteCustomProvider(e){try{return await F(this.fetch,`DELETE`,`${this.url}/admin/custom-providers/${e}`,{headers:this.headers,noResolveJson:!0}),{data:null,error:null}}catch(e){if(j(e))return{data:null,error:e};throw e}}async _adminListPasskeys(e){Kr(e.userId);try{return await F(this.fetch,`GET`,`${this.url}/admin/users/${e.userId}/passkeys`,{headers:this.headers,xform:e=>({data:e,error:null})})}catch(e){if(j(e))return{data:null,error:e};throw e}}async _adminDeletePasskey(e){Kr(e.userId),Kr(e.passkeyId);try{return await F(this.fetch,`DELETE`,`${this.url}/admin/users/${e.userId}/passkeys/${e.passkeyId}`,{headers:this.headers,noResolveJson:!0}),{data:null,error:null}}catch(e){if(j(e))return{data:null,error:e};throw e}}};function di(e={}){return{getItem:t=>e[t]||null,setItem:(t,n)=>{e[t]=n},removeItem:t=>{delete e[t]}}}globalThis&&hr()&&globalThis.localStorage&&globalThis.localStorage.getItem(`supabase.gotrue-js.locks.debug`);var fi=class extends Error{constructor(e){super(e),this.isAcquireTimeout=!0}};function pi(){if(typeof globalThis!=`object`)try{Object.defineProperty(Object.prototype,"__magic__",{get:function(){return this},configurable:!0}),__magic__.globalThis=__magic__,delete Object.prototype.__magic__}catch{typeof self<`u`&&(self.globalThis=self)}}function mi(e){if(!/^0x[a-fA-F0-9]{40}$/.test(e))throw Error(`@supabase/auth-js: Address "${e}" is invalid.`);return e.toLowerCase()}function hi(e){return parseInt(e,16)}function gi(e){let t=new TextEncoder().encode(e);return`0x`+Array.from(t,e=>e.toString(16).padStart(2,`0`)).join(``)}function _i(e){let{chainId:t,domain:n,expirationTime:r,issuedAt:i=new Date,nonce:a,notBefore:o,requestId:s,resources:c,scheme:l,uri:u,version:d}=e;if(!Number.isInteger(t))throw Error(`@supabase/auth-js: Invalid SIWE message field "chainId". Chain ID must be a EIP-155 chain ID. Provided value: ${t}`);if(!n)throw Error(`@supabase/auth-js: Invalid SIWE message field "domain". Domain must be provided.`);if(a&&a.length<8)throw Error(`@supabase/auth-js: Invalid SIWE message field "nonce". Nonce must be at least 8 characters. Provided value: ${a}`);if(!u)throw Error(`@supabase/auth-js: Invalid SIWE message field "uri". URI must be provided.`);if(d!==`1`)throw Error(`@supabase/auth-js: Invalid SIWE message field "version". Version must be '1'. Provided value: ${d}`);if(e.statement?.includes(`
`))throw Error(`@supabase/auth-js: Invalid SIWE message field "statement". Statement must not include '\\n'. Provided value: ${e.statement}`);let f=mi(e.address),p=`${l?`${l}://${n}`:n} wants you to sign in with your Ethereum account:\n${f}\n\n${e.statement?`${e.statement}\n`:``}`,m=`URI: ${u}\nVersion: ${d}\nChain ID: ${t}${a?`\nNonce: ${a}`:``}\nIssued At: ${i.toISOString()}`;if(r&&(m+=`\nExpiration Time: ${r.toISOString()}`),o&&(m+=`\nNot Before: ${o.toISOString()}`),s&&(m+=`\nRequest ID: ${s}`),c){let e=`
Resources:`;for(let t of c){if(!t||typeof t!=`string`)throw Error(`@supabase/auth-js: Invalid SIWE message field "resources". Every resource must be a valid string. Provided value: ${t}`);e+=`\n- ${t}`}m+=e}return`${p}\n${m}`}var I=class extends Error{constructor({message:e,code:t,cause:n,name:r}){super(e,{cause:n}),this.__isWebAuthnError=!0,this.name=r??(n instanceof Error?n.name:void 0)??`Unknown Error`,this.code=t}toJSON(){return{name:this.name,message:this.message,code:this.code}}},vi=class extends I{constructor(e,t){super({code:`ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`,cause:t,message:e}),this.name=`WebAuthnUnknownError`,this.originalError=t}};function yi({error:e,options:t}){let{publicKey:n}=t;if(!n)throw Error(`options was missing required publicKey property`);if(e.name===`AbortError`){if(t.signal instanceof AbortSignal)return new I({message:`Registration ceremony was sent an abort signal`,code:`ERROR_CEREMONY_ABORTED`,cause:e})}else if(e.name===`ConstraintError`){if(n.authenticatorSelection?.requireResidentKey===!0)return new I({message:`Discoverable credentials were required but no available authenticator supported it`,code:`ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT`,cause:e});if(t.mediation===`conditional`&&n.authenticatorSelection?.userVerification===`required`)return new I({message:`User verification was required during automatic registration but it could not be performed`,code:`ERROR_AUTO_REGISTER_USER_VERIFICATION_FAILURE`,cause:e});if(n.authenticatorSelection?.userVerification===`required`)return new I({message:`User verification was required but no available authenticator supported it`,code:`ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT`,cause:e})}else if(e.name===`InvalidStateError`)return new I({message:`The authenticator was previously registered`,code:`ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED`,cause:e});else if(e.name===`NotAllowedError`)return new I({message:e.message,code:`ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`,cause:e});else if(e.name===`NotSupportedError`)return n.pubKeyCredParams.filter(e=>e.type===`public-key`).length===0?new I({message:`No entry in pubKeyCredParams was of type "public-key"`,code:`ERROR_MALFORMED_PUBKEYCREDPARAMS`,cause:e}):new I({message:`No available authenticator supported any of the specified pubKeyCredParams algorithms`,code:`ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG`,cause:e});else if(e.name===`SecurityError`){let t=window.location.hostname;if(!Ei(t))return new I({message:`${window.location.hostname} is an invalid domain`,code:`ERROR_INVALID_DOMAIN`,cause:e});if(n.rp.id!==t)return new I({message:`The RP ID "${n.rp.id}" is invalid for this domain`,code:`ERROR_INVALID_RP_ID`,cause:e})}else if(e.name===`TypeError`){if(n.user.id.byteLength<1||n.user.id.byteLength>64)return new I({message:`User ID was not between 1 and 64 characters`,code:`ERROR_INVALID_USER_ID_LENGTH`,cause:e})}else if(e.name===`UnknownError`)return new I({message:`The authenticator was unable to process the specified options, or could not create a new credential`,code:`ERROR_AUTHENTICATOR_GENERAL_ERROR`,cause:e});return new I({message:`a Non-Webauthn related error has occurred`,code:`ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`,cause:e})}function bi({error:e,options:t}){let{publicKey:n}=t;if(!n)throw Error(`options was missing required publicKey property`);if(e.name===`AbortError`){if(t.signal instanceof AbortSignal)return new I({message:`Authentication ceremony was sent an abort signal`,code:`ERROR_CEREMONY_ABORTED`,cause:e})}else if(e.name===`NotAllowedError`)return new I({message:e.message,code:`ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`,cause:e});else if(e.name===`SecurityError`){let t=window.location.hostname;if(!Ei(t))return new I({message:`${window.location.hostname} is an invalid domain`,code:`ERROR_INVALID_DOMAIN`,cause:e});if(n.rpId!==t)return new I({message:`The RP ID "${n.rpId}" is invalid for this domain`,code:`ERROR_INVALID_RP_ID`,cause:e})}else if(e.name===`UnknownError`)return new I({message:`The authenticator was unable to process the specified options, or could not create a new assertion signature`,code:`ERROR_AUTHENTICATOR_GENERAL_ERROR`,cause:e});return new I({message:`a Non-Webauthn related error has occurred`,code:`ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`,cause:e})}var xi=new class{createNewAbortSignal(){if(this.controller){let e=Error(`Cancelling existing WebAuthn API call for new one`);e.name=`AbortError`,this.controller.abort(e)}let e=new AbortController;return this.controller=e,e.signal}cancelCeremony(){if(this.controller){let e=Error(`Manually cancelling existing WebAuthn API call`);e.name=`AbortError`,this.controller.abort(e),this.controller=void 0}}};function Si(e){if(!e)throw Error(`Credential creation options are required`);if(typeof PublicKeyCredential<`u`&&`parseCreationOptionsFromJSON`in PublicKeyCredential&&typeof PublicKeyCredential.parseCreationOptionsFromJSON==`function`)return PublicKeyCredential.parseCreationOptionsFromJSON(e);let{challenge:t,user:r,excludeCredentials:i}=e,a=n(e,[`challenge`,`user`,`excludeCredentials`]),o=lr(t).buffer,s=Object.assign(Object.assign({},r),{id:lr(r.id).buffer}),c=Object.assign(Object.assign({},a),{challenge:o,user:s});if(i&&i.length>0){c.excludeCredentials=Array(i.length);for(let e=0;e<i.length;e++){let t=i[e];c.excludeCredentials[e]=Object.assign(Object.assign({},t),{id:lr(t.id).buffer,type:t.type||`public-key`,transports:t.transports})}}return c}function Ci(e){if(!e)throw Error(`Credential request options are required`);if(typeof PublicKeyCredential<`u`&&`parseRequestOptionsFromJSON`in PublicKeyCredential&&typeof PublicKeyCredential.parseRequestOptionsFromJSON==`function`)return PublicKeyCredential.parseRequestOptionsFromJSON(e);let{challenge:t,allowCredentials:r}=e,i=n(e,[`challenge`,`allowCredentials`]),a=lr(t).buffer,o=Object.assign(Object.assign({},i),{challenge:a});if(r&&r.length>0){o.allowCredentials=Array(r.length);for(let e=0;e<r.length;e++){let t=r[e];o.allowCredentials[e]=Object.assign(Object.assign({},t),{id:lr(t.id).buffer,type:t.type||`public-key`,transports:t.transports})}}return o}function wi(e){if(`toJSON`in e&&typeof e.toJSON==`function`)return e.toJSON();let t=e;return{id:e.id,rawId:e.id,response:{attestationObject:dr(new Uint8Array(e.response.attestationObject)),clientDataJSON:dr(new Uint8Array(e.response.clientDataJSON))},type:`public-key`,clientExtensionResults:e.getClientExtensionResults(),authenticatorAttachment:t.authenticatorAttachment??void 0}}function Ti(e){if(`toJSON`in e&&typeof e.toJSON==`function`)return e.toJSON();let t=e,n=e.getClientExtensionResults(),r=e.response;return{id:e.id,rawId:e.id,response:{authenticatorData:dr(new Uint8Array(r.authenticatorData)),clientDataJSON:dr(new Uint8Array(r.clientDataJSON)),signature:dr(new Uint8Array(r.signature)),userHandle:r.userHandle?dr(new Uint8Array(r.userHandle)):void 0},type:`public-key`,clientExtensionResults:n,authenticatorAttachment:t.authenticatorAttachment??void 0}}function Ei(e){return e===`localhost`||/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(e)}function Di(){return!!(N()&&`PublicKeyCredential`in window&&window.PublicKeyCredential&&`credentials`in navigator&&typeof(navigator==null?void 0:navigator.credentials)?.create==`function`&&typeof(navigator==null?void 0:navigator.credentials)?.get==`function`)}async function Oi(e){try{let t=await navigator.credentials.create(e);return t?t instanceof PublicKeyCredential?{data:t,error:null}:{data:null,error:new vi(`Browser returned unexpected credential type`,t)}:{data:null,error:new vi(`Empty credential response`,t)}}catch(t){return{data:null,error:yi({error:t,options:e})}}}async function ki(e){try{let t=await navigator.credentials.get(e);return t?t instanceof PublicKeyCredential?{data:t,error:null}:{data:null,error:new vi(`Browser returned unexpected credential type`,t)}:{data:null,error:new vi(`Empty credential response`,t)}}catch(t){return{data:null,error:bi({error:t,options:e})}}}var Ai={hints:[`security-key`],authenticatorSelection:{authenticatorAttachment:`cross-platform`,requireResidentKey:!1,userVerification:`preferred`,residentKey:`discouraged`},attestation:`direct`},ji={userVerification:`preferred`,hints:[`security-key`],attestation:`direct`};function Mi(...e){let t=e=>typeof e==`object`&&!!e&&!Array.isArray(e),n=e=>e instanceof ArrayBuffer||ArrayBuffer.isView(e),r={};for(let i of e)if(i)for(let e in i){let a=i[e];if(a!==void 0){if(Array.isArray(a))r[e]=a;else if(n(a))r[e]=a;else if(t(a)){let n=r[e];r[e]=t(n)?Mi(n,a):Mi(a)}else r[e]=a}}return r}function Ni(e,t){return Mi(Ai,e,t||{})}function Pi(e,t){return Mi(ji,e,t||{})}var Fi=class{constructor(e){this.client=e,this.enroll=this._enroll.bind(this),this.challenge=this._challenge.bind(this),this.verify=this._verify.bind(this),this.authenticate=this._authenticate.bind(this),this.register=this._register.bind(this)}async _enroll(e){return this.client.mfa.enroll(Object.assign(Object.assign({},e),{factorType:`webauthn`}))}async _challenge({factorId:e,webauthn:t,friendlyName:n,signal:r},i){try{let{data:a,error:o}=await this.client.mfa.challenge({factorId:e,webauthn:t});if(!a)return{data:null,error:o};let s=r??xi.createNewAbortSignal();if(a.webauthn.type===`create`){let{user:e}=a.webauthn.credential_options.publicKey;if(!e.name){let t=n;if(t)e.name=`${e.id}:${t}`;else{let t=(await this.client.getUser()).data.user,n=t?.user_metadata?.name||t?.email||t?.id||`User`;e.name=`${e.id}:${n}`}}e.displayName||=e.name}switch(a.webauthn.type){case`create`:{let{data:t,error:n}=await Oi({publicKey:Ni(a.webauthn.credential_options.publicKey,i?.create),signal:s});return t?{data:{factorId:e,challengeId:a.id,webauthn:{type:a.webauthn.type,credential_response:t}},error:null}:{data:null,error:n}}case`request`:{let t=Pi(a.webauthn.credential_options.publicKey,i?.request),{data:n,error:r}=await ki(Object.assign(Object.assign({},a.webauthn.credential_options),{publicKey:t,signal:s}));return n?{data:{factorId:e,challengeId:a.id,webauthn:{type:a.webauthn.type,credential_response:n}},error:null}:{data:null,error:r}}}}catch(e){return j(e)?{data:null,error:e}:{data:null,error:new zn(`Unexpected error in challenge`,e)}}}async _verify({challengeId:e,factorId:t,webauthn:n}){return this.client.mfa.verify({factorId:t,challengeId:e,webauthn:n})}async _authenticate({factorId:e,webauthn:{rpId:t=typeof window<`u`?window.location.hostname:void 0,rpOrigins:n=typeof window<`u`?[window.location.origin]:void 0,signal:r}={}},i){if(!t)return{data:null,error:new In(`rpId is required for WebAuthn authentication`)};try{if(!Di())return{data:null,error:new zn(`Browser does not support WebAuthn`,null)};let{data:a,error:o}=await this.challenge({factorId:e,webauthn:{rpId:t,rpOrigins:n},signal:r},{request:i});if(!a)return{data:null,error:o};let{webauthn:s}=a;return this._verify({factorId:e,challengeId:a.challengeId,webauthn:{type:s.type,rpId:t,rpOrigins:n,credential_response:s.credential_response}})}catch(e){return j(e)?{data:null,error:e}:{data:null,error:new zn(`Unexpected error in authenticate`,e)}}}async _register({friendlyName:e,webauthn:{rpId:t=typeof window<`u`?window.location.hostname:void 0,rpOrigins:n=typeof window<`u`?[window.location.origin]:void 0,signal:r}={}},i){if(!t)return{data:null,error:new In(`rpId is required for WebAuthn registration`)};try{if(!Di())return{data:null,error:new zn(`Browser does not support WebAuthn`,null)};let{data:a,error:o}=await this._enroll({friendlyName:e});if(!a)return await this.client.mfa.listFactors().then(t=>t.data?.all.find(t=>t.factor_type===`webauthn`&&t.friendly_name===e&&t.status===`unverified`)).then(e=>e?this.client.mfa.unenroll({factorId:e?.id}):void 0),{data:null,error:o};let{data:s,error:c}=await this._challenge({factorId:a.id,friendlyName:a.friendly_name,webauthn:{rpId:t,rpOrigins:n},signal:r},{create:i});return s?this._verify({factorId:a.id,challengeId:s.challengeId,webauthn:{rpId:t,rpOrigins:n,type:s.webauthn.type,credential_response:s.webauthn.credential_response}}):{data:null,error:c}}catch(e){return j(e)?{data:null,error:e}:{data:null,error:new zn(`Unexpected error in register`,e)}}}};pi();var Ii={url:kn,storageKey:An,autoRefreshToken:!0,persistSession:!0,detectSessionInUrl:!0,headers:jn,flowType:`implicit`,debug:!1,hasCustomAuthorizationHeader:!1,throwOnError:!1,lockAcquireTimeout:5e3,skipAutoInitialize:!1,experimental:{}},Li={},Ri=!1,zi=class e{get jwks(){return Li[this.storageKey]?.jwks??{keys:[]}}set jwks(e){Li[this.storageKey]=Object.assign(Object.assign({},Li[this.storageKey]),{jwks:e})}get jwks_cached_at(){return Li[this.storageKey]?.cachedAt??-(2**53-1)}set jwks_cached_at(e){Li[this.storageKey]=Object.assign(Object.assign({},Li[this.storageKey]),{cachedAt:e})}constructor(t){var n;this.userStorage=null,this.memoryStorage=null,this.stateChangeEmitters=new Map,this.autoRefreshTicker=null,this.autoRefreshTickTimeout=null,this.visibilityChangedCallback=null,this.refreshingDeferred=null,this.lastRefreshFailure=null,this._sessionRemovalEpoch=0,this.initializePromise=null,this._pendingInitNotifications=null,this.detectSessionInUrl=!0,this.hasCustomAuthorizationHeader=!1,this.suppressGetSessionWarning=!1,this.lock=null,this.lockAcquired=!1,this.pendingInLock=[],this.broadcastChannel=null,this.logger=console.log;let r=Object.assign(Object.assign({},Ii),t);if(this.storageKey=r.storageKey,this.instanceID=e.nextInstanceID[this.storageKey]??0,e.nextInstanceID[this.storageKey]=this.instanceID+1,this.logDebugMessages=!!r.debug,typeof r.debug==`function`&&(this.logger=r.debug),this.instanceID>0&&N()){let e=`${this._logPrefix()} Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.`;console.warn(e),this.logDebugMessages&&console.trace(e)}if(this.persistSession=r.persistSession,this.autoRefreshToken=r.autoRefreshToken,this.experimental=r.experimental??{},this.admin=new ui({url:r.url,headers:r.headers,fetch:r.fetch,experimental:this.experimental}),this.url=r.url,this.headers=r.headers,this.fetch=_r(r.fetch),this.detectSessionInUrl=r.detectSessionInUrl,this.flowType=r.flowType,this.hasCustomAuthorizationHeader=r.hasCustomAuthorizationHeader,this.throwOnError=r.throwOnError,this.lockAcquireTimeout=r.lockAcquireTimeout,r.lock!=null&&(this.lock=r.lock,Ri||(Ri=!0,console.warn(`${this._logPrefix()} The "lock" option is deprecated and will be removed in v3. The client now coordinates session refreshes without a lock, so most apps can drop the option. See https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/migrations/lockless-coordination.md`))),this.jwks||(this.jwks={keys:[]},this.jwks_cached_at=-(2**53-1)),this.mfa={verify:this._verify.bind(this),enroll:this._enroll.bind(this),unenroll:this._unenroll.bind(this),challenge:this._challenge.bind(this),listFactors:this._listFactors.bind(this),challengeAndVerify:this._challengeAndVerify.bind(this),getAuthenticatorAssuranceLevel:this._getAuthenticatorAssuranceLevel.bind(this),webauthn:new Fi(this),recoveryCodes:{getStatus:this._getRecoveryCodesStatus.bind(this),generate:this._generateRecoveryCodes.bind(this),verify:this._verifyRecoveryCode.bind(this),regenerate:this._regenerateRecoveryCodes.bind(this),unenroll:this._unenrollRecoveryCodes.bind(this)}},this.oauth={getAuthorizationDetails:this._getAuthorizationDetails.bind(this),approveAuthorization:this._approveAuthorization.bind(this),denyAuthorization:this._denyAuthorization.bind(this),listGrants:this._listOAuthGrants.bind(this),revokeGrant:this._revokeOAuthGrant.bind(this)},this.passkey={startRegistration:this._startPasskeyRegistration.bind(this),verifyRegistration:this._verifyPasskeyRegistration.bind(this),startAuthentication:this._startPasskeyAuthentication.bind(this),verifyAuthentication:this._verifyPasskeyAuthentication.bind(this),list:this._listPasskeys.bind(this),update:this._updatePasskey.bind(this),delete:this._deletePasskey.bind(this)},this.persistSession?(r.storage?this.storage=r.storage:hr()?this.storage=globalThis.localStorage:(this.memoryStorage={},this.storage=di(this.memoryStorage)),r.userStorage&&(this.userStorage=r.userStorage)):(this.memoryStorage={},this.storage=di(this.memoryStorage)),N()&&globalThis.BroadcastChannel&&this.persistSession&&this.storageKey){try{this.broadcastChannel=new globalThis.BroadcastChannel(this.storageKey)}catch(e){console.error(`Failed to create a new BroadcastChannel, multi-tab state changes will not be available`,e)}(n=this.broadcastChannel)==null||n.addEventListener(`message`,async e=>{this._debug(`received broadcast notification from other tab or client`,e),(e.data.event===`TOKEN_REFRESHED`||e.data.event===`SIGNED_IN`)&&(this.lastRefreshFailure=null);try{await this._notifyAllSubscribers(e.data.event,e.data.session,!1)}catch(e){this._debug(`#broadcastChannel`,`error`,e)}})}r.skipAutoInitialize||this.initialize().catch(e=>{this._debug(`#initialize()`,`error`,e)})}isThrowOnErrorEnabled(){return this.throwOnError}_returnResult(e){if(this.throwOnError&&e&&e.error)throw e.error;return e}_logPrefix(){return`GoTrueClient@${this.storageKey}:${this.instanceID} (${Tn}) ${new Date().toISOString()}`}_debug(...e){return this.logDebugMessages&&this.logger(this._logPrefix(),...e),this}async initialize(){if(this.initializePromise)return await this.initializePromise;this._pendingInitNotifications=[],this.initializePromise=(async()=>this.lock==null?await this._initialize():await this._acquireLock(this.lockAcquireTimeout,async()=>await this._initialize()))();let e=await this.initializePromise,t=this._pendingInitNotifications??[];this._pendingInitNotifications=null;for(let e of t)await this._notifyAllSubscribers(e.event,e.session,e.broadcast);return e}async _initialize(){try{let e={},t=`none`;if(N()&&(e=gr(window.location.href),this._isImplicitGrantCallback(e)?t=`implicit`:await this._isPKCECallback(e)&&(t=`pkce`)),N()&&this.detectSessionInUrl&&t!==`none`){let{data:n,error:r}=await this._getSessionFromURL(e,t);if(r){if(this._debug(`#_initialize()`,`error detecting session from URL`,r),Gn(r)){let e=r.details?.code;if(e===`identity_already_exists`||e===`identity_not_found`||e===`single_identity_not_deletable`)return{error:r}}return{error:r}}let{session:i,redirectType:a}=n;return this._debug(`#_initialize()`,`detected session in URL`,i,`redirect type`,a),await this._saveSession(i),setTimeout(async()=>{a===`recovery`?await this._notifyAllSubscribers(`PASSWORD_RECOVERY`,i):await this._notifyAllSubscribers(`SIGNED_IN`,i)},0),{error:null}}return await this._recoverAndRefresh(),{error:null}}catch(e){return j(e)?this._returnResult({error:e}):this._returnResult({error:new zn(`Unexpected error during initialization`,e)})}finally{await this._handleVisibilityChange(),this._debug(`#_initialize()`,`end`)}}async signInAnonymously(e){try{let{data:t,error:n}=await F(this.fetch,`POST`,`${this.url}/signup`,{headers:this.headers,body:{data:e?.options?.data??{},gotrue_meta_security:{captcha_token:e?.options?.captchaToken}},xform:ni});if(n||!t)return this._returnResult({data:{user:null,session:null},error:n});let r=t.session,i=t.user;return t.session&&(await this._saveSession(t.session),await this._notifyAllSubscribers(`SIGNED_IN`,r)),this._returnResult({data:{user:i,session:r},error:null})}catch(e){if(j(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async signUp(e){let t=null;try{let n;if(`email`in e){let{email:r,password:i,options:a}=e,o=null,s=null;this.flowType===`pkce`&&([o,s,t]=await this._getCodeChallengeAndMethod()),n=await F(this.fetch,`POST`,`${this.url}/signup`,{headers:this.headers,redirectTo:this._maybeAppendFlowIdToRedirect(a?.emailRedirectTo,t),body:{email:r,password:i,data:a?.data??{},gotrue_meta_security:{captcha_token:a?.captchaToken},code_challenge:o,code_challenge_method:s},xform:ni})}else if(`phone`in e){let{phone:t,password:r,options:i}=e;n=await F(this.fetch,`POST`,`${this.url}/signup`,{headers:this.headers,body:{phone:t,password:r,data:i?.data??{},channel:i?.channel??`sms`,gotrue_meta_security:{captcha_token:i?.captchaToken}},xform:ni})}else throw new Un(`You must provide either an email or phone number and a password`);let{data:r,error:i}=n;if(i||!r)return await Lr(this.storage,this.storageKey,t),this._returnResult({data:{user:null,session:null},error:i});let a=r.session,o=r.user;return r.session&&(await this._saveSession(r.session),await this._notifyAllSubscribers(`SIGNED_IN`,a)),this._returnResult({data:{user:o,session:a},error:null})}catch(e){if(await Lr(this.storage,this.storageKey,t),j(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async signInWithPassword(e){try{let t;if(`email`in e){let{email:n,password:r,options:i}=e;t=await F(this.fetch,`POST`,`${this.url}/token?grant_type=password`,{headers:this.headers,body:{email:n,password:r,gotrue_meta_security:{captcha_token:i?.captchaToken}},xform:ri})}else if(`phone`in e){let{phone:n,password:r,options:i}=e;t=await F(this.fetch,`POST`,`${this.url}/token?grant_type=password`,{headers:this.headers,body:{phone:n,password:r,gotrue_meta_security:{captcha_token:i?.captchaToken}},xform:ri})}else throw new Un(`You must provide either an email or phone number and a password`);let{data:n,error:r}=t;if(r)return this._returnResult({data:{user:null,session:null},error:r});if(!n||!n.session||!n.user){let e=new Hn;return this._returnResult({data:{user:null,session:null},error:e})}return n.session&&(await this._saveSession(n.session),await this._notifyAllSubscribers(`SIGNED_IN`,n.session)),this._returnResult({data:Object.assign({user:n.user,session:n.session},n.weak_password?{weakPassword:n.weak_password}:null),error:r})}catch(e){if(j(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async signInWithOAuth(e){return await this._handleProviderSignIn(e.provider,{redirectTo:e.options?.redirectTo,scopes:e.options?.scopes,queryParams:e.options?.queryParams,skipBrowserRedirect:e.options?.skipBrowserRedirect})}async exchangeCodeForSession(e,t){return await this.initializePromise,this.lock==null?this._exchangeCodeForSession(e,t):this._acquireLock(this.lockAcquireTimeout,async()=>this._exchangeCodeForSession(e,t))}async signInWithWeb3(e){let{chain:t}=e;switch(t){case`ethereum`:return await this.signInWithEthereum(e);case`solana`:return await this.signInWithSolana(e);default:throw Error(`@supabase/auth-js: Unsupported chain "${t}"`)}}async signInWithEthereum(e){let t,n;if(`message`in e)t=e.message,n=e.signature;else{let{chain:r,wallet:i,statement:a,options:o}=e,s;if(!N()){if(typeof i!=`object`||!o?.url)throw Error(`@supabase/auth-js: Both wallet and url must be specified in non-browser environments.`);s=i}else if(typeof i==`object`)s=i;else{let e=window;if(`ethereum`in e&&typeof e.ethereum==`object`&&`request`in e.ethereum&&typeof e.ethereum.request==`function`)s=e.ethereum;else throw Error(`@supabase/auth-js: No compatible Ethereum wallet interface on the window object (window.ethereum) detected. Make sure the user already has a wallet installed and connected for this app. Prefer passing the wallet interface object directly to signInWithWeb3({ chain: 'ethereum', wallet: resolvedUserWallet }) instead.`)}let c=new URL(o?.url??window.location.href),l=await s.request({method:`eth_requestAccounts`}).then(e=>e).catch(()=>{throw Error(`@supabase/auth-js: Wallet method eth_requestAccounts is missing or invalid`)});if(!l||l.length===0)throw Error(`@supabase/auth-js: No accounts available. Please ensure the wallet is connected.`);let u=mi(l[0]),d=o?.signInWithEthereum?.chainId;d||=hi(await s.request({method:`eth_chainId`})),t=_i({domain:c.host,address:u,statement:a,uri:c.href,version:`1`,chainId:d,nonce:o?.signInWithEthereum?.nonce,issuedAt:o?.signInWithEthereum?.issuedAt??new Date,expirationTime:o?.signInWithEthereum?.expirationTime,notBefore:o?.signInWithEthereum?.notBefore,requestId:o?.signInWithEthereum?.requestId,resources:o?.signInWithEthereum?.resources}),n=await s.request({method:`personal_sign`,params:[gi(t),u]})}try{let{data:r,error:i}=await F(this.fetch,`POST`,`${this.url}/token?grant_type=web3`,{headers:this.headers,body:Object.assign({chain:`ethereum`,message:t,signature:n},e.options?.captchaToken?{gotrue_meta_security:{captcha_token:e.options?.captchaToken}}:null),xform:ni});if(i)throw i;if(!r||!r.session||!r.user){let e=new Hn;return this._returnResult({data:{user:null,session:null},error:e})}return r.session&&(await this._saveSession(r.session),await this._notifyAllSubscribers(`SIGNED_IN`,r.session)),this._returnResult({data:Object.assign({},r),error:i})}catch(e){if(j(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async signInWithSolana(e){let t,n;if(`message`in e)t=e.message,n=e.signature;else{let{chain:r,wallet:i,statement:a,options:o}=e,s;if(!N()){if(typeof i!=`object`||!o?.url)throw Error(`@supabase/auth-js: Both wallet and url must be specified in non-browser environments.`);s=i}else if(typeof i==`object`)s=i;else{let e=window;if(`solana`in e&&typeof e.solana==`object`&&(`signIn`in e.solana&&typeof e.solana.signIn==`function`||`signMessage`in e.solana&&typeof e.solana.signMessage==`function`))s=e.solana;else throw Error(`@supabase/auth-js: No compatible Solana wallet interface on the window object (window.solana) detected. Make sure the user already has a wallet installed and connected for this app. Prefer passing the wallet interface object directly to signInWithWeb3({ chain: 'solana', wallet: resolvedUserWallet }) instead.`)}let c=new URL(o?.url??window.location.href);if(`signIn`in s&&s.signIn){let e=await s.signIn(Object.assign(Object.assign(Object.assign({issuedAt:new Date().toISOString()},o?.signInWithSolana),{version:`1`,domain:c.host,uri:c.href}),a?{statement:a}:null)),r;if(Array.isArray(e)&&e[0]&&typeof e[0]==`object`)r=e[0];else if(e&&typeof e==`object`&&`signedMessage`in e&&`signature`in e)r=e;else throw Error(`@supabase/auth-js: Wallet method signIn() returned unrecognized value`);if(`signedMessage`in r&&`signature`in r&&(typeof r.signedMessage==`string`||r.signedMessage instanceof Uint8Array)&&r.signature instanceof Uint8Array)t=typeof r.signedMessage==`string`?r.signedMessage:new TextDecoder().decode(r.signedMessage),n=r.signature;else throw Error(`@supabase/auth-js: Wallet method signIn() API returned object without signedMessage and signature fields`)}else{if(!(`signMessage`in s)||typeof s.signMessage!=`function`||!(`publicKey`in s)||typeof s!=`object`||!s.publicKey||!(`toBase58`in s.publicKey)||typeof s.publicKey.toBase58!=`function`)throw Error(`@supabase/auth-js: Wallet does not have a compatible signMessage() and publicKey.toBase58() API`);t=[`${c.host} wants you to sign in with your Solana account:`,s.publicKey.toBase58(),...a?[``,a,``]:[``],`Version: 1`,`URI: ${c.href}`,`Issued At: ${o?.signInWithSolana?.issuedAt??new Date().toISOString()}`,...o?.signInWithSolana?.notBefore?[`Not Before: ${o.signInWithSolana.notBefore}`]:[],...o?.signInWithSolana?.expirationTime?[`Expiration Time: ${o.signInWithSolana.expirationTime}`]:[],...o?.signInWithSolana?.chainId?[`Chain ID: ${o.signInWithSolana.chainId}`]:[],...o?.signInWithSolana?.nonce?[`Nonce: ${o.signInWithSolana.nonce}`]:[],...o?.signInWithSolana?.requestId?[`Request ID: ${o.signInWithSolana.requestId}`]:[],...o?.signInWithSolana?.resources?.length?[`Resources`,...o.signInWithSolana.resources.map(e=>`- ${e}`)]:[]].join(`
`);let e=await s.signMessage(new TextEncoder().encode(t),`utf8`);if(!e||!(e instanceof Uint8Array))throw Error(`@supabase/auth-js: Wallet signMessage() API returned an recognized value`);n=e}}try{let{data:r,error:i}=await F(this.fetch,`POST`,`${this.url}/token?grant_type=web3`,{headers:this.headers,body:Object.assign({chain:`solana`,message:t,signature:dr(n)},e.options?.captchaToken?{gotrue_meta_security:{captcha_token:e.options?.captchaToken}}:null),xform:ni});if(i)throw i;if(!r||!r.session||!r.user){let e=new Hn;return this._returnResult({data:{user:null,session:null},error:e})}return r.session&&(await this._saveSession(r.session),await this._notifyAllSubscribers(`SIGNED_IN`,r.session)),this._returnResult({data:Object.assign({},r),error:i})}catch(e){if(j(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async _exchangeCodeForSession(e,t){let n=t?.flowId!=null,r=n?Ar(t?.flowId):N()?Ar(gr(window.location.href)[Fn]):null;n&&!r&&this._debug(`#_exchangeCodeForSession()`,`provided flowId is not a valid flow id`,t?.flowId);let{verifier:i,flowId:a}=n&&!r?{verifier:null,flowId:null}:await Ir(this.storage,this.storageKey,r),[o,s]=(i??``).split(`/`);try{if(!o&&this.flowType===`pkce`)throw new qn;let{data:t,error:n}=await F(this.fetch,`POST`,`${this.url}/token?grant_type=pkce`,{headers:this.headers,body:{auth_code:e,code_verifier:o},xform:ni});if(await Lr(this.storage,this.storageKey,a),n)throw n;if(!t||!t.session||!t.user){let e=new Hn;return this._returnResult({data:{user:null,session:null,redirectType:null},error:e})}return t.session&&(await this._saveSession(t.session),await this._notifyAllSubscribers(s===`recovery`?`PASSWORD_RECOVERY`:`SIGNED_IN`,t.session)),this._returnResult({data:Object.assign(Object.assign({},t),{redirectType:s??null}),error:n})}catch(e){if(await Lr(this.storage,this.storageKey,a),j(e))return this._returnResult({data:{user:null,session:null,redirectType:null},error:e});throw e}}async signInWithIdToken(e){try{let{options:t,provider:n,token:r,access_token:i,nonce:a}=e,{data:o,error:s}=await F(this.fetch,`POST`,`${this.url}/token?grant_type=id_token`,{headers:this.headers,body:{provider:n,id_token:r,access_token:i,nonce:a,gotrue_meta_security:{captcha_token:t?.captchaToken}},xform:ni});if(s)return this._returnResult({data:{user:null,session:null},error:s});if(!o||!o.session||!o.user){let e=new Hn;return this._returnResult({data:{user:null,session:null},error:e})}return o.session&&(await this._saveSession(o.session),await this._notifyAllSubscribers(`SIGNED_IN`,o.session)),this._returnResult({data:o,error:s})}catch(e){if(j(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async signInWithOtp(e){let t=null;try{if(`email`in e){let{email:n,options:r}=e,i=null,a=null;this.flowType===`pkce`&&([i,a,t]=await this._getCodeChallengeAndMethod());let{error:o}=await F(this.fetch,`POST`,`${this.url}/otp`,{headers:this.headers,body:{email:n,data:r?.data??{},create_user:r?.shouldCreateUser??!0,gotrue_meta_security:{captcha_token:r?.captchaToken},code_challenge:i,code_challenge_method:a},redirectTo:this._maybeAppendFlowIdToRedirect(r?.emailRedirectTo,t)});return this._returnResult({data:{user:null,session:null},error:o})}if(`phone`in e){let{phone:t,options:n}=e,{data:r,error:i}=await F(this.fetch,`POST`,`${this.url}/otp`,{headers:this.headers,body:{phone:t,data:n?.data??{},create_user:n?.shouldCreateUser??!0,gotrue_meta_security:{captcha_token:n?.captchaToken},channel:n?.channel??`sms`}});return this._returnResult({data:{user:null,session:null,messageId:r?.message_id},error:i})}throw new Un(`You must provide either an email or phone number.`)}catch(e){if(await Lr(this.storage,this.storageKey,t),j(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async verifyOtp(e){try{let t,n;`options`in e&&(t=e.options?.redirectTo,n=e.options?.captchaToken);let{data:r,error:i}=await F(this.fetch,`POST`,`${this.url}/verify`,{headers:this.headers,body:Object.assign(Object.assign({},e),{gotrue_meta_security:{captcha_token:n}}),redirectTo:t,xform:ni});if(i)throw i;if(!r)throw Error(`An error occurred on token verification.`);let a=r.session,o=r.user;return a?.access_token&&(await this._saveSession(a),await this._notifyAllSubscribers(e.type==`recovery`?`PASSWORD_RECOVERY`:`SIGNED_IN`,a)),this._returnResult({data:{user:o,session:a},error:null})}catch(e){if(j(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async signInWithSSO(e){let t=null;try{let n=null,r=null;this.flowType===`pkce`&&([n,r,t]=await this._getCodeChallengeAndMethod());let i=await F(this.fetch,`POST`,`${this.url}/sso`,{body:Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({},`providerId`in e?{provider_id:e.providerId}:null),`domain`in e?{domain:e.domain}:null),{redirect_to:this._maybeAppendFlowIdToRedirect(e.options?.redirectTo,t)}),e?.options?.captchaToken?{gotrue_meta_security:{captcha_token:e.options.captchaToken}}:null),{skip_http_redirect:!0,code_challenge:n,code_challenge_method:r}),headers:this.headers,xform:ai});return i.data?.url&&N()&&!e.options?.skipBrowserRedirect&&window.location.assign(i.data.url),this._returnResult(i)}catch(e){if(await Lr(this.storage,this.storageKey,t),j(e))return this._returnResult({data:null,error:e});throw e}}async reauthenticate(){return await this.initializePromise,this.lock==null?await this._reauthenticate():await this._acquireLock(this.lockAcquireTimeout,async()=>await this._reauthenticate())}async _reauthenticate(){try{return await this._useSession(async e=>{let{data:{session:t},error:n}=e;if(n)throw n;if(!t)throw new M;let{error:r}=await F(this.fetch,`GET`,`${this.url}/reauthenticate`,{headers:this.headers,jwt:t.access_token});return this._returnResult({data:{user:null,session:null},error:r})})}catch(e){if(j(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async resend(e){let t=null;try{let n=`${this.url}/resend`;if(`email`in e){let{email:r,type:i,options:a}=e,o=null,s=null;this.flowType===`pkce`&&([o,s,t]=await this._getCodeChallengeAndMethod());let{error:c}=await F(this.fetch,`POST`,n,{headers:this.headers,body:{email:r,type:i,gotrue_meta_security:{captcha_token:a?.captchaToken},code_challenge:o,code_challenge_method:s},redirectTo:this._maybeAppendFlowIdToRedirect(a?.emailRedirectTo,t)});return c&&await Lr(this.storage,this.storageKey,t),this._returnResult({data:{user:null,session:null},error:c})}if(`phone`in e){let{phone:t,type:r,options:i}=e,{data:a,error:o}=await F(this.fetch,`POST`,n,{headers:this.headers,body:{phone:t,type:r,gotrue_meta_security:{captcha_token:i?.captchaToken}}});return this._returnResult({data:{user:null,session:null,messageId:a?.message_id},error:o})}throw new Un(`You must provide either an email or phone number and a type`)}catch(e){if(await Lr(this.storage,this.storageKey,t),j(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async getSession(){return await this.initializePromise,this.lock==null?await this._useSession(async e=>e):await this._acquireLock(this.lockAcquireTimeout,async()=>this._useSession(async e=>e))}async _acquireLock(e,t){this._debug(`#_acquireLock`,`begin`,e);try{if(this.lockAcquired){let e=this.pendingInLock.length?this.pendingInLock[this.pendingInLock.length-1]:Promise.resolve(),n=(async()=>(await e,await t()))();return this.pendingInLock.push((async()=>{try{await n}catch{}})()),n}return await this.lock(`lock:${this.storageKey}`,e,async()=>{this._debug(`#_acquireLock`,`lock acquired for storage key`,this.storageKey);try{this.lockAcquired=!0;let e=t();for(this.pendingInLock.push((async()=>{try{await e}catch{}})()),await e;this.pendingInLock.length;){let e=[...this.pendingInLock];await Promise.all(e),this.pendingInLock.splice(0,e.length)}return await e}finally{this._debug(`#_acquireLock`,`lock released for storage key`,this.storageKey),this.lockAcquired=!1}})}finally{this._debug(`#_acquireLock`,`end`)}}async _useSession(e){this._debug(`#_useSession`,`begin`);try{return await e(await this.__loadSession())}finally{this._debug(`#_useSession`,`end`)}}async __loadSession(){this._debug(`#__loadSession()`,`begin`),this.lock!=null&&!this.lockAcquired&&this._debug(`#__loadSession()`,`used outside of an acquired lock!`,Error().stack);try{let e=null,t=await P(this.storage,this.storageKey);if(this._debug(`#getSession()`,`session from storage`,t),t!==null&&(this._isValidSession(t)?e=t:(this._debug(`#getSession()`,`session from storage is not valid`),await this._removeSession())),!e)return{data:{session:null},error:null};let n=e.expires_at?e.expires_at*1e3-Date.now()<Dn:!1;if(this._debug(`#__loadSession()`,`session has${n?``:` not`} expired`,`expires_at`,e.expires_at),!n)return{data:{session:await this._hydrateSessionUser(e)},error:null};let{data:r,error:i}=await this._callRefreshToken(e.refresh_token);if(i){let e=await P(this.storage,this.storageKey);return e&&this._isValidSession(e)&&e.expires_at&&e.expires_at*1e3>Date.now()?this._returnResult({data:{session:await this._hydrateSessionUser(e)},error:null}):this._returnResult({data:{session:null},error:i})}return this._returnResult({data:{session:r},error:null})}finally{this._debug(`#__loadSession()`,`end`)}}async _hydrateSessionUser(e){if(this.userStorage){let t=await P(this.userStorage,this.storageKey+`-user`);e.user=t?.user?t.user:Jr()}if(this.storage.isServer&&e.user&&!e.user.__isUserNotAvailableProxy){let t={value:this.suppressGetSessionWarning};e.user=Yr(e.user,t),t.value&&(this.suppressGetSessionWarning=!0)}return e}async getUser(e){if(e)return await this._getUser(e);await this.initializePromise;let t;return t=this.lock==null?await this._getUser():await this._acquireLock(this.lockAcquireTimeout,async()=>await this._getUser()),t.data.user&&(this.suppressGetSessionWarning=!0),t}async _getUser(e){try{return e?await F(this.fetch,`GET`,`${this.url}/user`,{headers:this.headers,jwt:e,xform:ii}):await this._useSession(async e=>{let{data:t,error:n}=e;if(n)throw n;return!t.session?.access_token&&!this.hasCustomAuthorizationHeader?{data:{user:null},error:new M}:await F(this.fetch,`GET`,`${this.url}/user`,{headers:this.headers,jwt:t.session?.access_token??void 0,xform:ii})})}catch(e){if(j(e))return Vn(e)&&await this._removeSession(),this._returnResult({data:{user:null},error:e});throw e}}async updateUser(e,t={}){return await this.initializePromise,this.lock==null?await this._updateUser(e,t):await this._acquireLock(this.lockAcquireTimeout,async()=>await this._updateUser(e,t))}async _updateUser(e,t={}){let n=null;try{return await this._useSession(async r=>{let{data:i,error:a}=r;if(a)throw a;if(!i.session)throw new M;let o=i.session,s=null,c=null;this.flowType===`pkce`&&e.email!=null&&([s,c,n]=await this._getCodeChallengeAndMethod());let{data:l,error:u}=await F(this.fetch,`PUT`,`${this.url}/user`,{headers:this.headers,redirectTo:this._maybeAppendFlowIdToRedirect(t?.emailRedirectTo,n),body:Object.assign(Object.assign({},e),{code_challenge:s,code_challenge_method:c}),jwt:o.access_token,xform:ii});if(u)throw u;return o.user=l.user,await this._saveSession(o),await this._notifyAllSubscribers(`USER_UPDATED`,o),this._returnResult({data:{user:o.user},error:null})})}catch(e){if(await Lr(this.storage,this.storageKey,n),j(e))return this._returnResult({data:{user:null},error:e});throw e}}async setSession(e){return await this.initializePromise,this.lock==null?await this._setSession(e):await this._acquireLock(this.lockAcquireTimeout,async()=>await this._setSession(e))}async _setSession(e){try{if(!e.access_token||!e.refresh_token)throw new M;let t=Date.now()/1e3,n=t,r=!0,i=null,{payload:a}=Sr(e.access_token);if(a.exp&&(n=a.exp,r=n<=t),r){let{data:t,error:n}=await this._callRefreshToken(e.refresh_token);if(n)return this._returnResult({data:{user:null,session:null},error:n});if(!t)return{data:{user:null,session:null},error:null};i=t}else{let{data:r,error:a}=await this._getUser(e.access_token);if(a)return this._returnResult({data:{user:null,session:null},error:a});i={access_token:e.access_token,refresh_token:e.refresh_token,user:r.user,token_type:`bearer`,expires_in:n-t,expires_at:n},await this._saveSession(i),await this._notifyAllSubscribers(`SIGNED_IN`,i)}return this._returnResult({data:{user:i.user,session:i},error:null})}catch(e){if(j(e))return this._returnResult({data:{session:null,user:null},error:e});throw e}}async refreshSession(e){return await this.initializePromise,this.lock==null?await this._refreshSession(e):await this._acquireLock(this.lockAcquireTimeout,async()=>await this._refreshSession(e))}async _refreshSession(e){try{return await this._useSession(async t=>{if(!e){let{data:n,error:r}=t;if(r)throw r;e=n.session??void 0}if(!e?.refresh_token)throw new M;let{data:n,error:r}=await this._callRefreshToken(e.refresh_token);return r?this._returnResult({data:{user:null,session:null},error:r}):n?this._returnResult({data:{user:n.user,session:n},error:null}):this._returnResult({data:{user:null,session:null},error:null})})}catch(e){if(j(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async _getSessionFromURL(e,t){try{if(!N())throw new Wn(`No browser detected.`);if(e.error||e.error_description||e.error_code)throw new Wn(e.error_description||`Error in URL with unspecified error_description`,{error:e.error||`unspecified_error`,code:e.error_code||`unspecified_code`});switch(t){case`implicit`:if(this.flowType===`pkce`)throw new Kn(`Not a valid PKCE flow url.`);break;case`pkce`:if(this.flowType===`implicit`)throw new Wn(`Not a valid implicit grant flow url.`)}if(t===`pkce`){if(this._debug(`#_initialize()`,`begin`,`is PKCE flow`,!0),!e.code)throw new Kn(`No code detected.`);let{data:t,error:n}=await this._exchangeCodeForSession(e.code,{flowId:e[Fn]});if(n)throw n;let r=new URL(window.location.href);return r.searchParams.delete(`code`),r.searchParams.delete(Fn),window.history.replaceState(window.history.state,``,r.toString()),{data:{session:t.session,redirectType:t.redirectType??null},error:null}}let{provider_token:n,provider_refresh_token:r,access_token:i,refresh_token:a,expires_in:o,expires_at:s,token_type:c}=e;if(!i||!o||!a||!c)throw new Wn(`No session defined in URL`);let l=Math.round(Date.now()/1e3),u=parseInt(o),d=l+u;s&&(d=parseInt(s));let f=d-l;f*1e3<=3e4&&console.warn(`@supabase/gotrue-js: Session as retrieved from URL expires in ${f}s, should have been closer to ${u}s`);let p=d-u;l-p>=120?console.warn(`@supabase/gotrue-js: Session as retrieved from URL was issued over 120s ago, URL could be stale`,p,d,l):l-p<0&&console.warn(`@supabase/gotrue-js: Session as retrieved from URL was issued in the future? Check the device clock for skew`,p,d,l);let{data:m,error:h}=await this._getUser(i);if(h)throw h;let g={provider_token:n,provider_refresh_token:r,access_token:i,expires_in:u,expires_at:d,refresh_token:a,token_type:c,user:m.user};return window.location.hash=``,this._debug(`#_getSessionFromURL()`,`clearing window.location.hash`),this._returnResult({data:{session:g,redirectType:e.type},error:null})}catch(e){if(j(e))return this._returnResult({data:{session:null,redirectType:null},error:e});throw e}}_isImplicitGrantCallback(e){return typeof this.detectSessionInUrl==`function`?this.detectSessionInUrl(new URL(window.location.href),e):!!(e.access_token||e.error||e.error_description||e.error_code)}async _isPKCECallback(e){if(!e.code)return!1;let t=Ar(e[Fn]);return t&&await P(this.storage,Mr(this.storageKey,t))?!0:!!await P(this.storage,`${this.storageKey}-code-verifier`)}async signOut(e={scope:`global`}){return await this.initializePromise,this.lock==null?await this._signOut(e):await this._acquireLock(this.lockAcquireTimeout,async()=>await this._signOut(e))}async _signOut({scope:e}={scope:`global`}){return await this._useSession(async t=>{let n=async()=>{await this._removeSession()},{data:r,error:i}=t;if(i&&!Vn(i))return this._returnResult({error:i});let a=r.session?.access_token;if(a){let{error:t}=await this.admin.signOut(a,e);if(t&&!(Rn(t)&&(t.status===404||t.status===401||t.status===403)||Vn(t)))return e!==`others`&&await n(),this._returnResult({error:t})}return e!==`others`&&await n(),this._returnResult({error:null})})}onAuthStateChange(e){let t=pr(),n={id:t,callback:e,unsubscribe:()=>{this._debug(`#unsubscribe()`,`state change callback with id removed`,t),this.stateChangeEmitters.delete(t)}};return this._debug(`#onAuthStateChange()`,`registered callback with id`,t),this.stateChangeEmitters.set(t,n),(async()=>{await this.initializePromise,this.lock==null?await this._emitInitialSession(t):await this._acquireLock(this.lockAcquireTimeout,async()=>{this._emitInitialSession(t)})})(),{data:{subscription:n}}}async _emitInitialSession(e){return await this._useSession(async t=>{try{let{data:{session:n},error:r}=t;if(r)throw r;await this.stateChangeEmitters.get(e)?.callback(`INITIAL_SESSION`,n),this._debug(`INITIAL_SESSION`,`callback id`,e,`session`,n)}catch(t){if(await this.stateChangeEmitters.get(e)?.callback(`INITIAL_SESSION`,null),this._debug(`INITIAL_SESSION`,`callback id`,e,`error`,t),Zn(t))return;Vn(t)||Yn(t)||Rn(t)&&(t.code===`refresh_token_not_found`||t.code===`refresh_token_already_used`||t.code===`session_expired`)?console.warn(t):console.error(t)}})}async resetPasswordForEmail(e,t={}){let n=null,r=null,i=null;this.flowType===`pkce`&&([n,r,i]=await this._getCodeChallengeAndMethod(!0));try{return await F(this.fetch,`POST`,`${this.url}/recover`,{body:{email:e,code_challenge:n,code_challenge_method:r,gotrue_meta_security:{captcha_token:t.captchaToken}},headers:this.headers,redirectTo:this._maybeAppendFlowIdToRedirect(t.redirectTo,i)})}catch(e){if(await Lr(this.storage,this.storageKey,i),j(e))return this._returnResult({data:null,error:e});throw e}}async getUserIdentities(){try{let{data:e,error:t}=await this.getUser();if(t)throw t;return this._returnResult({data:{identities:e.user.identities??[]},error:null})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async linkIdentity(e){return`token`in e?this.linkIdentityIdToken(e):this.linkIdentityOAuth(e)}async linkIdentityOAuth(e){let t=null;try{let{data:n,error:r}=await this._useSession(async n=>{let{data:r,error:i}=n;if(i)throw i;let{url:a,flowId:o}=await this._getUrlForProvider(`${this.url}/user/identities/authorize`,e.provider,{redirectTo:e.options?.redirectTo,scopes:e.options?.scopes,queryParams:e.options?.queryParams,skipBrowserRedirect:!0});return t=o,await F(this.fetch,`GET`,a,{headers:this.headers,jwt:r.session?.access_token??void 0})});if(r)throw r;return N()&&!e.options?.skipBrowserRedirect&&window.location.assign(n?.url),this._returnResult({data:{provider:e.provider,url:n?.url,flowId:t},error:null})}catch(n){if(j(n))return this._returnResult({data:{provider:e.provider,url:null,flowId:t},error:n});throw n}}async linkIdentityIdToken(e){return await this._useSession(async t=>{try{let{error:n,data:{session:r}}=t;if(n)throw n;let{options:i,provider:a,token:o,access_token:s,nonce:c}=e,{data:l,error:u}=await F(this.fetch,`POST`,`${this.url}/token?grant_type=id_token`,{headers:this.headers,jwt:r?.access_token??void 0,body:{provider:a,id_token:o,access_token:s,nonce:c,link_identity:!0,gotrue_meta_security:{captcha_token:i?.captchaToken}},xform:ni});return u?this._returnResult({data:{user:null,session:null},error:u}):!l||!l.session||!l.user?this._returnResult({data:{user:null,session:null},error:new Hn}):(l.session&&(await this._saveSession(l.session),await this._notifyAllSubscribers(`USER_UPDATED`,l.session)),this._returnResult({data:l,error:u}))}catch(e){if(await Lr(this.storage,this.storageKey,null),j(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}})}async unlinkIdentity(e){try{return await this._useSession(async t=>{let{data:n,error:r}=t;if(r)throw r;return await F(this.fetch,`DELETE`,`${this.url}/user/identities/${e.identity_id}`,{headers:this.headers,jwt:n.session?.access_token??void 0})})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async _refreshAccessToken(e){let t=`#_refreshAccessToken()`;this._debug(t,`begin`);try{let n=Date.now();return await wr(async n=>(n>0&&await Cr(200*2**(n-1)),this._debug(t,`refreshing attempt`,n),await F(this.fetch,`POST`,`${this.url}/token?grant_type=refresh_token`,{body:{refresh_token:e},headers:this.headers,xform:ni})),(e,t)=>{let r=200*2**e;return t&&Yn(t)&&Date.now()+r-n<3e4})}catch(e){if(this._debug(t,`error`,e),j(e))return this._returnResult({data:{session:null,user:null},error:e});throw e}finally{this._debug(t,`end`)}}_isValidSession(e){return typeof e==`object`&&!!e&&`access_token`in e&&`refresh_token`in e&&`expires_at`in e}async _handleProviderSignIn(e,t){let{url:n,flowId:r}=await this._getUrlForProvider(`${this.url}/authorize`,e,{redirectTo:t.redirectTo,scopes:t.scopes,queryParams:t.queryParams});return this._debug(`#_handleProviderSignIn()`,`provider`,e,`options`,t,`url`,n),N()&&!t.skipBrowserRedirect&&window.location.assign(n),{data:{provider:e,url:n,flowId:r},error:null}}async _recoverAndRefresh(){let e=`#_recoverAndRefresh()`;this._debug(e,`begin`);try{let t=await P(this.storage,this.storageKey);if(t&&this.userStorage){let e=await P(this.userStorage,this.storageKey+`-user`);!this.storage.isServer&&Object.is(this.storage,this.userStorage)&&!e&&(e={user:t.user},await yr(this.userStorage,this.storageKey+`-user`,e)),t.user=e?.user??Jr()}else if(t&&!t.user&&!t.user){let e=await P(this.storage,this.storageKey+`-user`);e&&e?.user?(t.user=e.user,await br(this.storage,this.storageKey+`-user`),await yr(this.storage,this.storageKey,t)):t.user=Jr()}if(this._debug(e,`session from storage`,t),!this._isValidSession(t)){this._debug(e,`session is not valid`),t!==null&&await this._removeSession();return}let n=(t.expires_at??1/0)*1e3-Date.now()<Dn;if(this._debug(e,`session has${n?``:` not`} expired with margin of ${Dn}s`),n){if(this.autoRefreshToken&&t.refresh_token){let{error:n}=await this._callRefreshToken(t.refresh_token);n&&(Zn(n)?this._debug(e,`refresh discarded by commit guard`,n):this._debug(e,`refresh failed`,n))}}else if(t.user&&t.user.__isUserNotAvailableProxy===!0)try{let{data:n,error:r}=await this._getUser(t.access_token);!r&&n?.user?(t.user=n.user,await this._saveSession(t),await this._notifyAllSubscribers(`SIGNED_IN`,t)):this._debug(e,`could not get user data, skipping SIGNED_IN notification`)}catch(t){console.error(`Error getting user data:`,t),this._debug(e,`error getting user data, skipping SIGNED_IN notification`,t)}else await this._notifyAllSubscribers(`SIGNED_IN`,t)}catch(t){this._debug(e,`error`,t),Yn(t)?console.warn(t):console.error(t);return}finally{this._debug(e,`end`)}}async _callRefreshToken(e){var t,n;if(!e)throw new M;if(this.refreshingDeferred)return this.refreshingDeferred.promise;if(this.lastRefreshFailure&&this.lastRefreshFailure.refreshToken===e&&Date.now()<this.lastRefreshFailure.expiresAt)return this._debug(`#_callRefreshToken()`,`returning cached failure (cooldown active)`),this.lastRefreshFailure.result;let r=`#_callRefreshToken()`;this._debug(r,`begin`);try{this.refreshingDeferred=new xr,this.refreshingDeferred.promise.then(void 0,()=>{});let t=await P(this.storage,this.storageKey),{data:n,error:i}=await this._refreshAccessToken(e);if(i)throw i;if(!n.session)throw new M;let a=await P(this.storage,this.storageKey);if(t!==null&&(a===null||a.refresh_token!==t.refresh_token)){this._debug(r,`commit guard: storage changed since refresh started, discarding rotated tokens`,{startedWith:`present`,nowHolds:a?`replaced`:`cleared`});let e={data:null,error:new Xn};return this.refreshingDeferred.resolve(e),e}let o=this._sessionRemovalEpoch;if(await this._saveSession(n.session),this._sessionRemovalEpoch!==o){this._debug(r,`commit guard (post-save): _removeSession ran during _saveSession, undoing write`),await br(this.storage,this.storageKey),this.userStorage&&await br(this.userStorage,this.storageKey+`-user`);let e={data:null,error:new Xn};return this.refreshingDeferred.resolve(e),e}await this._notifyAllSubscribers(`TOKEN_REFRESHED`,n.session);let s={data:n.session,error:null};return this.lastRefreshFailure=null,this.refreshingDeferred.resolve(s),s}catch(i){if(this._debug(r,`error`,i),j(i)){let n={data:null,error:i};if(!Yn(i)){let e=await P(this.storage,this.storageKey);e?.expires_at&&e.expires_at*1e3>Date.now()?this._debug(r,`proactive refresh failed, access token still valid — preserving session`):await this._removeSession()}return this.lastRefreshFailure={refreshToken:e,result:n,expiresAt:Date.now()+On},(t=this.refreshingDeferred)==null||t.resolve(n),n}throw(n=this.refreshingDeferred)==null||n.reject(i),i}finally{this.refreshingDeferred=null,this._debug(r,`end`)}}async _notifyAllSubscribers(e,t,n=!0){if(this._pendingInitNotifications!==null&&n){this._pendingInitNotifications.push({event:e,session:t,broadcast:n});return}let r=`#_notifyAllSubscribers(${e})`;this._debug(r,`begin`,t,`broadcast = ${n}`);try{this.broadcastChannel&&n&&this.broadcastChannel.postMessage({event:e,session:t});let r=[],i=Array.from(this.stateChangeEmitters.values()).map(async n=>{try{await n.callback(e,t)}catch(e){r.push(e)}});if(await Promise.all(i),r.length>0){for(let e=0;e<r.length;e+=1)console.error(r[e]);throw r[0]}}finally{this._debug(r,`end`)}}async _saveSession(e){this._debug(`#_saveSession()`,e),this.suppressGetSessionWarning=!0;let t=Object.assign({},e),n=t.user&&t.user.__isUserNotAvailableProxy===!0;if(this.userStorage){!n&&t.user&&await yr(this.userStorage,this.storageKey+`-user`,{user:t.user});let e=Object.assign({},t);delete e.user;let r=Xr(e);await yr(this.storage,this.storageKey,r)}else{let e=Xr(t);await yr(this.storage,this.storageKey,e)}}async _removeSession(){this._sessionRemovalEpoch+=1,this._debug(`#_removeSession()`),this.lastRefreshFailure=null,this.suppressGetSessionWarning=!1,await br(this.storage,this.storageKey),await Rr(this.storage,this.storageKey),await br(this.storage,this.storageKey+`-user`),this.userStorage&&await br(this.userStorage,this.storageKey+`-user`),await this._notifyAllSubscribers(`SIGNED_OUT`,null)}_removeVisibilityChangedCallback(){this._debug(`#_removeVisibilityChangedCallback()`);let e=this.visibilityChangedCallback;this.visibilityChangedCallback=null;try{e&&N()&&window!=null&&window.removeEventListener&&window.removeEventListener(`visibilitychange`,e)}catch(e){console.error(`removing visibilitychange callback failed`,e)}}async _startAutoRefresh(){await this._stopAutoRefresh(),this._debug(`#_startAutoRefresh()`);let e=setInterval(()=>this._autoRefreshTokenTick(),En);this.autoRefreshTicker=e,e&&typeof e==`object`&&typeof e.unref==`function`?e.unref():typeof Deno<`u`&&typeof Deno.unrefTimer==`function`&&Deno.unrefTimer(e);let t=setTimeout(async()=>{await this.initializePromise,await this._autoRefreshTokenTick()},0);this.autoRefreshTickTimeout=t,t&&typeof t==`object`&&typeof t.unref==`function`?t.unref():typeof Deno<`u`&&typeof Deno.unrefTimer==`function`&&Deno.unrefTimer(t)}async _stopAutoRefresh(){this._debug(`#_stopAutoRefresh()`);let e=this.autoRefreshTicker;this.autoRefreshTicker=null,e&&clearInterval(e);let t=this.autoRefreshTickTimeout;this.autoRefreshTickTimeout=null,t&&clearTimeout(t)}async startAutoRefresh(){this._removeVisibilityChangedCallback(),await this._startAutoRefresh()}async stopAutoRefresh(){this._removeVisibilityChangedCallback(),await this._stopAutoRefresh()}async dispose(){var e;this._removeVisibilityChangedCallback(),await this._stopAutoRefresh(),(e=this.broadcastChannel)==null||e.close(),this.broadcastChannel=null,this.stateChangeEmitters.clear()}async _autoRefreshTokenTick(){if(this._debug(`#_autoRefreshTokenTick()`,`begin`),this.lock!=null)try{await this._acquireLock(0,async()=>{try{let e=Date.now();try{return await this._useSession(async t=>{let{data:{session:n}}=t;if(!n||!n.refresh_token||!n.expires_at){this._debug(`#_autoRefreshTokenTick()`,`no session`);return}let r=Math.floor((n.expires_at*1e3-e)/En);this._debug(`#_autoRefreshTokenTick()`,`access token expires in ${r} ticks, a tick lasts ${En}ms, refresh threshold is 3 ticks`),r<=3&&await this._callRefreshToken(n.refresh_token)})}catch(e){console.error(`Auto refresh tick failed with error. This is likely a transient error.`,e)}}finally{this._debug(`#_autoRefreshTokenTick()`,`end`)}})}catch(e){if(e instanceof fi)this._debug(`auto refresh token tick lock not available`);else throw e}else if(this.refreshingDeferred!==null)this._debug(`#_autoRefreshTokenTick()`,`refresh already in flight, skipping`);else try{let e=Date.now();try{await this._useSession(async t=>{let{data:{session:n}}=t;if(!n||!n.refresh_token||!n.expires_at){this._debug(`#_autoRefreshTokenTick()`,`no session`);return}let r=Math.floor((n.expires_at*1e3-e)/En);this._debug(`#_autoRefreshTokenTick()`,`access token expires in ${r} ticks, a tick lasts ${En}ms, refresh threshold is 3 ticks`),r<=3&&await this._callRefreshToken(n.refresh_token)})}catch(e){console.error(`Auto refresh tick failed with error. This is likely a transient error.`,e)}}finally{this._debug(`#_autoRefreshTokenTick()`,`end`)}}async _handleVisibilityChange(){if(this._debug(`#_handleVisibilityChange()`),!N()||!(window!=null&&window.addEventListener))return this.autoRefreshToken&&this.startAutoRefresh(),!1;try{this.visibilityChangedCallback=async()=>{try{await this._onVisibilityChanged(!1)}catch(e){this._debug(`#visibilityChangedCallback`,`error`,e)}},window==null||window.addEventListener(`visibilitychange`,this.visibilityChangedCallback),await this._onVisibilityChanged(!0)}catch(e){console.error(`_handleVisibilityChange`,e)}}async _onVisibilityChanged(e){let t=`#_onVisibilityChanged(${e})`;if(this._debug(t,`visibilityState`,document.visibilityState),document.visibilityState===`visible`){if(this.autoRefreshToken&&this._startAutoRefresh(),!e){if(await this.initializePromise,this.lock!=null)await this._acquireLock(this.lockAcquireTimeout,async()=>{document.visibilityState===`visible`?await this._recoverAndRefresh():this._debug(t,`acquired the lock to recover the session, but the browser visibilityState is no longer visible, aborting`)});else{if(document.visibilityState!==`visible`){this._debug(t,`visibilityState is no longer visible, skipping recovery`);return}await this._recoverAndRefresh()}}}else document.visibilityState===`hidden`&&this.autoRefreshToken&&this._stopAutoRefresh()}async _getUrlForProvider(e,t,n){let r=n?.redirectTo,i=null,a=null,o=null;this.flowType===`pkce`&&([i,a,o]=await this._getCodeChallengeAndMethod(),r=this._maybeAppendFlowIdToRedirect(r,o));let s=[`provider=${encodeURIComponent(t)}`];if(r&&s.push(`redirect_to=${encodeURIComponent(r)}`),n?.scopes&&s.push(`scopes=${encodeURIComponent(n.scopes)}`),i!=null&&a!=null){let e=new URLSearchParams({code_challenge:`${encodeURIComponent(i)}`,code_challenge_method:`${encodeURIComponent(a)}`});s.push(e.toString())}if(n?.queryParams){let e=new URLSearchParams(n.queryParams);s.push(e.toString())}return n?.skipBrowserRedirect&&s.push(`skip_http_redirect=${n.skipBrowserRedirect}`),{url:`${e}?${s.join(`&`)}`,flowId:o}}_maybeAppendFlowIdToRedirect(e,t){return!e||!t||!this.experimental.appendPkceFlowIdToRedirects?e??void 0:zr(e,t)}async _getCodeChallengeAndMethod(e=!1){return Br(this.storage,this.storageKey,e,e=>this._debug(`#_getCodeChallengeAndMethod()`,`evicted oldest pending PKCE verifier slot`,e))}async _unenroll(e){try{return await this._useSession(async t=>{let{data:n,error:r}=t;return r?this._returnResult({data:null,error:r}):await F(this.fetch,`DELETE`,`${this.url}/factors/${e.factorId}`,{headers:this.headers,jwt:n?.session?.access_token})})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async _enroll(e){try{return await this._useSession(async t=>{let{data:n,error:r}=t;if(r)return this._returnResult({data:null,error:r});let i=Object.assign({friendly_name:e.friendlyName,factor_type:e.factorType},e.factorType===`phone`?{phone:e.phone}:e.factorType===`totp`?{issuer:e.issuer}:{}),{data:a,error:o}=await F(this.fetch,`POST`,`${this.url}/factors`,{body:i,headers:this.headers,jwt:n?.session?.access_token});return o?this._returnResult({data:null,error:o}):(e.factorType===`totp`&&a.type===`totp`&&a?.totp?.qr_code&&(a.totp.qr_code=`data:image/svg+xml;utf-8,${a.totp.qr_code}`),this._returnResult({data:a,error:null}))})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async _verify(e){let t=async()=>{try{return await this._useSession(async t=>{let{data:n,error:r}=t;if(r)return this._returnResult({data:null,error:r});let i=Object.assign({challenge_id:e.challengeId},`webauthn`in e?{webauthn:Object.assign(Object.assign({},e.webauthn),{credential_response:e.webauthn.type===`create`?wi(e.webauthn.credential_response):Ti(e.webauthn.credential_response)})}:{code:e.code}),{data:a,error:o}=await F(this.fetch,`POST`,`${this.url}/factors/${e.factorId}/verify`,{body:i,headers:this.headers,jwt:n?.session?.access_token});return o?this._returnResult({data:null,error:o}):(await this._saveSession(Object.assign({expires_at:Math.round(Date.now()/1e3)+a.expires_in},a)),await this._notifyAllSubscribers(`MFA_CHALLENGE_VERIFIED`,a),this._returnResult({data:a,error:o}))})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}};return this.lock==null?t():this._acquireLock(this.lockAcquireTimeout,t)}async _challenge(e){let t=async()=>{try{return await this._useSession(async t=>{let{data:n,error:r}=t;if(r)return this._returnResult({data:null,error:r});let i=await F(this.fetch,`POST`,`${this.url}/factors/${e.factorId}/challenge`,{body:e,headers:this.headers,jwt:n?.session?.access_token});if(i.error)return i;let{data:a}=i;if(a.type!==`webauthn`)return{data:a,error:null};switch(a.webauthn.type){case`create`:return{data:Object.assign(Object.assign({},a),{webauthn:Object.assign(Object.assign({},a.webauthn),{credential_options:Object.assign(Object.assign({},a.webauthn.credential_options),{publicKey:Si(a.webauthn.credential_options.publicKey)})})}),error:null};case`request`:return{data:Object.assign(Object.assign({},a),{webauthn:Object.assign(Object.assign({},a.webauthn),{credential_options:Object.assign(Object.assign({},a.webauthn.credential_options),{publicKey:Ci(a.webauthn.credential_options.publicKey)})})}),error:null}}})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}};return this.lock==null?t():this._acquireLock(this.lockAcquireTimeout,t)}async _challengeAndVerify(e){let{data:t,error:n}=await this._challenge({factorId:e.factorId});return n?this._returnResult({data:null,error:n}):await this._verify({factorId:e.factorId,challengeId:t.id,code:e.code})}async _listFactors(){let{data:{user:e},error:t}=await this.getUser();if(t)return{data:null,error:t};let n={all:[],phone:[],totp:[],webauthn:[],recovery_code:[]};for(let t of e?.factors??[])n.all.push(t),t.status===`verified`&&t.factor_type in n&&Array.isArray(n[t.factor_type])&&n[t.factor_type].push(t);return{data:n,error:null}}async _getAuthenticatorAssuranceLevel(e){if(e)try{let{payload:t}=Sr(e),n=null;t.aal&&(n=t.aal);let r=n,{data:{user:i},error:a}=await this.getUser(e);if(a)return this._returnResult({data:null,error:a});((i?.factors)?.filter(e=>e.status===`verified`)??[]).length>0&&(r=`aal2`);let o=t.amr||[];return{data:{currentLevel:n,nextLevel:r,currentAuthenticationMethods:o},error:null}}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}let{data:{session:t},error:n}=await this.getSession();if(n)return this._returnResult({data:null,error:n});if(!t)return{data:{currentLevel:null,nextLevel:null,currentAuthenticationMethods:[]},error:null};let{payload:r}=Sr(t.access_token),i=null;r.aal&&(i=r.aal);let a=i;(t.user.factors?.filter(e=>e.status===`verified`)??[]).length>0&&(a=`aal2`);let o=r.amr||[];return{data:{currentLevel:i,nextLevel:a,currentAuthenticationMethods:o},error:null}}async _getRecoveryCodesStatus(){qr(this.experimental);try{return await this._useSession(async e=>{let{data:t,error:n}=e;if(n)return this._returnResult({data:null,error:n});let{data:r,error:i}=await F(this.fetch,`GET`,`${this.url}/factors/recovery-codes`,{headers:this.headers,jwt:t?.session?.access_token});return i?this._returnResult({data:null,error:i}):this._returnResult({data:r,error:null})})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async _generateRecoveryCodes(e){qr(this.experimental);try{return await this._useSession(async t=>{let{data:n,error:r}=t;if(r)return this._returnResult({data:null,error:r});let{data:i,error:a}=await F(this.fetch,`POST`,`${this.url}/factors/recovery-codes`,{body:e?.friendlyName?{friendly_name:e.friendlyName}:void 0,headers:this.headers,jwt:n?.session?.access_token});return a?this._returnResult({data:null,error:a}):this._returnResult({data:i,error:null})})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async _verifyRecoveryCode(e){qr(this.experimental);let t=async()=>{try{return await this._useSession(async t=>{let{data:n,error:r}=t;if(r)return this._returnResult({data:null,error:r});let{data:i,error:a}=await F(this.fetch,`POST`,`${this.url}/factors/recovery-codes/verify`,{body:{code:e.code},headers:this.headers,jwt:n?.session?.access_token});if(a)return this._returnResult({data:null,error:a});let o=Object.assign({expires_at:fr(i.expires_in)},i);return await this._saveSession(o),await this._notifyAllSubscribers(`MFA_CHALLENGE_VERIFIED`,o),this._returnResult({data:i,error:null})})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}};return this.lock==null?t():this._acquireLock(this.lockAcquireTimeout,t)}async _regenerateRecoveryCodes(){qr(this.experimental);try{return await this._useSession(async e=>{let{data:t,error:n}=e;if(n)return this._returnResult({data:null,error:n});let{data:r,error:i}=await F(this.fetch,`POST`,`${this.url}/factors/recovery-codes/regenerate`,{headers:this.headers,jwt:t?.session?.access_token});return i?this._returnResult({data:null,error:i}):this._returnResult({data:r,error:null})})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async _unenrollRecoveryCodes(){qr(this.experimental);try{return await this._useSession(async e=>{let{data:t,error:n}=e;if(n)return this._returnResult({data:null,error:n});let{data:r,error:i}=await F(this.fetch,`DELETE`,`${this.url}/factors/recovery-codes`,{headers:this.headers,jwt:t?.session?.access_token});return i?this._returnResult({data:null,error:i}):this._returnResult({data:r,error:null})})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async _getAuthorizationDetails(e){try{return await this._useSession(async t=>{let{data:{session:n},error:r}=t;return r?this._returnResult({data:null,error:r}):n?await F(this.fetch,`GET`,`${this.url}/oauth/authorizations/${e}`,{headers:this.headers,jwt:n.access_token,xform:e=>({data:e,error:null})}):this._returnResult({data:null,error:new M})})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async _approveAuthorization(e,t){try{return await this._useSession(async n=>{let{data:{session:r},error:i}=n;if(i)return this._returnResult({data:null,error:i});if(!r)return this._returnResult({data:null,error:new M});let a=await F(this.fetch,`POST`,`${this.url}/oauth/authorizations/${e}/consent`,{headers:this.headers,jwt:r.access_token,body:{action:`approve`},xform:e=>({data:e,error:null})});return a.data&&a.data.redirect_url&&N()&&!t?.skipBrowserRedirect&&window.location.assign(a.data.redirect_url),a})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async _denyAuthorization(e,t){try{return await this._useSession(async n=>{let{data:{session:r},error:i}=n;if(i)return this._returnResult({data:null,error:i});if(!r)return this._returnResult({data:null,error:new M});let a=await F(this.fetch,`POST`,`${this.url}/oauth/authorizations/${e}/consent`,{headers:this.headers,jwt:r.access_token,body:{action:`deny`},xform:e=>({data:e,error:null})});return a.data&&a.data.redirect_url&&N()&&!t?.skipBrowserRedirect&&window.location.assign(a.data.redirect_url),a})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async _listOAuthGrants(){try{return await this._useSession(async e=>{let{data:{session:t},error:n}=e;return n?this._returnResult({data:null,error:n}):t?await F(this.fetch,`GET`,`${this.url}/user/oauth/grants`,{headers:this.headers,jwt:t.access_token,xform:e=>({data:e,error:null})}):this._returnResult({data:null,error:new M})})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async _revokeOAuthGrant(e){try{return await this._useSession(async t=>{let{data:{session:n},error:r}=t;return r?this._returnResult({data:null,error:r}):n?(await F(this.fetch,`DELETE`,`${this.url}/user/oauth/grants`,{headers:this.headers,jwt:n.access_token,query:{client_id:e.clientId},noResolveJson:!0}),{data:{},error:null}):this._returnResult({data:null,error:new M})})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async fetchJwk(e,t={keys:[]}){let n=t.keys.find(t=>t.kid===e);if(n)return n;let r=Date.now();if(n=this.jwks.keys.find(t=>t.kid===e),n&&this.jwks_cached_at+6e5>r)return n;let{data:i,error:a}=await F(this.fetch,`GET`,`${this.url}/.well-known/jwks.json`,{headers:this.headers});if(a)throw a;return!i.keys||i.keys.length===0||(this.jwks=i,this.jwks_cached_at=r,n=i.keys.find(t=>t.kid===e),!n)?null:n}async getClaims(e,t={}){try{let n=e;if(!n){let{data:e,error:t}=await this.getSession();if(t||!e.session)return this._returnResult({data:null,error:t});n=e.session.access_token}let{header:r,payload:i,signature:a,raw:{header:o,payload:s}}=Sr(n);if(!t?.allowExpired)try{Ur(i.exp)}catch(e){throw new $n(e instanceof Error?e.message:`JWT validation failed`)}let c=!r.alg||r.alg.startsWith(`HS`)||!r.kid||!(`crypto`in globalThis&&`subtle`in globalThis.crypto)?null:await this.fetchJwk(r.kid,t?.keys?{keys:t.keys}:t?.jwks);if(!c){let{error:e}=await this.getUser(n);if(e)throw e;return{data:{claims:i,header:r,signature:a},error:null}}let l=Wr(r.alg),u=await crypto.subtle.importKey(`jwk`,c,l,!0,[`verify`]);if(!await crypto.subtle.verify(l,u,a,ur(`${o}.${s}`)))throw new $n(`Invalid JWT signature`);return{data:{claims:i,header:r,signature:a},error:null}}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async signInWithPasskey(e){try{if(!Di())return this._returnResult({data:null,error:new zn(`Browser does not support WebAuthn`,null)});let{data:t,error:n}=await this._startPasskeyAuthentication({options:{captchaToken:e?.options?.captchaToken}});if(n||!t)return this._returnResult({data:null,error:n});let{data:r,error:i}=await ki({publicKey:Ci(t.options),signal:e?.options?.signal??xi.createNewAbortSignal(),mediation:e?.options?.mediation});if(i||!r)return this._returnResult({data:null,error:i??new zn(`WebAuthn ceremony failed`,null)});let a=Ti(r);return this._verifyPasskeyAuthentication({challengeId:t.challenge_id,credential:a})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async registerPasskey(e){try{if(!Di())return this._returnResult({data:null,error:new zn(`Browser does not support WebAuthn`,null)});let{data:t,error:n}=await this._startPasskeyRegistration();if(n||!t)return this._returnResult({data:null,error:n});let{data:r,error:i}=await Oi({publicKey:Si(t.options),signal:e?.options?.signal??xi.createNewAbortSignal()});if(i||!r)return this._returnResult({data:null,error:i??new zn(`WebAuthn ceremony failed`,null)});let a=wi(r);return this._verifyPasskeyRegistration({challengeId:t.challenge_id,credential:a})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async _startPasskeyRegistration(){try{return await this._useSession(async e=>{let{data:{session:t},error:n}=e;if(n)return this._returnResult({data:null,error:n});if(!t)return this._returnResult({data:null,error:new M});let{data:r,error:i}=await F(this.fetch,`POST`,`${this.url}/passkeys/registration/options`,{headers:this.headers,jwt:t.access_token,body:{}});return i?this._returnResult({data:null,error:i}):this._returnResult({data:r,error:null})})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async _verifyPasskeyRegistration(e){try{return await this._useSession(async t=>{let{data:{session:n},error:r}=t;if(r)return this._returnResult({data:null,error:r});if(!n)return this._returnResult({data:null,error:new M});let{data:i,error:a}=await F(this.fetch,`POST`,`${this.url}/passkeys/registration/verify`,{headers:this.headers,jwt:n.access_token,body:{challenge_id:e.challengeId,credential:e.credential}});return a?this._returnResult({data:null,error:a}):this._returnResult({data:i,error:null})})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async _startPasskeyAuthentication(e){try{let{data:t,error:n}=await F(this.fetch,`POST`,`${this.url}/passkeys/authentication/options`,{headers:this.headers,body:{gotrue_meta_security:{captcha_token:e?.options?.captchaToken}}});return n?this._returnResult({data:null,error:n}):this._returnResult({data:t,error:null})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async _verifyPasskeyAuthentication(e){try{let{data:t,error:n}=await F(this.fetch,`POST`,`${this.url}/passkeys/authentication/verify`,{headers:this.headers,body:{challenge_id:e.challengeId,credential:e.credential},xform:ni});return n?this._returnResult({data:null,error:n}):(t.session&&(await this._saveSession(t.session),await this._notifyAllSubscribers(`SIGNED_IN`,t.session)),this._returnResult({data:t,error:null}))}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async _listPasskeys(){try{return await this._useSession(async e=>{let{data:{session:t},error:n}=e;if(n)return this._returnResult({data:null,error:n});if(!t)return this._returnResult({data:null,error:new M});let{data:r,error:i}=await F(this.fetch,`GET`,`${this.url}/passkeys`,{headers:this.headers,jwt:t.access_token,xform:e=>({data:e,error:null})});return i?this._returnResult({data:null,error:i}):this._returnResult({data:r,error:null})})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async _updatePasskey(e){try{return await this._useSession(async t=>{let{data:{session:n},error:r}=t;if(r)return this._returnResult({data:null,error:r});if(!n)return this._returnResult({data:null,error:new M});let{data:i,error:a}=await F(this.fetch,`PATCH`,`${this.url}/passkeys/${e.passkeyId}`,{headers:this.headers,jwt:n.access_token,body:{friendly_name:e.friendlyName}});return a?this._returnResult({data:null,error:a}):this._returnResult({data:i,error:null})})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}async _deletePasskey(e){try{return await this._useSession(async t=>{let{data:{session:n},error:r}=t;if(r)return this._returnResult({data:null,error:r});if(!n)return this._returnResult({data:null,error:new M});let{error:i}=await F(this.fetch,`DELETE`,`${this.url}/passkeys/${e.passkeyId}`,{headers:this.headers,jwt:n.access_token,noResolveJson:!0});return i?this._returnResult({data:null,error:i}):this._returnResult({data:null,error:null})})}catch(e){if(j(e))return this._returnResult({data:null,error:e});throw e}}};zi.nextInstanceID={};var Bi=zi,Vi=`2.118.0`,Hi=``,Ui;if(typeof Deno<`u`)Hi=`deno`,Ui=Deno.version?.deno;else if(typeof document<`u`)Hi=`web`;else if(typeof navigator<`u`&&navigator.product===`ReactNative`)Hi=`react-native`;else{var Wi;Hi=`node`;let e=globalThis.process;Ui=e==null||(Wi=e.version)==null?void 0:Wi.replace(/^v/,``)}var Gi=[`runtime=${Hi}`];Ui&&Gi.push(`runtime-version=${Ui}`);var Ki={headers:{"X-Client-Info":`supabase-js/${Vi}; ${Gi.join(`; `)}`}},qi={schema:`public`},Ji={autoRefreshToken:!0,persistSession:!0,detectSessionInUrl:!0,flowType:`implicit`},Yi={},Xi={enabled:!1,respectSamplingDecision:!0};function Zi(e){if(!e||typeof e!=`string`)return null;let t=e.split(`-`);if(t.length!==4)return null;let[n,r,i,a]=t;if(n.length!==2||r.length!==32||i.length!==16||a.length!==2)return null;let o=/^[0-9a-f]+$/i;return!o.test(n)||!o.test(r)||!o.test(i)||!o.test(a)||r===`00000000000000000000000000000000`||i===`0000000000000000`?null:{version:n,traceId:r,parentId:i,traceFlags:a,isSampled:(parseInt(a,16)&1)==1}}function Qi(e,t){if(!e||!t||t.length===0)return!1;let n;if(e instanceof URL)n=e;else try{n=new URL(e)}catch{return!1}for(let e of t)try{if(typeof e==`string`){if($i(n.hostname,e))return!0}else if(e instanceof RegExp){if(e.test(n.hostname))return!0}else if(typeof e==`function`&&e(n))return!0}catch{continue}return!1}function $i(e,t){if(t===e)return!0;if(t.startsWith(`*.`)){let n=t.slice(2);if(e.endsWith(n)&&(e===n||e.endsWith(`.`+n)))return!0}return!1}function ea(e){let t=[];try{let n=new URL(e);t.push(n.hostname)}catch{}return t.push(`*.supabase.co`,`*.supabase.in`),t.push(`localhost`,`127.0.0.1`,`[::1]`),t}function ta(e){"@babel/helpers - typeof";return ta=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},ta(e)}function na(e,t){if(ta(e)!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t||`default`);if(ta(r)!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}function ra(e){var t=na(e,`string`);return ta(t)==`symbol`?t:t+``}function ia(e,t,n){return(t=ra(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function aa(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),n.push.apply(n,r)}return n}function L(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]==null?{}:arguments[t];t%2?aa(Object(n),!0).forEach(function(t){ia(e,t,n[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):aa(Object(n)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))})}return e}var oa=e=>e?(...t)=>e(...t):(...e)=>fetch(...e),sa=()=>Headers,ca=e=>e.startsWith(`sb_publishable_`)||e.startsWith(`sb_secret_`),la=`sb_temp_`,ua=new Set,da=e=>{if(!e.startsWith(`sb_`)||ca(e)||e.startsWith(la))return;let t=e.match(/^sb_[a-zA-Z0-9]+_/)?.[0]??`unknown`;ua.has(t)||(ua.add(t),console.warn(`@supabase/supabase-js: Unrecognized Supabase API key format. The client will proceed and send this key as-is; if you see authentication errors you may need to upgrade @supabase/supabase-js to a version that recognizes this key type.`))},fa=(e,t,n,r,i,a)=>{let o=oa(r),s=sa(),c=i?.enabled===!0,l=i?.respectSamplingDecision!==!1,u=c?ea(t):null,d=!(a?.omitApiKeyAsBearer&&ca(e));return async(t,r)=>{let i=await n(),a=new s(r?.headers);if(a.has(`apikey`)||a.set(`apikey`,e),!a.has(`Authorization`)){let t=i??(d?e:null);t&&a.set(`Authorization`,`Bearer ${t}`)}if(u){let e=ha(t,u,l);e&&(e.traceparent&&!a.has(`traceparent`)&&a.set(`traceparent`,e.traceparent),e.tracestate&&!a.has(`tracestate`)&&a.set(`tracestate`,e.tracestate),e.baggage&&!a.has(`baggage`)&&a.set(`baggage`,e.baggage))}return o(t,L(L({},r),{},{headers:a}))}},pa=!1,ma=!1;function ha(e,n,r){let i=t();if(!i)return pa||(pa=!0,console.warn("@supabase/supabase-js: tracePropagation is enabled but the tracing runtime is not loaded, so trace headers will not be attached. Add `import '@supabase/supabase-js/tracing'` at your application entry point (requires the OpenTelemetry API package to be installed). The CDN/UMD build does not support trace propagation.")),null;if(!Qi(typeof e==`string`||e instanceof URL?e:e.url,n))return null;let a=i();if(!a||!a.traceparent){var o;if(a!=null&&(o=a.carrierKeys)!=null&&o.length&&!ma){ma=!0;let e=a.carrierKeys.includes(`sentry-trace`)?" Sentry detected: set `propagateTraceparent: true` in Sentry.init() to emit it.":` Configure your tracing SDK to emit W3C trace context on outgoing requests.`;console.warn(`@supabase/supabase-js: tracePropagation is enabled and a tracing SDK is active, but its propagator wrote [${a.carrierKeys.join(`, `)}] and no W3C traceparent header, so trace headers will not be attached.`+e)}return null}if(r){let e=Zi(a.traceparent);if(e&&!e.isSampled)return{traceparent:a.traceparent}}return a}function ga(e){return typeof e==`boolean`?{enabled:e}:e}function _a(e){return e.endsWith(`/`)?e:e+`/`}var va=!1;function ya(e){va||typeof e==`object`&&e&&`schema`in e&&e.schema!==void 0&&(va=!0,console.warn(`@supabase/supabase-js: The "schema" option must be nested under "db", e.g. createClient(url, key, { db: { schema: 'myschema' } }). A top-level "schema" is ignored and queries go to the default schema.`))}function ba(e,t){let{db:n,auth:r,realtime:i,global:a}=e,{db:o,auth:s,realtime:c,global:l}=t,u=ga(e.tracePropagation),d=ga(t.tracePropagation),f={db:L(L({},o),n),auth:L(L({},s),r),realtime:L(L({},c),i),storage:{},global:L(L(L({},l),a),{},{headers:L(L({},l?.headers??{}),a?.headers??{})}),tracePropagation:{enabled:u?.enabled??d?.enabled??!1,respectSamplingDecision:u?.respectSamplingDecision??d?.respectSamplingDecision??!0},accessToken:async()=>``};return e.accessToken?f.accessToken=e.accessToken:delete f.accessToken,f}function xa(e){let t=e?.trim();if(!t)throw Error(`supabaseUrl is required.`);if(!t.match(/^https?:\/\//i))throw Error(`Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.`);try{return new URL(_a(t))}catch{throw Error(`Invalid supabaseUrl: Provided URL is malformed.`)}}var Sa=class extends Bi{constructor(e){super(e)}},Ca=class{constructor(e,t,n){this.supabaseUrl=e,this.supabaseKey=t;let r=xa(e);if(!t)throw Error(`supabaseKey is required.`);da(t),ya(n),this.realtimeUrl=new URL(`realtime/v1`,r),this.realtimeUrl.protocol=this.realtimeUrl.protocol.replace(`http`,`ws`),this.authUrl=new URL(`auth/v1`,r),this.storageUrl=new URL(`storage/v1`,r),this.functionsUrl=new URL(`functions/v1`,r);let i=`sb-${r.hostname.split(`.`)[0]}-auth-token`,a={db:qi,realtime:Yi,auth:L(L({},Ji),{},{storageKey:i}),global:Ki,tracePropagation:Xi},o=ba(n??{},a);this.settings=o,this.storageKey=o.auth.storageKey??``,this.headers=o.global.headers??{},o.accessToken?(this.accessToken=o.accessToken,this.auth=new Proxy({},{get:(e,t)=>{throw Error(`@supabase/supabase-js: Supabase Client is configured with the accessToken option, accessing supabase.auth.${String(t)} is not possible`)}})):this.auth=this._initSupabaseAuthClient(o.auth??{},this.headers,o.global.fetch),this.fetch=fa(t,e,this._getSessionToken.bind(this),o.global.fetch,o.tracePropagation),this.functionsFetch=fa(t,e,this._getSessionToken.bind(this),o.global.fetch,o.tracePropagation,{omitApiKeyAsBearer:!0}),this.realtime=this._initRealtimeClient(L({headers:this.headers,accessToken:this._getAccessToken.bind(this),fetch:this.fetch},o.realtime)),this.accessToken&&Promise.resolve(this.accessToken()).then(e=>this.realtime.setAuth(e)).catch(e=>console.warn(`Failed to set initial Realtime auth token:`,e)),this.rest=new re(new URL(`rest/v1`,r).href,{headers:this.headers,schema:o.db.schema,fetch:this.fetch,timeout:o.db.timeout,urlLengthLimit:o.db.urlLengthLimit,retry:o.db.retry}),this.storage=new wn(this.storageUrl.href,this.headers,this.fetch,n?.storage),o.accessToken||this._listenForAuthEvents()}get functions(){return new u(this.functionsUrl.href,{headers:this.headers,customFetch:this.functionsFetch})}from(e){return this.rest.from(e)}schema(e){return this.rest.schema(e)}getOpenApiSpec(){return this.rest.getOpenApiSpec()}rpc(e,t={},n={head:!1,get:!1,count:void 0}){return this.rest.rpc(e,t,n)}channel(e,t={config:{}}){return this.realtime.channel(e,t)}getChannels(){return this.realtime.getChannels()}removeChannel(e){return this.realtime.removeChannel(e)}removeAllChannels(){return this.realtime.removeAllChannels()}async _getSessionToken(){var e=this;if(e.accessToken)return await e.accessToken();let{data:t}=await e.auth.getSession();return t.session?.access_token??null}async _getAccessToken(){var e=this;return await e._getSessionToken()??e.supabaseKey}_initSupabaseAuthClient({autoRefreshToken:e,persistSession:t,detectSessionInUrl:n,storage:r,userStorage:i,storageKey:a,flowType:o,lock:s,debug:c,throwOnError:l,experimental:u,lockAcquireTimeout:d,skipAutoInitialize:f},p,m){let h={Authorization:`Bearer ${this.supabaseKey}`,apikey:`${this.supabaseKey}`};return new Sa({url:this.authUrl.href,headers:L(L({},h),p),storageKey:a,autoRefreshToken:e,persistSession:t,detectSessionInUrl:n,storage:r,userStorage:i,flowType:o,lock:s,debug:c,throwOnError:l,experimental:u,fetch:m,lockAcquireTimeout:d,skipAutoInitialize:f,hasCustomAuthorizationHeader:Object.keys(this.headers).some(e=>e.toLowerCase()===`authorization`)})}_initRealtimeClient(e){return new Ct(this.realtimeUrl.href,L(L({},e),{},{params:L(L({},{apikey:this.supabaseKey}),e?.params)}))}_listenForAuthEvents(){return this.auth.onAuthStateChange((e,t)=>{this._handleTokenChanged(e,`CLIENT`,t?.access_token)})}_handleTokenChanged(e,t,n){(e===`TOKEN_REFRESHED`||e===`SIGNED_IN`||e===`INITIAL_SESSION`)&&this.changedAccessToken!==n?(this.changedAccessToken=n,this.realtime.setAuth(n)):e===`SIGNED_OUT`&&(this.realtime.setAuth(),t==`STORAGE`&&this.auth.signOut(),this.changedAccessToken=void 0)}},wa=(e,t,n)=>new Ca(e,t,n);function Ta(){if(typeof window<`u`||globalThis.Deno!==void 0)return!1;let e=globalThis.process;if(!e)return!1;let t=e.version;if(t==null)return!1;let n=t.match(/^v(\d+)\./);return n?parseInt(n[1],10)<=20:!1}Ta()&&console.warn(`⚠️  Node.js 20 and below are deprecated and will no longer be supported in future versions of @supabase/supabase-js. Please upgrade to Node.js 22 or later. For more information, visit: https://github.com/orgs/supabase/discussions/45715`);var R=wa(`https://tayveudoxrdkqnmcjrtu.supabase.co`,`sb_publishable_H1edhTEr7wt_xJEZsqa7lw_hHEllI1i`),Ea=`rwcll-demo-clock-offset-ms`;function Da(){try{let e=typeof localStorage>`u`?null:localStorage.getItem(Ea),t=e===null?0:Number(e);return Number.isFinite(t)?t:0}catch{return 0}}var Oa=Da(),ka=()=>Date.now()+Oa,z=()=>new Date(ka()),Aa=()=>Oa!==0;function B(){return Oa===0?null:z().toISOString()}function ja(e){Oa=e.getTime()-Date.now();try{localStorage.setItem(Ea,String(Oa))}catch{}}function Ma(){Oa=0;try{localStorage.removeItem(Ea)}catch{}}function V(e){return e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e])}function Na(e,t=z()){let n=/^(\d{4})-(\d{2})-(\d{2})$/.exec(e);if(!n)return null;let r=Number(n[1]),i=Number(n[2]),a=Number(n[3]),o=t.getFullYear()-r,s=t.getMonth()+1;return(s<i||s===i&&t.getDate()<a)&&--o,o}var Pa=[{id:`approvals`,label:`Approvals`,help:`Review new accounts and umpire registrations that are waiting for approval.`},{id:`roles`,label:`Roles`,help:`Give people their roles, and see what each role allows.`},{id:`setup`,label:`League Setup`,help:`Leagues, seasons, divisions and teams, and creating a season from the registration files.`},{id:`locations`,label:`Locations`,help:`The fields where games are played, with their addresses.`},{id:`umpires`,label:`Umpire Directory`,help:`Everyone who umpires: their records and contact details, invitations, and linking them to accounts.`},{id:`outbox`,label:`Outbox`,help:`Messages waiting to be sent, such as invitations, assignments and reminders.`},{id:`details`,label:`My details`,help:`Your own phone number, and whether you want text messages.`}];function Fa(e){return Pa.find(t=>t.id===e)??null}function Ia(){return`
    <main class="page">
      <section class="auth-card admin-card">
        <p class="eyebrow">RWCLL · ADMINISTRATION</p>
        <h1>Administration</h1>
        <p class="intro">Choose what you want to work on.</p>

        <ul class="admin-menu">
          ${Pa.map(e=>`
            <li class="admin-menu-item">
              <button type="button" class="primary-button admin-menu-button"
                data-admin-section="${V(e.id)}">
                ${V(e.label)}
              </button>
              <em class="admin-menu-help">${V(e.help)}</em>
            </li>
          `).join(``)}
        </ul>
      </section>
    </main>
  `}function La(e){let t=(t,n)=>`
    <li>
      <button type="button" class="admin-subnav-button"
        data-admin-section="${V(t)}"
        ${t===e?`aria-current="page"`:``}>
        ${V(n)}
      </button>
    </li>
  `;return`
    <nav class="admin-subnav" aria-label="Administration sections">
      <ul>
        ${t(``,`Overview`)}
        ${Pa.map(e=>t(e.id,e.label)).join(``)}
      </ul>
    </nav>
  `}async function Ra(e){let{data:t,error:n}=await R.rpc(`queue_email`,{p_kind:e.kind,p_to_email:e.toEmail,p_subject:e.subject,p_body:e.body,p_to_profile_id:e.toProfileId??null});return n?{ok:!1,error:n.message}:(document.dispatchEvent(new CustomEvent(`outbox:changed`)),{ok:!0,id:String(t)})}var za=e=>e??1/0;function Ba(e,t){return za(e.youngest_ll_age)-za(t.youngest_ll_age)||za(e.oldest_ll_age)-za(t.oldest_ll_age)||e.name.localeCompare(t.name,void 0,{numeric:!0})}function Va(e){return[...e].sort(Ba)}var Ha={windows:[],exceptions:[]};function Ua(e){let t=e.map(e=>({start:Date.parse(e.starts_at),end:Date.parse(e.ends_at)})).filter(e=>Number.isFinite(e.start)&&Number.isFinite(e.end)&&e.end>e.start).sort((e,t)=>e.start-t.start),n=[];for(let e of t){let t=n[n.length-1];t&&e.start<=t.end?t.end=Math.max(t.end,e.end):n.push({...e})}return n}function Wa(e,t,n=ka()){let{windows:r,exceptions:i}=Array.isArray(t)?{windows:t,exceptions:[]}:t??Ha,a=Date.parse(e.starts_at),o=Date.parse(e.ends_at);if(i.some(e=>Date.parse(e.starts_at)<o&&Date.parse(e.ends_at)>a))return`cannot`;let s=Ua(r).filter(e=>e.end>n);return s.length===0?`none`:s.some(e=>e.start<=a&&e.end>=o)?`available`:`unavailable`}var Ga=e=>String(e).padStart(2,`0`);function H(e){return`${e.getFullYear()}-${Ga(e.getMonth()+1)}-${Ga(e.getDate())}`}function Ka(e){let t=/^(\d{4})-(\d{2})-(\d{2})/.exec(e??``);if(!t)return null;let n=new Date(Number(t[1]),Number(t[2])-1,Number(t[3]));return Number.isNaN(n.getTime())?null:n}function qa(e){let t=/^(\d{1,2}):(\d{2})/.exec(e??``);return t?{h:Number(t[1]),m:Number(t[2])}:null}function Ja(e,t,n=z(),r=366){let i=Ka(t),a=Ka(e.starts_on),o=qa(e.start_time),s=qa(e.end_time);if(!i||!a||!o||!s)return[];let c=new Date(n.getFullYear(),n.getMonth(),n.getDate()),l=new Date(c.getFullYear(),c.getMonth(),c.getDate()+r),u=i<l?i:l,d=o.h===0&&o.m===0&&s.h===23&&s.m===59,f=new Set(e.weekdays),p=[];for(let e=a>c?new Date(a):c;e<=u;e=new Date(e.getFullYear(),e.getMonth(),e.getDate()+1)){if(!f.has(e.getDay()))continue;let t=e.getFullYear(),n=e.getMonth(),r=e.getDate();p.push({starts_at:new Date(t,n,r,o.h,o.m).toISOString(),ends_at:(d?new Date(t,n,r+1):new Date(t,n,r,s.h,s.m)).toISOString()})}return p}function Ya(e,t,n=z()){return e.flatMap(e=>Ja(e,t.get(e.season_id),n))}function Xa(e,t,n,r=z()){let i=new Map,a=e=>{let t=i.get(e);return t||(t={windows:[],exceptions:[]},i.set(e,t)),t};for(let t of e){let e={starts_at:t.starts_at,ends_at:t.ends_at};(t.kind===`unavailable`?a(t.umpire_id).exceptions:a(t.umpire_id).windows).push(e)}for(let e of t)a(e.umpire_id).windows.push(...Ja(e,n.get(e.season_id),r));return i}var Za=[`Sun`,`Mon`,`Tue`,`Wed`,`Thu`,`Fri`,`Sat`];function Qa(e){let t=new Set(e);if([0,1,2,3,4,5,6].every(e=>t.has(e)))return`Every day`;let n=[1,2,3,4,5,6,0],r=[],i=0;for(;i<n.length;){if(!t.has(n[i])){i++;continue}let e=i;for(;e+1<n.length&&t.has(n[e+1]);)e++;if(e-i+1>=3)r.push(`${Za[n[i]]}\u2013${Za[n[e]]}`);else for(let t=i;t<=e;t++)r.push(Za[n[t]]);i=e+1}return`Every ${r.join(`, `)}`}function $a(e){let t=qa(e);return t?`${t.h%12==0?12:t.h%12}:${Ga(t.m)} ${t.h<12?`AM`:`PM`}`:e}function eo(e,t=z()){let n=Ka(e);return n?n.toLocaleDateString(`en-US`,{month:`short`,day:`numeric`,...n.getFullYear()===t.getFullYear()?{}:{year:`numeric`}}):e}function to(e,t,n=z()){let r=/^00:00/.test(e.start_time)&&/^23:59/.test(e.end_time)?`all day`:`${$a(e.start_time)} \u2013 ${$a(e.end_time)}`,i=Ka(e.starts_on),a=new Date(n.getFullYear(),n.getMonth(),n.getDate()),o=i&&i>a?`, from ${eo(e.starts_on,n)}`:``,s=t?.ends_on?` until ${eo(t.ends_on,n)} (end of ${t.name})`:``;return`${Qa(e.weekdays)}, ${r}${o},${s}`.replace(/,$/,``)}var no=e=>String(e).padStart(2,`0`);function ro(e){let t=new Date(e);return`${t.getFullYear()}-${no(t.getMonth()+1)}-${no(t.getDate())}T${no(t.getHours())}:${no(t.getMinutes())}`}function io(e){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(e))return null;let t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function ao(e,t){return new Date(new Date(e).getTime()+t*6e4).toISOString()}function oo(e,t){return Math.round((new Date(t).getTime()-new Date(e).getTime())/6e4)}var so=new Intl.DateTimeFormat(`en-US`,{weekday:`short`,month:`short`,day:`numeric`,year:`numeric`}),co=new Intl.DateTimeFormat(`en-US`,{hour:`numeric`,minute:`2-digit`});function U(e,t=z().getFullYear()){let n=new Date(e),r=so.format(n);return n.getFullYear()===t?r.replace(/,\s*\d{4}$/,``):r}function W(e){return co.format(new Date(e)).replace(/\u202f/g,` `)}function G(e){let t=new Date(e);return`${t.getFullYear()}-${no(t.getMonth()+1)}-${no(t.getDate())}`}function lo(e){return new Date(e.getFullYear(),e.getMonth(),e.getDate())}var uo=new Intl.DateTimeFormat(`en-US`,{weekday:`long`,month:`long`,day:`numeric`,year:`numeric`});function fo(e){return uo.format(new Date(e))}var po=new Intl.DateTimeFormat(`en-US`,{weekday:`long`});function mo(e){return po.format(new Date(e))}function ho(e,t){return`${W(e)} \u2013 ${W(t)}`}var go=new Intl.DateTimeFormat(`en-US`,{year:`numeric`,month:`short`,day:`numeric`,hour:`numeric`,minute:`2-digit`,timeZoneName:`short`});function _o(e){return go.format(e).replace(/\u202f/g,` `)}var vo=(e,t,n)=>e.map(e=>[Math.max(e.start,t),Math.min(e.end,n)]).filter(([e,t])=>t>e),yo=(e,t)=>{let n=e;for(let[e,r]of t)n=n.flatMap(([t,n])=>{if(r<=t||e>=n)return[[t,n]];let i=[];return e>t&&i.push([t,e]),r<n&&i.push([r,n]),i});return n},bo=e=>e.reduce((e,[t,n])=>e+(n-t),0),xo=e=>W(new Date(e).toISOString());function So(e,t,n,r,i=z()){let a=Ua(n),o=Ua(r),s=H(i),c=new Date(e,t+1,0).getDate(),l=[];for(let n=1;n<=c;n++){let r=new Date(e,t,n).getTime(),i=new Date(e,t,n+1).getTime(),c=H(new Date(e,t,n)),u=vo(o,r,i),d=yo(vo(a,r,i),u),f=bo(d),p=bo(u),m=i-r-6e4,h=`none`,g=`Nothing entered`;f>=m?(h=`all`,g=`Available all day`):f>0?(h=`some`,g=`Available ${d.map(([e,t])=>`${xo(e)} \u2013 ${xo(t)}`).join(`, `)}`):p>0&&(h=`cannot`,g=p>=m?`Marked unavailable all day`:`Marked unavailable for part of the day`);let _=f>0&&p>0;_&&(g+=` (and marked unavailable for part of the day)`),l.push({key:c,day:n,kind:h,partialCannot:_,label:g,past:c<s})}return l}function Co(e,t,n){let r=new Date(e,t,1),i=r.toLocaleDateString(`en-US`,{month:`long`,year:`numeric`}),a=r.getDay(),o=[`Su`,`Mo`,`Tu`,`We`,`Th`,`Fr`,`Sa`],s=[`Sunday`,`Monday`,`Tuesday`,`Wednesday`,`Thursday`,`Friday`,`Saturday`];return`
    <div class="cal">
      <div class="cal-head">
        <button type="button" class="secondary-button cal-nav" data-cal-nav="-1" aria-label="Previous month">&lsaquo;</button>
        <strong class="cal-title" aria-live="polite">${V(i)}</strong>
        <button type="button" class="secondary-button cal-nav" data-cal-nav="1" aria-label="Next month">&rsaquo;</button>
      </div>
      <div class="cal-grid">
        ${o.map((e,t)=>`<span class="cal-dow" title="${s[t]}">${e}</span>`).join(``)}
        ${Array.from({length:a},()=>`<span class="cal-blank"></span>`).join(``)}
        ${n.map(n=>{let i=`${s[new Date(e,t,n.day).getDay()]}, ${r.toLocaleDateString(`en-US`,{month:`long`})} ${n.day}: ${n.label}`;return`<button type="button" class="cal-day cal-${n.kind}${n.partialCannot?` cal-partial`:``}${n.past?` cal-past`:``}" data-cal-date="${n.key}" title="${V(i)}" aria-label="${V(i)}">${n.day}</button>`}).join(``)}
      </div>
      <ul class="cal-key">
        <li><span class="cal-swatch cal-all"></span> Available all day</li>
        <li><span class="cal-swatch cal-some"></span> Available part of the day</li>
        <li><span class="cal-swatch cal-cannot"></span> Marked unavailable</li>
        <li><span class="cal-swatch cal-none"></span> Nothing entered</li>
      </ul>
    </div>
  `}function wo(e){if(!e)return``;if(e.youth){let t=[e.own?`Own ${e.own}`:``,e.parent?`Parent ${e.parent}`:``].filter(Boolean);return t.length?t.join(` · `):`no phone on file`}return e.own??`no phone on file`}function To(e,t,n,r=new Map){let i=new Map;for(let a of e){let e=a.profile_id?t.get(a.profile_id):null,o=a.classification===`youth`,s=!!(Eo(e)&&a.profile_id&&r.get(a.profile_id));i.set(a.id,{own:Eo(e)??Eo(a.phone),ownText:s,parent:o?Eo(n.get(a.id)):null,youth:o})}return i}function Eo(e){let t=(e??``).trim();return t===``?null:t}function Do(e){let t=e.trim(),n=t.replace(/\D/g,``);return t.startsWith(`+`)?`+${n}`:n}var Oo=1e3,ko=`id, season_id, division_id, game_type, home_team_id, away_team_id, home_label, away_label, location_id, starts_at, ends_at, status, notes, external_game_id, umpires_needed`;async function K(e){let t=[];for(let n=0;;n+=Oo){let{data:r,error:i}=await e(n,n+Oo-1);if(i)return{rows:[],error:i.message};let a=r??[];if(t.push(...a),a.length<Oo)break}return{rows:t,error:null}}async function Ao(){let[e,t,n,r,i,a]=await Promise.all([R.from(`seasons`).select(`id, name, is_active, starts_on, ends_on`),R.from(`divisions`).select(`id, name, is_active, league_id, umpires_per_game, tournament_umpires, youngest_ll_age, oldest_ll_age`).order(`name`),K((e,t)=>R.from(`teams`).select(`id, name, is_active, season_id, division_id`).order(`name`).range(e,t)),R.from(`locations`).select(`id, name, is_active, address, is_league_field, directions`).order(`name`),K((e,t)=>R.from(`umpires`).select(`id, display_name, classification, eligibility_status`).order(`id`).range(e,t)),R.from(`leagues`).select(`id, unconfirmed_warning_days`)]),o=e.error?.message??t.error?.message??n.error??r.error?.message??i.error??a.error?.message;return o?{context:null,error:o}:{context:{seasons:e.data??[],divisions:Va(t.data??[]).map(e=>({...e,umpires_per_game:e.umpires_per_game??2,tournament_umpires:e.tournament_umpires??null})),teams:n.rows,locations:r.data??[],umpireNames:new Map(i.rows.map(e=>[e.id,e.display_name])),umpires:i.rows.map(e=>({id:e.id,name:e.display_name,classification:e.classification===`youth`?`youth`:`adult`,eligibility:e.eligibility_status===`inactive`||e.eligibility_status===`suspended`?e.eligibility_status:`active`})),unconfirmedDays:new Map((a.data??[]).map(e=>[e.id,e.unconfirmed_warning_days??7]))},error:null}}var jo=`game_id, position, umpire_id, status, self_assigned, confirmed_at, attendance, arrived_at`;async function Mo(){let e=await K((e,t)=>R.from(`game_assignment_events`).select(`game_id, umpire_id, position, note, created_at`).eq(`event`,`declined`).order(`created_at`,{ascending:!1}).range(e,t));return e.error?[]:e.rows}async function No(e){let t=await K((t,n)=>R.from(`games`).select(ko).eq(`season_id`,e).order(`starts_at`).range(t,n));if(t.error)return{games:[],assignments:[],error:t.error};let n=await K((e,t)=>R.from(`game_assignments`).select(jo).order(`game_id`).order(`position`).range(e,t));if(n.error)return{games:[],assignments:[],error:n.error};let r=new Set(t.rows.map(e=>e.id));return{games:t.rows,assignments:n.rows.filter(e=>r.has(e.game_id)),error:null}}async function Po(e,t){let n=await K((n,r)=>R.from(`games`).select(ko).gte(`starts_at`,e).lt(`starts_at`,t).order(`starts_at`).range(n,r));if(n.error)return{games:[],assignments:[],error:n.error};let r=[],i=n.rows.map(e=>e.id);for(let e=0;e<i.length;e+=100){let t=i.slice(e,e+100),n=await K((e,n)=>R.from(`game_assignments`).select(jo).in(`game_id`,t).order(`game_id`).order(`position`).range(e,n));if(n.error)return{games:[],assignments:[],error:n.error};r.push(...n.rows)}return{games:n.rows,assignments:r,error:null}}async function Fo(e){let t=new Map,n=[...new Set(e)];for(let e=0;e<n.length;e+=100){let r=n.slice(e,e+100),i=await K((e,t)=>R.from(`game_notes`).select(`id, game_id, author_name, body, created_at, admin_only`).in(`game_id`,r).order(`created_at`).range(e,t));if(i.error)return{notes:new Map,error:i.error};for(let e of i.rows){let n=t.get(e.game_id)??[];n.push(e),t.set(e.game_id,n)}}return{notes:t,error:null}}async function Io(e){let t=new Map;if(e.length===0)return t;let{data:n,error:r}=await R.from(`location_access_notes`).select(`location_id, body`).in(`location_id`,e);if(r)return t;for(let e of n??[])t.set(e.location_id,e.body);return t}async function Lo(e){let t=B(),{data:n,error:r}=await R.rpc(`get_game_access_details`,{p_game_id:e,...t?{p_now:t}:{}});return r||typeof n!=`string`||n===``?null:n}async function Ro(e,t){let{data:n,error:r}=await R.from(`field_closures`).select(`id, location_id, closes_from, closes_to, reason, created_by_name, created_at, reopened_at, reopened_by_name`).lt(`closes_from`,t).gt(`closes_to`,e).order(`closes_from`);if(r)return{closures:[],error:r.message};let i=n??[],a=new Map;if(i.length){let e=await R.from(`field_closure_games`).select(`closure_id`).in(`closure_id`,i.map(e=>e.id));if(!e.error)for(let t of e.data??[])a.set(t.closure_id,(a.get(t.closure_id)??0)+1)}return{closures:i.map(e=>({...e,games:a.get(e.id)??0})),error:null}}async function zo(e){let t=new Map,n=[...new Set(e)];for(let e=0;e<n.length;e+=100){let{data:r,error:i}=await R.from(`running_late_reports`).select(`game_id, umpire_id, minutes, reported_at`).in(`game_id`,n.slice(e,e+100));if(i)return new Map;for(let e of r??[])t.set(`${e.game_id}:${e.umpire_id}`,e)}return t}async function Bo(e){let t=new Map;if(e.length===0)return t;let{data:n,error:r}=await R.rpc(`game_partners`,{p_game_ids:[...new Set(e)]});if(r)return t;for(let e of n??[]){let n=t.get(e.game_id)??[];n.push({position:e.place,name:e.umpire_name}),t.set(e.game_id,n)}return t}async function Vo(){let e=new Map,t=await K((e,t)=>R.from(`game_reports`).select(`id, game_id, season_id, umpire_id, author_name, category, body, created_at`).order(`created_at`,{ascending:!1}).range(e,t));if(t.error)return{reports:[],followups:e,error:t.error};let n=t.rows.map(e=>e.id);for(let t=0;t<n.length;t+=100){let r=await R.from(`game_report_followups`).select(`id, report_id, author_name, body, created_at`).in(`report_id`,n.slice(t,t+100)).order(`created_at`);if(r.error)return{reports:[],followups:new Map,error:r.error.message};for(let t of r.data??[]){let n=e.get(t.report_id)??[];n.push(t),e.set(t.report_id,n)}}return{reports:t.rows,followups:e,error:null}}async function Ho(){let e=new Map,t=await K((e,t)=>R.from(`outside_reports`).select(`id, umpire_id, game_id, season_id, source_name, source_role, received_on, body, entered_by_name, created_at, edited_at`).order(`received_on`,{ascending:!1}).range(e,t));if(t.error)return{reports:[],followups:e,error:t.error};let n=t.rows.map(e=>e.id);for(let t=0;t<n.length;t+=100){let r=await R.from(`outside_report_followups`).select(`id, report_id, author_name, body, created_at`).in(`report_id`,n.slice(t,t+100)).order(`created_at`);if(r.error)return{reports:[],followups:new Map,error:r.error.message};for(let t of r.data??[]){let n=e.get(t.report_id)??[];n.push(t),e.set(t.report_id,n)}}return{reports:t.rows,followups:e,error:null}}async function Uo(e){let{data:t,error:n}=await R.from(`report_audit`).select(`id, report_kind, report_id, action, actor_name, acted_at`).eq(`report_id`,e).order(`acted_at`);return n?[]:t??[]}var Wo=`id, umpire_id, starts_at, ends_at, notes, kind`,Go=`id, umpire_id, season_id, weekdays, start_time, end_time, starts_on, notes`;async function Ko(){let[e,t,n]=await Promise.all([K((e,t)=>R.from(`umpire_availability`).select(Wo).gt(`ends_at`,z().toISOString()).order(`starts_at`).range(e,t)),K((e,t)=>R.from(`umpire_availability_patterns`).select(Go).order(`starts_on`).range(e,t)),R.from(`seasons`).select(`id, ends_on`)]);if(e.error||t.error||n.error)return null;let r=new Map((n.data??[]).map(e=>[e.id,e.ends_on]));return Xa(e.rows,t.rows,r)}async function qo(e){let t=await K((t,n)=>R.from(`umpire_availability`).select(Wo).eq(`umpire_id`,e).gt(`ends_at`,z().toISOString()).order(`starts_at`).range(t,n));return{rows:t.rows,error:t.error}}async function Jo(e){let t=await K((t,n)=>R.from(`umpire_availability_patterns`).select(Go).eq(`umpire_id`,e).order(`starts_on`).range(t,n));return{rows:t.rows,error:t.error}}async function Yo(){let{data:e,error:t}=await R.from(`seasons`).select(`id, name, starts_on, ends_on, is_active`).order(`starts_on`,{ascending:!1});return{seasons:e??[],error:t?.message??null}}async function Xo(e){let t=[...new Set(e)],n=[];for(let e=0;e<t.length;e+=100){let r=t.slice(e,e+100),i=await K((e,t)=>R.from(`games`).select(ko).in(`id`,r).order(`starts_at`).range(e,t));if(i.error)return{games:[],error:i.error};n.push(...i.rows)}return{games:n,error:null}}async function Zo(e){let t=[...new Set(e)],n=new Map;for(let e=0;e<t.length;e+=100){let r=t.slice(e,e+100),i=await R.from(`umpires`).select(`id, profile_id, phone, classification`).in(`id`,r);if(i.error)return{contacts:new Map,error:i.error.message};let a=i.data??[],o=a.map(e=>e.profile_id).filter(e=>!!e),s=a.filter(e=>e.classification===`youth`).map(e=>e.id),c=o.length?await R.from(`account_contact`).select(`profile_id, phone, sms_opt_in`).in(`profile_id`,o):{data:[],error:null};if(c.error)return{contacts:new Map,error:c.error.message};let l=s.length?await R.from(`umpire_private_details`).select(`umpire_id, emergency_contact_phone`).in(`umpire_id`,s):{data:[],error:null};if(l.error)return{contacts:new Map,error:l.error.message};let u=new Map((c.data??[]).map(e=>[e.profile_id,e.phone])),d=new Map((c.data??[]).map(e=>[e.profile_id,!!e.sms_opt_in])),f=new Map((l.data??[]).map(e=>[e.umpire_id,e.emergency_contact_phone]));for(let[e,t]of To(a,u,f,d))n.set(e,t)}return{contacts:n,error:null}}async function Qo(e){let t=await K((t,n)=>R.from(`game_assignments`).select(jo).eq(`umpire_id`,e).order(`game_id`).range(t,n));if(t.error)return{games:[],assignments:[],error:t.error};let n=[...new Set(t.rows.map(e=>e.game_id))],r=[];for(let e=0;e<n.length;e+=100){let t=n.slice(e,e+100),i=await K((e,n)=>R.from(`games`).select(ko).in(`id`,t).order(`starts_at`).range(e,n));if(i.error)return{games:[],assignments:[],error:i.error};r.push(...i.rows)}return{games:r,assignments:t.rows,error:null}}var $o={one:`Add a time you can umpire`,repeat:`Add a repeating time you can umpire`,cannot:`Add a date or time you can't umpire`},es=[`Sun`,`Mon`,`Tue`,`Wed`,`Thu`,`Fri`,`Sat`],ts=[1,2,3,4,5,6,0];async function ns(e,t){let{umpireId:n,own:r}=t,i=null,a=[],o=[],s=[],c=z(),l={year:c.getFullYear(),month:c.getMonth()},u=(e=``)=>r?`<h2>My availability</h2>`:`<h3>Availability${e?`: ${V(e)}`:``}</h3>`;e.innerHTML=`
    <section class="availability">
      ${u()}
      <p class="directory-description">Loading&hellip;</p>
    </section>
  `;let[d,f,p]=await Promise.all([qo(n),Jo(n),Yo()]);if(d.error||f.error){console.error(`Availability failed:`,d.error??f.error),e.innerHTML=`
      <section class="availability">
        ${u()}
        <p class="directory-empty">The availability could not be loaded. Refresh and try again.</p>
      </section>
    `;return}a=d.rows,o=f.rows,s=p.seasons,e.innerHTML=`
    <section class="availability">
      ${u(t.name)}
      <p class="directory-description">
        ${r?`Tell schedulers when you can umpire, as single dates, as repeating times, or both. Once you have added any, you are taken to be unavailable at other times. Dates you cannot umpire always win.`:`The times this umpire can umpire, and the dates they cannot. You can add or change them for them. Once any times are entered, the umpire is taken to be unavailable at other times. Dates they cannot umpire always win.`}
      </p>
      <div id="av-empty"></div>
      <div id="av-lists"></div>
      <div id="av-calendar"></div>

      <form id="av-form" class="create-umpire-form" novalidate>
        <h3 id="av-form-title">${$o.one}</h3>

        <label for="av-type">What do you want to add?</label>
        <select id="av-type">
          <option value="one">A time I can umpire (one date)</option>
          <option value="repeat">A repeating time I can umpire</option>
          <option value="cannot">A date or time I can't umpire</option>
        </select>

        <div id="av-repeat-fields">
          <fieldset class="av-days">
            <legend>Days of the week</legend>
            <div class="av-day-row">
              ${ts.map(e=>`
                <label class="av-day"><input type="checkbox" name="av-day" value="${e}" /> ${es[e]}</label>`).join(``)}
            </div>
            <div class="av-shortcuts">
              <button type="button" class="secondary-button" data-av-days="1,2,3,4,5">Mon&ndash;Fri</button>
              <button type="button" class="secondary-button" data-av-days="6,0">Sat, Sun</button>
              <button type="button" class="secondary-button" data-av-days="">Clear</button>
            </div>
          </fieldset>

          <label for="av-start-on">Starting</label>
          <input id="av-start-on" type="date" />

          <label for="av-season">Season</label>
          <select id="av-season"></select>
          <p id="av-season-hint" class="season-dates"></p>
        </div>

        <div id="av-date-fields">
          <label for="av-date">Date</label>
          <input id="av-date" type="date" required />
        </div>

        <label class="season-checkbox-label">
          <input id="av-allday" type="checkbox" /> All day
        </label>

        <div id="av-times">
          <label for="av-from">From</label>
          <input id="av-from" type="time" value="08:00" />
          <label for="av-to">To</label>
          <input id="av-to" type="time" value="20:00" />
        </div>

        <label for="av-note">Note (optional)</label>
        <input id="av-note" maxlength="200" placeholder="For example: after work" />

        <div class="account-actions">
          <button id="av-save" class="primary-button" type="submit">Add</button>
          <button id="av-cancel" class="secondary-button" type="button" hidden>Cancel</button>
        </div>

        <p id="av-message" class="message" role="status" aria-live="polite"></p>
      </form>
    </section>
  `;let m=t=>e.querySelector(`#${t}`),h=(e,t=`error`)=>{let n=m(`av-message`);n.textContent=e,n.className=e?`message ${t}`:`message`},g=()=>H(z()),_=e=>s.find(t=>t.id===e),v=()=>s.filter(e=>e.ends_on&&e.ends_on>=g()).sort((e,t)=>Number(t.is_active)-Number(e.is_active)),y=e=>{let t=new Date(e);return t.getHours()===0&&t.getMinutes()===0},b=e=>{let t=new Date(e);return`${String(t.getHours()).padStart(2,`0`)}:${String(t.getMinutes()).padStart(2,`0`)}`},x=e=>y(e.starts_at)&&y(e.ends_at)&&G(e.starts_at)===G(new Date(Date.parse(e.ends_at)-6e4).toISOString()),S=e=>{let t=G(e.starts_at)===G(e.ends_at);if(y(e.starts_at)&&y(e.ends_at)){let t=new Date(Date.parse(e.ends_at)-6e4).toISOString();return G(e.starts_at)===G(t)?`${U(e.starts_at)} \u00b7 All day`:`${U(e.starts_at)} to ${U(t)} \u00b7 All day`}return t?`${U(e.starts_at)} \u00b7 ${W(e.starts_at)} \u2013 ${W(e.ends_at)}`:`${U(e.starts_at)} ${W(e.starts_at)} \u2013 ${U(e.ends_at)} ${W(e.ends_at)}`},C=()=>o.filter(e=>{let t=_(e.season_id)?.ends_on;return!!t&&t>=g()}),w=()=>{let e=a.filter(e=>e.kind!==`unavailable`),t=a.filter(e=>e.kind===`unavailable`),n=C();m(`av-empty`).innerHTML=n.length===0&&e.length===0?r?`<p class="av-callout">You have not told us when you can umpire. Add the dates and times you are free, so schedulers know.</p>`:`<p class="directory-empty">Nothing entered yet. The assignment screen will show &ldquo;no availability entered&rdquo; for this umpire.</p>`:``;let i=(e,t)=>t.length===0?``:`<h3 class="av-sub">${e}</h3>
           <ul class="av-list">${t.map(e=>`
             <li class="av-item">
               <span class="av-when">${V(e.text)}${e.note?` <em class="av-note">${V(e.note)}</em>`:``}</span>
               <span class="av-actions">
                 <button type="button" class="secondary-button" data-av-edit="${V(e.id)}" data-av-type="${e.type}">Change</button>
                 <button type="button" class="secondary-button" data-av-delete="${V(e.id)}" data-av-type="${e.type}">Remove</button>
               </span>
             </li>`).join(``)}</ul>`;m(`av-lists`).innerHTML=i(`Repeating times`,n.map(e=>({id:e.id,type:`repeat`,text:to(e,_(e.season_id)),note:e.notes})))+i(`Times I can umpire`,e.map(e=>({id:e.id,type:`one`,text:S(e),note:e.notes})))+i(`Dates and times I can't umpire`,t.map(e=>({id:e.id,type:`cannot`,text:S(e),note:e.notes})))},T=()=>{let e=new Map(s.map(e=>[e.id,e.ends_on])),t=[...a.filter(e=>e.kind!==`unavailable`).map(e=>({starts_at:e.starts_at,ends_at:e.ends_at})),...Ya(o,e)],n=a.filter(e=>e.kind===`unavailable`).map(e=>({starts_at:e.starts_at,ends_at:e.ends_at}));m(`av-calendar`).innerHTML=Co(l.year,l.month,So(l.year,l.month,t,n))},E=()=>{let e=v(),t=m(`av-season`),n=t.value;t.innerHTML=e.length?e.map(e=>`<option value="${V(e.id)}">${V(e.name)} (ends ${V(eo(e.ends_on))})</option>`).join(``):`<option value="">No season with an end date</option>`,t.disabled=e.length===0,n&&e.some(e=>e.id===n)&&(t.value=n),D()};function D(){let e=_(m(`av-season`).value);m(`av-season-hint`).textContent=e?.ends_on?`It ends automatically on ${eo(e.ends_on)}, the end of ${e.name}.`:`A repeating time needs a season with an end date. An administrator can set one in League Setup.`}let O=()=>i?.type??m(`av-type`).value,ee=()=>{let e=O();m(`av-repeat-fields`).hidden=e!==`repeat`,m(`av-date-fields`).hidden=e===`repeat`,m(`av-times`).hidden=m(`av-allday`).checked,i||(m(`av-form-title`).textContent=$o[e])},te=()=>{i=null,m(`av-type`).disabled=!1,m(`av-date`).value=``,m(`av-start-on`).value=``,m(`av-allday`).checked=!1,m(`av-from`).value=`08:00`,m(`av-to`).value=`20:00`,m(`av-note`).value=``,e.querySelectorAll(`input[name='av-day']`).forEach(e=>{e.checked=!1}),m(`av-save`).textContent=`Add`,m(`av-cancel`).hidden=!0,ee()},ne=async()=>{let[e,t]=await Promise.all([qo(n),Jo(n)]);e.error||t.error?h(`The list could not be refreshed. ${e.error??t.error}`):(a=e.rows,o=t.rows,w(),T())};w(),T(),E(),ee(),m(`av-type`).addEventListener(`change`,()=>{h(``),ee()}),m(`av-allday`).addEventListener(`change`,ee),m(`av-season`).addEventListener(`change`,D),m(`av-cancel`).addEventListener(`click`,()=>{te(),h(``)}),e.addEventListener(`click`,t=>{let n=t.target,r=n.closest(`[data-av-days]`);if(r){let t=new Set((r.dataset.avDays??``).split(`,`).filter(Boolean).map(Number));e.querySelectorAll(`input[name='av-day']`).forEach(e=>{e.checked=t.has(Number(e.value))});return}let s=n.closest(`[data-cal-nav]`);if(s){let e=new Date(l.year,l.month+Number(s.dataset.calNav),1);l={year:e.getFullYear(),month:e.getMonth()},T();return}let c=n.closest(`[data-cal-date]`);if(c){m(O()===`repeat`?`av-start-on`:`av-date`).value=c.dataset.calDate??``,h(``);return}let u=n.closest(`[data-av-edit]`);if(u){let t=u.dataset.avType,n=u.dataset.avEdit;if(t===`repeat`){let r=o.find(e=>e.id===n);if(!r)return;i={type:t,id:n},m(`av-type`).value=`repeat`,e.querySelectorAll(`input[name='av-day']`).forEach(e=>{e.checked=r.weekdays.includes(Number(e.value))});let a=/^00:00/.test(r.start_time)&&/^23:59/.test(r.end_time);m(`av-allday`).checked=a,m(`av-from`).value=r.start_time.slice(0,5),m(`av-to`).value=r.end_time.slice(0,5),m(`av-start-on`).value=r.starts_on,m(`av-note`).value=r.notes??``,m(`av-season`).value=r.season_id,D()}else{let e=a.find(e=>e.id===n);if(!e)return;i={type:t,id:n},m(`av-type`).value=t,m(`av-date`).value=G(e.starts_at),m(`av-allday`).checked=x(e),m(`av-from`).value=b(e.starts_at),m(`av-to`).value=b(e.ends_at),m(`av-note`).value=e.notes??``}m(`av-type`).disabled=!0,m(`av-form-title`).textContent=`Change this time`,m(`av-save`).textContent=`Save change`,m(`av-cancel`).hidden=!1,ee(),h(``),m(`av-form`).scrollIntoView({behavior:`smooth`,block:`nearest`});return}let d=n.closest(`[data-av-delete]`);if(d){d.disabled=!0;let e=d.dataset.avType===`repeat`?`umpire_availability_patterns`:`umpire_availability`;(async()=>{let{error:t}=await R.from(e).delete().eq(`id`,d.dataset.avDelete);t?(d.disabled=!1,h(`Could not remove it. ${t.message}`)):(i?.id===d.dataset.avDelete&&te(),await ne(),h(`Removed.`,`success`))})()}});let re=async e=>{if(m(`av-save`).disabled=!1,e){h(`Could not save it. ${e.message}`);return}let t=i!==null;te(),await ne(),h(t?`Changed.`:`Added.`,`success`)};m(`av-form`).addEventListener(`submit`,t=>{t.preventDefault();let r=O(),a=m(`av-allday`).checked,o=m(`av-from`).value,s=m(`av-to`).value,c=m(`av-note`).value.trim();if(!a&&(!o||!s))return h(`Enter the times from and to, or tick All day.`);if(!a&&s<=o)return h(`The end time must be after the start time. For the whole day, tick All day.`);let l=m(`av-save`);if(r===`repeat`){let t=[...e.querySelectorAll(`input[name='av-day']:checked`)].map(e=>Number(e.value)).sort((e,t)=>e-t);if(t.length===0)return h(`Choose at least one day of the week.`);let r=_(m(`av-season`).value);if(!r||!r.ends_on)return h(`A repeating time needs a season with an end date. An administrator can set one in League Setup.`);let u=m(`av-start-on`).value||g();if(!i&&u<g())return h(`The start date cannot be in the past.`);if(u>r.ends_on)return h(`That is after the end of the season (${eo(r.ends_on)}).`);let d={season_id:r.id,weekdays:t,start_time:a?`00:00`:o,end_time:a?`23:59`:s,starts_on:u,notes:c||null};l.disabled=!0,(async()=>{let{error:e}=i?await R.from(`umpire_availability_patterns`).update(d).eq(`id`,i.id):await R.from(`umpire_availability_patterns`).insert({umpire_id:n,...d});await re(e)})();return}let u=m(`av-date`).value;if(!u)return h(`Choose a date.`);let d,f;if(a?(d=new Date(`${u}T00:00:00`),f=new Date(d),f.setDate(f.getDate()+1)):(d=new Date(`${u}T${o}:00`),f=new Date(`${u}T${s}:00`)),Number.isNaN(d.getTime())||Number.isNaN(f.getTime()))return h(`That date or time is not valid.`);if(f<=d)return h(`The end time must be after the start time. For the whole day, tick All day.`);if(f.getTime()<=ka())return h(`That time has already passed.`);let p=z();if(p.setFullYear(p.getFullYear()+2),d>p)return h(`Choose a date within the next two years.`);let v={starts_at:d.toISOString(),ends_at:f.toISOString(),notes:c||null,kind:r===`cannot`?`unavailable`:`available`};l.disabled=!0,(async()=>{let{error:e}=i?await R.from(`umpire_availability`).update(v).eq(`id`,i.id):await R.from(`umpire_availability`).insert({umpire_id:n,...v});await re(e)})()})}var rs=[];function q(e){return e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e])}function is(e,t=z()){let n=/^(\d{4})-(\d{2})-(\d{2})$/.exec(e);if(!n)return null;let r=Number(n[1]),i=Number(n[2]),a=Number(n[3]),o=t.getFullYear()-r,s=t.getMonth()+1;return(s<i||s===i&&t.getDate()<a)&&--o,o}function as(e,t){if(!e)return`Birth dates are kept for administrators only. They are used to tell youth from adult and to find umpires under 13.`;let n=is(e);if(n===null)return`Enter a valid birth date.`;if(n<0)return`That birth date is in the future.`;let r=`Age ${n}.`;return n<13&&(r+=` Under 13: a parent account and consent will be required before this umpire can be active.`),n>=18&&t===`youth`&&(r+=` This umpire is 18 or older but is classified Youth. Change the classification to Adult when appropriate.`),n<18&&t===`adult`&&(r+=` This umpire is under 18 but is classified Adult.`),r}function os(e){return e.trim().toLowerCase()}function ss(e){return e.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)}function cs(e,t){let n=e=>e.trim().replace(/\s+/g,` `).toLowerCase();return n(e)===n(t)}function ls(e){return e.profile_id!==null&&e.account_name!==null&&e.account_name.trim()!==``&&!cs(e.account_name,e.display_name)}function us(e){return new Date(e.expires_at).getTime()<Date.now()}function ds(e){if(e.profile_id)switch(e.account_status){case`pending`:return`Pending review`;case`rejected`:return`Rejected`;case`suspended`:return`Suspended`;default:return`Linked`}return e.invitation?us(e.invitation)?`Invitation expired`:`Invited (expires ${e.invitation.expires_at.slice(0,10)})`:`Not linked`}async function fs(e,t){let{data:n}=await R.from(`umpire_invitations`).select(`expires_at`).eq(`umpire_id`,e).eq(`status`,`pending`).maybeSingle();return Ra({kind:`invitation`,toEmail:t,subject:`You are invited to the RWCLL umpire list`,body:ps(t,n?.expires_at??new Date(Date.now()+2592e6).toISOString())})}function ps(e,t){return[`You have been added to the RWCLL umpire list.`,``,`To get started, go to ${window.location.origin} and choose "Create account". Register using exactly this email address: ${e}`,``,`Choose the umpire type that matches you, confirm your email when asked, and sign in. You will be approved automatically.`,``,`This invitation expires on ${t.slice(0,10)}.`].join(`
`)}function ms(e){switch(e){case`active`:return`Active`;case`inactive`:return`Inactive`;case`suspended`:return`Suspended`}}function hs(e=``){let t=document.querySelector(`#umpire-results`);if(!t)return;let n=e.trim().toLowerCase(),r=rs.filter(e=>[e.display_name,e.umpire_number??``,e.classification,e.email??``,e.phone??``,e.eligibility_status,ds(e),e.account_name??``].some(e=>e.toLowerCase().includes(n)));t.innerHTML=r.length===0?`
      <p class="directory-empty">
        ${rs.length===0?`No umpire records have been created yet.`:`No umpires match your search.`}
      </p>
    `:`
    <div class="table-scroll">
      <table class="umpire-table">
        <thead>
          <tr>
            <th>Umpire</th>
            <th>Number</th>
            <th>Classification</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Eligibility</th>
            <th>Account</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${r.map(e=>`
            <tr>
              <td>${q(e.display_name)}</td>
              <td>${q(e.umpire_number||`—`)}</td>
              <td>${q(e.classification===`youth`?`Youth`:`Adult`)}</td>
              <td class="email-cell">${q(e.email||`—`)}</td>
              <td>${q(e.phone||`—`)}</td>
              <td>
                <span class="eligibility-badge eligibility-${e.eligibility_status}">
                  ${ms(e.eligibility_status)}
                </span>
              </td>
              <td>
                ${q(ds(e))}
                ${ls(e)?`<br><span class="season-dates">Account name: ${q(e.account_name??``)}</span>`:``}
              </td>
                <td>
                <button type="button" class="secondary-button"
                    data-edit-umpire="${e.id}">
                    Edit
                </button>
                <button type="button" class="secondary-button"
                    data-link-umpire="${e.id}">
                    ${e.profile_id?`Change link`:`Link account`}
                </button>
                </td>
            </tr>
          `).join(``)}
        </tbody>
      </table>
    </div>
  `}async function gs(){let e=document.querySelector(`#umpire-results`),t=document.querySelector(`#umpire-directory-message`);if(!e)return;e.textContent=`Loading umpire records…`;let{data:n,error:r}=await R.from(`umpires`).select(`
      id,
      profile_id,
      umpire_number,
      display_name,
      classification,
      phone,
      eligibility_status,
      can_self_assign,
      plays_in_division_id
    `).order(`display_name`);if(r){e.textContent=`Unable to load the umpire directory.`,t&&(t.textContent=r.message,t.className=`message error`);return}let[i,a,o]=await Promise.all([R.from(`umpire_private_details`).select(`umpire_id, email`),R.from(`profiles`).select(`id, email, account_status, display_name`),R.from(`umpire_invitations`).select(`id, umpire_id, email, expires_at`).eq(`status`,`pending`)]);i.error&&console.error(`Umpire emails not loaded:`,i.error.message),a.error&&console.error(`Account emails not loaded:`,a.error.message),o.error&&console.error(`Invitations not loaded:`,o.error.message);let s=new Map;for(let e of i.data??[])e.email&&s.set(e.umpire_id,e.email);let c=new Map,l=new Map,u=new Map;for(let e of a.data??[])e.email&&c.set(e.id,e.email),l.set(e.id,e.account_status),e.display_name&&u.set(e.id,e.display_name);let d=new Map;for(let e of o.data??[])d.set(e.umpire_id,{id:e.id,email:e.email,expires_at:e.expires_at});rs=(n??[]).map(e=>{let t=e.profile_id?c.get(e.profile_id)??null:null,n=s.get(e.id)??null;return{...e,email:t??n,email_from_account:t!==null,account_status:e.profile_id?l.get(e.profile_id)??null:null,account_name:e.profile_id?u.get(e.profile_id)??null:null,invitation:d.get(e.id)??null}}),hs(document.querySelector(`#umpire-search`)?.value??``),t&&(t.textContent=`${rs.length} umpire record(s) loaded.`,t.className=`message success`)}async function _s(e){let t=document.querySelector(`#create-umpire-message`),n=document.querySelector(`#save-umpire-button`),r=new FormData(e),i=String(r.get(`display_name`)??``).trim(),a=String(r.get(`umpire_number`)??``).trim(),o=String(r.get(`classification`)??``),s=String(r.get(`phone`)??``).trim(),c=os(String(r.get(`email`)??``)),l=e.querySelector(`[name="invite"]`)?.checked??!1,u=String(r.get(`eligibility_status`)??``);if(!i)t&&(t.textContent=`Please enter the umpire's full name.`,t.className=`message error`);else if(![`youth`,`adult`].includes(o))t&&(t.textContent=`Please select a valid classification.`,t.className=`message error`);else if(![`active`,`inactive`,`suspended`].includes(u))t&&(t.textContent=`Please select a valid eligibility status.`,t.className=`message error`);else if(c&&!ss(c))t&&(t.textContent=`Please enter a valid email address.`,t.className=`message error`);else{n&&(n.disabled=!0,n.textContent=`Creating…`),t&&(t.textContent=``,t.className=`message`);try{let{data:n,error:r}=await R.from(`umpires`).insert({display_name:i,umpire_number:a||null,classification:o,phone:s||null,eligibility_status:u,profile_id:null}).select(`id`).single();if(r)throw r;let d=!1,f=!1;if(c&&n&&l){let{error:r}=await R.rpc(`invite_umpire`,{p_umpire_id:n.id,p_email:c});if(r){t&&(t.textContent=`The umpire was created, but the invitation could not be recorded: `+r.message,t.className=`message error`),e.reset(),await gs();return}d=!0,f=(await fs(n.id,c)).ok}else if(c&&n){let{error:r}=await R.from(`umpire_private_details`).upsert({umpire_id:n.id,email:c,updated_at:new Date().toISOString()},{onConflict:`umpire_id`});if(r){t&&(t.textContent=`The umpire was created, but the email could not be saved: `+r.message,t.className=`message error`),e.reset(),await gs();return}}t&&(t.textContent=d?f?`Umpire created, invitation recorded, and the message was added to the Outbox.`:`Umpire created and invitation recorded. Open Edit on the new record to copy the message to send them.`:`Umpire created successfully.`,t.className=`message success`),e.reset(),await gs()}catch(e){if(t){let n=e instanceof Error?e.message:`An unexpected error occurred.`;t.textContent=n.includes(`umpires_umpire_number_key`)?`That umpire number is already in use. Please choose another.`:`Unable to create umpire: ${n}`,t.className=`message error`}}finally{n&&(n.disabled=!1,n.textContent=`Create umpire`)}}}function vs(e){let t=document.querySelector(`#umpire-editor`);t&&(t.innerHTML=e,t.scrollIntoView({behavior:`smooth`,block:`start`}),t.querySelector(`[data-cancel-editor]`)?.addEventListener(`click`,()=>{t.replaceChildren()}))}async function ys(e,t){let n=document.querySelector(`#invitation-panel`);if(!n)return;let{data:r,error:i}=await R.from(`umpire_invitations`).select(`id, email, expires_at`).eq(`umpire_id`,e).eq(`status`,`pending`).maybeSingle();if(i){n.innerHTML=`<p class="message error">Could not load the invitation: ${q(i.message)}</p>`;return}let a=r??null,o=a?us(a):!1;n.className=`invitation-panel`,n.innerHTML=a?`
      <h4>Invitation</h4>
      <p class="season-dates">
        ${o?`The invitation to <strong>${q(a.email)}</strong> expired on ${q(a.expires_at.slice(0,10))}.`:`Invited: <strong>${q(a.email)}</strong>. The invitation expires on ${q(a.expires_at.slice(0,10))}.`}
      </p>
      <div class="account-actions">
        <button type="button" class="secondary-button"
          data-invite-action="renew">Renew (30 more days)</button>
        <button type="button" class="secondary-button"
          data-invite-action="revoke">Revoke</button>
      </div>
      ${o?``:`
          <label for="invitation-message">Message to send them</label>
          <textarea id="invitation-message" readonly rows="8">${q(ps(a.email,a.expires_at))}</textarea>
          <button type="button" class="secondary-button"
            data-invite-action="copy">Copy message</button>
          <p class="season-dates">
            Email sending is not set up yet, so copy this message and send
            it yourself.
          </p>`}
      <p id="invitation-feedback" class="message" role="status"
        aria-live="polite"></p>
    `:`
      <h4>Invitation</h4>
      <p class="season-dates">
        Not invited yet. Type their email in the Email box above, then press
        Invite. When they register with that email and confirm it, they are
        linked and approved automatically.
      </p>
      <button type="button" class="secondary-button"
        data-invite-action="invite">Invite to register</button>
      <p id="invitation-feedback" class="message" role="status"
        aria-live="polite"></p>
    `;let s=(e,t)=>{let n=document.querySelector(`#invitation-feedback`);n&&(n.textContent=e,n.className=`message ${t}`)};t&&s(t.text,t.kind),n.onclick=t=>{let n=t.target;if(!(n instanceof Element))return;let r=n.closest(`[data-invite-action]`);if(!r)return;let i=r.dataset.inviteAction??``;(async()=>{if(i===`copy`){let e=document.querySelector(`#invitation-message`);if(!e)return;try{await navigator.clipboard.writeText(e.value),s(`Message copied.`,`success`)}catch{e.select(),s(`Press Ctrl+C to copy the selected message.`,`success`)}}else if(i===`invite`){let t=os(document.querySelector(`#edit-email`)?.value??``);if(!t||!ss(t)){s(`Enter a valid email address in the Email box above first.`,`error`);return}r.disabled=!0;let{error:n}=await R.rpc(`invite_umpire`,{p_umpire_id:e,p_email:t});if(n){s(n.message,`error`),r.disabled=!1;return}let i=await fs(e,t);await gs(),await ys(e,{text:i.ok?`Invitation created and added to the Outbox. You can also copy the message below and send it yourself.`:`Invitation created, but it could not be added to the Outbox (${i.error}). Copy the message below and send it yourself.`,kind:`success`})}else if(a){if(i===`renew`){r.disabled=!0;let{data:t,error:n}=await R.rpc(`renew_umpire_invitation`,{p_invitation_id:a.id});if(n){s(n.message,`error`),r.disabled=!1;return}await gs(),await ys(e,{text:`Invitation renewed until ${String(t).slice(0,10)}.`,kind:`success`})}else if(i===`revoke`){if(!window.confirm(`Revoke the invitation to ${a.email}? They will no longer be approved automatically.`))return;r.disabled=!0;let{error:t}=await R.rpc(`revoke_umpire_invitation`,{p_invitation_id:a.id});if(t){s(t.message,`error`),r.disabled=!1;return}await gs(),await ys(e,{text:`Invitation revoked.`,kind:`success`})}}})()}}async function bs(e){let t=rs.find(t=>t.id===e);if(!t){vs(`<p>Umpire record not found.</p>`);return}let{data:n,error:r}=await R.from(`umpire_private_details`).select(`emergency_contact_name, emergency_contact_phone, admin_notes, email, birth_date, external_id_primary, external_id_secondary`).eq(`umpire_id`,e).maybeSingle();if(r){vs(`<p class="error-message">Could not load private details: ${q(r.message)}</p>`);return}let[i,a]=await Promise.all([R.from(`divisions`).select(`id, name, league_id, is_active, youngest_ll_age, oldest_ll_age`).order(`name`),R.from(`leagues`).select(`id, name`).order(`name`)]),o=new Map((a.data??[]).map(e=>[e.id,e.name])),s=i.error?null:Va(i.data??[]).map(e=>`
          <option value="${q(e.id)}"
            ${t.plays_in_division_id===e.id?`selected`:``}>
            ${q(e.name)}${o.size>1?` (${q(o.get(e.league_id)??``)})`:``}${e.is_active?``:` (inactive)`}
          </option>`).join(``);vs(`
    <form id="edit-umpire-form" class="create-umpire-form">
      <h3>Edit Umpire</h3>

      <label for="edit-display-name">Display Name</label>
      <input id="edit-display-name" name="display_name" required
        value="${q(t.display_name)}">

      <label for="edit-umpire-number">Umpire Number</label>
      <input id="edit-umpire-number" name="umpire_number"
        value="${q(t.umpire_number??``)}">

      <label for="edit-classification">Classification</label>
      <select id="edit-classification" name="classification" required>
        <option value="youth" ${t.classification===`youth`?`selected`:``}>Youth</option>
        <option value="adult" ${t.classification===`adult`?`selected`:``}>Adult</option>
      </select>

      <label for="edit-phone">Phone</label>
      <input id="edit-phone" name="phone"
        value="${q(t.phone??``)}">

      <label for="edit-eligibility">Eligibility</label>
      <select id="edit-eligibility" name="eligibility_status" required>
        <option value="active" ${t.eligibility_status===`active`?`selected`:``}>Active</option>
        <option value="inactive" ${t.eligibility_status===`inactive`?`selected`:``}>Inactive</option>
        <option value="suspended" ${t.eligibility_status===`suspended`?`selected`:``}>Suspended</option>
      </select>

      <label class="season-checkbox-label">
        <input id="edit-can-self-assign" name="can_self_assign" type="checkbox"
          ${t.can_self_assign===!1?``:`checked`}>
        Allowed to assign themselves to games (in divisions that allow it)
      </label>

      ${s===null?``:`
        <label for="edit-plays-in">Division they play in (youth umpires)</label>
        <select id="edit-plays-in" name="plays_in_division_id">
          <option value="">Not set: worked out from their Little League age</option>
          ${s}
        </select>
        <p class="season-dates">
          A youth umpire cannot umpire the division they play in. If this is
          left blank, any division whose ages include theirs counts.
        </p>
      `}

      <hr class="directory-divider">
      <h3>Private Details — Administrators Only</h3>

      ${t.email_from_account?`<p class="season-dates">Email: ${q(t.email??``)}
            (from the linked account; it changes when the account's email changes)</p>`:`<label for="edit-email">Email</label>
      <input id="edit-email" name="email" type="email"
        maxlength="254" autocomplete="off"
        value="${q(n?.email??``)}">`}

      ${ls(t)?`<p class="season-dates">
            The person's own account uses the name
            <strong>${q(t.account_name??``)}</strong>.
            The roster name above is what you typed. They are the same
            person; this is only a difference in spelling or style.
          </p>
          <button type="button" class="secondary-button"
            id="use-account-name">Use the account's name</button>`:``}

      ${t.profile_id?``:`<div id="invitation-panel"></div>`}

      <label for="edit-birth-date">Birth date</label>
      <input id="edit-birth-date" name="birth_date" type="date"
        value="${q(n?.birth_date??``)}">
      <p id="edit-age-hint" class="season-dates"></p>

      <label for="edit-emergency-contact-name">Emergency Contact Name (for a youth umpire: a parent or guardian)</label>
      <input id="edit-emergency-contact-name"
        name="emergency_contact_name"
        value="${q(n?.emergency_contact_name??``)}">

      <label for="edit-emergency-contact-phone">Emergency Contact Phone (printed as the parent's number for a youth umpire)</label>
      <input id="edit-emergency-contact-phone"
        name="emergency_contact_phone"
        value="${q(n?.emergency_contact_phone??``)}">

      <label for="edit-external-id-primary">Outside ID 1 (main league database)</label>
      <input id="edit-external-id-primary" name="external_id_primary"
        maxlength="100" autocomplete="off"
        value="${q(n?.external_id_primary??``)}">

      <label for="edit-external-id-secondary">Outside ID 2 (backup system)</label>
      <input id="edit-external-id-secondary" name="external_id_secondary"
        maxlength="100" autocomplete="off"
        value="${q(n?.external_id_secondary??``)}">

      <label for="edit-admin-notes">Administrative Notes</label>
      <textarea id="edit-admin-notes" name="admin_notes"
        rows="4">${q(n?.admin_notes??``)}</textarea>

      <p id="edit-umpire-message" class="message"
        role="status" aria-live="polite"></p>

      <div class="account-actions">
        <button type="submit">Save Changes</button>
        <button type="button" class="secondary-button" data-cancel-editor>Cancel</button>
      </div>
    </form>

    <div id="edit-availability" class="availability-admin"></div>
  `);let c=document.querySelector(`#edit-availability`);c&&ns(c,{umpireId:e,own:!1,name:t.display_name});let l=()=>{let e=document.querySelector(`#edit-age-hint`),t=document.querySelector(`#edit-birth-date`),n=document.querySelector(`#edit-classification`);e&&t&&n&&(e.textContent=as(t.value,n.value))};document.querySelector(`#edit-birth-date`)?.addEventListener(`input`,l),document.querySelector(`#edit-classification`)?.addEventListener(`change`,l),l(),document.querySelector(`#use-account-name`)?.addEventListener(`click`,()=>{let e=document.querySelector(`#edit-display-name`);e&&t.account_name&&(e.value=t.account_name)}),t.profile_id||ys(e);let u=document.querySelector(`#edit-umpire-form`);u?.addEventListener(`submit`,async t=>{t.preventDefault(),await xs(e,new FormData(u))})}async function xs(e,t){let n=String(t.get(`display_name`)??``).trim(),r=String(t.get(`umpire_number`)??``).trim(),i=String(t.get(`classification`)??``),a=String(t.get(`phone`)??``).trim(),o=String(t.get(`eligibility_status`)??``),s=String(t.get(`emergency_contact_name`)??``).trim(),c=String(t.get(`emergency_contact_phone`)??``).trim(),l=String(t.get(`admin_notes`)??``).trim(),u=String(t.get(`birth_date`)??``).trim(),d=String(t.get(`external_id_primary`)??``).trim(),f=String(t.get(`external_id_secondary`)??``).trim(),p=t.has(`email`),m=os(String(t.get(`email`)??``));if(!n){vs(`<p>Please enter a display name.</p>`);return}if(![`youth`,`adult`].includes(i)){vs(`<p>Please choose a valid classification.</p>`);return}if(![`active`,`inactive`,`suspended`].includes(o)){vs(`<p>Please choose a valid eligibility status.</p>`);return}if(p&&m&&!ss(m)){let e=document.querySelector(`#edit-umpire-message`);e&&(e.textContent=`Please enter a valid email address.`,e.className=`message error`);return}if(u){let e=is(u);if(e===null||e<0||e>120){let e=document.querySelector(`#edit-umpire-message`);e&&(e.textContent=`Enter a valid birth date that is not in the future.`,e.className=`message error`);return}}let h=document.querySelector(`#edit-umpire-form button[type="submit"]`);h&&(h.disabled=!0,h.textContent=`Saving...`);let{error:g}=await R.from(`umpires`).update({display_name:n,umpire_number:r||null,classification:i,phone:a||null,eligibility_status:o,can_self_assign:t.get(`can_self_assign`)===`on`,...t.has(`plays_in_division_id`)?{plays_in_division_id:String(t.get(`plays_in_division_id`)||``)||null}:{}}).eq(`id`,e);if(g){vs(`<p class="error-message">Could not save umpire: ${q(g.message)}</p>`);return}let{error:_}=await R.from(`umpire_private_details`).upsert({umpire_id:e,emergency_contact_name:s||null,emergency_contact_phone:c||null,admin_notes:l||null,birth_date:u||null,external_id_primary:d||null,external_id_secondary:f||null,...p?{email:m||null}:{},updated_at:new Date().toISOString()},{onConflict:`umpire_id`});_?vs(`<p class="error-message">The main umpire details were saved, but the private details could not be saved: ${q(_.message.includes(`external_id_primary_unique`)?`Outside ID 1 is already used by another umpire record.`:_.message.includes(`external_id_secondary_unique`)?`Outside ID 2 is already used by another umpire record.`:_.message)}</p>`):(vs(`<p>Umpire details saved successfully.</p>`),await gs())}async function Ss(e){let t=rs.find(t=>t.id===e);if(!t)return;let n=document.querySelector(`#umpire-editor`);if(!n)return;n.textContent=`Loading available accounts…`;let{data:r,error:i}=await R.from(`profiles`).select(`id, display_name, email, account_status`).eq(`account_status`,`approved`).order(`display_name`);if(i){n.textContent=`Unable to load accounts: ${i.message}`;return}let a=new Set(rs.filter(t=>t.id!==e&&t.profile_id).map(e=>e.profile_id)),o=(r??[]).filter(e=>e.id===t.profile_id||!a.has(e.id));vs(`
    <form id="link-umpire-form" class="create-umpire-form">
      <h3>Link account: ${q(t.display_name)}</h3>
      <p>Select an approved user account to associate with this umpire.
        Linking does not change the user's roles or approval status.</p>

      <label for="umpire-profile">Approved account</label>
      <select id="umpire-profile" name="profile_id">
        <option value="">No account linked</option>
        ${o.map(e=>`
          <option value="${q(e.id)}"
            ${e.id===t.profile_id?`selected`:``}>
            ${q(e.display_name||`Unnamed user`)}
            — ${q(e.email||`No email`)}
          </option>
        `).join(``)}
      </select>

      <p id="link-umpire-message" class="message" role="status"></p>

      <div class="account-actions">
        <button class="primary-button" type="submit">Save link</button>
        <button class="secondary-button" type="button" data-cancel-editor>Cancel</button>
      </div>
    </form>
  `);let s=document.querySelector(`#link-umpire-form`);s?.addEventListener(`submit`,t=>{t.preventDefault(),Cs(e,s)})}async function Cs(e,t){let n=document.querySelector(`#link-umpire-message`),r=t.querySelector(`button[type="submit"]`),i=String(new FormData(t).get(`profile_id`)??``);r&&(r.disabled=!0,r.textContent=`Saving…`);let{error:a}=await R.from(`umpires`).update({profile_id:i||null}).eq(`id`,e);a?(n&&(n.textContent=`Unable to save account link: ${a.message}`,n.className=`message error`),r&&(r.disabled=!1,r.textContent=`Save link`)):(vs(`
    <p class="message success">Account link updated successfully.</p>
  `),await gs())}function ws(e){e.innerHTML=`
    <section class="directory-section">
      <div class="directory-header">
        <div>
          <p class="eyebrow">RWCLL · ADMINISTRATION</p>
          <h2>Umpire Directory</h2>
          <p class="directory-description">
            View, search, and manage registered league umpires.
          </p>
        </div>
      </div>

      <button id="toggle-create-umpire" class="primary-button" type="button"
        aria-expanded="false">
        + Create Umpire
      </button>

      <form id="create-umpire-form" class="create-umpire-form" hidden>
        <h3>New umpire</h3>

        <label for="new-umpire-name">Full name *</label>
        <input id="new-umpire-name" name="display_name"
          type="text" maxlength="100" required
          placeholder="Umpire's full name" />

        <label for="new-umpire-number">Umpire number</label>
        <input id="new-umpire-number" name="umpire_number"
          type="text" maxlength="50"
          placeholder="Optional league number" />

        <label for="new-umpire-classification">Classification *</label>
        <select id="new-umpire-classification" name="classification" required>
          <option value="youth">Youth</option>
          <option value="adult">Adult</option>
        </select>

        <label for="new-umpire-email">Email</label>
        <input id="new-umpire-email" name="email"
          type="email" maxlength="254" autocomplete="off"
          placeholder="Optional email address (administrators only)" />

        <label class="season-checkbox-label">
          <input type="checkbox" name="invite" checked />
          Invite them to register with this email (they are approved
          automatically when they confirm it)
        </label>

        <label for="new-umpire-phone">Phone</label>
        <input id="new-umpire-phone" name="phone"
          type="tel" maxlength="30"
          placeholder="Optional phone number" />

        <label for="new-umpire-eligibility">Eligibility *</label>
        <select id="new-umpire-eligibility" name="eligibility_status" required>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>

        <p id="create-umpire-message" class="message"
          role="status" aria-live="polite"></p>

        <div class="account-actions">
          <button id="save-umpire-button" class="primary-button"
            type="submit">Create umpire</button>
          <button id="cancel-create-umpire" class="secondary-button"
            type="button">Cancel</button>
        </div>
      </form>

      <label for="umpire-search">Search umpires</label>
      <input id="umpire-search" type="search"
        placeholder="Search name, number, email, phone, or status"
        autocomplete="off" />

      <p id="umpire-directory-message" class="message"
        role="status" aria-live="polite"></p>

        <div id="umpire-editor"></div>

      <div id="umpire-results">Loading umpire records…</div>

      <button id="refresh-umpires" class="secondary-button" type="button">
        Refresh directory
      </button>
    </section>
  `;let t=e.querySelector(`#create-umpire-form`),n=e.querySelector(`#toggle-create-umpire`);n?.addEventListener(`click`,()=>{t&&n&&(t.hidden=!t.hidden,n.setAttribute(`aria-expanded`,String(!t.hidden)),n.textContent=t.hidden?`+ Create Umpire`:`− Close Form`,t.hidden||e.querySelector(`#new-umpire-name`)?.focus())}),e.querySelector(`#cancel-create-umpire`)?.addEventListener(`click`,()=>{t?.reset(),t&&(t.hidden=!0),n?.setAttribute(`aria-expanded`,`false`),n&&(n.textContent=`+ Create Umpire`)}),t?.addEventListener(`submit`,e=>{e.preventDefault(),_s(t)}),e.querySelector(`#umpire-search`)?.addEventListener(`input`,e=>{let t=e.target;t instanceof HTMLInputElement&&hs(t.value)}),e.querySelector(`#refresh-umpires`)?.addEventListener(`click`,()=>{gs()}),e.querySelector(`#umpire-results`)?.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof HTMLButtonElement))return;let n=t.dataset.editUmpire,r=t.dataset.linkUmpire;n&&bs(n),r&&Ss(r)}),gs()}var Ts=[`JAN`,`FEB`,`MAR`,`APR`,`MAY`,`JUN`,`JUL`,`AUG`,`SEP`,`OCT`,`NOV`,`DEC`],J={editingSeasonId:null,editingLeagueId:null,editingDivisionId:null,editingLocationId:null,editingTeamId:null,teamSeasonFilter:``,teamDivisionFilter:``,ageCharts:[],loadedSeasons:[],loadedLeagues:[],loadedDivisions:[],loadedTeams:[]},Es=null;function Ds(e){Es=e}async function Os(e){if(!Es)throw Error(`League Setup has not been initialised.`);await Es(e)}function ks(e,t){let n=e.querySelector(t.buttonId);n&&n.addEventListener(`click`,async()=>{let r=t.getId();if(!r)return;let i=e.querySelector(`#league-setup-message`),a=n.closest(`form`)?.querySelector(`[name="name"]`)?.defaultValue??``;if(!window.confirm(`Delete the ${t.noun} "${a}"? This cannot be undone.`))return;let o=n.textContent??`Delete`;n.disabled=!0,n.textContent=`Deleting…`;let{data:s,error:c}=await R.from(t.table).delete().eq(`id`,r).select(`id`);if(c||!s||s.length===0){i&&(i.textContent=c?.code===`23503`?t.inUseMessage:c?`Could not delete ${t.noun}: ${c.message}`:`The ${t.noun} was not deleted. You may not have permission, or it was already removed.`,i.className=`message error`),n.disabled=!1,n.textContent=o;return}t.onDeleted(),await Os(e);let l=e.querySelector(`#league-setup-message`);l&&(l.textContent=`${t.noun.charAt(0).toUpperCase()}${t.noun.slice(1)} deleted.`,l.className=`message success`)})}function As(e,t){let n=e.trim(),r=t.trim();if(!/^\d+$/.test(n)||!/^\d+$/.test(r))return{error:`Enter whole numbers for both the youngest and oldest age.`};let i=Number(n),a=Number(r);return i<4||i>18||a<4||a>18?{error:`Ages must be between 4 and 18.`}:i>a?{error:`The youngest age cannot be higher than the oldest age.`}:{youngest:i,oldest:a}}var js=[[0,`No umpire`],[1,`1 umpire (plate)`],[2,`2 umpires (plate, field)`],[3,`3 umpires (plate, first base, third base)`],[4,`4 umpires (plate, first, second, third base)`]];function Ms(e,t){let n=Number(e);return Number.isInteger(n)&&n>=0&&n<=4?n:t}function Ns(e,t=!0){let n=e===0?`No umpire`:`${e} ${e===1?`umpire`:`umpires`}`;return t&&e!==0?`${n} per game`:n}function Ps(e,t){let n=t.length>1;return`
    <section class="setup-panel">
      <h3>Divisions</h3>
      <button id="add-division-button" type="button"
        class="primary-button">
        Add division
      </button>
      ${e.length?`<ul class="setup-list">${e.map(e=>{let r=t.find(t=>t.id===e.league_id),i=e.youngest_ll_age!==null&&e.oldest_ll_age!==null?e.youngest_ll_age===e.oldest_ll_age?`LL age ${e.youngest_ll_age}`:`LL ages ${e.youngest_ll_age}\u2013${e.oldest_ll_age}`:`No age range set`;return`
        <li class="season-item">
          <div>
            <strong>${V(e.name)}</strong>
            ${e.age_group?`<span class="setup-status">${V(e.age_group)}</span>`:``}
            <p class="season-dates">${V(i)}</p>
            <p class="season-dates">${e.allow_self_assign?`Umpires can assign themselves. `:``}${Ns(e.umpires_per_game??2)}${e.tournament_umpires!==null&&e.tournament_umpires!==void 0?`; tournaments: ${Ns(e.tournament_umpires,!1)}`:``}</p>
            ${n&&r?`<p class="season-dates">${V(r.name)}</p>`:``}
            ${e.description?`<p class="season-dates">${V(e.description)}</p>`:``}
            <span class="setup-status">
              ${e.is_active?`Active`:`Inactive`}
            </span>
          </div>
          <button type="button"
            class="secondary-button season-edit-button"
            data-edit-division="${V(e.id)}">
            Edit
          </button>
        </li>
      `}).join(``)}</ul>`:`<p class="directory-empty">No divisions have been added yet.</p>`}
    </section>
  `}function Fs(e,t){let n=e?.name??``,r=e?.description??``,i=e?.youngest_ll_age??``,a=e?.oldest_ll_age??``,o=e?.is_active??!0,s=t.filter(e=>e.is_active),c=s.length===1?s[0].id:``,l=e?`
      <p class="season-dates">
        League: ${V(t.find(t=>t.id===e.league_id)?.name??`Unknown league`)}
      </p>
    `:`
      <label for="division-league">League</label>
      <select id="division-league" name="league_id" required>
        ${s.length===1?``:`<option value="">Choose a league</option>`}
        ${s.map(e=>`
          <option value="${V(e.id)}"
            ${e.id===c?`selected`:``}>
            ${V(e.name)}
          </option>
        `).join(``)}
      </select>
    `;return`
    <form id="division-form" class="create-umpire-form">
      <h3>${e?`Edit division`:`Add division`}</h3>

      ${l}

      <label for="division-name">Division name</label>
      <input id="division-name" name="name" required maxlength="100"
        value="${V(n)}"
        placeholder="e.g. Minors" />

      <label for="division-youngest">
        Youngest Little League age (4\u201318)
      </label>
      <input id="division-youngest" name="youngest_ll_age" required
        type="number" inputmode="numeric" step="1"
        min="4" max="18"
        value="${V(String(i))}" />

      <label for="division-oldest">
        Oldest Little League age (4\u201318)
      </label>
      <input id="division-oldest" name="oldest_ll_age" required
        type="number" inputmode="numeric" step="1"
        min="4" max="18"
        value="${V(String(a))}" />

      <label for="division-umpires">Umpires needed per game</label>
      <select id="division-umpires" name="umpires_per_game">
        ${js.map(([t,n])=>`<option value="${t}" ${(e?.umpires_per_game??2)===t?`selected`:``}>${n}</option>`).join(``)}
      </select>

      <label for="division-tournament-umpires">Umpires needed for tournament games</label>
      <select id="division-tournament-umpires" name="tournament_umpires">
        <option value="" ${e?.tournament_umpires===null||e?.tournament_umpires===void 0?`selected`:``}>Same as regular games</option>
        ${js.map(([t,n])=>`<option value="${t}" ${e?.tournament_umpires===t?`selected`:``}>${n}</option>`).join(``)}
      </select>
      <p class="season-dates">
        These are the starting numbers for every game in the division. Choose
        "No umpire" for a division that does not use umpires. The umpire
        chief can change the number for an individual game.
      </p>

      <label class="season-checkbox-label">
        <input name="allow_self_assign" type="checkbox" ${e?.allow_self_assign?`checked`:``} />
        Umpires can assign themselves to games in this division
      </label>
      <p class="season-dates">
        Off to begin with. When on, umpires see this division's open places on their
        Home page and can take them. The youth age rule, overlapping games and the
        league's limit on games still apply.
      </p>

      <label for="division-description">Description (optional)</label>
      <textarea id="division-description" name="description"
        rows="3" maxlength="500">${V(r)}</textarea>

      <label class="season-checkbox-label">
        <input name="is_active" type="checkbox"
          ${o?`checked`:``} />
        Active division
      </label>
      ${e?`<button id="delete-division-button" type="button"
            class="secondary-button">
            Delete division
          </button>`:``}

      <div class="account-actions">
        <button type="submit" class="primary-button">
          Save division
        </button>
        <button id="cancel-division-button" type="button"
          class="secondary-button">
          Cancel
        </button>
      </div>
    </form>
  `}function Is(e){let t=e.querySelector(`#division-form`);t&&(e.querySelector(`#cancel-division-button`)?.addEventListener(`click`,()=>{J.editingDivisionId=null,Os(e)}),ks(e,{buttonId:`#delete-division-button`,table:`divisions`,noun:`division`,getId:()=>J.editingDivisionId,inUseMessage:`This division can't be deleted because teams use it. Move or remove those teams first, or mark the division inactive instead.`,onDeleted:()=>{J.editingDivisionId=null}}),t.addEventListener(`submit`,async n=>{n.preventDefault();let r=e.querySelector(`#league-setup-message`),i=e=>{r&&(r.textContent=e,r.className=`message error`)},a=new FormData(t),o=String(a.get(`name`)??``).trim(),s=String(a.get(`description`)??``).trim(),c=t.querySelector(`[name="is_active"]`)?.checked??!1,l=null;if(!J.editingDivisionId&&(l=String(a.get(`league_id`)??``)||null,!l||!J.loadedLeagues.some(e=>e.id===l))){i(`Choose a league.`);return}if(!o){i(`Enter a division name.`);return}let u=As(String(a.get(`youngest_ll_age`)??``),String(a.get(`oldest_ll_age`)??``));if(`error`in u){i(u.error);return}let d=t.querySelector(`button[type="submit"]`);d&&(d.disabled=!0,d.textContent=`Saving…`);let f={name:o,youngest_ll_age:u.youngest,oldest_ll_age:u.oldest,umpires_per_game:Ms(a.get(`umpires_per_game`),2),tournament_umpires:a.get(`tournament_umpires`)===``?null:Ms(a.get(`tournament_umpires`),2),allow_self_assign:a.get(`allow_self_assign`)===`on`,description:s||null,is_active:c},p=J.editingDivisionId?await R.from(`divisions`).update(f).eq(`id`,J.editingDivisionId):await R.from(`divisions`).insert({...f,league_id:l});if(p.error){p.error.code===`23505`?i(`A division with that name already exists in this league. Choose a different name.`):p.error.code===`23514`?i(`The age range was not accepted. Use whole ages from 4 to 18, with the youngest no higher than the oldest.`):i(`Could not save division: ${p.error.message}`),d&&(d.disabled=!1,d.textContent=`Save division`);return}J.editingDivisionId=null,await Os(e);let m=e.querySelector(`#league-setup-message`);m&&(m.textContent=`Division saved successfully.`,m.className=`message success`)}))}function Ls(e){return e===0?`No warning about unconfirmed assignments`:`Warns about unconfirmed assignments ${e} ${e===1?`day`:`days`} before a game`}function Rs(e){return`
    <section class="setup-panel">
      <h3>Leagues</h3>
      <button id="add-league-button" type="button"
        class="primary-button">
        Add league
      </button>
      ${e.length?`<ul class="setup-list">${e.map(e=>`
        <li class="season-item">
          <div>
            <strong>${V(e.name)}</strong>
            <span class="setup-status">
              ${e.is_active?`Active`:`Inactive`}
            </span>
            <p class="season-dates">${Ls(e.unconfirmed_warning_days??7)}</p>
            <p class="season-dates">${e.self_assign_max_games?`An umpire can take up to ${e.self_assign_max_games} upcoming ${e.self_assign_max_games===1?`game`:`games`} for themselves`:`No limit on games umpires take for themselves`}</p>
          </div>
          <button type="button"
            class="secondary-button season-edit-button"
            data-edit-league="${V(e.id)}">
            Edit
          </button>
        </li>
      `).join(``)}</ul>`:`<p class="directory-empty">
        No leagues yet. Add a league before you create divisions.
      </p>`}
    </section>
  `}function zs(e){let t=e?.name??``,n=e?.is_active??!0;return`
    <form id="league-form" class="create-umpire-form">
      <h3>${e?`Edit league`:`Add league`}</h3>

      <label for="league-name">League name</label>
      <input id="league-name" name="name" required maxlength="100"
        value="${V(t)}"
        placeholder="Your league's name" />

      <label class="season-checkbox-label">
        <input name="is_active" type="checkbox"
          ${n?`checked`:``} />
        Active league
      </label>

      <label for="league-unconfirmed-days">Warn about unconfirmed assignments (days before a game)</label>
      <input id="league-unconfirmed-days" name="unconfirmed_warning_days"
        type="number" min="0" max="60" step="1" inputmode="numeric"
        value="${e?.unconfirmed_warning_days??7}" />
      <p class="season-dates">
        When an umpire has still not confirmed an assignment this many days
        before the game, the administrators are warned. Use 0 for no warning.
      </p>

      <label for="league-self-assign-max">Most upcoming games an umpire can take for themselves</label>
      <input id="league-self-assign-max" name="self_assign_max_games"
        type="number" min="1" max="500" step="1" inputmode="numeric"
        placeholder="No limit"
        value="${e?.self_assign_max_games??``}" />
      <p class="season-dates">
        Leave blank for no limit. Games already played and canceled games do not
        count. It limits only games an umpire takes for themselves, never
        assignments an administrator makes.
      </p>
      ${e?`<button id="delete-league-button" type="button"
            class="secondary-button">
            Delete league
          </button>`:``}

      <div class="account-actions">
        <button type="submit" class="primary-button">
          Save league
        </button>
        <button id="cancel-league-button" type="button"
          class="secondary-button">
          Cancel
        </button>
      </div>
    </form>
  `}function Bs(e){let t=e.querySelector(`#league-form`);t&&(ks(e,{buttonId:`#delete-league-button`,table:`leagues`,noun:`league`,getId:()=>J.editingLeagueId,inUseMessage:`This league can't be deleted because divisions or teams use it. Remove those first, or mark the league inactive instead.`,onDeleted:()=>{J.editingLeagueId=null}}),e.querySelector(`#cancel-league-button`)?.addEventListener(`click`,()=>{J.editingLeagueId=null,Os(e)}),t.addEventListener(`submit`,async n=>{n.preventDefault();let r=e.querySelector(`#league-setup-message`),i=new FormData(t),a=String(i.get(`name`)??``).trim(),o=t.querySelector(`[name="is_active"]`)?.checked??!1;if(!a){r&&(r.textContent=`Enter a league name.`,r.className=`message error`);return}let s=String(i.get(`unconfirmed_warning_days`)??``).trim(),c=Number(s);if(s===``||!Number.isInteger(c)||c<0||c>60){r&&(r.textContent=`Enter a whole number of days from 0 to 60 for the unconfirmed-assignment warning.`,r.className=`message error`);return}let l=String(i.get(`self_assign_max_games`)??``).trim(),u=l===``?null:Number(l);if(u!==null&&(!Number.isInteger(u)||u<1||u>500)){r&&(r.textContent=`Enter a whole number of games from 1 to 500 for the limit, or leave it blank for no limit.`,r.className=`message error`);return}let d=t.querySelector(`button[type="submit"]`);d&&(d.disabled=!0,d.textContent=`Saving…`);let f={name:a,is_active:o,unconfirmed_warning_days:c,self_assign_max_games:u},p=J.editingLeagueId?await R.from(`leagues`).update(f).eq(`id`,J.editingLeagueId):await R.from(`leagues`).insert(f);if(p.error){r&&(r.textContent=p.error.code===`23505`?`A league with that name already exists. Choose a different name.`:`Could not save league: ${p.error.message}`,r.className=`message error`),d&&(d.disabled=!1,d.textContent=`Save league`);return}J.editingLeagueId=null,await Os(e);let m=e.querySelector(`#league-setup-message`);m&&(m.textContent=`League saved successfully.`,m.className=`message success`)}))}function Vs(e){return`
    <section class="setup-panel">
      <h3>Game Locations</h3>
      <button id="add-location-button" type="button"
        class="primary-button">
        Add location
      </button>
      ${e.length?`<ul class="setup-list">${e.map(e=>`
        <li class="season-item">
          <div>
            <strong>${V(e.name)}</strong>
            ${e.address?`<p class="season-dates">${V(e.address)}</p>`:``}
            ${e.notes?`<p class="season-dates">${V(e.notes)}</p>`:``}
            <span class="setup-status">
              ${e.is_active?`Active`:`Inactive`}
            </span>
            <span class="field-kind ${e.is_league_field?`field-kind-league`:`field-kind-away`}">
              ${e.is_league_field?`League field`:`Away field`}
            </span>
          </div>
          <button type="button"
            class="secondary-button season-edit-button"
            data-edit-location="${V(e.id)}">
            Edit
          </button>
        </li>
      `).join(``)}</ul>`:`<p class="directory-empty">
        No game locations yet. Add the fields where games are played.
      </p>`}
    </section>
  `}function Hs(e){let t=e?.name??``,n=e?.address??``,r=e?.notes??``,i=e?.directions??``,a=e?.is_active??!0,o=e?.is_league_field??!0;return`
    <form id="location-form" class="create-umpire-form">
      <h3>${e?`Edit location`:`Add location`}</h3>

      <label for="location-name">Location name</label>
      <input id="location-name" name="name" required maxlength="100"
        value="${V(t)}"
        placeholder="e.g. Field 1" />

      <label for="location-address">Address (optional)</label>
      <input id="location-address" name="address" maxlength="200"
        value="${V(n)}" />

      <label for="location-directions">Parking and directions (optional)</label>
      <textarea id="location-directions" name="directions"
        rows="3" maxlength="1000">${V(i)}</textarea>
      <p class="field-help">Anyone who can see the schedule can read this.</p>

      <label for="location-access">Access details (optional)</label>
      <textarea id="location-access" name="access"
        rows="2" maxlength="500" ${e?`disabled`:``}
        placeholder="For example: gate code 1234"></textarea>
      <p class="field-help">
        A gate code or lock combination. Only administrators, and the umpires on a
        game here from 24 hours before until it ends, can read this. It is never printed.
      </p>

      <label for="location-notes">Notes (optional)</label>
      <textarea id="location-notes" name="notes"
        rows="3" maxlength="500">${V(r)}</textarea>

      <label class="season-checkbox-label">
        <input name="is_active" type="checkbox"
          ${a?`checked`:``} />
        Active location
      </label>

      <label class="season-checkbox-label">
        <input name="is_league_field" type="checkbox"
          ${o?`checked`:``} />
        A field this league runs
      </label>
      <p class="season-dates">
        Leave this unticked for a field our teams travel to (an away field).
      </p>
      ${e?`<button id="delete-location-button" type="button"
            class="secondary-button">
            Delete location
          </button>`:``}

      <div class="account-actions">
        <button type="submit" class="primary-button">
          Save location
        </button>
        <button id="cancel-location-button" type="button"
          class="secondary-button">
          Cancel
        </button>
      </div>
    </form>
  `}function Us(e){let t=e.querySelector(`#location-form`);if(!t)return;ks(e,{buttonId:`#delete-location-button`,table:`locations`,noun:`location`,getId:()=>J.editingLocationId,inUseMessage:`This location can't be deleted because games use it. Move or remove those games first, or mark the location inactive instead.`,onDeleted:()=>{J.editingLocationId=null}}),e.querySelector(`#cancel-location-button`)?.addEventListener(`click`,()=>{J.editingLocationId=null,Os(e)});let n=t.querySelector(`[name="access"]`);n&&J.editingLocationId&&R.from(`location_access_notes`).select(`body`).eq(`location_id`,J.editingLocationId).maybeSingle().then(({data:e,error:t})=>{t?n.placeholder=`The access details could not be loaded, so they will be left as they are.`:(n.value=e?.body??``,n.disabled=!1)}),t.addEventListener(`submit`,async n=>{n.preventDefault();let r=e.querySelector(`#league-setup-message`),i=new FormData(t),a=String(i.get(`name`)??``).trim(),o=String(i.get(`address`)??``).trim(),s=String(i.get(`notes`)??``).trim(),c=String(i.get(`directions`)??``).trim(),l=t.querySelector(`[name="access"]`),u=l?.value.trim()??``,d=!!l&&!l.disabled,f=t.querySelector(`[name="is_active"]`)?.checked??!1,p=t.querySelector(`[name="is_league_field"]`)?.checked??!1;if(!a){r&&(r.textContent=`Enter a location name.`,r.className=`message error`);return}let m=t.querySelector(`button[type="submit"]`);m&&(m.disabled=!0,m.textContent=`Saving…`);let h={name:a,address:o||null,notes:s||null,directions:c||null,is_active:f,is_league_field:p},g=J.editingLocationId,_=g?await R.from(`locations`).update(h).eq(`id`,g):await R.from(`locations`).insert(h).select(`id`).single();if(_.error){r&&(r.textContent=_.error.code===`23505`?`A location with that name already exists. Choose a different name.`:`Could not save location: ${_.error.message}`,r.className=`message error`),m&&(m.disabled=!1,m.textContent=`Save location`);return}let v=``;if(d){let e=g??_.data?.id;if(e){let t=await R.rpc(`set_location_access_details`,{p_location_id:e,p_body:u});t.error&&(v=` The access details were not saved: ${t.error.message}`)}}J.editingLocationId=null,await Os(e);let y=e.querySelector(`#league-setup-message`);y&&(y.textContent=`Location saved successfully.${v}`,y.className=v?`message error`:`message success`)})}var Ws={externalId:`Game ID`,event:`Event type (and division)`,group:`Group (used if there is no event type)`,home:`Home team`,away:`Away team`,date:`Date`,start:`Start time`,end:`End time`,field:`Field`,location:`Location`,status:`Status`},Gs=[`externalId`,`home`,`away`,`date`,`start`,`end`],Ks=[[`externalId`,[`matchid`,`gameid`,`eventid`,`matchnumber`,`gamenumber`,`id`]],[`date`,[`date`,`gamedate`,`matchdate`]],[`start`,[`starttime`,`start`,`begintime`]],[`end`,[`endtime`,`end`,`finishtime`]],[`home`,[`hometeam`,`home`]],[`away`,[`awayteam`,`away`,`visitingteam`,`visitor`]],[`event`,[`eventname`,`event`,`eventtype`,`type`]],[`group`,[`groupname`,`group`,`divisionname`,`division`]],[`field`,[`field`,`diamond`]],[`location`,[`location`,`venue`,`facility`,`park`,`site`,`complex`]],[`status`,[`scheduledstatus`,`matchstatus`,`status`]]];function qs(e){return e.toLowerCase().replace(/[^a-z0-9]/g,``)}function Js(e){let t={externalId:null,event:null,group:null,home:null,away:null,date:null,start:null,end:null,field:null,location:null,status:null},n=e.map(qs),r=new Set;for(let[e,i]of Ks)for(let a of i){let i=n.findIndex((e,t)=>e===a&&!r.has(t));if(i!==-1){t[e]=i,r.add(i);break}}return t}function Ys(e){let t=Gs.filter(t=>e[t]===null);return e.field===null&&e.location===null&&t.push(`location`),t}function Xs(e,t){let n=(e,n)=>{let r=t[n];return r===null?``:(e[r]??``).trim()};return e.slice(1).map((e,t)=>({line:t+2,externalId:n(e,`externalId`),event:n(e,`event`),group:n(e,`group`),home:n(e,`home`),away:n(e,`away`),date:n(e,`date`),start:n(e,`start`),end:n(e,`end`),field:n(e,`field`),location:n(e,`location`),status:n(e,`status`)}))}function Zs(e){return e.away.trim().toLowerCase()===`practice`}function Qs(e){return e.event||e.group}function $s(e){let t=e.trim(),n=/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})$/.exec(t);return n?ec(n[3].length===2?2e3+Number(n[3]):Number(n[3]),Number(n[1]),Number(n[2])):(n=/^(\d{4})-(\d{2})-(\d{2})$/.exec(t),n?ec(Number(n[1]),Number(n[2]),Number(n[3])):null)}function ec(e,t,n){let r=new Date(e,t-1,n);return r.getFullYear()===e&&r.getMonth()===t-1&&r.getDate()===n?{y:e,m:t,d:n}:null}function tc(e){let t=e.trim(),n=/^(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]?\.?$/.exec(t);if(n){let e=Number(n[1]),t=n[2]===void 0?0:Number(n[2]);if(e<1||e>12||t>59)return null;let r=n[3].toLowerCase()===`p`;return{h:e%12+(r?12:0),m:t}}if(n=/^(\d{1,2}):(\d{2})$/.exec(t),n){let e=Number(n[1]),t=Number(n[2]);return e<=23&&t<=59?{h:e,m:t}:null}return null}function nc(e,t){let n=new Date(e.y,e.m-1,e.d,t.h,t.m);return n.getFullYear()===e.y&&n.getMonth()===e.m-1&&n.getDate()===e.d&&n.getHours()===t.h&&n.getMinutes()===t.m?n.toISOString():null}function Y(e){return e.toLowerCase().replace(/[^a-z0-9]/g,``)}function rc(e){return e.replace(/^\s*games?\s*[-:]\s*/i,``).replace(/\s*[-:]\s*group\s*$/i,``).trim()}function ic(e){return e.replace(/\([^)]*\)/g,` `).replace(/\s+/g,` `).trim()}function ac(e,t){let n=rc(e),r=Y(ic(n)),i=[...new Set([Y(n),r])].filter(Boolean);if(i.length===0)return null;let a=t.map(e=>({id:e.id,full:Y(e.name),core:Y(ic(e.name))})),o=a.filter(e=>i.some(t=>e.full===t||e.core===t));if(o.length===1)return o[0].id;if(o.length>1)return null;if(r.length>=3){let e=a.filter(e=>e.core.startsWith(r)||e.full.startsWith(r));if(e.length===1)return e[0].id}return null}function oc(e){return/^[A-Za-z]+\s+\d+\s*-\s*\S/.test(e.trim())}function sc(e){return e.replace(/\s+/g,` `).trim()}function cc(e,t){let n=e.map(e=>Y(e));for(let e of t){let t=n.indexOf(e);if(t!==-1)return t}return null}function lc(e){let t=$s(e.trim().split(/\s+/)[0]??``);return t?`${t.y}-${String(t.m).padStart(2,`0`)}-${String(t.d).padStart(2,`0`)}`:null}function uc(e){let t=e[0]??[],n=cc(t,[`programname`,`program`,`seasonname`,`season`]),r=cc(t,[`divisionname`,`division`,`groupname`,`group`]),i=cc(t,[`teamname`,`team`]),a=cc(t,[`teamcode`,`code`]),o=[];if(r===null&&o.push(`Division Name`),i===null&&o.push(`Team Name`),o.length)return{rows:[],missing:o};let s=(e,t)=>t===null?``:e[t]??``;return{missing:o,rows:e.slice(1).map((e,t)=>({line:t+2,program:sc(s(e,n)),division:sc(s(e,r)),team:sc(s(e,i)),code:sc(s(e,a))}))}}function dc(e){let t=e[0]??[],n=cc(t,[`programname`,`program`,`seasonname`,`season`]),r=cc(t,[`divisionname`,`division`,`groupname`,`group`]),i=cc(t,[`numberofteams`,`teamcount`,`teams`]),a=cc(t,[`divisionstartdate`,`startdate`,`start`]),o=cc(t,[`divisionenddate`,`enddate`,`end`]);if(r===null)return{rows:[],missing:[`Division Name`]};let s=(e,t)=>t===null?``:e[t]??``;return{missing:[],rows:e.slice(1).map((e,t)=>{let c=Number.parseInt(s(e,i),10);return{line:t+2,program:sc(s(e,n)),division:sc(s(e,r)),expectedTeams:Number.isFinite(c)?c:null,startsOn:lc(s(e,a)),endsOn:lc(s(e,o))}})}}function fc(e,t){return t===``||e.program===``||Y(e.program)===Y(t)}function pc(e){let t=new Map;for(let n of[...e.teams,...e.divisions])n.program&&!t.has(Y(n.program))&&t.set(Y(n.program),n.program);return[...t.values()]}function mc(e,t){let n=new Map,r=e=>{let t=Y(e);if(!t)return null;let r=n.get(t);return r||(r={key:t,name:e,teams:0,expected:null,startsOn:null,endsOn:null},n.set(t,r)),r};for(let n of e.divisions.filter(e=>fc(e,t))){let e=r(n.division);e&&(e.expected=n.expectedTeams,e.startsOn=n.startsOn,e.endsOn=n.endsOn)}for(let n of e.teams.filter(e=>fc(e,t))){let e=r(n.division);e&&n.team&&(e.teams+=1)}return[...n.values()]}function hc(e){let t=e.map(e=>e.startsOn).filter(e=>!!e).sort()[0]??``;if(!t)return{startsOn:``,endsOn:``,ignored:[]};let n=new Date(`${t}T00:00:00Z`);n.setUTCDate(n.getUTCDate()+366);let r=n.toISOString().slice(0,10),i=[],a=[];for(let t of e)t.endsOn&&(t.endsOn>r?i.push(`The end date ${t.endsOn} for ${t.name} was ignored: it is more than a year after the start, so it is probably a typing slip.`):a.push(t.endsOn));return a.sort(),{startsOn:t,endsOn:a[a.length-1]??``,ignored:i}}function gc(e,t,n,r){let i=r??pc(e)[0]??``,a=mc(e,i),o=t.divisions.filter(e=>e.league_id===n),s={};for(let e of a){let t=ac(e.name,o);s[e.key]={include:!/external/i.test(e.name),target:t?{kind:`existing`,id:t}:{kind:`new`,name:ic(e.name)||e.name}}}let c=t.seasons.find(e=>Y(e.name)===Y(i)),l=hc(a.filter(e=>s[e.key]?.include));return{leagueId:n,program:i,season:c?{kind:`existing`,id:c.id}:{kind:`new`,name:i,startsOn:l.startsOn,endsOn:l.endsOn},divisions:s,skipTeams:{}}}var _c=100,vc=/^\d{4}-\d{2}-\d{2}$/;function yc(e){let{files:t,settings:n,context:r,newId:i}=e,a=[],o=[],s=r.divisions.filter(e=>e.league_id===n.leagueId);r.leagues.some(e=>e.id===n.leagueId)||a.push(`Choose the league these divisions and teams belong to.`);let c,l=null;if(n.season.kind===`existing`){let e=n.season.id,t=r.seasons.find(t=>t.id===e);t||a.push(`The season you chose could not be found.`),l=t?.id??null,c={kind:`existing`,id:l,name:t?.name??``,startsOn:``,endsOn:``}}else{let e=sc(n.season.name),{startsOn:t,endsOn:i}=n.season;e?e.length>_c?a.push(`The season name is too long (the limit is ${_c} letters).`):r.seasons.some(t=>Y(t.name)===Y(e))&&a.push(`A season called "${e}" already exists. Choose it from the list to add teams to it, or give this one a different name.`):a.push(`The season needs a name.`),t&&!vc.test(t)&&a.push(`The season start date is not a date.`),i&&!vc.test(i)&&a.push(`The season end date is not a date.`),vc.test(t)&&vc.test(i)&&i<t&&a.push(`The season ends before it starts.`),c={kind:`new`,id:null,name:e,startsOn:t,endsOn:i}}let u=mc(t,n.program),d=[],f=new Map,p=[],m=new Map;for(let e of u){let t=n.divisions[e.key],r=!t||t.include,o=t?.target??{kind:`new`,name:ic(e.name)||e.name};if(!r){p.push({key:e.key,fileName:e.name,teams:e.teams,expected:e.expected,include:!1,status:`skipped`,targetName:``});continue}if(o.kind===`existing`){let t=s.find(e=>e.id===o.id);t?f.set(e.key,{id:t.id,name:t.name}):a.push(`The division you chose for "${e.name}" is not in this league.`),p.push({key:e.key,fileName:e.name,teams:e.teams,expected:e.expected,include:!0,status:`existing`,targetName:t?.name??``});continue}let c=sc(o.name);if(!c)a.push(`The new division for "${e.name}" needs a name.`);else if(c.length>_c)a.push(`The division name "${c}" is too long (the limit is ${_c} letters).`);else if(s.some(e=>Y(e.name)===Y(c)))a.push(`A division called "${c}" already exists in this league. Choose it from the list instead of creating it again.`);else if(m.has(Y(c)))a.push(`Two divisions in the file would both be created as "${c}". Give one of them a different name, or choose an existing division.`);else{m.set(Y(c),e.name);let t=i();d.push({id:t,name:c}),f.set(e.key,{id:t,name:c})}p.push({key:e.key,fileName:e.name,teams:e.teams,expected:e.expected,include:!0,status:`new`,targetName:c})}let h=t.teams.filter(e=>fc(e,n.program)),g=l?r.teams.filter(e=>e.season_id===l&&e.league_id===n.leagueId):[],_=new Map(g.map(e=>[Y(e.name),e])),v=[],y=[],b=new Map,x=new Set,S=0,C=0;for(let e of h){let t=f.get(Y(e.division));if(!e.team||!t||n.skipTeams[String(e.line)])continue;let r=Y(e.team);b.set(r,[...b.get(r)??[],e.line])}for(let e of h){let t=Y(e.team),r=f.get(Y(e.division)),s={line:e.line,name:e.team,fileDivision:e.division};if(!e.team){o.push(`Line ${e.line}: a row with no team name was skipped.`);continue}if(x.add(t),!r||n.skipTeams[String(e.line)]){C+=1,v.push({...s,divisionName:r?.name??``,status:`skipped`,note:r?`left out`:`its division is not being imported`});continue}(b.get(t)?.length??0)>1&&a.push(`The team "${e.team}" appears more than once (lines ${b.get(t).join(`, `)}). Untick all but one.`),e.team.length>_c&&a.push(`The team name "${e.team}" is too long (the limit is ${_c} letters).`);let c=/-\s*$/.test(e.team)?`no coach name yet`:``,l=_.get(t);l?(S+=1,l.division_id&&l.division_id!==r.id&&o.push(`"${l.name}" is already in this season in a different division than the file puts it in. It was left as it is.`),v.push({...s,divisionName:r.name,status:`exists`,note:`already in this season`})):(b.get(t)&&b.get(t)[0]!==e.line||y.push({id:i(),name:e.team,divisionId:r.id}),v.push({...s,divisionName:r.name,status:`new`,note:c}))}let w=h.length>0;for(let e of p)w&&e.include&&e.expected!==null&&e.expected!==e.teams&&o.push(`${e.fileName}: the division file expects ${e.expected} teams but the team file has ${e.teams}.`);let T=v.filter(e=>e.status===`new`&&e.note===`no coach name yet`);T.length&&o.push(`${T.length} ${T.length===1?`team has`:`teams have`} no coach name yet (${T.map(e=>e.name).join(`, `)}). They will be created with the name as it is; untick them to leave them out.`);let E=g.filter(e=>!x.has(Y(e.name))).map(e=>e.name);E.length&&o.push(`${E.length} ${E.length===1?`team`:`teams`} already in this season ${E.length===1?`is`:`are`} not in the file. They have not been touched.`);let D=hc(u.filter(e=>n.divisions[e.key]?.include!==!1));return n.season.kind===`new`&&o.push(...D.ignored),{season:c,divisions:p,teams:v,newDivisions:d,newTeams:y,existingTeams:S,skippedTeams:C,notInFile:E,problems:a,warnings:o}}function bc(e){let t=e.charCodeAt(0)===65279?e.slice(1):e,n=[],r=[],i=``,a=!1,o=!1,s=()=>{r.push(i),i=``,o=!1},c=()=>{s(),(r.some(e=>e.trim()!==``)||r.length>1)&&n.push(r),r=[]};for(let e=0;e<t.length;e+=1){let n=t[e];a?n===`"`?t[e+1]===`"`?(i+=`"`,e+=1):a=!1:i+=n:n===`"`&&i===``&&!o?(a=!0,o=!0):n===`,`?s():n===`\r`?(t[e+1]===`
`&&(e+=1),c()):n===`
`?c():i+=n}if(a)throw Error(`The file ends inside a quoted value. Check that every opening quote has a closing quote.`);return(i!==``||r.length>0)&&c(),n.filter(e=>e.some(e=>e.trim()!==``))}var xc=`__new__`,Sc=2097152;function Cc(){if(typeof crypto.randomUUID==`function`)return crypto.randomUUID();let e=crypto.getRandomValues(new Uint8Array(16));e[6]=e[6]&15|64,e[8]=e[8]&63|128;let t=[...e].map(e=>e.toString(16).padStart(2,`0`)).join(``);return`${t.slice(0,8)}-${t.slice(8,12)}-${t.slice(12,16)}-${t.slice(16,20)}-${t.slice(20)}`}function wc(e){let t=``;return/season .* could not be created/i.test(e)&&/duplicate|already exists/i.test(e)?t=` A season with that name already exists: choose it from the Season list to add teams to it.`:/division .* could not be added/i.test(e)&&/duplicate/i.test(e)?t=` A division with that name already exists in this league: choose it from the list instead of creating it again.`:/team .* could not be added/i.test(e)&&/duplicate/i.test(e)?t=` A team with that name is already in this season.`:/row-level security|permission denied/i.test(e)&&(t=` You may not have permission to do this.`),`Nothing was created. ${e}${t}`}function Tc(e,t){let n=t.leagues.filter(e=>e.is_active),r={leagues:t.leagues.map(e=>({id:e.id,name:e.name})),seasons:t.seasons.map(e=>({id:e.id,name:e.name})),divisions:t.divisions.map(e=>({id:e.id,name:e.name,league_id:e.league_id})),teams:t.teams.map(e=>({id:e.id,name:e.name,season_id:e.season_id,league_id:e.league_id,division_id:e.division_id}))},i={teams:[],divisions:[]},a=``,o=``,s=null,c=null,l=!1,u=!1;e.innerHTML=`
    <section class="importer" id="season-importer">
      <h3>Create a season from your registration files</h3>
      <p class="directory-description">
        Choose the <strong>Team Detail</strong> file from the registration
        system. It lists every team with its division, and is enough to create
        the season, its divisions and its teams. You can also add the
        <strong>Division Details</strong> file, which fills in the season's
        dates and checks the number of teams in each division. Save each file
        as CSV first. Nothing is created until you press the button at the
        bottom, and anything that already exists is left alone.
      </p>

      <label for="si-team-file">Team Detail file (.csv)</label>
      <input id="si-team-file" type="file" accept=".csv,text/csv" />

      <label for="si-division-file">Division Details file (.csv, optional)</label>
      <input id="si-division-file" type="file" accept=".csv,text/csv" />

      <p id="si-message" class="message" role="status" aria-live="polite"></p>

      <div id="si-body"></div>

      <div class="account-actions">
        <button id="si-close" class="secondary-button" type="button">Close</button>
      </div>
    </section>
  `;let d=e.querySelector(`#season-importer`),f=d.querySelector(`#si-body`),p=d.querySelector(`#si-message`),m=(e,t=`error`)=>{p.textContent=e,p.className=e?`message ${t}`:`message`},h=()=>{s&&(c=yc({files:i,settings:s,context:r,newId:Cc}))},g=(e,t)=>{s=gc(i,r,e,t),l=!1,h(),_()},_=()=>{if(!s){f.innerHTML=``;return}let e=pc(i),c=s,l=r.divisions.filter(e=>e.league_id===c.leagueId).sort((e,t)=>e.name.localeCompare(t.name)),u=mc(i,c.program),d=c.season.kind===`new`?c.season:null;f.innerHTML=`
      <p class="directory-description">
        ${[a?`Team file: <strong>${V(a)}</strong> (${i.teams.length} teams)`:``,o?`Division file: <strong>${V(o)}</strong> (${i.divisions.length} divisions)`:``].filter(Boolean).join(` &middot; `)}
      </p>

      <label for="si-league">League</label>
      <select id="si-league">
        ${n.map(e=>`
          <option value="${V(e.id)}" ${e.id===c.leagueId?`selected`:``}>${V(e.name)}</option>
        `).join(``)}
      </select>

      ${e.length>1?`
        <label for="si-program">Program in the file (one season at a time)</label>
        <select id="si-program">
          ${e.map(e=>`
            <option value="${V(e)}" ${e===c.program?`selected`:``}>${V(e)}</option>
          `).join(``)}
        </select>
      `:``}

      <label for="si-season">Season</label>
      <select id="si-season">
        <option value="${xc}" ${d?`selected`:``}>Create a new season</option>
        ${t.seasons.map(e=>`
          <option value="${V(e.id)}" ${c.season.kind===`existing`&&c.season.id===e.id?`selected`:``}>Add to: ${V(e.name)}</option>
        `).join(``)}
      </select>

      <div id="si-season-new" ${d?``:`hidden`}>
        <label for="si-season-name">New season name</label>
        <input id="si-season-name" type="text" maxlength="100" value="${V(d?.name??``)}" />
        <div class="game-filters">
          <div>
            <label for="si-season-start">Starts</label>
            <input id="si-season-start" type="date" value="${V(d?.startsOn??``)}" />
          </div>
          <div>
            <label for="si-season-end">Ends</label>
            <input id="si-season-end" type="date" value="${V(d?.endsOn??``)}" />
          </div>
        </div>
      </div>

      <h4>Divisions</h4>
      <p class="directory-description">
        A division you already have is matched by name (a bracketed
        description such as "(Machine Pitch)" is ignored). Otherwise a new
        division is created, named without the description; you can change
        the name. Untick a division to leave it, and its teams, out.
      </p>
      <div class="table-scroll">
        <table class="umpire-table imp-table" aria-label="Divisions">
          <thead><tr><th>Import</th><th>In the file</th><th>Teams</th><th>Your division</th></tr></thead>
          <tbody>
            ${u.map(e=>{let t=c.divisions[e.key],n=t?.target,r=n?.kind===`new`;return`
                <tr>
                  <td data-label="Import">
                    <label class="season-checkbox-label"><input type="checkbox" data-div-include="${V(e.key)}" ${t?.include===!1?``:`checked`} /> Import</label>
                  </td>
                  <td data-label="In the file">${V(e.name)}</td>
                  <td data-label="Teams">${e.teams}${e.expected===null?``:` <span class="season-dates">(file says ${e.expected})</span>`}</td>
                  <td data-label="Your division">
                    <select data-div-target="${V(e.key)}" aria-label="Division for ${V(e.name)}" ${t?.include===!1?`disabled`:``}>
                      <option value="${xc}" ${r?`selected`:``}>Create a new division</option>
                      ${l.map(e=>`
                        <option value="${V(e.id)}" ${n?.kind===`existing`&&n.id===e.id?`selected`:``}>${V(e.name)}</option>
                      `).join(``)}
                    </select>
                    <input type="text" data-div-name="${V(e.key)}" maxlength="100"
                      value="${V(n?.kind===`new`?n.name:``)}"
                      aria-label="Name of the new division" ${r&&t?.include!==!1?``:`hidden`} />
                  </td>
                </tr>
              `}).join(``)}
          </tbody>
        </table>
      </div>

      <div id="si-teams"></div>
      <div id="si-preview"></div>
    `,v(),y()},v=()=>{let e=f.querySelector(`#si-teams`);e&&c&&s&&(e.innerHTML=c.teams.length===0?``:`
      <details id="si-teams-details" ${e.querySelector(`details`)?.open??!1?`open`:``}>
        <summary>Teams (${c.teams.length}): untick any you do not want</summary>
        <div class="table-scroll">
          <table class="umpire-table imp-table" aria-label="Teams">
            <thead><tr><th>Import</th><th>Team</th><th>Division</th><th>Note</th></tr></thead>
            <tbody>
              ${c.teams.map(e=>{let t=e.status===`exists`||e.note===`its division is not being imported`;return`
                  <tr>
                    <td data-label="Import">
                      <input type="checkbox" data-team-line="${e.line}" aria-label="Import ${V(e.name)}"
                        ${e.status===`skipped`?``:`checked`} ${t?`disabled`:``} />
                    </td>
                    <td data-label="Team">${V(e.name)}</td>
                    <td data-label="Division">${V(e.divisionName||e.fileDivision)}</td>
                    <td data-label="Note">${V(e.note)}</td>
                  </tr>
                `}).join(``)}
            </tbody>
          </table>
        </div>
      </details>
    `)},y=()=>{let e=f.querySelector(`#si-preview`);if(!e||!c)return;let t=c,n=e=>e===1?`team`:`teams`,r=e=>e===1?`division`:`divisions`,i=t.newDivisions.length===0&&t.newTeams.length===0&&t.season.kind===`existing`,a=t.problems.length>0||i||u,o=t.season.kind===`new`?`a new season, <strong>${V(t.season.name||`(no name)`)}</strong>${t.season.startsOn||t.season.endsOn?` (${V(t.season.startsOn||`?`)} to ${V(t.season.endsOn||`?`)})`:``}`:`the existing season <strong>${V(t.season.name)}</strong>, which is not changed`,s=i?`Nothing new to add`:t.season.kind===`new`?`Create the season, ${t.newDivisions.length} ${r(t.newDivisions.length)} and ${t.newTeams.length} ${n(t.newTeams.length)}`:`Add ${t.newTeams.length} ${n(t.newTeams.length)}${t.newDivisions.length?` and ${t.newDivisions.length} ${r(t.newDivisions.length)}`:``}`;e.innerHTML=`
      <h4>Preview</h4>
      <p id="si-summary" class="imp-summary">
        This will use ${o}.
      </p>
      <ul class="imp-badges">
        <li class="imp-badge imp-new"><strong id="si-count-teams">${t.newTeams.length}</strong> new ${n(t.newTeams.length)}</li>
        <li class="imp-badge imp-new"><strong id="si-count-divisions">${t.newDivisions.length}</strong> new ${r(t.newDivisions.length)}</li>
        <li class="imp-badge"><strong id="si-count-existing">${t.existingTeams}</strong> already here</li>
        <li class="imp-badge"><strong id="si-count-skipped">${t.skippedTeams}</strong> left out</li>
        <li class="imp-badge ${t.problems.length?`imp-problem`:``}"><strong id="si-count-problems">${t.problems.length}</strong> ${t.problems.length===1?`problem`:`problems`}</li>
      </ul>

      ${t.problems.length?`
        <div class="imp-section imp-problems" id="si-problems">
          <h5>Please fix ${t.problems.length===1?`this`:`these`} first</h5>
          <ul class="imp-list">${t.problems.map(e=>`<li>${V(e)}</li>`).join(``)}</ul>
        </div>
      `:``}

      ${t.warnings.length?`
        <div class="imp-section" id="si-warnings">
          <h5>Worth a look</h5>
          <ul class="imp-list">${t.warnings.map(e=>`<li>${V(e)}</li>`).join(``)}</ul>
        </div>
      `:``}

      ${t.newDivisions.length?`
        <details class="imp-section">
          <summary>New divisions (${t.newDivisions.length})</summary>
          <ul class="imp-list">${t.newDivisions.map(e=>`<li>${V(e.name)}</li>`).join(``)}</ul>
        </details>
      `:``}

      <div class="account-actions">
        <button id="si-apply" class="primary-button" type="button" ${a?`disabled`:``}>${V(s)}</button>
      </div>
    `},b=async()=>{if(!c||!s||u||c.problems.length>0)return;u=!0,m(`Creating…`,`success`),y();let{data:e,error:n}=await R.rpc(`import_season`,{p_league_id:s.leagueId,p_season:c.season.kind===`new`?{name:c.season.name,starts_on:c.season.startsOn||null,ends_on:c.season.endsOn||null}:{id:c.season.id},p_divisions:c.newDivisions.map(e=>({id:e.id,name:e.name})),p_teams:c.newTeams.map(e=>({id:e.id,name:e.name,division_id:e.divisionId}))});if(u=!1,n){m(wc(n.message),`error`),y();return}let r=e??{},i=r.teams_created??0,a=r.divisions_created??0,o=c.season.name;t.onImported(r.season_created?`Created the season "${o}" with ${a} new ${a===1?`division`:`divisions`} and ${i} ${i===1?`team`:`teams`}.`:`Added ${i} ${i===1?`team`:`teams`} to "${o}"${a?` and created ${a} new ${a===1?`division`:`divisions`}`:``}.`,r.season_id??``)},x=async(e,t)=>{if(m(``),/\.xlsx?$/i.test(e.name)){m(`That is an Excel file. Please save it as CSV first (File, Save as or Download, Comma-separated values) and choose that file.`);return}if(e.size>Sc){m(`That file is too large (the limit is 2 MB).`);return}let r;try{r=bc(await e.text())}catch(e){m(e instanceof Error?e.message:`That file could not be read.`);return}if(r.length<2)m(`That file has no rows below the headings.`);else{if(t===`team`){let t=uc(r);if(t.missing.length){m(`That does not look like a Team Detail file: these headings were not found: ${t.missing.join(`, `)}.`);return}i={...i,teams:t.rows},a=e.name}else{let t=dc(r);if(t.missing.length){m(`That does not look like a Division Details file: these headings were not found: ${t.missing.join(`, `)}.`);return}i={...i,divisions:t.rows},o=e.name}n.length===0?m(`There is no active league yet. Add a league first, then come back.`):g(s?.leagueId??n[0].id,s?.program||void 0)}};d.querySelector(`#si-team-file`)?.addEventListener(`change`,e=>{let t=e.target.files?.[0];t&&x(t,`team`)}),d.querySelector(`#si-division-file`)?.addEventListener(`change`,e=>{let t=e.target.files?.[0];t&&x(t,`division`)}),d.querySelector(`#si-close`)?.addEventListener(`click`,t.onClose),f.addEventListener(`click`,e=>{let t=e.target;t instanceof Element&&t.closest(`#si-apply`)&&b()}),f.addEventListener(`change`,e=>{let t=e.target;if(t instanceof HTMLElement&&s){if(t instanceof HTMLSelectElement&&t.id===`si-league`)g(t.value,s.program);else if(t instanceof HTMLSelectElement&&t.id===`si-program`)g(s.leagueId,t.value);else if(t instanceof HTMLSelectElement&&t.id===`si-season`){if(t.value===xc){let e=hc(mc(i,s.program).filter(e=>s.divisions[e.key]?.include!==!1));s.season={kind:`new`,name:s.program,startsOn:e.startsOn,endsOn:e.endsOn}}else s.season={kind:`existing`,id:t.value};h(),_()}else if(t instanceof HTMLInputElement&&t.dataset.divInclude!==void 0){let e=s.divisions[t.dataset.divInclude];if(e&&(e.include=t.checked),s.season.kind===`new`&&!l){let e=hc(mc(i,s.program).filter(e=>s.divisions[e.key]?.include!==!1));s.season={...s.season,startsOn:e.startsOn,endsOn:e.endsOn}}h(),_()}else if(t instanceof HTMLSelectElement&&t.dataset.divTarget!==void 0){let e=t.dataset.divTarget,n=f.querySelector(`[data-div-name="${CSS.escape(e)}"]`),r=s.divisions[e];if(!r)return;if(t.value===xc){let t=n?.value.trim()||mc(i,s.program).find(t=>t.key===e)?.name||``;r.target={kind:`new`,name:t},n&&(n.value=t,n.hidden=!1)}else r.target={kind:`existing`,id:t.value},n&&(n.hidden=!0);h(),v(),y()}else t instanceof HTMLInputElement&&t.dataset.teamLine!==void 0?(s.skipTeams[t.dataset.teamLine]=!t.checked,h(),v(),y()):t instanceof HTMLInputElement&&(t.id===`si-season-start`||t.id===`si-season-end`)&&s.season.kind===`new`&&(l=!0,s.season={...s.season,startsOn:t.id===`si-season-start`?t.value:s.season.startsOn,endsOn:t.id===`si-season-end`?t.value:s.season.endsOn},h(),y())}}),f.addEventListener(`input`,e=>{let t=e.target;if(t instanceof HTMLInputElement&&s){if(t.id===`si-season-name`&&s.season.kind===`new`)s.season={...s.season,name:t.value},h(),y();else if(t.dataset.divName!==void 0){let e=s.divisions[t.dataset.divName];e&&e.target.kind===`new`&&(e.target={kind:`new`,name:t.value},h(),v(),y())}}})}function Ec(e){let t=[],n=[],r=e.replace(/^\uFEFF/,``).split(/\r\n|\n|\r/),i=!1,a=0,o=new Set,s=new Set;for(let e=0;e<r.length;e++){let c=e+1,l=r[e].trim();if(!l)continue;if(l.includes(`"`)){t.push(`Line ${c}: quotation marks are not supported.`);continue}let u=l.split(`,`).map(e=>e.trim());if(!i){i=!0;let e=[...Ts,`AGE`],n=u.map(e=>e.toUpperCase());if(!(n.length===e.length&&e.every((e,t)=>n[t]===e)))return t.push(`Line ${c}: the header must be exactly ${e.join(`,`)}.`),{entries:[],errors:t};continue}if(a++,u.length!==13){t.push(`Line ${c}: expected 13 values but found ${u.length}.`);continue}let d=u[12];if(!/^\d+$/.test(d)){t.push(`Line ${c}: AGE "${d}" is not a whole number.`);continue}let f=Number(d);if(f<4||f>18){t.push(`Line ${c}: AGE ${f} is outside the supported range 4–18.`);continue}let p=[],m=[];if(u.slice(0,12).forEach((e,t)=>{let n=Number(e);!/^\d{4}$/.test(e)||n<1900||n>2100?m.push(Ts[t]):p.push({birth_month:t+1,birth_year:n,ll_age:f})}),m.length>0){t.push(`Line ${c}: invalid birth year in ${m.join(`, `)}. Use four-digit years.`);continue}let h=[],g=!1;for(let e of p)o.has(`${e.birth_month}-${e.birth_year}`)&&h.push(Ts[e.birth_month-1]),s.has(`${e.birth_month}-${e.ll_age}`)&&(g=!0);if(h.length>0)t.push(`Line ${c}: the birth year repeats one already used for ${h.join(`, `)}.`);else if(g)t.push(`Line ${c}: age ${f} appears more than once.`);else for(let e of p)o.add(`${e.birth_month}-${e.birth_year}`),s.add(`${e.birth_month}-${e.ll_age}`),n.push(e)}return i?a===0&&t.push(`The file has a header but no data rows.`):t.push(`The file is empty.`),{entries:t.length>0?[]:n,errors:t}}function Dc(e){let t=e.map(e=>e.ll_age),n=e.map(e=>e.birth_year);return`${e.length} entries, Little League ages ${Math.min(...t)}–${Math.max(...t)}, birth years ${Math.min(...n)}–${Math.max(...n)}.`}async function Oc(){let{data:e,error:t}=await R.from(`little_league_age_charts`).select(`id, chart_year, name`).order(`chart_year`,{ascending:!1}).order(`name`);return t?(console.error(`Age chart load failed:`,t.message),null):e??[]}function kc(e,t){return`<option value="">No chart selected</option>`+e.map(e=>`
      <option value="${V(e.id)}"
        ${e.id===t?`selected`:``}>
        ${V(e.name)}
      </option>
    `).join(``)}function Ac(e,t,n,r=[]){let i=e.querySelector(`#chart-import-feedback`);if(!i)return;let a=r.slice(0,8),o=r.length>a.length?`<p>…and ${r.length-a.length} more.</p>`:``,s=a.length?`<ul>${a.map(e=>`<li>${V(e)}</li>`).join(``)}</ul>`:``;i.innerHTML=`<p class="message ${t===`info`?``:t}">${V(n)}</p>${s}${o}`}function jc(e){let t=e.querySelector(`#chart-file`),n=e.querySelector(`#chart-year`),r=e.querySelector(`#chart-name`),i=e.querySelector(`#chart-import-button`),a=e.querySelector(`#season-chart`);if(!t||!n||!r||!i||!a)return;let o=[];e.querySelector(`#chart-import`)?.addEventListener(`keydown`,e=>{e.key===`Enter`&&e.preventDefault()}),t.addEventListener(`change`,async()=>{o=[],i.disabled=!0;let a=t.files?.[0];if(!a){Ac(e,`info`,``);return}if(a.size>102400){Ac(e,`error`,`That file is too large for an age chart. Choose the chart CSV.`);return}let s;try{s=await a.text()}catch{Ac(e,`error`,`The file could not be read.`);return}let c=Ec(s);if(c.errors.length>0){Ac(e,`error`,`This file can't be imported. Fix these problems and choose it again:`,c.errors);return}o=c.entries;let l=a.name.match(/(20\d{2})/);!n.value&&l&&(n.value=l[1]),!r.value.trim()&&n.value&&(r.value=`${n.value} Little League Age Chart`),Ac(e,`success`,`File checked: ${Dc(o)} Confirm the year and name, then select Import chart.`),i.disabled=!1}),i.addEventListener(`click`,async()=>{let s=Number(n.value),c=r.value.trim();if(o.length===0){Ac(e,`error`,`Choose a chart CSV file first.`);return}if(!Number.isInteger(s)||s<2e3||s>2100){Ac(e,`error`,`Enter a chart year between 2000 and 2100.`);return}if(!c){Ac(e,`error`,`Enter a chart name.`);return}i.disabled=!0,i.textContent=`Importing…`;let{data:l,error:u}=await R.rpc(`import_age_chart`,{p_chart_year:s,p_name:c,p_entries:o});if(i.textContent=`Import chart`,u){Ac(e,`error`,u.code===`23505`?`A chart with this year and name already exists. Choose a different name.`:`Could not import the chart: ${u.message}`),i.disabled=!1;return}let d=typeof l==`string`?l:null,f=await Oc();o=[],t.value=``,f?(J.ageCharts=f,a.innerHTML=kc(J.ageCharts,d),Ac(e,`success`,`Chart imported and selected. It is saved, but it is not attached to this season until you select Save season.`)):Ac(e,`success`,`The chart was imported, but the list could not refresh. Select Refresh at the top of League Setup.`)})}function Mc(e){return`
    <section class="setup-panel">
      <h3>Seasons</h3>
      <button id="add-season-button" type="button"
        class="primary-button">
        Add season
      </button>
      ${e.length?`<ul class="setup-list">${e.map(e=>{let t=J.ageCharts.find(t=>t.id===e.age_chart_id),n=e.age_chart_id?`Age chart: ${t?t.name:`unavailable`}`:`No age chart selected`;return`
        <li class="season-item">
          <div>
            <strong>${V(e.name)}</strong>
            <p class="season-dates">
              ${e.starts_on||`Start date not set`}
              &ndash;
              ${e.ends_on||`End date not set`}
            </p>
            <p class="season-dates">${V(n)}</p>
            <span class="setup-status">
              ${e.is_active?`Active`:`Inactive`}
            </span>
          </div>
          <button type="button"
            class="secondary-button season-edit-button"
            data-edit-season="${V(e.id)}">
            Edit
          </button>
        </li>
      `}).join(``)}</ul>`:`<p class="directory-empty">No seasons have been added yet.</p>`}
    </section>
  `}function Nc(e){let t=e?.name??``,n=e?.starts_on??``,r=e?.ends_on??``,i=e?.is_active??!0;return`
    <form id="season-form" class="create-umpire-form">
      <h3>${e?`Edit season`:`Add season`}</h3>

      <label for="season-name">Season name</label>
      <input id="season-name" name="name" required maxlength="100"
        value="${V(t)}"
        placeholder="e.g. Spring 2027" />

      <label for="season-start">Start date</label>
      <input id="season-start" name="starts_on" type="date"
        value="${V(n)}" />

      <label for="season-end">End date</label>
      <input id="season-end" name="ends_on" type="date"
        value="${V(r)}" />

      <label for="season-chart">Little League age chart</label>
      <select id="season-chart" name="age_chart_id">
        ${kc(J.ageCharts,e?.age_chart_id??null)}
      </select>

      <label class="season-checkbox-label">
        <input name="is_active" type="checkbox"
          ${i?`checked`:``} />
        Active season
      </label>
      ${e?`<button id="delete-season-button" type="button"
            class="secondary-button">
            Delete season
          </button>`:``}

      <div id="chart-import">
        <hr class="directory-divider" />
        <h3>Import a new age chart</h3>
        <p class="directory-description">
          Upload the annual chart as a CSV file. Imported charts cannot
          be edited. To fix a mistake, import a corrected chart under
          a new name.
        </p>

        <label for="chart-file">Chart CSV file</label>
        <input id="chart-file" type="file" accept=".csv,text/csv" />

        <label for="chart-year">Chart year</label>
        <input id="chart-year" type="number" min="2000" max="2100"
          step="1" placeholder="e.g. 2027" />

        <label for="chart-name">Chart name</label>
        <input id="chart-name" type="text" maxlength="100"
          placeholder="e.g. 2027 Little League Age Chart" />

        <div id="chart-import-feedback" role="status"
          aria-live="polite"></div>

        <button id="chart-import-button" type="button"
          class="secondary-button" disabled>
          Import chart
        </button>
        <hr class="directory-divider" />
      </div>

      <div class="account-actions">
        <button type="submit" class="primary-button">
          Save season
        </button>
        <button id="cancel-season-button" type="button"
          class="secondary-button">
          Cancel
        </button>
      </div>
    </form>
  `}function Pc(e){let t=e.querySelector(`#season-form`);t&&(jc(t),ks(e,{buttonId:`#delete-season-button`,table:`seasons`,noun:`season`,getId:()=>J.editingSeasonId,inUseMessage:`This season can't be deleted because teams or games use it. Remove those first, or mark the season inactive instead.`,onDeleted:()=>{J.editingSeasonId=null}}),e.querySelector(`#cancel-season-button`)?.addEventListener(`click`,()=>{J.editingSeasonId=null,Os(e)}),t.addEventListener(`submit`,async n=>{n.preventDefault();let r=e.querySelector(`#league-setup-message`),i=new FormData(t),a=String(i.get(`name`)??``).trim(),o=String(i.get(`starts_on`)??``)||null,s=String(i.get(`ends_on`)??``)||null,c=String(i.get(`age_chart_id`)??``)||null,l=t.querySelector(`[name="is_active"]`)?.checked??!1;if(!a){r&&(r.textContent=`Enter a season name.`,r.className=`message error`);return}if(o&&s&&s<o){r&&(r.textContent=`The end date must be on or after the start date.`,r.className=`message error`);return}let u=J.editingSeasonId?J.loadedSeasons.find(e=>e.id===J.editingSeasonId)?.age_chart_id??null:null;if(J.editingSeasonId&&u&&c!==u&&!window.confirm(`This season already uses an age chart. Changing it changes the Little League ages calculated for this season. Change the chart?`))return;let d=t.querySelector(`button[type="submit"]`);d&&(d.disabled=!0,d.textContent=`Saving…`);let f={name:a,starts_on:o,ends_on:s,age_chart_id:c,is_active:l},p=J.editingSeasonId?await R.from(`seasons`).update(f).eq(`id`,J.editingSeasonId):await R.from(`seasons`).insert(f);if(p.error){r&&(r.textContent=`Could not save season: ${p.error.message}`,r.className=`message error`),d&&(d.disabled=!1,d.textContent=`Save season`);return}J.editingSeasonId=null,await Os(e);let m=e.querySelector(`#league-setup-message`);m&&(m.textContent=`Season saved successfully.`,m.className=`message success`)}))}function Fc(e){return e.youngest_ll_age===null||e.oldest_ll_age===null?``:e.youngest_ll_age===e.oldest_ll_age?` (LL age ${e.youngest_ll_age})`:` (LL ages ${e.youngest_ll_age}\u2013${e.oldest_ll_age})`}function Ic(){let e=J.loadedLeagues.length>1,t=J.teamSeasonFilter?J.loadedTeams.filter(e=>e.season_id===J.teamSeasonFilter):J.loadedTeams,n=`__none__`,r=t.filter(e=>!e.division_id).length,i=J.teamDivisionFilter===``?t:J.teamDivisionFilter===n?t.filter(e=>!e.division_id):t.filter(e=>e.division_id===J.teamDivisionFilter),a=`<option value="">All divisions (${t.length})</option>`+J.loadedDivisions.map(e=>`
      <option value="${V(e.id)}"
        ${e.id===J.teamDivisionFilter?`selected`:``}>
        ${V(e.name)}
        (${t.filter(t=>t.division_id===e.id).length})
      </option>
    `).join(``)+(r>0||J.teamDivisionFilter===n?`<option value="${n}" ${J.teamDivisionFilter===n?`selected`:``}>
          No division (${r})
        </option>`:``);return`
    <h3>Teams</h3>
    <button id="add-team-button" type="button" class="primary-button">
      Add team
    </button>
    <label for="team-season-filter">Show season</label>
    <select id="team-season-filter">${`<option value="">All seasons</option>`+J.loadedSeasons.map(e=>`
      <option value="${V(e.id)}"
        ${e.id===J.teamSeasonFilter?`selected`:``}>
        ${V(e.name)}
      </option>
    `).join(``)}</select>
    <label for="team-division-filter">Show division</label>
    <select id="team-division-filter">${a}</select>
    ${i.length?`<ul class="setup-list">${i.map(t=>{let n=J.loadedSeasons.find(e=>e.id===t.season_id),r=J.loadedDivisions.find(e=>e.id===t.division_id),i=J.loadedLeagues.find(e=>e.id===t.league_id),a=[n?n.name:`Unknown season`,r?r.name:`No division`,e&&i?i.name:``].filter(e=>e!==``).join(`, `);return`
        <li class="season-item">
          <div>
            <strong>${V(t.name)}</strong>
            <p class="season-dates">${V(a)}</p>
            <span class="setup-status">
              ${t.is_active?`Active`:`Inactive`}
            </span>
          </div>
          <button type="button"
            class="secondary-button season-edit-button"
            data-edit-team="${V(t.id)}">
            Edit
          </button>
        </li>
      `}).join(``)}</ul>`:`<p class="directory-empty">${J.loadedTeams.length===0?`No teams yet. Add the teams that play in each season.`:t.length===0?`No teams in this season yet.`:`No teams in this division.`}</p>`}
  `}function Lc(e,t){return`<option value="">No division</option>`+J.loadedDivisions.filter(n=>n.league_id===e&&(n.is_active||n.id===t)).map(e=>`
      <option value="${V(e.id)}"
        ${e.id===t?`selected`:``}>
        ${V(e.name+Fc(e))}
      </option>
    `).join(``)}function Rc(e){let t=J.loadedLeagues.filter(e=>e.is_active),n=J.loadedSeasons.filter(e=>e.is_active),r=e?e.league_id:t.length===1?t[0].id:``,i=e?e.season_id:n.some(e=>e.id===J.teamSeasonFilter)?J.teamSeasonFilter:n.length===1?n[0].id:``,a=e?`
      <p class="season-dates">
        League: ${V(J.loadedLeagues.find(t=>t.id===e.league_id)?.name??`Unknown league`)}
      </p>
      <p class="season-dates">
        Season: ${V(J.loadedSeasons.find(t=>t.id===e.season_id)?.name??`Unknown season`)}
      </p>
    `:`
      <label for="team-league">League</label>
      <select id="team-league" name="league_id" required>
        ${t.length===1?``:`<option value="">Choose a league</option>`}
        ${t.map(e=>`
          <option value="${V(e.id)}"
            ${e.id===r?`selected`:``}>
            ${V(e.name)}
          </option>
        `).join(``)}
      </select>

      <label for="team-season">Season</label>
      <select id="team-season" name="season_id" required>
        ${n.length===1?``:`<option value="">Choose a season</option>`}
        ${n.map(e=>`
          <option value="${V(e.id)}"
            ${e.id===i?`selected`:``}>
            ${V(e.name)}
          </option>
        `).join(``)}
      </select>
    `;return`
    <form id="team-form" class="create-umpire-form">
      <h3>${e?`Edit team`:`Add team`}</h3>

      ${a}

      <label for="team-name">Team name</label>
      <input id="team-name" name="name" required maxlength="100"
        value="${V(e?.name??``)}"
        placeholder="e.g. Tigers" />

      <label for="team-division">Division (optional)</label>
      <select id="team-division" name="division_id">
        ${Lc(r,e?.division_id??null)}
      </select>

      <label class="season-checkbox-label">
        <input name="is_active" type="checkbox"
          ${e?.is_active??!0?`checked`:``} />
        Active team
      </label>
      ${e?`<button id="delete-team-button" type="button"
            class="secondary-button">
            Delete team
          </button>`:``}

      <div class="account-actions">
        <button type="submit" class="primary-button">
          Save team
        </button>
        <button id="cancel-team-button" type="button"
          class="secondary-button">
          Cancel
        </button>
      </div>
    </form>
  `}function zc(e,t){let n=e.querySelector(`#team-editor`);n&&(J.editingTeamId=t?t.id:null,n.innerHTML=Rc(t),Bc(e),n.scrollIntoView({behavior:`smooth`}))}function Bc(e){let t=e.querySelector(`#team-form`);if(!t)return;ks(e,{buttonId:`#delete-team-button`,table:`teams`,noun:`team`,getId:()=>J.editingTeamId,inUseMessage:`This team can't be deleted because games use it. Move or remove those games first, or mark the team inactive instead.`,onDeleted:()=>{J.editingTeamId=null}}),e.querySelector(`#cancel-team-button`)?.addEventListener(`click`,()=>{J.editingTeamId=null,Os(e)});let n=t.querySelector(`#team-league`),r=t.querySelector(`#team-division`);n?.addEventListener(`change`,()=>{r&&(r.innerHTML=Lc(n.value,null))}),t.addEventListener(`submit`,async n=>{n.preventDefault();let r=e.querySelector(`#league-setup-message`),i=e=>{r&&(r.textContent=e,r.className=`message error`)},a=new FormData(t),o=String(a.get(`name`)??``).trim(),s=String(a.get(`division_id`)??``)||null,c=t.querySelector(`[name="is_active"]`)?.checked??!1,l=J.editingTeamId?J.loadedTeams.find(e=>e.id===J.editingTeamId)??null:null,u,d;if(l)u=l.league_id,d=l.season_id;else{if(u=String(a.get(`league_id`)??``),d=String(a.get(`season_id`)??``),!J.loadedLeagues.some(e=>e.id===u)){i(`Choose a league.`);return}if(!J.loadedSeasons.some(e=>e.id===d)){i(`Choose a season.`);return}}if(!o){i(`Enter a team name.`);return}if(s&&!J.loadedDivisions.some(e=>e.id===s&&e.league_id===u)){i(`Choose a division that belongs to the team's league.`);return}let f=t.querySelector(`button[type="submit"]`);f&&(f.disabled=!0,f.textContent=`Saving…`);let p={name:o,division_id:s,is_active:c},m=l?await R.from(`teams`).update(p).eq(`id`,l.id):await R.from(`teams`).insert({...p,league_id:u,season_id:d});if(m.error){i(m.error.code===`23505`?`A team with that name already exists in this league and season. Choose a different name.`:`Could not save team: ${m.error.message}`),f&&(f.disabled=!1,f.textContent=`Save team`);return}J.editingTeamId=null,await Os(e);let h=e.querySelector(`#league-setup-message`);h&&(h.textContent=`Team saved successfully.`,h.className=`message success`)})}var Vc=null,Hc=new WeakMap;async function Uc(e,t){let n=t??Hc.get(e)??`all`;Hc.set(e,n);let r=n!==`locations`,i=n!==`setup`,a=n===`locations`?`Locations`:`League Setup`;e.innerHTML=`
    <section class="directory-section">
      <h2>${a}</h2>
      <p class="directory-description">Loading setup records…</p>
    </section>
  `;let[o,s,c,l,u,d]=await Promise.all([R.from(`leagues`).select(`id, name, is_active, unconfirmed_warning_days, self_assign_max_games`).order(`name`),R.from(`seasons`).select(`id, name, starts_on, ends_on, is_active, age_chart_id`).order(`starts_on`,{ascending:!1}),R.from(`divisions`).select(`id, name, age_group, league_id, description, youngest_ll_age, oldest_ll_age, umpires_per_game, tournament_umpires, allow_self_assign, is_active`).order(`name`),R.from(`locations`).select(`id, name, address, notes, is_active, is_league_field, directions`).order(`name`),R.from(`little_league_age_charts`).select(`id, chart_year, name`).order(`chart_year`,{ascending:!1}).order(`name`),R.from(`teams`).select(`id, league_id, season_id, division_id, name, is_active`).order(`name`)]),f=o.error??s.error??c.error??l.error??u.error??d.error;if(f){let t=f.code===`42703`||/column .* does not exist|schema cache/i.test(f.message);e.innerHTML=`
      <section class="directory-section">
        <h2>${a}</h2>
        <p class="message error">
          Unable to load setup records. Refresh and try again.
        </p>
        <p class="season-dates">Details from the database: ${V(f.message)}</p>
        ${t?`<p class="season-dates">This usually means a database change has not been applied to the
              database this app is connected to. Apply the newest migration to it (see the FAQ,
              "Apply a database change to the test project"), then refresh.</p>`:``}
      </section>
    `,console.error(`League setup load failed:`,f.message);return}let p=o.data??[],m=s.data??[],h=Va(c.data??[]),g=l.data??[],_=d.data??[];J.ageCharts=u.data??[],J.loadedSeasons=m,J.loadedLeagues=p,J.loadedDivisions=h,J.loadedTeams=_;let v=J.editingLeagueId?p.find(e=>e.id===J.editingLeagueId)??null:null,y=J.editingTeamId?_.find(e=>e.id===J.editingTeamId)??null:null,b=J.editingLocationId?g.find(e=>e.id===J.editingLocationId)??null:null,x=J.editingDivisionId?h.find(e=>e.id===J.editingDivisionId)??null:null,S=J.editingSeasonId?m.find(e=>e.id===J.editingSeasonId)??null:null;e.innerHTML=`
    <section class="directory-section">
      <div class="directory-header">
        <div>
          <h2>${a}</h2>
          <p class="directory-description">
            ${n===`locations`?`The fields where games are played.`:n===`setup`?`Configure leagues, seasons, divisions and teams.`:`Configure leagues, seasons, divisions, and game locations.`}
          </p>
        </div>
        <div class="header-actions">
          ${r?`<button id="import-season-button"
            class="secondary-button" type="button">Create a season from a file</button>`:``}
          <button id="refresh-league-setup"
            class="secondary-button" type="button">Refresh</button>
        </div>
      </div>

      <p id="league-setup-message" class="message"
        role="status" aria-live="polite"></p>

      ${r?`
        <div id="season-import-editor"></div>

        <div id="league-editor">
          ${v?zs(v):``}
        </div>

        <div id="season-editor">
          ${S?Nc(S):``}
        </div>

        <div id="division-editor">
          ${x?Fs(x,p):``}
        </div>

        <div id="team-editor">
          ${y?Rc(y):``}
        </div>
      `:``}

      ${i?`
        <div id="location-editor">
          ${b?Hs(b):``}
        </div>
      `:``}

      <div class="setup-grid">
        ${r?`
          ${Rs(p)}
          ${Mc(m)}
          ${Ps(h,p)}
          <section id="teams-panel" class="setup-panel">
            ${Ic()}
          </section>
        `:``}
        ${i?Vs(g):``}
      </div>
    </section>
  `,e.querySelector(`#refresh-league-setup`)?.addEventListener(`click`,()=>{J.editingSeasonId=null,J.editingLeagueId=null,J.editingDivisionId=null,J.editingLocationId=null,J.editingTeamId=null,Uc(e)}),e.querySelector(`#import-season-button`)?.addEventListener(`click`,()=>{let t=e.querySelector(`#season-import-editor`);t&&(Tc(t,{leagues:p,seasons:m,divisions:h,teams:_,onClose:()=>{t.innerHTML=``},onImported:(t,n)=>{Vc=t,n&&(J.teamSeasonFilter=n),Uc(e)}}),t.scrollIntoView({behavior:`smooth`,block:`start`}))}),e.querySelector(`#add-league-button`)?.addEventListener(`click`,()=>{J.editingLeagueId=null;let t=e.querySelector(`#league-editor`);t&&(t.innerHTML=zs(null),Bs(e),t.scrollIntoView({behavior:`smooth`}))}),e.querySelectorAll(`[data-edit-league]`).forEach(t=>{t.addEventListener(`click`,()=>{J.editingLeagueId=t.dataset.editLeague??null;let n=p.find(e=>e.id===J.editingLeagueId),r=e.querySelector(`#league-editor`);n&&r&&(r.innerHTML=zs(n),Bs(e),r.scrollIntoView({behavior:`smooth`}))})}),v&&Bs(e);let C=e.querySelector(`#teams-panel`);if(C?.addEventListener(`click`,t=>{let n=t.target;if(!(n instanceof Element))return;if(n.closest(`#add-team-button`)){if(!p.some(e=>e.is_active)||!m.some(e=>e.is_active)){let t=e.querySelector(`#league-setup-message`);t&&(t.textContent=`Add an active league and an active season before you create teams.`,t.className=`message error`);return}zc(e,null);return}let r=n.closest(`[data-edit-team]`);if(r){let t=_.find(e=>e.id===r.dataset.editTeam);t&&zc(e,t)}}),C?.addEventListener(`change`,e=>{let t=e.target;t instanceof HTMLSelectElement&&t.id===`team-season-filter`&&(J.teamSeasonFilter=t.value,C.innerHTML=Ic()),t instanceof HTMLSelectElement&&t.id===`team-division-filter`&&(J.teamDivisionFilter=t.value,C.innerHTML=Ic())}),y&&Bc(e),e.querySelector(`#add-location-button`)?.addEventListener(`click`,()=>{J.editingLocationId=null;let t=e.querySelector(`#location-editor`);t&&(t.innerHTML=Hs(null),Us(e),t.scrollIntoView({behavior:`smooth`}))}),e.querySelectorAll(`[data-edit-location]`).forEach(t=>{t.addEventListener(`click`,()=>{J.editingLocationId=t.dataset.editLocation??null;let n=g.find(e=>e.id===J.editingLocationId),r=e.querySelector(`#location-editor`);n&&r&&(r.innerHTML=Hs(n),Us(e),r.scrollIntoView({behavior:`smooth`}))})}),b&&Us(e),e.querySelector(`#add-division-button`)?.addEventListener(`click`,()=>{let t=e.querySelector(`#league-setup-message`);if(!p.some(e=>e.is_active)){t&&(t.textContent=`Add an active league before you create divisions.`,t.className=`message error`);return}J.editingDivisionId=null;let n=e.querySelector(`#division-editor`);n&&(n.innerHTML=Fs(null,p),Is(e),n.scrollIntoView({behavior:`smooth`}))}),e.querySelectorAll(`[data-edit-division]`).forEach(t=>{t.addEventListener(`click`,()=>{J.editingDivisionId=t.dataset.editDivision??null;let n=h.find(e=>e.id===J.editingDivisionId),r=e.querySelector(`#division-editor`);n&&r&&(r.innerHTML=Fs(n,p),Is(e),r.scrollIntoView({behavior:`smooth`}))})}),x&&Is(e),e.querySelector(`#add-season-button`)?.addEventListener(`click`,()=>{J.editingSeasonId=null;let t=e.querySelector(`#season-editor`);t&&(t.innerHTML=Nc(null),Pc(e),t.scrollIntoView({behavior:`smooth`}))}),e.querySelectorAll(`[data-edit-season]`).forEach(t=>{t.addEventListener(`click`,()=>{J.editingSeasonId=t.dataset.editSeason??null;let n=m.find(e=>e.id===J.editingSeasonId),r=e.querySelector(`#season-editor`);n&&r&&(r.innerHTML=Nc(n),Pc(e),r.scrollIntoView({behavior:`smooth`}))})}),S&&Pc(e),Vc){let t=e.querySelector(`#league-setup-message`);t&&(t.textContent=Vc,t.className=`message success`),Vc=null}}Ds(Uc);var Wc={youth_umpire:`adult_umpire`,adult_umpire:`youth_umpire`},Gc=``;function Kc(e){let t=e.replace(/_/g,` `);return t.charAt(0).toUpperCase()+t.slice(1)}function qc(e){return e.display_name||e.email||`Name not provided`}function Jc(e,t,n,r,i){let a=n.length?`<ul class="role-chips">${n.map(n=>{let i=t.find(e=>e.id===n),a=!(r&&n===`super_admin`);return`
          <li class="role-chip" title="${V(i?.description??``)}">
            <span>${V(Kc(n))}</span>
            ${a?`<button type="button" class="role-chip-remove"
                  data-remove-role="${V(n)}"
                  data-user-id="${V(e.id)}"
                  aria-label="Remove ${V(Kc(n))} from ${V(qc(e))}">
                  &times;
                </button>`:``}
          </li>
        `}).join(``)}</ul>`:`<p class="role-chip-none">No roles yet</p>`,o=t.filter(e=>{if(n.includes(e.id))return!1;let t=Wc[e.id];return!(t&&n.includes(t))}),s=o.length?`
      <div class="role-add">
        <select data-add-select="${V(e.id)}"
          aria-label="Role to add for ${V(qc(e))}">
          <option value="">Add a role&hellip;</option>
          ${o.map(e=>`
            <option value="${V(e.id)}">
              ${V(Kc(e.id))}
            </option>
          `).join(``)}
        </select>
        <button type="button" class="secondary-button"
          data-add-role="${V(e.id)}">
          Add
        </button>
      </div>
    `:``;return`
    <li class="role-account"
      data-search="${V(`${e.display_name??``} ${e.email??``} ${i??``}`.toLowerCase())}">
      <span class="role-account-name">
        ${V(qc(e))}${r?` (you)`:``}
      </span>
      <span class="role-account-email">
        ${V(e.email??`Email unavailable`)}
      </span>
      <span class="role-account-contact">
        Phone: ${V(i??`not on file`)}
      </span>
      ${a}
      ${s}
    </li>
  `}async function Yc(e){e.innerHTML=`
    <section class="directory-section">
      <h2>Roles</h2>
      <p class="directory-description">Loading accounts&hellip;</p>
    </section>
  `;let[t,n,r,i,a,o]=await Promise.all([R.from(`profiles`).select(`id, display_name, email, account_status`).eq(`account_status`,`approved`).order(`display_name`),R.from(`roles`).select(`id, description`).order(`id`),R.from(`user_roles`).select(`user_id, role_id`),R.auth.getSession(),R.from(`umpires`).select(`profile_id, phone`),R.from(`account_contact`).select(`profile_id, phone`)]),s=t.error??n.error??r.error;if(s){e.innerHTML=`
      <section class="directory-section">
        <h2>Roles</h2>
        <p class="message error">
          Unable to load accounts and roles. Refresh and try again.
        </p>
      </section>
    `,console.error(`Role manager load failed:`,s.message);return}let c=t.data??[],l=n.data??[],u=r.data??[],d=i.data.session?.user.id??null;a.error&&console.error(`Phone numbers not loaded:`,a.error.message),o.error&&console.error(`Account phones not loaded:`,o.error.message);let f=new Map;for(let e of o.data??[])e.phone&&f.set(e.profile_id,e.phone);let p=new Map;for(let e of a.data??[])e.profile_id&&e.phone&&p.set(e.profile_id,e.phone);let m=e=>u.filter(t=>t.user_id===e).map(e=>e.role_id).sort();e.innerHTML=`
    <section class="directory-section" id="role-manager">
      <div class="directory-header">
        <div>
          <h2>Roles</h2>
          <p class="directory-description">
            Choose what each approved account is allowed to do.
            Only super admins can change roles.
          </p>
        </div>
        <button id="refresh-roles" class="secondary-button"
          type="button">Refresh</button>
      </div>

      <details class="role-legend">
        <summary>What each role allows</summary>
        <ul>
          ${l.map(e=>`
            <li>
              <strong>${V(Kc(e.id))}</strong>:
              ${V(e.description)}
            </li>
          `).join(``)}
        </ul>
      </details>

      <p id="role-manager-message" class="message"
        role="status" aria-live="polite"></p>

      <label for="role-search">Search accounts</label>
      <input id="role-search" type="search"
        placeholder="Search by name or email"
        value="${V(Gc)}" />

      ${c.length?`<ul class="role-list">${c.map(e=>Jc(e,l,m(e.id),e.id===d,f.get(e.id)??p.get(e.id)??null)).join(``)}</ul>
          <p id="role-no-match" class="directory-empty" hidden>
            No accounts match your search.
          </p>`:`<p class="directory-empty">
            There are no approved accounts yet. Approve an account first.
          </p>`}
    </section>
  `;let h=e.querySelector(`#role-manager`);if(!h)return;let g=(e,t)=>{let n=h.querySelector(`#role-manager-message`);n&&(n.textContent=e,n.className=`message ${t}`)},_=()=>{let e=Gc.trim().toLowerCase(),t=0;h.querySelectorAll(`.role-account`).forEach(n=>{let r=!e||(n.dataset.search??``).includes(e);n.hidden=!r,r&&t++});let n=h.querySelector(`#role-no-match`);n&&(n.hidden=t>0)};_(),h.querySelector(`#role-search`)?.addEventListener(`input`,e=>{Gc=e.target.value,_()}),h.querySelector(`#refresh-roles`)?.addEventListener(`click`,()=>{Yc(e)});let v=async(t,n)=>{await Yc(e);let r=e.querySelector(`#role-manager-message`);r&&(r.textContent=t,r.className=`message ${n}`)};h.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`[data-remove-role]`);if(n){let e=n.dataset.userId??``,t=n.dataset.removeRole??``,r=c.find(t=>t.id===e),i=r?qc(r):`this account`,a=t===`super_admin`?` They will lose all administrator access.`:``;if(!window.confirm(`Remove the "${Kc(t)}" role from ${i}?${a}`))return;n.disabled=!0,(async()=>{let{data:r,error:a}=await R.from(`user_roles`).delete().eq(`user_id`,e).eq(`role_id`,t).select(`user_id`);a||!r||r.length===0?(g(a?`Could not remove the role: ${a.message}`:`The role was not removed. You may not have permission, or it was already removed.`,`error`),n.disabled=!1):await v(`Removed ${Kc(t)} from ${i}.`,`success`)})();return}let r=t.closest(`[data-add-role]`);if(r){let e=r.dataset.addRole??``,t=h.querySelector(`select[data-add-select="${CSS.escape(e)}"]`)?.value??``,n=c.find(t=>t.id===e),i=n?qc(n):`this account`;if(!t){g(`Choose a role to add first.`,`error`);return}r.disabled=!0,(async()=>{let{error:n}=await R.from(`user_roles`).insert({user_id:e,role_id:t,granted_by:d});n?(g(n.code===`23505`?`${i} already has that role.`:`Could not add the role: ${n.message}`,`error`),r.disabled=!1):await v(`Added ${Kc(t)} to ${i}.`,`success`)})()}})}function Xc(e,t){let n=Date.parse(t)-Date.parse(e);return n>0?Math.max(1,Math.round(n/6e4)):0}function Zc(e,t,n=`Arrived`){let r=Xc(e,t);return`${n} ${W(t)}${r>0?` \u00b7 ${r} min late`:``}`}function Qc(e,t,n){if(e.status===`canceled`)return{kind:`closed`};if(t.attendance===`arrived`&&t.arrived_at)return{kind:`done`,arrivedAt:t.arrived_at};if(e.status===`completed`)return{kind:`closed`};let r=Date.parse(e.starts_at),i=Date.parse(e.ends_at),a=n.getTime();if(a>i)return{kind:`over`,noShow:t.attendance===`no_show`};let o=r-36e5;return a<o?{kind:`early`,opensAt:new Date(o).toISOString()}:{kind:`open`,markedNoShow:t.attendance===`no_show`}}var $c=[`Rain`,`Wet field`,`Unsafe conditions`,`Other`],el=(e,t,n)=>`${e} ${e===1?t:n}`;function tl(e,t,n){return e.games.filter(e=>{let r=Date.parse(e.startsAt);return(e.status===`draft`||e.status===`scheduled`)&&r>=t&&r<n})}function nl(e,t,n){let r=new Date(`${e}T${t||`00:00`}:00`),i=n?new Date(`${e}T${n}:00`):new Date(`${e}T00:00:00`);return n||i.setDate(i.getDate()+1),Number.isNaN(r.getTime())||Number.isNaN(i.getTime())||i.getTime()<=r.getTime()?null:{from:r,to:i}}function rl(e){return[...new Set(e.flatMap(e=>e.slots.map(e=>e.umpireId)).filter(e=>!!e))]}function il(e){if(e.length===0)return`No games would be canceled in that time.`;let t=e.map(e=>W(e.startsAt)).join(`, `),n=rl(e).length;return`This will cancel ${el(e.length,`game`,`games`)} (${t}) and tell ${el(n,`umpire`,`umpires`)}.`}function al(e,t){let n=t.trim();return e===`Other`||e===``?n:n?`${e}: ${n}`:e}function ol(e){if((Date.parse(e.closes_to)-Date.parse(e.closes_from))/36e5>=23)return`all day`;let t=new Date(e.closes_to);return t.getHours()===0&&t.getMinutes()===0?`from ${W(e.closes_from)} on`:`${W(e.closes_from)} to ${W(e.closes_to)}`}function sl(e,t){let n=e.fields.map(e=>({field:e,count:tl(e,-1/0,1/0).length})).filter(e=>e.count>0),r=t=>e.fields.find(e=>e.locationId===t)?.name??`A field`,i=t.length===0?``:`
      <h3 class="closure-list-title">Closed today</h3>
      <ul class="closure-list">
        ${t.map(e=>`
          <li class="closure-item${e.reopened_at?` closure-reopened`:``}">
            <span><strong>${V(r(e.location_id))}</strong>, ${V(ol(e))}:
              ${V(e.reason)}
              (${V(el(e.games,`game`,`games`))} canceled by ${V(e.created_by_name)})
              ${e.reopened_at?`<em>Reopened by ${V(e.reopened_by_name??`an administrator`)}.</em>`:``}</span>
            ${e.reopened_at?``:`<button type="button" class="secondary-button" data-reopen="${V(e.id)}">Reopen</button>`}
          </li>`).join(``)}
      </ul>`;return`
    <details class="board-closure" id="board-closure-box"${t.some(e=>!e.reopened_at)?` open`:``}>
      <summary>Rainout: close a field</summary>
      ${n.length===0?`<p class="closure-none">There are no games left to cancel on this day.</p>`:`
        <form id="closure-form" class="closure-form">
          <label>Field
            <select id="closure-field">
              ${n.map(({field:e,count:t})=>`<option value="${V(e.locationId)}">${V(e.name)} (${V(el(t,`game`,`games`))})</option>`).join(``)}
            </select>
          </label>
          <label>From <input id="closure-from" type="time" /></label>
          <label>To <input id="closure-to" type="time" /></label>
          <p class="closure-help">Leave the times blank to close the field for the whole day.</p>
          <label>Reason
            <select id="closure-reason">
              ${$c.map(e=>`<option>${V(e)}</option>`).join(``)}
            </select>
          </label>
          <label>Details <input id="closure-details" maxlength="150" placeholder="optional (required for Other)" /></label>
          <p id="closure-preview" class="closure-preview" role="status" aria-live="polite"></p>
          <button type="submit" class="primary-button">Cancel these games</button>
        </form>`}
      ${i}
    </details>`}var cl=1e3;function ll(e){return`${U(e)} \u00b7 ${W(e)}`}function ul(e,t,n){let r=t.length===0?``:`
      <h4 class="notes-title">Notes (${t.length})</h4>
      <ul class="notes-list">
        ${t.map(e=>`
          <li class="note" data-note="${V(e.id)}">
            <span class="note-meta"><strong>${V(e.author_name)}</strong> &middot; ${V(ll(e.created_at))}${e.admin_only?` <span class="board-tag board-tag-warn note-private-tag">Administrators only</span>`:``}</span>
            <span class="note-body">${V(e.body)}</span>
            ${n.canRemove?`<button type="button" class="secondary-button note-remove" data-note-remove="${V(e.id)}" aria-label="Remove the note by ${V(e.author_name)}">Remove</button>`:``}
          </li>`).join(``)}
      </ul>`;return`
    <div class="notes" data-notes-for="${V(e)}">
      ${r}
      <p class="note-message message" role="status" aria-live="polite"></p>
      <details class="note-add">
        <summary>Add a note</summary>
        <form class="note-form" data-game="${V(e)}">
          <label>Note
            <textarea class="note-text" rows="3" maxlength="${cl}" required
              placeholder="For example: the field is closed, use Field B"></textarea>
          </label>
          <label class="note-private">
            <input type="checkbox" class="note-admin-only" />
            Only administrators can read this note
          </label>
          <p class="note-help">
            Everyone on this game, and the administrators, can read a note unless you tick the box.
            Please do not write medical details: for an injury, say only that one happened (use
            initials, not a full name) and tell an administrator.
          </p>
          <div class="note-actions">
            <button type="submit" class="primary-button">Save note</button>
          </div>
        </form>
      </details>
    </div>`}function dl(e){return e.map(e=>`<div class="print-note"><strong>${V(e.author_name)}</strong> (${V(ll(e.created_at))}): ${V(e.body)}</div>`).join(``)}var fl=[`plate`,`first_base`,`second_base`,`third_base`,`field`],pl={plate:`Plate`,first_base:`1B`,second_base:`2B`,third_base:`3B`,field:`Field`},ml={plate:`Plate`,first_base:`First base`,second_base:`Second base`,third_base:`Third base`,field:`Field`},hl={0:[],1:[`plate`],2:[`plate`,`field`],3:[`plate`,`first_base`,`third_base`],4:[`plate`,`first_base`,`second_base`,`third_base`]};function gl(e){return hl[Math.max(0,Math.min(4,Math.trunc(e)||0))]}function _l(e){return e===0?`No umpire needed`:`${e} ${e===1?`umpire`:`umpires`}`}function vl(e,t){return e?t===`tournament`&&e.tournament_umpires!==null&&e.tournament_umpires!==void 0?e.tournament_umpires:e.umpires_per_game??2:2}function yl(e,t){return e.umpires_needed??t(e.division_id,e.game_type)}function bl(e,t){let n=fl.filter(t=>e[t]).length,r=Math.max(0,t-n),i={};for(let t of fl)i[t]=e[t]?`assigned`:`not_needed`;for(let n of gl(t))!e[n]&&r>0&&(i[n]=`open`,--r);return i}function xl(e,t){let n=bl(e,t);return fl.filter(e=>n[e]===`open`)}function Sl(e){let t=new Map;for(let n of e){let e=t.get(n.game_id)??{};e[n.position]=n.umpire_id,t.set(n.game_id,e)}return t}function Cl(e,t){return Date.parse(e.starts_at)<Date.parse(t.ends_at)&&Date.parse(t.starts_at)<Date.parse(e.ends_at)}function wl(e,t,n,r){let i=new Set(r.filter(t=>t.umpire_id===e).map(e=>e.game_id));return n.filter(e=>e.id!==t.id&&i.has(e.id)&&e.status!==`canceled`&&Cl(t,e))}function Tl(e,t,n){let r=new Set(t.filter(e=>e.status!==`canceled`).map(e=>e.id));return n.filter(t=>t.umpire_id===e&&r.has(t.game_id)).length}var El=(e,t)=>e.localeCompare(t,void 0,{numeric:!0});function Dl(e,t){return(e.status===`draft`||e.status===`scheduled`)&&Date.parse(e.ends_at)>t.getTime()}function Ol(e){let t=new Map;for(let n of e){let e=t.get(n.game_id)??[];e.push(n),t.set(n.game_id,e)}return t}function kl(e,t){return e.status===`canceled`?0:yl(e,(e,n)=>vl(t.get(e),n))}function Al(e,t,n){let r={};for(let e of t)r[e.position]=e;let i=kl(e,n);return{assigned:r,needed:i,open:xl(r,i)}}function jl(e,t){let n=new Map(e.divisions.map(e=>[e.id,e])),r=new Map(e.locations.map(e=>[e.id,e])),i=Ol(e.assignments),a={games:0,canceled:0,fields:0,needed:0,open:0,unconfirmed:0,notHere:0,noShows:0},o=new Map,s=(t,n)=>t?e.teamNames.get(t)??`Unknown team`:n??`To be decided`;for(let c of e.games){if(G(c.starts_at)!==t)continue;let{assigned:l,needed:u,open:d}=Al(c,i.get(c.id)??[],n),f=Dl(c,e.now),p=[];if(c.status!==`canceled`)for(let t of fl){let n=l[t];if(n){let r=Date.parse(c.starts_at)<=e.now.getTime(),i=n.attendance===`arrived`?`arrived`:n.attendance===`no_show`?`no_show`:f&&r?`not_yet`:null;p.push({position:t,state:n.status===`confirmed`?`confirmed`:`assigned`,name:e.umpireNames.get(n.umpire_id)??`Unknown umpire`,selfAssigned:n.self_assigned,umpireId:n.umpire_id,here:i,arrivedAt:n.attendance===`arrived`?n.arrived_at??null:null})}else d.includes(t)&&p.push({position:t,state:`open`,name:null,selfAssigned:!1,umpireId:null,here:null,arrivedAt:null})}let m={id:c.id,startsAt:c.starts_at,endsAt:c.ends_at,status:c.status,gameType:c.game_type,division:n.get(c.division_id)?.name??`Unknown division`,home:s(c.home_team_id,c.home_label),away:s(c.away_team_id,c.away_label),notes:c.notes,slots:p,finished:!f},h=r.get(c.location_id),g=o.get(c.location_id);g||(g={locationId:c.location_id,name:h?.name??`Unknown field`,address:h?.address??null,directions:h?.directions??null,league:!!h?.is_league_field,games:[]},o.set(c.location_id,g)),g.games.push(m),c.status===`canceled`?a.canceled+=1:(a.games+=1,a.noShows+=p.filter(e=>e.here===`no_show`).length,f&&(a.notHere+=p.filter(e=>e.here===`not_yet`).length,a.needed+=u,a.open+=d.length,a.unconfirmed+=p.filter(e=>e.state===`assigned`).length))}let c=[...o.values()];for(let e of c)e.games.sort((e,t)=>Date.parse(e.startsAt)-Date.parse(t.startsAt)||Date.parse(e.endsAt)-Date.parse(t.endsAt)||e.id.localeCompare(t.id));c.sort((e,t)=>Number(t.league)-Number(e.league)||El(e.name,t.name)),a.fields=c.filter(e=>e.games.some(e=>e.status!==`canceled`)).length;let l=new Set(c.map(e=>e.locationId));return{dayKey:t,fields:c,emptyLeagueFields:e.locations.filter(e=>e.is_league_field&&e.is_active&&!l.has(e.id)).map(e=>e.name).sort(El),summary:a}}function Ml(e,t,n,r){let i=new Map(n.map(e=>[e.id,e])),a=Ol(t),o=new Map;for(let t of e){let e=G(t.starts_at),n=o.get(e)??{games:0,canceled:0,open:0};t.status===`canceled`?n.canceled+=1:(n.games+=1,Dl(t,r)&&(n.open+=Al(t,a.get(t.id)??[],i).open.length)),o.set(e,n)}return o}var Nl=(e,t,n)=>`${e} ${e===1?t:n}`;function Pl(e){return fo(new Date(`${e}T12:00:00`).toISOString())}function Fl(e,t,n,r,i){let a=new Date(e,t,1),o=a.toLocaleDateString(`en-US`,{month:`long`,year:`numeric`}),s=new Date(e,t+1,0).getDate(),c=[`Su`,`Mo`,`Tu`,`We`,`Th`,`Fr`,`Sa`],l=[`Sunday`,`Monday`,`Tuesday`,`Wednesday`,`Thursday`,`Friday`,`Saturday`],u=[];for(let o=1;o<=s;o++){let s=H(new Date(e,t,o)),c=n.get(s),d=c?.games??0,f=c?.open??0,p=`${l[new Date(e,t,o).getDay()]}, ${a.toLocaleDateString(`en-US`,{month:`long`})} ${o}: ${d===0?`no games`:Nl(d,`game`,`games`)}`;c&&c.canceled>0&&(p+=`, ${c.canceled} canceled`),f>0&&(p+=`, ${Nl(f,`place needs`,`places need`)} an umpire`);let m=[`cal-day`,`board-day`];d>0&&m.push(`board-has`),f>0&&m.push(`board-open`),s===r&&m.push(`board-selected`),s===i&&m.push(`board-today`),u.push(`
      <button type="button" class="${m.join(` `)}" data-board-day="${s}"
        ${s===r?`aria-current="date"`:``}
        title="${V(p)}" aria-label="${V(p)}">
        <span class="board-daynum">${o}</span>${d>0?`<span class="board-count">${d}</span>`:``}
      </button>`)}return`
    <div class="cal board-cal">
      <div class="cal-head">
        <button type="button" class="secondary-button cal-nav" data-board-month="-1" aria-label="Previous month">&lsaquo;</button>
        <strong class="cal-title" aria-live="polite">${V(o)}</strong>
        <button type="button" class="secondary-button cal-nav" data-board-month="1" aria-label="Next month">&rsaquo;</button>
      </div>
      <div class="cal-grid">
        ${c.map((e,t)=>`<span class="cal-dow" title="${l[t]}">${e}</span>`).join(``)}
        ${Array.from({length:a.getDay()},()=>`<span class="cal-blank"></span>`).join(``)}
        ${u.join(``)}
      </div>
      <ul class="cal-key">
        <li><span class="board-keynum">12</span> number of games that day (canceled games are not counted)</li>
        <li><span class="board-keydot"></span> places still need an umpire</li>
        <li><span class="board-keyring"></span> today</li>
      </ul>
    </div>
  `}function Il(e){return Pl(e)}function Ll(e){if(e.games===0&&e.canceled===0)return`No games on this day.`;let t=[Nl(e.games,`game`,`games`),Nl(e.fields,`field`,`fields`)];return e.canceled>0&&t.push(`${e.canceled} canceled`),e.needed>0&&t.push(e.open>0?`${Nl(e.open,`place needs`,`places need`)} an umpire`:`every place has an umpire`),e.unconfirmed>0&&t.push(`${e.unconfirmed} not confirmed yet`),e.notHere>0&&t.push(`${e.notHere} not here yet`),e.noShows>0&&t.push(Nl(e.noShows,`no-show`,`no-shows`)),t.join(` · `)}var Rl={draft:`Draft`,canceled:`Canceled`,completed:`Completed`};function zl(e,t,n,r){let i=Do(t);return`<span class="board-contact">${n?`<span class="board-contact-label">${n}</span> `:``}<a class="board-call" href="tel:${V(i)}" aria-label="Call ${V(e)} at ${V(t)}">Call</a>${r?` <a class="board-call" href="sms:${V(i)}" aria-label="Text ${V(e)} at ${V(t)}">Text</a>`:``} <span class="board-phone">${V(t)}</span>${r?``:` <span class="board-note">(calls only)</span>`}</span>`}function Bl(e,t){if(!t)return``;let n=[t.own?zl(e,t.own,t.youth?`Own`:``,!!t.ownText):``,t.youth&&t.parent?zl(e,t.parent,`Parent`,!1):``].filter(Boolean);return n.length?`<span class="board-contacts">${n.join(` `)}</span>`:`<span class="board-contacts board-note">${V(wo(t))}</span>`}var Vl=Bl;function Hl(e,t,n){let r=e.umpireId?n?.get(`${t.id}:${e.umpireId}`):void 0;return!r||e.here===`arrived`||t.finished?``:`<span class="board-tag board-tag-warn">Running late: about ${r.minutes} min (told us ${V(W(r.reported_at))})</span>`}function Ul(e,t){if(e.here===`arrived`&&e.arrivedAt){let n=Zc(t.startsAt,e.arrivedAt);return`<span class="board-tag ${/late/.test(n)?`board-tag-warn`:``}">${V(n)}</span>`}return e.here===`no_show`?`<span class="board-tag board-tag-bad">No-show</span>`:e.here===`not_yet`?`<span class="board-tag board-tag-warn">Not here yet</span>`:``}function Wl(e,t){if(!e.umpireId||t.status===`canceled`)return``;let n=`data-game="${V(t.id)}" data-umpire="${V(e.umpireId)}"`,r=V(e.name??`this umpire`);return`
    <details class="board-mark" data-day="${V(G(t.startsAt))}">
      <summary aria-label="Record attendance for ${r}">Mark</summary>
      <div class="board-mark-body">
        <label>Arrived at <input type="time" class="board-mark-time" aria-label="Arrival time for ${r}; the current time is filled in" /></label>
        <button type="button" class="secondary-button" data-mark="arrived" ${n}>Arrived</button>
        <button type="button" class="secondary-button" data-mark="no_show" ${n}>No-show</button>
        ${e.here===`arrived`||e.here===`no_show`?`<button type="button" class="secondary-button" data-mark="clear" ${n}>Clear</button>`:``}
      </div>
    </details>`}function Gl(e,t,n,r){let i=`<span class="board-pos">${V(pl[e.position])}</span>`;if(e.state===`open`)return`<li class="board-ump board-ump-open">${i} <strong>${t.finished?`No umpire recorded`:`Needs an umpire`}</strong>
      ${t.finished?``:`<button type="button" class="secondary-button board-find" data-find-game="${V(t.id)}" data-find-position="${V(e.position)}">Find an umpire</button>`}
      <div class="board-find-panel" data-find-panel="${V(t.id)}:${V(e.position)}" hidden></div></li>`;let a=e.state===`confirmed`?`<span class="board-tag">Confirmed</span>`:`<span class="board-tag board-tag-warn">Not confirmed</span>`,o=[e.umpireId?Bl(e.name??`this umpire`,n?.get(e.umpireId)):``,Wl(e,t)].filter(Boolean).join(`
`);return`<li class="board-ump board-ump-${e.state}">${i} ${V(e.name??``)} ${t.finished&&e.state===`assigned`?``:a}${e.selfAssigned?` <span class="board-note">(took it themselves)</span>`:``} ${Ul(e,t)} ${Hl(e,t,r)}
    ${o?`<div class="board-ump-actions">${o}</div>`:``}</li>`}function Kl(e,t,n,r){let i=[Rl[e.status]?`<span class="board-badge board-badge-${e.status}">${Rl[e.status]}</span>`:``,e.gameType===`regular`?``:`<span class="board-badge">${V(e.gameType)}</span>`].join(` `);return`
    <li class="board-game board-status-${e.status}" data-board-game="${V(e.id)}">
      <div class="board-time">${V(ho(e.startsAt,e.endsAt))}</div>
      <div class="board-main">
        <div class="board-teams">
          <span class="board-division">${V(e.division)}</span>
          <strong>${V(e.home)}</strong> vs <strong>${V(e.away)}</strong>
          ${i}
        </div>
        ${e.notes?`<p class="board-note">${V(e.notes)}</p>`:``}
        ${e.slots.length?`<ul class="board-umps">${e.slots.map(n=>Gl(n,e,t,r)).join(``)}</ul>`:``}
        ${ul(e.id,n?.get(e.id)??[],{canRemove:!0})}
      </div>
    </li>`}function ql(e,t,n,r){let i=(r?.closures??[]).filter(t=>t.location_id===e.locationId&&!t.reopened_at),a=r?.access?.get(e.locationId),o=e.address?` <a class="board-map" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(e.address)}" target="_blank" rel="noopener">${V(e.address)}</a>`:``;return`
    <section class="board-field" data-board-field="${V(e.locationId)}">
      <h3>${V(e.name)}
        <span class="field-kind ${e.league?`field-kind-league`:`field-kind-away`}">${e.league?`League field`:`Away field`}</span>
        ${i.length?`<span class="field-kind field-kind-closed">Closed: ${V(i[i.length-1].reason)}</span>`:``}
      </h3>
      ${o?`<p class="board-address">${o}</p>`:``}
      ${e.directions?`<p class="board-directions"><strong>Parking and directions:</strong> ${V(e.directions)}</p>`:``}
      ${a?`<p class="board-access"><strong>Access details:</strong> ${V(a)} <span class="board-note">(administrators, and the umpires on a game here from 24 hours before until it ends)</span></p>`:``}
      <ol class="board-games">${e.games.map(e=>Kl(e,t,n,r?.late)).join(``)}</ol>
    </section>`}function Jl(e,t,n,r){let i=e.fields.filter(e=>e.league),a=e.fields.filter(e=>!e.league);return`
    ${r?.closures?sl(e,r.closures):``}
    ${i.map(e=>ql(e,t,n,r)).join(``)}
    ${e.emptyLeagueFields.length?`<p class="board-empty-fields">No games at: ${e.emptyLeagueFields.map(V).join(`, `)}.</p>`:``}
    ${a.length?`<h2 class="board-away-title">Games at other fields</h2>${a.map(e=>ql(e,t,n,r)).join(``)}`:``}
  `}var Yl=(e,t)=>(e?.get(t)??[]).filter(e=>!e.admin_only);function Xl(e,t,n){let r=e=>e.games.map(e=>{let t=e.slots.length?e.slots.map(t=>`<div>${V(pl[t.position])}: ${t.state===`open`?`<span class="print-open">OPEN</span>`:V(t.name??``)}${t.state===`assigned`&&!e.finished?` (not confirmed)`:``}</div>`).join(``):`&nbsp;`,r=e.status===`canceled`?` <span class="print-canceled-tag">CANCELED</span>`:e.status===`completed`?` <span class="print-tag">completed</span>`:e.status===`draft`?` <span class="print-tag">draft</span>`:``;return`<tr>
      <td>${V(ho(e.startsAt,e.endsAt))}</td>
      <td>${V(e.division)}</td>
      <td><strong>${V(e.home)}</strong> vs <strong>${V(e.away)}</strong>${r}</td>
      <td>${t}</td>
    </tr>${Yl(n,e.id).length?`<tr><td></td><td colspan="3">${dl(Yl(n,e.id))}</td></tr>`:``}`}).join(``);return`
    <article class="print-doc">
      <header class="print-head">
        <h1>Field board</h1>
        <p class="print-sub">${V(Il(e.dayKey))}</p>
        <p class="print-meta">${V(Ll(e.summary))} \u00b7 Printed ${V(_o(t))}</p>
      </header>
      ${e.fields.length?e.fields.map(e=>`
    <section class="print-day">
      <h2>${V(e.name)} <span class="print-count">${e.league?`League field`:`Away field`} \u00b7 ${Nl(e.games.length,`game`,`games`)}</span></h2>
      <table class="print-table">
        <thead><tr><th>Time</th><th>Division</th><th>Game</th><th>Umpires</th></tr></thead>
        <tbody>${r(e)}</tbody>
      </table>
    </section>`).join(``):`<p>No games on this day.</p>`}
    </article>`}function Zl(e){let t=new Set(e.assignments.filter(t=>t.game_id===e.game.id).map(e=>e.umpire_id)),n=e.umpires.filter(n=>n.eligibility===`active`&&!t.has(n.id)&&!e.problems.get(n.id)).map(t=>({umpireId:t.id,name:t.name,youth:t.classification===`youth`,availability:e.availability?Wa(e.game,e.availability.get(t.id),e.now):`none`,busy:wl(t.id,e.game,e.games,e.assignments).length>0,games:Tl(t.id,e.games,e.assignments)})),r=e=>e.availability===`cannot`?4:e.busy?3:e.availability===`available`?0:e.availability===`none`?1:2;return n.sort((e,t)=>r(e)-r(t)||e.games-t.games||e.name.localeCompare(t.name))}function Ql(e){switch(e.availability){case`available`:return`Said they can umpire at this time`;case`cannot`:return`Marked unavailable at this time`;case`unavailable`:return`Has not said they can at this time`;default:return`No availability entered`}}function $l(e,t,n,r){return n.length===0?`<div class="callaround"><p class="callaround-help">There is no one else who could take this place (everyone active is already on the game, or not allowed by the age rules).</p></div>`:`
    <div class="callaround">
      <p class="callaround-help">
        Umpires who could take the ${V(pl[t])} place, best first. Call or text, then press
        <strong>Assign</strong> when they say yes. Nothing is saved about who you called.
      </p>
      <ul class="callaround-list">
        ${n.map(n=>`
          <li class="callaround-item">
            <div class="callaround-who">
              <strong>${V(n.name)}</strong>${n.youth?` (youth)`:``}
              <span class="board-tag${n.availability===`available`&&!n.busy?``:` board-tag-warn`}">${V(Ql(n))}</span>
              ${n.busy?`<span class="board-tag board-tag-warn">Busy at this time</span>`:``}
              <span class="board-note">${n.games} ${n.games===1?`game`:`games`}</span>
            </div>
            ${Vl(n.name,r.get(n.umpireId))||`<span class="board-contacts board-note">no phone on file</span>`}
            <button type="button" class="secondary-button callaround-assign"
              data-assign-umpire="${V(n.umpireId)}" data-assign-game="${V(e)}"
              data-assign-position="${V(t)}"
              aria-label="Assign ${V(n.name)} to the ${V(pl[t])} place">Assign</button>
          </li>`).join(``)}
      </ul>
    </div>`}function eu(e,t,n){e.addEventListener(`submit`,e=>{let n=e.target.closest(`form.note-form`);if(!n)return;e.preventDefault();let r=n.querySelector(`.note-text`),i=n.closest(`.notes`).querySelector(`.note-message`),a=r.value.trim();if(!a){i.textContent=`Write something first.`,i.className=`note-message message error`;return}let o=n.querySelector(`button[type='submit']`);o.disabled=!0,(async()=>{let e=B(),{error:r}=await R.rpc(`add_game_note`,{p_game_id:n.dataset.game,p_body:a,p_admin_only:n.querySelector(`.note-admin-only`)?.checked??!1,...e?{p_now:e}:{}});r?(o.disabled=!1,i.textContent=`Could not save the note. ${r.message}`,i.className=`note-message message error`):t(`Note added.`)})()},n?{signal:n}:void 0),e.addEventListener(`click`,e=>{let n=e.target.closest(`[data-note-remove]`);n&&(n.disabled=!0,(async()=>{let{error:e}=await R.rpc(`delete_game_note`,{p_note_id:n.dataset.noteRemove});if(e){n.disabled=!1;let t=n.closest(`.notes`)?.querySelector(`.note-message`);t&&(t.textContent=`Could not remove the note. ${e.message}`,t.className=`note-message message error`)}else t(`Note removed.`)})())},n?{signal:n}:void 0)}function tu(e){document.getElementById(`print-root`)?.remove();let t=document.createElement(`div`);t.id=`print-root`,t.innerHTML=e,document.body.appendChild(t),document.body.classList.add(`printing`);let n=!1,r=()=>{n||(n=!0,window.removeEventListener(`afterprint`,r),t.remove(),document.body.classList.remove(`printing`))};window.addEventListener(`afterprint`,r),window.setTimeout(r,6e5),window.print()}var nu=6e4,ru=new Map,iu=null,au=new WeakMap,ou=``;async function su(){if(iu&&Date.now()-iu.at<nu)return{context:iu.context,error:null};let e=await Ao();return e.context&&(iu={at:Date.now(),context:e.context}),e}async function cu(e,t){let n=`${e}-${t}`,r=ru.get(n);if(r&&Date.now()-r.at<nu)return{data:r,error:null};let i=await Po(new Date(e,t,1).toISOString(),new Date(e,t+1,1).toISOString());if(i.error)return{data:null,error:i.error};let a={at:Date.now(),games:i.games,assignments:i.assignments};return ru.set(n,a),{data:a,error:null}}function lu(e,t){if(!e||!/^\d{4}-\d{2}-\d{2}$/.test(e))return t;let n=Ka(e);return n&&H(n)===e?e:t}function uu(e,t){let n=Ka(e);return H(new Date(n.getFullYear(),n.getMonth(),n.getDate()+t))}async function du(e,t,n){let r=z(),i=H(r),a=lu(n,i),o=Ka(a),s={year:o.getFullYear(),month:o.getMonth()};au.get(e)?.abort();let c=new AbortController;au.set(e,c),e.innerHTML=`
    <main class="page">
      <section class="auth-card admin-card board-card">
        <p class="eyebrow">RWCLL &middot; FIELD BOARD</p>
        <h1>Field board</h1>

        <div class="board-controls">
          <button type="button" class="secondary-button" data-board-step="-1">&lsaquo; Previous day</button>
          <button type="button" class="secondary-button" id="board-today">Today</button>
          <button type="button" class="secondary-button" data-board-step="1">Next day &rsaquo;</button>
          <label class="board-goto">Go to
            <input id="board-date" type="date" value="${a}" />
          </label>
          <button type="button" class="secondary-button" id="board-print">Print this day</button>
          <button type="button" class="secondary-button" id="board-refresh">Refresh</button>
        </div>

        <h2 id="board-title" class="board-date">${V(Il(a))}</h2>
        <p id="board-summary" class="board-summary">Loading&hellip;</p>
        <p id="board-message" class="message" role="status" aria-live="polite"></p>

        <div class="board-layout">
          <details id="board-calendar-box" class="board-calendar-box">
            <summary>Calendar</summary>
            <div id="board-calendar"></div>
          </details>

          <div id="board-day"></div>
        </div>
      </section>
    </main>
  `;let l=t=>e.querySelector(`#${t}`),u=e=>{l(`board-summary`).textContent=``;let t=l(`board-message`);t.textContent=e,t.className=`message error`};l(`board-calendar-box`).open=window.matchMedia(`(min-width: 700px)`).matches;let[d,f]=await Promise.all([su(),cu(o.getFullYear(),o.getMonth())]);if(d.error||!d.context||f.error||!f.data){console.error(`Field board failed:`,d.error??f.error),u(`The field board could not be loaded. Refresh and try again.`),e.addEventListener(`click`,r=>{let o=r.target,s=o.closest(`[data-board-step]`);if(s)return t(`board/${uu(a,Number(s.dataset.boardStep))}`);if(o.closest(`#board-today`))return t(`board/${i}`);o.closest(`#board-refresh`)&&(ru.clear(),iu=null,du(e,t,n))},{signal:c.signal}),l(`board-date`).addEventListener(`change`,e=>{let n=e.target.value;n&&t(`board/${n}`)});return}let p=d.context,m=jl({divisions:p.divisions,teamNames:new Map(p.teams.map(e=>[e.id,e.name])),locations:p.locations,umpireNames:p.umpireNames,now:r,games:f.data.games,assignments:f.data.assignments},a);l(`board-summary`).textContent=Ll(m.summary);let h=[...new Set(m.fields.flatMap(e=>e.games.flatMap(e=>e.slots.map(e=>e.umpireId))).filter(e=>!!e))],g=h.length?(await Zo(h)).contacts:void 0,_=m.fields.flatMap(e=>e.games.map(e=>e.id)),v=_.length?(await Fo(_)).notes:void 0,y=new Date(`${a}T00:00:00`),b=new Date(y);b.setDate(b.getDate()+1);let[x,S,C]=await Promise.all([Io(m.fields.map(e=>e.locationId)),Ro(y.toISOString(),b.toISOString()),zo(_)]),w=Jl(m,g,v,{access:x,closures:S.closures,late:C});if(m.summary.games===0&&m.summary.canceled===0){let e=[...Ml(f.data.games,f.data.assignments,p.divisions,r).entries()].filter(([,e])=>e.games>0).map(([e])=>e).sort(),t=[...e].reverse().find(e=>e<a),n=e.find(e=>e>a),i=(e,t)=>`<button type="button" class="secondary-button" data-board-goto="${e}">${V(t)}: ${V(Il(e))}</button>`;w=`<div class="board-none">${t?i(t,`Previous game day`):``}${n?i(n,`Next game day`):``}</div>`}if(l(`board-day`).innerHTML=w,ou){let e=l(`board-message`);e.textContent=ou,e.className=`message success`,ou=``}let T=async()=>{let e=await cu(s.year,s.month);if(e.error||!e.data){l(`board-calendar`).innerHTML=`<p class="directory-empty">The calendar could not be loaded.</p>`;return}let t=Ml(e.data.games,e.data.assignments,p.divisions,r);l(`board-calendar`).innerHTML=Fl(s.year,s.month,t,a,i)};await T(),e.addEventListener(`click`,r=>{let o=r.target,c=o.closest(`details.board-mark > summary`);if(c){let e=c.parentElement,t=e.querySelector(`.board-mark-time`);if(!e.open&&t){let n=z();t.value=e.dataset.day===H(n)?`${String(n.getHours()).padStart(2,`0`)}:${String(n.getMinutes()).padStart(2,`0`)}`:``,t.dataset.default=t.value}return}let l=o.closest(`[data-reopen]`);if(l){ee(l);return}let u=o.closest(`[data-find-game]`);if(u){te(u);return}let d=o.closest(`[data-assign-umpire]`);if(d){ne(d);return}let f=o.closest(`[data-board-step]`);if(f)return t(`board/${uu(a,Number(f.dataset.boardStep))}`);if(o.closest(`#board-today`))return t(`board/${i}`);let p=o.closest(`[data-board-day], [data-board-goto]`);if(p)return t(`board/${p.dataset.boardDay??p.dataset.boardGoto}`);let h=o.closest(`[data-board-month]`);if(h){let e=new Date(s.year,s.month+Number(h.dataset.boardMonth),1);s={year:e.getFullYear(),month:e.getMonth()},T();return}let g=o.closest(`[data-mark]`);g?re(g):o.closest(`#board-print`)?tu(Xl(m,new Date,v)):o.closest(`#board-refresh`)&&(ru.clear(),iu=null,du(e,t,n))},{signal:c.signal});let E=(e,t=`error`)=>{let n=l(`board-message`);n.textContent=e,n.className=`message ${t}`},D=()=>{let t=e.querySelector(`#closure-form`);if(!t)return null;let n=m.fields.find(e=>e.locationId===t.querySelector(`#closure-field`).value),r=nl(a,t.querySelector(`#closure-from`).value,t.querySelector(`#closure-to`).value);return{form:t,field:n,window:r,games:n&&r?tl(n,r.from.getTime(),r.to.getTime()):[]}},O=()=>{let t=D(),n=e.querySelector(`#closure-preview`);t&&n&&(n.textContent=t.window?il(t.games):`The end time must be after the start time.`)};e.addEventListener(`change`,e=>{e.target.closest(`#closure-form`)&&O()},{signal:c.signal}),e.addEventListener(`input`,e=>{e.target.closest(`#closure-form`)&&O()},{signal:c.signal}),e.addEventListener(`toggle`,e=>{e.target.id===`board-closure-box`&&O()},{capture:!0,signal:c.signal}),e.addEventListener(`submit`,r=>{if(!r.target.closest(`#closure-form`))return;r.preventDefault();let i=D();if(!i||!i.field)return;if(!i.window)return E(`The end time must be after the start time.`);let a=i.form.querySelector(`#closure-reason`).value,o=al(a,i.form.querySelector(`#closure-details`).value);if(!o)return E(`Give a reason (details are needed when the reason is Other).`);if(i.games.length===0)return E(`No games would be canceled in that time.`);window.confirm(`${i.field.name}: ${il(i.games)}\n\nReason: ${o}\n\nCancel them?`)&&(i.form.querySelectorAll(`button`).forEach(e=>{e.disabled=!0}),(async()=>{let{data:r,error:a}=await R.rpc(`close_field`,{p_location_id:i.field.locationId,p_from:i.window.from.toISOString(),p_to:i.window.to.toISOString(),p_reason:o,...B()?{p_now:B()}:{}});if(a)return i.form.querySelectorAll(`button`).forEach(e=>{e.disabled=!1}),E(`Could not close the field. ${a.message}`);ru.clear(),ou=`Closed ${i.field.name}: ${r} ${Number(r)===1?`game`:`games`} canceled and the umpires told.`,du(e,t,n)})())},{signal:c.signal});let ee=async r=>{if(!window.confirm(`Reopen this field? The games it canceled will be put back, and the umpires told.`))return;r.disabled=!0;let{data:i,error:a}=await R.rpc(`reopen_closure`,{p_closure_id:r.dataset.reopen,...B()?{p_now:B()}:{}});if(a)return r.disabled=!1,E(`Could not reopen it. ${a.message}`);ru.clear(),ou=`Reopened: ${i} ${Number(i)===1?`game`:`games`} put back and the umpires told.`,du(e,t,n)},te=async t=>{let n=t.dataset.findGame,r=t.dataset.findPosition,i=e.querySelector(`[data-find-panel="${n}:${r}"]`);if(!i.hidden){i.hidden=!0;return}i.hidden=!1,i.innerHTML=`<p class="callaround-help">Looking for umpires&hellip;</p>`;let a=f.data.games.find(e=>e.id===n),o=await R.rpc(`game_umpire_eligibility`,{p_game_id:n});if(!a||o.error){i.innerHTML=`<p class="message error">Could not look for umpires. ${V(o.error?.message??``)}</p>`;return}let s=new Map((o.data??[]).map(e=>[e.umpire_id,e.problem])),c=Zl({game:a,umpires:p.umpires,games:f.data.games,assignments:f.data.assignments,availability:await Ko(),problems:s});i.innerHTML=$l(n,r,c,c.length?(await Zo(c.map(e=>e.umpireId))).contacts:new Map)},ne=async r=>{let i=r.dataset.assignGame,a=r.dataset.assignPosition,o=r.dataset.assignUmpire,s={};for(let e of fl)s[e]=null;for(let e of f.data.assignments.filter(e=>e.game_id===i))s[e.position]=e.umpire_id;s[a]=o,e.querySelectorAll(`[data-assign-umpire]`).forEach(e=>{e.disabled=!0});let{error:c}=await R.rpc(`set_game_umpires`,{p_game_id:i,p_umpires:s});if(c)return e.querySelectorAll(`[data-assign-umpire]`).forEach(e=>{e.disabled=!1}),E(`Could not assign them. ${c.message}`);ru.clear(),ou=`Assigned ${p.umpireNames.get(o)??`the umpire`} to the ${pl[a]} place.`,du(e,t,n)};eu(e,r=>{ou=r,du(e,t,n)},c.signal);let re=async r=>{let i=r.dataset.mark,o=r.dataset.game,s=l(`board-message`),c=(e,t=`error`)=>{s.textContent=e,s.className=`message ${t}`},u=null;if(i===`arrived`){let e=r.closest(`.board-mark-body`)?.querySelector(`.board-mark-time`),t=e?.value;if(t&&t!==e?.dataset.default){let e=m.fields.flatMap(e=>e.games).find(e=>e.id===o),n=new Date(`${e?G(e.startsAt):a}T${t}:00`);if(Number.isNaN(n.getTime()))return c(`That time is not valid.`);u=n.toISOString()}}e.querySelectorAll(`[data-mark]`).forEach(e=>{e.disabled=!0});let{error:d}=await R.rpc(`admin_set_attendance`,{p_game_id:o,p_umpire_id:r.dataset.umpire,p_attendance:i===`clear`?null:i,p_arrived_at:u,...B()?{p_now:B()}:{}});if(d)return e.querySelectorAll(`[data-mark]`).forEach(e=>{e.disabled=!1}),c(`Could not record it. ${d.message}`);ru.clear(),ou=i===`arrived`?`Arrival recorded.`:i===`no_show`?`No-show recorded.`:`Attendance cleared.`,du(e,t,n)};l(`board-date`).addEventListener(`change`,e=>{let n=e.target.value;n&&t(`board/${n}`)})}var fu=[[`ejection`,`An ejection`],[`protest`,`A protest`],[`conduct`,`Conduct (players, coaches or fans)`],[`incident`,`An incident or injury`],[`other`,`Something else`]],pu=[[`coach`,`A coach`],[`manager`,`A manager`],[`parent`,`A parent`],[`league_official`,`A league official`],[`spectator`,`A spectator`],[`other`,`Someone else`]],mu=e=>fu.find(([t])=>t===e)?.[1]??e,hu=e=>pu.find(([t])=>t===e)?.[1]??e,gu=`Write what happened, as facts. Use initials for children, leave out medical details, and do not guess or repeat rumors.`,_u=`If this is about the safety or welfare of a child, tell the league's safety officer as well. This app is not the way to report that.`,vu=e=>`${U(e)} \u00b7 ${W(e)}`;function yu(e){if(!e)return`This season has no end date, so this report will not be deleted automatically. Set the season's end date in League Setup.`;let[t,n,r]=e.split(`-`).map(Number);return`Deleted automatically after ${new Date(t+1,n-1,r).toLocaleDateString(`en-US`,{month:`short`,day:`numeric`,year:`numeric`})} (a year after the season ends).`}function bu(e){return e.length===0?``:`
    <ul class="report-followups">
      ${e.map(e=>`
        <li><span class="report-meta"><strong>${V(e.author_name)}</strong> &middot; ${V(vu(e.created_at))}</span>
          <span class="report-text">${V(e.body)}</span></li>`).join(``)}
    </ul>`}function xu(e,t){return`
    <form class="report-followup-form" data-followup-kind="${e}" data-report="${V(t)}">
      <label>Add a follow-up
        <textarea class="report-followup-text" rows="2" maxlength="4000" required></textarea>
      </label>
      <button type="submit" class="secondary-button">Add follow-up</button>
    </form>`}function Su(e,t){return`
    <details class="report-log" data-log-kind="${e}" data-log-id="${V(t)}">
      <summary>Change log</summary>
      <div class="report-log-body" aria-live="polite"></div>
    </details>`}function Cu(e,t){return`
    <article class="report" data-umpire="${V(e.umpireId)}" data-report-card="${V(e.id)}">
      <h3>${t.admin?`${V(e.umpireName)} &middot; `:``}${V(mu(e.category))}</h3>
      <p class="report-meta">${V(e.gameLabel)} &middot; written ${V(vu(e.created_at))}</p>
      <p class="report-text">${V(e.body)}</p>
      ${bu(e.followups)}
      ${xu(`game`,e.id)}
      ${t.admin?`<p class="report-retention">${V(yu(e.endsOn))}</p>`:``}
      ${t.admin?Su(`game`,e.id):``}
      ${t.canDelete?`<button type="button" class="secondary-button report-delete" data-delete-report="game:${V(e.id)}">Delete this report</button>`:``}
    </article>`}function wu(e,t){return`
    <article class="report report-outside" data-umpire="${V(e.umpireId)}" data-report-card="${V(e.id)}">
      <h3>About ${V(e.umpireName)}</h3>
      <p class="report-meta">
        From <strong>${V(e.source_name)}</strong> (${V(hu(e.source_role).toLowerCase())})
        &middot; received ${V(U(`${e.received_on}T12:00:00`))}
        ${e.gameLabel?`&middot; ${V(e.gameLabel)}`:``}
        &middot; entered by ${V(e.enteredBy)}${e.edited_at?` (edited ${V(vu(e.edited_at))})`:``}
      </p>
      <p class="report-text">${V(e.body)}</p>
      ${bu(e.followups)}
      ${xu(`outside`,e.id)}
      <p class="report-retention">${V(yu(e.endsOn))}</p>
      <div class="report-actions">
        <button type="button" class="secondary-button" data-edit-outside="${V(e.id)}">Edit</button>
        ${t.canDelete?`<button type="button" class="secondary-button report-delete" data-delete-report="outside:${V(e.id)}">Delete this report</button>`:``}
      </div>
      ${Su(`outside`,e.id)}
    </article>`}function Tu(e){return`
    <details class="report-form-box" id="outside-box">
      <summary>Add a report from outside</summary>
      <form id="outside-form" class="outside-form">
        <input type="hidden" id="outside-edit-id" value="" />
        <p class="report-guidance">${V(gu)}</p>
        <p class="report-guidance">${V(_u)}</p>
        <label>Who is it about?
          <select id="outside-umpire" required>
            <option value="">Choose an umpire</option>
            ${e.umpires.map(e=>`<option value="${V(e.id)}">${V(e.name)}</option>`).join(``)}
          </select>
        </label>
        <label>Season
          <select id="outside-season" required>
            ${e.seasons.map(t=>`<option value="${V(t.id)}"${t.id===e.defaultSeasonId?` selected`:``}>${V(t.name)}</option>`).join(``)}
          </select>
        </label>
        <p class="field-help">The season decides when the report is deleted: a year after it ends.</p>
        <label>Which game (optional)
          <select id="outside-game"><option value="">No particular game</option></select>
        </label>
        <label>Who reported it?
          <input id="outside-source" maxlength="100" required placeholder="Name" />
        </label>
        <label>They are
          <select id="outside-role">
            ${pu.map(([e,t])=>`<option value="${e}">${V(t)}</option>`).join(``)}
          </select>
        </label>
        <label>Date received
          <input id="outside-date" type="date" value="${V(e.todayKey)}" max="${V(e.todayKey)}" required />
        </label>
        <label>What was reported
          <textarea id="outside-body" rows="5" maxlength="4000" required></textarea>
        </label>
        <p class="report-guidance"><strong>The umpire this is about cannot see it.</strong></p>
        <div class="report-form-actions">
          <button type="submit" class="primary-button" id="outside-save">Save report</button>
          <button type="button" class="secondary-button" id="outside-cancel" hidden>Cancel editing</button>
        </div>
      </form>
    </details>`}function Eu(e){return`
    <main class="page">
      <section class="auth-card admin-card reports-card">
        <p class="eyebrow">RWCLL &middot; REPORTS</p>
        <h1>Reports</h1>
        <p class="report-privacy">
          Only the umpire chief and super admins can read these.
          <strong>An umpire cannot see a report from outside about themselves</strong>, and cannot change a
          post-game report after sending it. Reports are never printed or emailed, and each is deleted
          automatically a year after its season ends.
        </p>
        <p id="reports-message" class="message${e.purged?` success`:``}" role="status" aria-live="polite">${e.purged?`${e.purged} expired ${(e=>e===1?`report`:`reports`)(e.purged)} deleted automatically.`:``}</p>

        <label class="report-filter">Show reports for
          <select id="reports-filter">
            <option value="">Everyone</option>
            ${e.umpires.map(e=>`<option value="${V(e.id)}">${V(e.name)}</option>`).join(``)}
          </select>
        </label>

        <h2>Post-game reports (${e.gameReports.length})</h2>
        ${e.gameReports.length===0?`<p class="report-none">No post-game reports.</p>`:e.gameReports.map(t=>Cu(t,{admin:!0,canDelete:e.canDelete})).join(``)}

        <h2>Reports from outside (${e.outside.length})</h2>
        ${Tu(e)}
        ${e.outside.length===0?`<p class="report-none">No reports from outside.</p>`:e.outside.map(t=>wu(t,{canDelete:e.canDelete})).join(``)}
      </section>
    </main>`}function Du(e){return`
    <section class="my-reports" aria-labelledby="my-reports-title">
      <h2 id="my-reports-title">Post-game reports</h2>
      <p id="my-reports-message" class="message" role="status" aria-live="polite"></p>
      <details class="report-form-box" id="my-report-box">
        <summary>Write a post-game report</summary>
        ${e.games.length===0?`<p class="report-none">You have no games you can write a report about right now. You can write one from the moment a game starts until 14 days after it.</p>`:`
        <form id="my-report-form" class="outside-form">
          <p class="report-guidance">${V(gu)}</p>
          <p class="report-guidance">${V(_u)}</p>
          <label>Which game?
            <select id="my-report-game" required>
              ${e.games.map(e=>`<option value="${V(e.id)}">${V(e.label)}</option>`).join(``)}
            </select>
          </label>
          <label>What is it about?
            <select id="my-report-category">
              ${fu.map(([e,t])=>`<option value="${e}">${V(t)}</option>`).join(``)}
            </select>
          </label>
          <label>What happened
            <textarea id="my-report-body" rows="5" maxlength="4000" required></textarea>
          </label>
          <p class="report-guidance">
            <strong>Only the umpire chief and super admins can read this.</strong>
            You can read what you send and add follow-ups, but you cannot change it afterwards.
          </p>
          <button type="submit" class="primary-button">Send report</button>
        </form>`}
      </details>
      ${e.reports.length===0?``:`<h3 class="my-reports-sent">What you have sent</h3>${e.reports.map(e=>Cu(e,{admin:!1,canDelete:!1})).join(``)}`}
    </section>`}function Ou(e){let t=new Map(e.teams.map(e=>[e.id,e.name])),n=new Map(e.locations.map(e=>[e.id,e])),r=new Map(e.divisions.map(e=>[e.id,e.name])),i=new Map(e.divisions.map(e=>[e.id,e]));return{teamName:e=>t.get(e)??`A team`,fieldName:e=>n.get(e)?.name??``,fieldAddress:e=>n.get(e)?.address??``,fieldDirections:e=>n.get(e)?.directions??``,divisionName:e=>r.get(e)??``,umpireName:t=>e.umpireNames.get(t)??`Unknown umpire`,umpiresNeeded:e=>yl(e,(e,t)=>vl(i.get(e),t))}}function ku(e,t,n){let r=t===`home`?e.home_team_id:e.away_team_id,i=t===`home`?e.home_label:e.away_label;return r?n.teamName(r):i??`?`}var Au=(e,t)=>Date.parse(e.startsAt)-Date.parse(t.startsAt)||e.field.localeCompare(t.field)||e.home.localeCompare(t.home);function ju(e,t,n,r){let i=new Map,a=new Map;for(let e of t){let t=i.get(e.game_id)??{};t[e.position]=n.umpireName(e.umpire_id),i.set(e.game_id,t);let r=a.get(e.game_id)??{};r[e.position]=e.umpire_id,a.set(e.game_id,r)}let o=(e,t)=>{let n=a.get(e)?.[t];return n?wo(r?.get(n)):``};return e.map(e=>{let t=i.get(e.id),r=n.umpiresNeeded(e),a=bl(t??{},r);return{id:e.id,day:G(e.starts_at),startsAt:e.starts_at,endsAt:e.ends_at,time:ho(e.starts_at,e.ends_at),start:W(e.starts_at),end:W(e.ends_at),weekday:mo(e.starts_at),division:n.divisionName(e.division_id),field:n.fieldName(e.location_id),address:n.fieldAddress(e.location_id),directions:n.fieldDirections(e.location_id),home:ku(e,`home`,n),away:ku(e,`away`,n),umpires:{plate:t?.plate??null,first_base:t?.first_base??null,second_base:t?.second_base??null,third_base:t?.third_base??null,field:t?.field??null},contacts:{plate:o(e.id,`plate`),first_base:o(e.id,`first_base`),second_base:o(e.id,`second_base`),third_base:o(e.id,`third_base`),field:o(e.id,`field`)},needed:r,slots:a,status:e.status,type:e.game_type,masterId:e.external_game_id??``,notes:e.notes??``}}).sort(Au)}function Mu(e){let t=new Map;for(let n of[...e].sort(Au)){let e=t.get(n.day);e||(e={day:n.day,heading:fo(n.startsAt),games:[]},t.set(n.day,e)),e.games.push(n)}return[...t.values()].sort((e,t)=>e.day.localeCompare(t.day))}var Nu=[`Date`,`Day`,`Start`,`End`,`Division`,`Field`,`Address`,`Home`,`Away`,`Plate umpire`,`Field umpire`,`1B umpire`,`2B umpire`,`3B umpire`,`Umpires needed`,`Status`,`Type`,`Master Game ID`,`Notes`];function Pu(e){return[...e].sort(Au).map(e=>[e.day,e.weekday,e.start,e.end,e.division,e.field,e.address,e.home,e.away,e.umpires.plate??``,e.umpires.field??``,e.umpires.first_base??``,e.umpires.second_base??``,e.umpires.third_base??``,String(e.needed),e.status,e.type,e.masterId,e.notes])}function Fu(e,t,n,r){let i=new Map;for(let t of n)t.umpire_id===e&&i.set(t.game_id,{position:ml[t.position]??t.position,status:t.status===`confirmed`?`confirmed`:`assigned`});return ju(t.filter(e=>i.has(e.id)),[],r).map(e=>({...e,position:i.get(e.id).position,myStatus:i.get(e.id).status}))}var Iu=[`Date`,`Day`,`Start`,`End`,`Position`,`Field`,`Address`,`Division`,`Home`,`Away`,`Status`,`Master Game ID`];function Lu(e){return[...e].sort(Au).map(e=>[e.day,e.weekday,e.start,e.end,e.position,e.field,e.address,e.division,e.home,e.away,e.status,e.masterId])}var Ru=(e,t,n)=>`${e} ${e===1?t:n}`;function zu(e){return`
    <strong>${V(e.home)}</strong> vs <strong>${V(e.away)}</strong>
    ${e.type===`regular`?``:`<span class="print-tag">${V(e.type)}</span>`}
    ${e.status===`canceled`?`<span class="print-canceled-tag">CANCELED</span>`:``}
    ${e.status===`completed`?`<span class="print-tag">completed</span>`:``}
  `}function Bu(e){return`${V(e.field)}${e.address?`<br><small>${V(e.address)}</small>`:``}`}function Vu(e){if(e.status===`canceled`)return`&mdash;`;let t=fl.map(t=>{let n=e.umpires[t];if(n){let r=e.contacts[t];return`<div>${pl[t]}: ${V(n)}${r?` <span class="print-phone">&middot; ${V(r)}</span>`:``}</div>`}return e.slots[t]===`open`?`<div>${pl[t]}: <span class="print-open">OPEN</span></div>`:``}).filter(Boolean);return t.length?t.join(``):`&mdash;`}function Hu(e,t){let n=e.reduce((e,t)=>e+t.games.length,0);return`
    <article class="print-doc">
      <header class="print-head">
        <h1>${V(t.title)}</h1>
        ${t.lines.map(e=>`<p class="print-sub">${V(e)}</p>`).join(``)}
        <p class="print-meta">
          ${Ru(n,`game`,`games`)} on ${Ru(e.length,`day`,`days`)}
          &middot; Printed ${V(t.printedAt)}
        </p>
      </header>

      ${e.length===0?`<p>There are no games to show.</p>`:``}

      ${e.map((e,n)=>`
        <section class="print-day ${t.pagePerDay&&n>0?`print-new-page`:``}">
          <h2>${V(e.heading)}
            <span class="print-count">${Ru(e.games.length,`game`,`games`)}</span>
          </h2>
          <table class="print-table">
            <thead>
              <tr>
                <th class="c-time">Time</th><th>Division</th><th>Field</th>
                <th>Game</th><th>Umpires</th>
              </tr>
            </thead>
            <tbody>
              ${e.games.map(e=>`
                <tr class="${e.status===`canceled`?`print-canceled`:``}">
                  <td class="c-time">${V(e.time)}</td>
                  <td>${V(e.division)}</td>
                  <td>${Bu(e)}</td>
                  <td>${zu(e)}</td>
                  <td class="print-umpires">${Vu(e)}</td>
                </tr>
              `).join(``)}
            </tbody>
          </table>
        </section>
      `).join(``)}
    </article>
  `}function Uu(e,t,n){let r=[...t].sort(Au);return`
    <article class="print-doc">
      <header class="print-head">
        <h1>${V(n.title)}: ${V(e)}</h1>
        ${n.lines.map(e=>`<p class="print-sub">${V(e)}</p>`).join(``)}
        <p class="print-meta">
          ${Ru(r.length,`game`,`games`)} &middot; Printed ${V(n.printedAt)}
        </p>
      </header>

      ${r.length===0?`<p>There are no games to show.</p>`:`
        <table class="print-table">
          <thead>
            <tr>
              <th>Date</th><th class="c-time">Time</th><th>Position</th>
              <th>Field</th><th>Game</th><th>Division</th>
            </tr>
          </thead>
          <tbody>
            ${r.map(e=>`
              <tr class="${e.status===`canceled`?`print-canceled`:``}">
                <td>${V(U(e.startsAt))}</td>
                <td class="c-time">${V(e.time)}</td>
                <td><strong>${V(e.position)}</strong></td>
                <td>${Bu(e)}</td>
                <td>${zu(e)}</td>
                <td>${V(e.division)}</td>
              </tr>
            `).join(``)}
          </tbody>
        </table>
      `}
    </article>
  `}var Wu=new WeakMap,Gu=``,Ku={created:`Created`,edited:`Edited`,followup:`Added a follow-up`,deleted:`Deleted`,purged:`Deleted automatically (a year after its season ended)`},qu=e=>(e??[]).map(e=>({id:e.id,author_name:e.author_name,body:e.body,created_at:e.created_at}));async function Ju(e,t){Wu.get(e)?.abort();let n=new AbortController;Wu.set(e,n),e.innerHTML=`<main class="page"><section class="auth-card admin-card"><h1>Reports</h1><p>Loading&hellip;</p></section></main>`;let r=B(),i=await R.rpc(`purge_expired_reports`,r?{p_now:r}:{}),a=i.error?0:Number(i.data)||0,[o,s,c]=await Promise.all([Ao(),Vo(),Ho()]);if(o.error||!o.context||s.error||c.error){e.innerHTML=`<main class="page"><section class="auth-card admin-card"><h1>Reports</h1><p class="message error">The reports could not be loaded. Refresh and try again.</p></section></main>`;return}let l=o.context,u=Ou(l),d=new Map(l.seasons.map(e=>[e.id,e])),f=e=>l.umpireNames.get(e)??`An umpire`,p=[...s.reports.map(e=>e.game_id),...c.reports.map(e=>e.game_id).filter(e=>!!e)],m=new Map((p.length?(await Xo(p)).games:[]).map(e=>[e.id,e])),h=e=>{if(!e)return`A game`;let t=(e,t)=>e?u.teamName(e):t??`TBD`;return`${U(e.starts_at)} \u00b7 ${u.divisionName(e.division_id)} \u00b7 ${t(e.home_team_id,e.home_label)} vs ${t(e.away_team_id,e.away_label)} \u00b7 ${u.fieldName(e.location_id)}`},g=s.reports.map(e=>({id:e.id,created_at:e.created_at,category:e.category,body:e.body,authorName:e.author_name,umpireId:e.umpire_id,umpireName:f(e.umpire_id),gameLabel:h(m.get(e.game_id)),endsOn:d.get(e.season_id)?.ends_on??null,followups:qu(s.followups.get(e.id))})),_=c.reports.map(e=>({id:e.id,created_at:e.created_at,edited_at:e.edited_at,received_on:e.received_on,source_name:e.source_name,source_role:e.source_role,body:e.body,umpireId:e.umpire_id,umpireName:f(e.umpire_id),gameId:e.game_id,gameLabel:e.game_id?h(m.get(e.game_id)):null,seasonId:e.season_id,seasonName:d.get(e.season_id)?.name??``,endsOn:d.get(e.season_id)?.ends_on??null,enteredBy:e.entered_by_name,followups:qu(c.followups.get(e.id))})),v=l.umpires.map(e=>({id:e.id,name:e.name})).sort((e,t)=>e.name.localeCompare(t.name)),y=l.seasons.map(e=>({id:e.id,name:e.name})),b=l.seasons.find(e=>e.is_active)?.id??y[0]?.id??``;e.innerHTML=Eu({gameReports:g,outside:_,umpires:v,seasons:y,defaultSeasonId:b,todayKey:H(z()),canDelete:t,purged:a});let x=t=>e.querySelector(t),S=(e,t=`error`)=>{let n=x(`#reports-message`);n.textContent=e,n.className=`message ${t}`},C=n=>{Gu=n,Ju(e,t)};Gu&&=(S(Gu,`success`),``),x(`#reports-filter`).addEventListener(`change`,t=>{let n=t.target.value;e.querySelectorAll(`.report`).forEach(e=>{e.hidden=n!==``&&e.dataset.umpire!==n})},{signal:n.signal});let w=async()=>{let e=x(`#outside-umpire`).value,t=x(`#outside-season`).value,n=x(`#outside-game`);if(n.innerHTML=`<option value="">No particular game</option>`,!e||!t)return;let r=await No(t);if(r.error)return;let i=new Set(r.assignments.filter(t=>t.umpire_id===e).map(e=>e.game_id)),a=r.games.filter(e=>i.has(e.id)).sort((e,t)=>t.starts_at.localeCompare(e.starts_at)).slice(0,60);for(let e of a){let t=document.createElement(`option`);t.value=e.id,t.textContent=h(e),n.appendChild(t)}};e.addEventListener(`change`,e=>{let t=e.target.id;(t===`outside-umpire`||t===`outside-season`)&&w()},{signal:n.signal});let T=e=>{x(`#outside-edit-id`).value=e?.id??``,x(`#outside-umpire`).disabled=!!e,x(`#outside-season`).disabled=!!e,x(`#outside-game`).disabled=!!e,x(`#outside-cancel`).hidden=!e,x(`#outside-save`).textContent=e?`Save changes`:`Save report`,x(`#outside-box > summary`).textContent=e?`Edit a report from outside`:`Add a report from outside`,e?(x(`#outside-umpire`).value=e.umpireId,x(`#outside-season`).value=e.seasonId,x(`#outside-source`).value=e.source_name,x(`#outside-role`).value=e.source_role,x(`#outside-date`).value=e.received_on,x(`#outside-body`).value=e.body,x(`#outside-box`).open=!0,x(`#outside-box`).scrollIntoView({block:`start`})):(x(`#outside-form`).reset(),x(`#outside-date`).value=H(z()),x(`#outside-season`).value=b)};e.addEventListener(`click`,e=>{let t=e.target,n=t.closest(`[data-edit-outside]`);if(n)return T(_.find(e=>e.id===n.dataset.editOutside)??null);if(t.closest(`#outside-cancel`))return T(null);let r=t.closest(`[data-delete-report]`);if(r){let[e,t]=r.dataset.deleteReport.split(`:`);if(!window.confirm(`Delete this report for good? Its follow-ups go with it. The change log keeps a note that it was deleted, and who did it.`))return;r.disabled=!0,(async()=>{let{error:n}=await R.rpc(`delete_report`,{p_kind:e,p_report_id:t,...B()?{p_now:B()}:{}});if(n)return r.disabled=!1,S(`Could not delete it. ${n.message}`);C(`Report deleted.`)})()}},{signal:n.signal}),e.addEventListener(`toggle`,e=>{let t=e.target;if(!(t instanceof HTMLDetailsElement)||!t.matches(`details.report-log`)||!t.open)return;let n=t.querySelector(`.report-log-body`);n.textContent=`Loading…`,Uo(t.dataset.logId).then(e=>{n.innerHTML=e.length===0?`<p>No entries.</p>`:`<ul>${e.map(e=>`<li>${V(vu(e.acted_at))} &middot; ${V(e.actor_name)}: ${V(Ku[e.action]??e.action)}</li>`).join(``)}</ul>`})},{capture:!0,signal:n.signal}),e.addEventListener(`submit`,e=>{let t=e.target;if(t.matches(`.report-followup-form`)){e.preventDefault();let n=t.querySelector(`.report-followup-text`).value.trim();if(!n)return S(`Write something first.`);let r=t.dataset.followupKind,i=t.querySelector(`button`);i.disabled=!0,(async()=>{let{error:e}=await R.rpc(r===`game`?`add_game_report_followup`:`add_outside_report_followup`,{p_report_id:t.dataset.report,p_body:n,...B()?{p_now:B()}:{}});if(e)return i.disabled=!1,S(`Could not add it. ${e.message}`);C(`Follow-up added.`)})()}else if(t.id===`outside-form`){e.preventDefault();let t=x(`#outside-edit-id`).value,n=x(`#outside-body`).value.trim(),r=x(`#outside-source`).value.trim();if(!n)return S(`Write what was reported.`);if(!r)return S(`Say who reported it.`);let i=x(`#outside-save`);i.disabled=!0,(async()=>{let e={p_source_name:r,p_source_role:x(`#outside-role`).value,p_received_on:x(`#outside-date`).value,p_body:n,...B()?{p_now:B()}:{}},{error:a}=t?await R.rpc(`edit_outside_report`,{p_report_id:t,...e}):await R.rpc(`add_outside_report`,{p_umpire_id:x(`#outside-umpire`).value,p_game_id:x(`#outside-game`).value||null,p_season_id:x(`#outside-season`).value,...e});if(a)return i.disabled=!1,S(`Could not save the report. ${a.message}`);C(t?`Report updated.`:`Report saved. The umpire it is about cannot see it.`)})()}},{signal:n.signal})}var Yu=[[`plate`,`Home plate`],[`first_base`,`First base`],[`second_base`,`Second base`],[`third_base`,`Third base`],[`field`,`Field`]],Xu=[[`youth`,`Youth umpires`],[`adult`,`Adult umpires`]],Zu=(e,t,n)=>`${e}|${t}|${n}`;function X(e){return`$${(e/100).toLocaleString(`en-US`,{minimumFractionDigits:2,maximumFractionDigits:2})}`}function Qu(e){let t=e.replace(/[\s,$]/g,``);if(t===``)return{ok:!0,cents:null};if(!/^\d+(\.\d{1,2})?$/.test(t))return{ok:!1,error:`Enter an amount in dollars, like 50 or 25.50.`};let[n,r=``]=t.split(`.`),i=Number(n)*100+Number(r.padEnd(2,`0`));return i>1e5?{ok:!1,error:`The most one place can pay is $1000.00.`}:{ok:!0,cents:i}}var $u=e=>e==null?``:(e/100).toFixed(2);function ed(e,t){let n=new Map;for(let r of e){if(r.effective_on>t)continue;let e=Zu(r.division_id,r.classification,r.position),i=n.get(e);(!i||r.effective_on>i.effective_on)&&n.set(e,r)}return new Map([...n].map(([e,t])=>[e,t.amount_cents]))}function td(e,t){let n=[],r=[];for(let[i,a]of t){let t=Qu(a);if(!t.ok){r.push({key:i,message:t.error});continue}let o=e.get(i),s=t.cents??(o!==void 0&&o>0?0:void 0);if(s===void 0||s===o||o===void 0&&s===0)continue;let[c,l,u]=i.split(`|`);n.push({division_id:c,classification:l,position:u,amount_cents:s})}return{changes:n,errors:r}}var nd=e=>Yu.find(([t])=>t===e)?.[1]??e,rd=e=>e===`adult`?`adult`:`youth`,id=e=>{let[t,n,r]=e.split(`-`).map(Number);return new Date(t,n-1,r).toLocaleDateString(`en-US`,{month:`short`,day:`numeric`,year:`numeric`})};function ad(e){let t=new Date(e.changed_at).toLocaleString(`en-US`,{month:`short`,day:`numeric`,hour:`numeric`,minute:`2-digit`}).replace(/\u202f/g,` `),n=e.old_cents===null?`set to ${X(e.new_cents)}`:`${X(e.old_cents)} to ${X(e.new_cents)}`;return`${t} \u00b7 ${e.changed_by_name}: ${e.division_name}, ${rd(e.classification)}, ${nd(e.position).toLowerCase()}, ${n} (from ${id(e.effective_on)})`}function od(e,t,n){return`
    <div class="rates-table-wrap">
      <table class="rates-table">
        <caption class="rates-caption">${V(Xu.find(([t])=>t===e)?.[1]??e)}, per game</caption>
        <thead>
          <tr>
            <th scope="col">Division</th>
            ${Yu.map(([,e])=>`<th scope="col">${V(e)}</th>`).join(``)}
            <th scope="col"><span class="visually-hidden">Copy</span></th>
          </tr>
        </thead>
        <tbody>
          ${t.map(t=>`
            <tr data-rate-row="${V(e)}|${V(t.id)}">
              <th scope="row">${V(t.name)}</th>
              ${Yu.map(([r,i])=>`
                <td><input class="rate-cell" inputmode="decimal" autocomplete="off"
                  data-rate-key="${V(Zu(t.id,e,r))}"
                  value="${V($u(n.get(Zu(t.id,e,r))))}"
                  aria-label="${V(`${e===`adult`?`Adult`:`Youth`}, ${t.name}, ${i}, dollars per game`)}" /></td>`).join(``)}
              <td><button type="button" class="secondary-button rate-copy"
                data-copy-row="${V(e)}|${V(t.id)}"
                aria-label="Copy the ${V(t.name)} ${e===`adult`?`adult`:`youth`} row to every division">Copy to all</button></td>
            </tr>`).join(``)}
        </tbody>
      </table>
    </div>`}function sd(e){return`
    <section class="pay-rates" aria-labelledby="pay-rates-title">
      <h2 id="pay-rates-title">Pay rates</h2>
      <p class="report-privacy">
        What each place pays <strong>per game</strong>, for each division. Youth and adult umpires have separate rates.
        Adult rates start empty, which means adults are not paid; fill them in if that changes.
        A rate applies to games on or after its <strong>start date</strong>, so a change never rewrites the past.
        This only sets the amounts: nothing is paid from this page.
      </p>
      <p id="rates-message" class="message" role="status" aria-live="polite"></p>

      <label class="rates-date">New rates start on
        <input type="date" id="rates-date" value="${V(e.effectiveOn)}" min="${V(e.minDate)}" max="${V(e.maxDate)}" required />
      </label>
      <p class="field-help">The amounts shown are what applies on this date. Change a start date, or leave it as today.</p>

      ${e.divisions.length===0?`<p class="report-none">There are no divisions yet. Set them up in League Setup first.</p>`:`${od(`youth`,e.divisions,e.current)}${od(`adult`,e.divisions,e.current)}
      <div class="rates-actions">
        <button type="button" class="primary-button" id="rates-save">Save rates</button>
        <button type="button" class="secondary-button" id="rates-reset">Undo my changes</button>
      </div>`}

      <h3 class="rates-log-title">Recent changes</h3>
      ${e.log.length===0?`<p class="report-none">No rates have been set yet.</p>`:`<ul class="rates-log">${e.log.map(e=>`<li>${V(ad(e))}</li>`).join(``)}</ul>`}
    </section>`}var cd=new WeakMap;function ld(e){cd.get(e)?.abort();let t=new AbortController;return cd.set(e,t),t}function ud(e){cd.get(e)?.abort()}function dd(e,t,n,r=`error`){let i=e.querySelector(t);i&&(i.textContent=n,i.className=`message ${r}`)}var fd=e=>Yu.find(([t])=>t===e)?.[1]??e,pd=[[`check`,`Check`],[`bank_transfer`,`Bank transfer`],[`cash`,`Cash`],[`other`,`Other`]],md=e=>{let[t,n,r]=e.split(`-`).map(Number);return new Date(t,n-1,r).toLocaleDateString(`en-US`,{month:`short`,day:`numeric`})},hd=e=>{let[t,n,r]=e.split(`-`).map(Number);return new Date(t,n-1,r).toLocaleDateString(`en-US`,{month:`short`,day:`numeric`,year:`numeric`})},gd=e=>e<0?`-${X(-e)}`:X(e);function _d(e){let t=e.replace(/[\s,$]/g,``),n=/^([+-])?(\d+(?:\.\d{1,2})?)$/.exec(t);if(!n)return{ok:!1,error:`Enter an amount in dollars, like 10 or -5.50 (a minus takes money away).`};let[r,i=``]=n[2].split(`.`),a=Number(r)*100+Number(i.padEnd(2,`0`));return a===0?{ok:!1,error:`An adjustment cannot be zero.`}:a>1e5?{ok:!1,error:`An adjustment can be at most $1000.00 either way.`}:{ok:!0,cents:n[1]===`-`?-a:a}}function vd(e){let t=/^[=+\-@\t\r]/.test(e)?`'${e}`:e;return/[",\n\r]/.test(t)?`"${t.replace(/"/g,`""`)}"`:t}var yd=e=>(e/100).toFixed(2);function bd(e,t,n){let r=e=>n.find(t=>t.payee_profile_id!==null&&t.payee_profile_id===e),i=[...t].sort((e,t)=>{let n=r(e.payee_profile_id),i=r(t.payee_profile_id);return!!n==!!i?(n?.payee_name??``).localeCompare(i?.payee_name??``)||e.umpire_name.localeCompare(t.umpire_name):n?-1:1}),a=[`Period start`,`Period end`,`Payee`,`Umpire`,`Games`,`Earned`,`Adjustments`,`Total`,`Payment`,`Method`,`Reference`],o=i.map(t=>{let n=r(t.payee_profile_id);return[e.period_start,e.period_end,vd(n?.payee_name??`(no payee)`),vd(t.umpire_name),String(t.games),yd(t.earned_cents),yd(t.adjustments_cents),yd(t.total_cents),n?n.status:`none`,vd(n?.method??``),vd(n?.reference??``)].join(`,`)});return[a.join(`,`),...o].join(`\r
`)+`\r
`}var xd=e=>e.effective_payee_id===null;function Sd(e){return[...e].sort((e,t)=>Number(xd(t))-Number(xd(e))||e.display_name.localeCompare(t.display_name))}function Cd(e,t){let n=e=>`<option value="${V(e.profile_id)}"${e.profile_id===t?` selected`:``}>${V(e.display_name)}${e.email&&e.email!==e.display_name?` (${V(e.email)})`:``}</option>`,r=e.filter(e=>e.is_parent),i=e.filter(e=>!e.is_parent);return`${r.length?`<optgroup label="Parents and guardians">${r.map(n).join(``)}</optgroup>`:``}${i.length?`<optgroup label="Other accounts">${i.map(n).join(``)}</optgroup>`:``}`}function wd(e){let t=e.filter(xd).filter(e=>e.eligibility_status===`active`).length;return`
    <section class="payees" aria-labelledby="payees-title">
      <h2 id="payees-title">Who is paid</h2>
      <p class="report-privacy">
        Each umpire's pay goes to a <strong>payee</strong>. An <strong>adult</strong> umpire is paid to their own account
        unless you choose someone else. A <strong>youth</strong> umpire must have a <strong>parent or guardian's account</strong>
        chosen: Stripe does not allow a minor to hold a payout account. Brothers and sisters can share one parent, and are paid
        together as one family. A change here affects payrolls made from now on.
      </p>
      <p id="payees-message" class="message" role="status" aria-live="polite"></p>
      <p class="payees-summary" id="payees-summary">${t===0?`Everyone has a payee.`:`<strong>${t}</strong> active ${t===1?`umpire still needs`:`umpires still need`} a payee.`}</p>
      ${e.length===0?`<p class="report-none">There are no umpires yet.</p>`:`<div class="rates-table-wrap"><table class="rates-table payees-table">
            <caption class="visually-hidden">Who receives each umpire's pay</caption>
            <thead><tr><th scope="col">Umpire</th><th scope="col">Kind</th><th scope="col">Paid to</th><th scope="col"><span class="visually-hidden">Save</span></th></tr></thead>
            <tbody>${Sd(e).map(e=>`
              <tr data-payee-row="${V(e.umpire_id)}">
                <th scope="row">${V(e.display_name)}${e.eligibility_status===`active`?``:` <span class="payee-flag">(${V(e.eligibility_status)})</span>`}${xd(e)?` <span class="payee-flag payee-flag-missing">needs a payee</span>`:``}</th>
                <td>${e.classification===`adult`?`Adult`:`Youth`}${e.has_account?``:` <span class="payee-flag">(no account)</span>`}</td>
                <td><select class="payee-select" data-payee-select="${V(e.umpire_id)}" data-current="${V(e.payee_id??``)}" aria-label="${V(`Who is paid for ${e.display_name}`)}">
                  <option value="">${e.classification===`adult`?`Themselves`:`Choose a parent or guardian…`}</option>
                  ${e.payee_id?`<option value="${V(e.payee_id)}" selected>${V(e.effective_payee_name??`Chosen account`)}</option>`:``}
                </select></td>
                <td><button type="button" class="secondary-button rate-copy" data-save-payee="${V(e.umpire_id)}">Save</button></td>
              </tr>`).join(``)}</tbody>
          </table></div>`}
    </section>`}function Td(e){let t=t=>e.umpires.find(e=>e.umpire_id===t)?.display_name??`Unknown umpire`,n=e.earnings.reduce((e,t)=>e+t.amount_cents,0),r=e.adjustments.reduce((e,t)=>e+t.amount_cents,0),i=[...e.earnings].sort((e,n)=>e.game_date.localeCompare(n.game_date)||t(e.umpire_id).localeCompare(t(n.umpire_id)));return`
    <section class="earnings-section" aria-labelledby="earnings-title">
      <h2 id="earnings-title">Earnings</h2>
      <p class="report-privacy">
        An umpire earns a game when their <strong>arrival is recorded</strong> (their own check-in, or marked on the Field board)
        on a game that was played and not canceled. The amount is what that place paid <strong>on the game's date</strong>, and it
        is kept as it was at that moment, so a later change of rates does not alter it. Running this again only adds what is new.
      </p>
      <p id="earn-message" class="message" role="status" aria-live="polite"></p>

      <div class="earn-form">
        <label>From <input type="date" id="earn-from" value="${V(e.from)}" /></label>
        <label>Through <input type="date" id="earn-through" value="${V(e.through)}" max="${V(e.todayKey)}" /></label>
        <button type="button" class="primary-button" id="earn-run">Work out earnings</button>
      </div>

      <h3>Waiting to be paid</h3>
      <p class="earn-summary" id="earn-summary">${e.earnings.length} ${e.earnings.length===1?`earning`:`earnings`}, ${X(n)}${e.adjustments.length?`, and adjustments of ${gd(r)}`:``}.</p>
      ${e.earnings.length===0?`<p class="report-none">Nothing is waiting. Work out earnings above, or everything has been put in a payroll.</p>`:`<div class="rates-table-wrap"><table class="rates-table earn-table">
            <caption class="visually-hidden">Earnings not yet in a payroll</caption>
            <thead><tr><th scope="col">Date</th><th scope="col">Umpire</th><th scope="col">Division</th><th scope="col">Place</th><th scope="col">Amount</th><th scope="col"><span class="visually-hidden">Void</span></th></tr></thead>
            <tbody>${i.map(e=>`
              <tr data-earning="${V(e.id)}">
                <td>${V(md(e.game_date))}</td><th scope="row">${V(t(e.umpire_id))}</th><td>${V(e.division_name)}</td><td>${V(fd(e.position))}</td>
                <td class="money">${X(e.amount_cents)}</td>
                <td><button type="button" class="secondary-button rate-copy" data-void-earning="${V(e.id)}" aria-label="Void the earning of ${V(t(e.umpire_id))} on ${V(md(e.game_date))}">Void</button></td>
              </tr>`).join(``)}</tbody>
          </table></div>`}

      <h3>Adjustments</h3>
      <p class="field-help">For anything the arrivals do not capture: a substitute who worked, a bonus, a correction. A minus takes money away.</p>
      ${e.adjustments.length===0?`<p class="report-none">No adjustments are waiting.</p>`:`<ul class="rates-log adj-list">${e.adjustments.map(e=>`
        <li data-adjustment="${V(e.id)}">${V(t(e.umpire_id))}: <strong>${gd(e.amount_cents)}</strong> ${V(e.reason)} <span class="field-help">(${V(e.created_by_name)})</span>
          <button type="button" class="secondary-button rate-copy" data-void-adjustment="${V(e.id)}">Void</button></li>`).join(``)}</ul>`}

      <div class="adj-form">
        <label>Umpire
          <select id="adj-umpire"><option value="">Choose&hellip;</option>${[...e.umpires].sort((e,t)=>e.display_name.localeCompare(t.display_name)).map(e=>`<option value="${V(e.umpire_id)}">${V(e.display_name)}</option>`).join(``)}</select>
        </label>
        <label>Amount ($) <input id="adj-amount" inputmode="decimal" autocomplete="off" placeholder="10 or -5.50" /></label>
        <label>Reason <input id="adj-reason" maxlength="200" autocomplete="off" /></label>
        <button type="button" class="secondary-button" id="adj-add">Add adjustment</button>
      </div>
    </section>`}var Ed={draft:`Draft`,approved:`Approved: waiting to be paid`,paid:`Paid`,discarded:`Discarded`},Dd=e=>`${hd(e.period_start)} to ${hd(e.period_end)}`;function Od(e,t){return e.length===0?`<p class="report-none">Nobody is owed anything in this payroll.</p>`:`<div class="rates-table-wrap"><table class="rates-table pay-table">
    <thead><tr><th scope="col">Paid to</th><th scope="col">Umpires</th><th scope="col">Amount</th><th scope="col">Status</th></tr></thead>
    <tbody>${[...e].sort((e,t)=>e.payee_name.localeCompare(t.payee_name)).map(e=>`
      <tr data-payment="${V(e.id)}">
        <th scope="row">${V(e.payee_name)}</th><td>${e.umpire_count}</td><td class="money">${X(e.amount_cents)}</td>
        <td>${e.status===`paid`?`Paid${e.method?` by ${V(pd.find(([t])=>t===e.method)?.[1].toLowerCase()??e.method)}`:``}${e.reference?` (${V(e.reference)})`:``}`:t?`<span class="pay-record">
                <select data-pay-method="${V(e.id)}" aria-label="How ${V(e.payee_name)} was paid">${pd.map(([e,t])=>`<option value="${e}">${t}</option>`).join(``)}</select>
                <input data-pay-reference="${V(e.id)}" maxlength="100" placeholder="Check number or note" aria-label="Reference for ${V(e.payee_name)}" />
                <button type="button" class="secondary-button rate-copy" data-record-payment="${V(e.id)}">Record as paid</button>
              </span>`:`Waiting`}</td>
      </tr>`).join(``)}</tbody></table></div>`}function kd(e){return`<div class="rates-table-wrap"><table class="rates-table line-table">
    <thead><tr><th scope="col">Umpire</th><th scope="col">Games</th><th scope="col">Earned</th><th scope="col">Adjustments</th><th scope="col">Total</th></tr></thead>
    <tbody>${[...e].sort((e,t)=>e.umpire_name.localeCompare(t.umpire_name)).map(e=>`
      <tr><th scope="row">${V(e.umpire_name)}${e.payee_profile_id===null&&e.total_cents!==0?` <span class="payee-flag payee-flag-missing">no payee</span>`:``}</th><td>${e.games}</td><td class="money">${X(e.earned_cents)}</td><td class="money">${gd(e.adjustments_cents)}</td><td class="money">${gd(e.total_cents)}</td></tr>`).join(``)}</tbody></table></div>`}function Ad(e){return`${new Date(e.acted_at).toLocaleString(`en-US`,{month:`short`,day:`numeric`,hour:`numeric`,minute:`2-digit`}).replace(/\u202f/g,` `)} \u00b7 ${e.actor_name}: ${e.detail}`}function jd(e){let t=e.payrolls.find(e=>e.status===`draft`),n=e.payrolls.filter(e=>e.status!==`draft`),r=t=>e.lines.filter(e=>e.payroll_id===t),i=t=>e.payments.filter(e=>e.payroll_id===t),a=t?r(t.id).filter(e=>e.payee_profile_id===null&&e.total_cents!==0):[];return`
    <section class="payroll-section" aria-labelledby="payroll-title">
      <h2 id="payroll-title">Payroll</h2>
      <p class="report-privacy">
        A payroll collects everything waiting to be paid for a period, totals it for each <strong>family</strong> (payee), and is
        <strong>approved</strong> by the treasurer or any super admin. Then record each payment as it is made. Nothing is sent
        by this page; paying through Stripe comes later.
      </p>
      <p id="payroll-message" class="message" role="status" aria-live="polite"></p>

      ${t?`
        <article class="payroll-card payroll-draft" data-payroll="${V(t.id)}">
          <h3>Draft payroll: ${V(Dd(t))}${t.note?` <span class="field-help">(${V(t.note)})</span>`:``}</h3>
          <p class="payroll-total">Total: <strong>${gd(t.total_cents)}</strong>. Created by ${V(t.created_by_name)}.</p>
          ${a.length?`<p class="message error" role="alert">${a.length===1?`One umpire has`:`${a.length} umpires have`} no payee yet: ${a.map(e=>`${V(e.umpire_name)} (${gd(e.total_cents)})`).join(`, `)}. Choose a payee for ${a.length===1?`them`:`each`} in <strong>Payees</strong>, then approve.</p>`:``}
          <h4>Payments</h4>
          ${Od(i(t.id),!1)}
          <h4>By umpire</h4>
          ${kd(r(t.id))}
          <div class="rates-actions">
            <button type="button" class="primary-button" data-approve="${V(t.id)}">Approve payroll</button>
            <button type="button" class="secondary-button" data-discard="${V(t.id)}">Discard this draft</button>
          </div>
        </article>`:`
        <div class="earn-form payroll-new">
          <p class="field-help">${e.waitingCount===0?`Nothing is waiting to be paid yet. Work out earnings first.`:`${e.waitingCount} ${e.waitingCount===1?`item is`:`items are`} waiting to be paid.`}</p>
          <label>Period starts <input type="date" id="payroll-start" value="${V(e.defaultStart)}" /></label>
          <label>Period ends <input type="date" id="payroll-end" value="${V(e.defaultEnd)}" /></label>
          <label>Note <input id="payroll-note" maxlength="200" autocomplete="off" placeholder="Optional, for example October" /></label>
          <button type="button" class="primary-button" id="payroll-create">Create a payroll</button>
        </div>`}

      <h3>Earlier payrolls</h3>
      ${n.length===0?`<p class="report-none">No earlier payrolls.</p>`:n.map(e=>`
        <details class="payroll-card" data-payroll="${V(e.id)}">
          <summary><strong>${V(Dd(e))}</strong> &middot; ${V(Ed[e.status]??e.status)} &middot; ${e.status===`discarded`?``:gd(e.total_cents)}</summary>
          ${e.status===`discarded`?`<p class="field-help">This draft was discarded. Nothing was paid.</p>`:`
            <p class="field-help">Created by ${V(e.created_by_name)}${e.approved_by_name?`; approved by ${V(e.approved_by_name)}`:``}.${e.note?` ${V(e.note)}`:``}</p>
            ${Od(i(e.id),e.status===`approved`)}
            <button type="button" class="secondary-button" data-csv="${V(e.id)}">Download spreadsheet (CSV)</button>`}
        </details>`).join(``)}

      <h3 class="rates-log-title">Recent activity</h3>
      ${e.log.length===0?`<p class="report-none">Nothing yet.</p>`:`<ul class="rates-log">${e.log.map(e=>`<li>${V(Ad(e))}</li>`).join(``)}</ul>`}
    </section>`}var Z=null,Md=(e,t)=>{Z={selector:e,text:t}},Nd=e=>{e.innerHTML=`<p class="message error">This could not be loaded. Refresh and try again.</p>`},Pd=e=>{let t=z();return H(new Date(t.getFullYear(),t.getMonth()+e,1))};async function Fd(e){let t=ld(e);e.innerHTML=`<p>Loading&hellip;</p>`;let[n,r]=await Promise.all([R.rpc(`payments_umpire_list`),R.rpc(`payee_candidates`)]);if(n.error||r.error)return Nd(e);let i=n.data??[],a=r.data??[];e.innerHTML=wd(i),Z&&Z.selector===`#payees-message`&&(dd(e,Z.selector,Z.text,`success`),Z=null);let o=e=>{let t=e.target.closest(`.payee-select`);if(!t||t.dataset.filled)return;let n=t.dataset.current??``,r=t.options[0].outerHTML,i=n?[...t.options].find(e=>e.value===n)?.outerHTML??``:``;t.innerHTML=r+Cd(a,n||null),n&&!t.querySelector(`option[value="${n}"]`)&&t.insertAdjacentHTML(`beforeend`,i),t.value=n,t.dataset.filled=`1`};e.addEventListener(`focusin`,o,{signal:t.signal}),e.addEventListener(`pointerdown`,o,{signal:t.signal,capture:!0}),e.addEventListener(`click`,t=>{let n=t.target.closest(`[data-save-payee]`);if(!n)return;let r=n.dataset.savePayee,a=e.querySelector(`[data-payee-select="${r}"]`),o=i.find(e=>e.umpire_id===r);n.disabled=!0,(async()=>{let{error:t}=await R.rpc(`set_umpire_payee`,{p_umpire_id:r,p_payee_profile_id:a.value||null});if(t)return n.disabled=!1,dd(e,`#payees-message`,`Could not save. ${t.message}`);Md(`#payees-message`,`Saved the payee for ${o?.display_name??`that umpire`}.`),Fd(e)})()},{signal:t.signal})}var Id=``,Ld=``;async function Rd(e){let t=ld(e);e.innerHTML=`<p>Loading&hellip;</p>`;let[n,r,i]=await Promise.all([R.rpc(`payments_umpire_list`),R.from(`earnings`).select(`id, umpire_id, game_date, division_name, position, amount_cents`).is(`payroll_id`,null).is(`voided_at`,null),R.from(`earning_adjustments`).select(`id, umpire_id, amount_cents, reason, created_by_name`).is(`payroll_id`,null).is(`voided_at`,null)]);if(n.error||r.error||i.error)return Nd(e);let a=H(z());Id||=Pd(-1),Ld||=a,e.innerHTML=Td({umpires:n.data??[],earnings:r.data??[],adjustments:i.data??[],from:Id,through:Ld,todayKey:a}),Z&&Z.selector===`#earn-message`&&(dd(e,Z.selector,Z.text,`success`),Z=null);let o=t=>{Md(`#earn-message`,t),Rd(e)};e.addEventListener(`change`,e=>{let t=e.target;t.id===`earn-from`&&(Id=t.value),t.id===`earn-through`&&(Ld=t.value)},{signal:t.signal}),e.addEventListener(`click`,t=>{let n=t.target,r=t=>dd(e,`#earn-message`,t);if(n.closest(`#earn-run`)){let e=n.closest(`#earn-run`);if(!Id||!Ld)return r(`Choose a start and an end date.`);e.disabled=!0,(async()=>{let{data:t,error:n}=await R.rpc(`generate_earnings`,{p_from:Id,p_through:Ld});if(n)return e.disabled=!1,r(`Could not work out earnings. ${n.message}`);let i=t;o(`Added ${i.created} ${i.created===1?`earning`:`earnings`} (${X(i.total_cents)}).`+(i.no_rate>0?` ${i.no_rate} recorded ${i.no_rate===1?`arrival earned`:`arrivals earned`} nothing because that place has no pay rate (see Pay rates).`:``))})();return}let i=n.closest(`[data-void-earning]`);if(i){let e=window.prompt(`Why is this earning being voided? (A reason is required.)`);if(e===null)return;i.disabled=!0,(async()=>{let{error:t}=await R.rpc(`void_earning`,{p_id:i.dataset.voidEarning,p_reason:e});if(t)return i.disabled=!1,r(`Could not void it. ${t.message}`);o(`Voided.`)})();return}let a=n.closest(`[data-void-adjustment]`);if(a){if(!window.confirm(`Void this adjustment?`))return;a.disabled=!0,(async()=>{let{error:e}=await R.rpc(`void_adjustment`,{p_id:a.dataset.voidAdjustment});if(e)return a.disabled=!1,r(`Could not void it. ${e.message}`);o(`Adjustment voided.`)})()}else if(n.closest(`#adj-add`)){let t=n.closest(`#adj-add`),i=e.querySelector(`#adj-umpire`).value,a=_d(e.querySelector(`#adj-amount`).value),s=e.querySelector(`#adj-reason`).value.trim();if(!i)return r(`Choose the umpire.`);if(!a.ok)return r(a.error);if(!s)return r(`Give a reason.`);t.disabled=!0,(async()=>{let{error:e}=await R.rpc(`add_adjustment`,{p_umpire_id:i,p_game_id:null,p_amount_cents:a.cents,p_reason:s});if(e)return t.disabled=!1,r(`Could not add it. ${e.message}`);o(`Adjustment added.`)})()}},{signal:t.signal})}async function zd(e){let t=ld(e);e.innerHTML=`<p>Loading&hellip;</p>`;let[n,r,i,a,o,s]=await Promise.all([R.from(`payrolls`).select(`id, period_start, period_end, status, note, total_cents, created_by_name, created_at, approved_by_name, approved_at`),R.from(`payroll_lines`).select(`payroll_id, umpire_id, umpire_name, payee_profile_id, games, earned_cents, adjustments_cents, total_cents`),R.from(`payroll_payments`).select(`id, payroll_id, payee_profile_id, payee_name, amount_cents, umpire_count, status, method, reference, paid_at`),R.from(`money_log`).select(`action, detail, actor_name, acted_at`).limit(60),R.from(`earnings`).select(`id`).is(`payroll_id`,null).is(`voided_at`,null),R.from(`earning_adjustments`).select(`id`).is(`payroll_id`,null).is(`voided_at`,null)]);if(n.error||r.error||i.error||a.error||o.error||s.error)return Nd(e);let c=(n.data??[]).sort((e,t)=>t.created_at.localeCompare(e.created_at)),l=r.data??[],u=i.data??[],d=(a.data??[]).sort((e,t)=>t.acted_at.localeCompare(e.acted_at)).slice(0,30),f=Pd(-1),[p,m]=f.split(`-`).map(Number);e.innerHTML=jd({payrolls:c,lines:l,payments:u,log:d,defaultStart:f,defaultEnd:H(new Date(p,m,0)),waitingCount:(o.data??[]).length+(s.data??[]).length}),Z&&Z.selector===`#payroll-message`&&(dd(e,Z.selector,Z.text,`success`),Z=null);let h=t=>{Md(`#payroll-message`,t),zd(e)};e.addEventListener(`click`,t=>{let n=t.target,r=t=>dd(e,`#payroll-message`,t),i=(e,t,n,i,a)=>{e.disabled=!0,(async()=>{let{error:o}=await R.rpc(t,n);if(o)return e.disabled=!1,r(`${a} ${o.message}`);h(i)})()},a=n.closest(`#payroll-create`);if(a){let t=e.querySelector(`#payroll-start`).value,n=e.querySelector(`#payroll-end`).value;return!t||!n?r(`Choose when the period starts and ends.`):i(a,`create_payroll`,{p_period_start:t,p_period_end:n,p_note:e.querySelector(`#payroll-note`).value.trim()||null},`Draft payroll created. Check it, then approve it.`,`Could not create the payroll.`)}let o=n.closest(`[data-approve]`);if(o){let e=c.find(e=>e.id===o.dataset.approve);return window.confirm(`Approve this payroll for ${X(e?.total_cents??0)}? After approval it cannot be changed, only paid.`)?i(o,`approve_payroll`,{p_id:o.dataset.approve},`Approved. Record each payment as it is made.`,`Could not approve.`):void 0}let s=n.closest(`[data-discard]`);if(s)return window.confirm(`Discard this draft? Everything in it goes back to waiting to be paid.`)?i(s,`discard_payroll`,{p_id:s.dataset.discard},`Draft discarded. Its earnings are waiting to be paid again.`,`Could not discard.`):void 0;let d=n.closest(`[data-record-payment]`);if(d){let t=d.dataset.recordPayment,n=e.querySelector(`[data-pay-method="${t}"]`).value;return i(d,`record_payment`,{p_payment_id:t,p_method:n,p_reference:e.querySelector(`[data-pay-reference="${t}"]`).value.trim()||null},`Payment recorded.`,`Could not record the payment.`)}let f=n.closest(`[data-csv]`);if(f){let e=c.find(e=>e.id===f.dataset.csv);if(!e)return;let t=bd(e,l.filter(t=>t.payroll_id===e.id),u.filter(t=>t.payroll_id===e.id)),n=document.createElement(`a`);n.href=URL.createObjectURL(new Blob([t],{type:`text/csv;charset=utf-8`})),n.download=`payroll-${e.period_start}-to-${e.period_end}.csv`,document.body.appendChild(n),n.click(),n.remove(),setTimeout(()=>URL.revokeObjectURL(n.href),1e3)}},{signal:t.signal})}var Bd=``,Vd=(e,t)=>{let[n,r,i]=e.split(`-`).map(Number);return H(new Date(n,r-1,i+t))};async function Hd(e){ud(e),e.innerHTML=`<p>Loading&hellip;</p>`;let[t,n,r]=await Promise.all([Ao(),R.from(`pay_rates`).select(`division_id, classification, position, amount_cents, effective_on`).order(`effective_on`),R.from(`pay_rate_log`).select(`division_name, classification, position, effective_on, old_cents, new_cents, changed_by_name, changed_at`).order(`changed_at`,{ascending:!1}).limit(20)]);if(t.error||!t.context||n.error||r.error){e.innerHTML=`<p class="message error">The pay rates could not be loaded. Refresh and try again.</p>`;return}let i=Va(t.context.divisions).map(e=>({id:e.id,name:e.name})),a=n.data??[],o=H(z()),s=o,c=()=>{let t=ld(e),n=ed(a,s);e.innerHTML=sd({divisions:i,current:n,effectiveOn:s,todayKey:o,minDate:Vd(o,-60),maxDate:Vd(o,365),log:r.data??[]});let l=t=>e.querySelector(t),u=(e,t=`error`)=>{let n=l(`#rates-message`);n.textContent=e,n.className=`message ${t}`};Bd&&=(u(Bd,`success`),``);let d=()=>new Map([...e.querySelectorAll(`.rate-cell`)].map(e=>[e.dataset.rateKey,e.value])),f=()=>td(n,d());l(`#rates-date`)?.addEventListener(`change`,e=>{let t=e.target.value;if(!t)return;let{changes:n,errors:r}=f();(n.length||r.length)&&!window.confirm(`Changing the start date will discard the amounts you have typed. Continue?`)?e.target.value=s:(s=t,c())},{signal:t.signal}),e.addEventListener(`click`,t=>{let n=t.target,r=n.closest(`[data-copy-row]`);if(r){let[t]=r.dataset.copyRow.split(`|`),n=[...e.querySelectorAll(`[data-rate-row="${r.dataset.copyRow}"] .rate-cell`)].map(e=>e.value);e.querySelectorAll(`[data-rate-row^="${t}|"]`).forEach(e=>{e.querySelectorAll(`.rate-cell`).forEach((e,t)=>{e.value=n[t]})}),u(`Copied to every division. Press Save rates to keep it.`,`success`)}else{if(n.closest(`#rates-reset`))return c();if(n.closest(`#rates-save`)){e.querySelectorAll(`.rate-cell`).forEach(e=>e.removeAttribute(`aria-invalid`));let{changes:t,errors:n}=f();if(n.length)return e.querySelector(`[data-rate-key="${n[0].key}"]`)?.setAttribute(`aria-invalid`,`true`),e.querySelector(`[data-rate-key="${n[0].key}"]`)?.focus(),u(n[0].message);if(t.length===0)return u(`There is nothing to save: no amount has changed.`);let r=l(`#rates-save`);r.disabled=!0,(async()=>{let{data:n,error:i}=await R.rpc(`set_pay_rates`,{p_effective_on:s,p_rates:t});if(i)return r.disabled=!1,u(`Could not save the rates. ${i.message}`);Bd=`Saved ${n} ${Number(n)===1?`rate`:`rates`}, starting ${s}.`,Hd(e)})()}}},{signal:t.signal})};c()}var Ud=[[`rates`,`Pay rates`],[`payees`,`Who is paid`],[`earnings`,`Earnings`],[`payroll`,`Payroll`]],Wd=`rates`,Gd=new WeakMap;async function Kd(e){Gd.get(e)?.abort();let t=new AbortController;Gd.set(e,t),e.innerHTML=`
    <main class="page">
      <section class="auth-card admin-card payments-card">
        <p class="eyebrow">RWCLL &middot; PAYMENTS</p>
        <h1>Payments</h1>
        <div class="pay-tabs" role="group" aria-label="Payments sections">
          ${Ud.map(([e,t])=>`<button type="button" class="pay-tab" data-pay-section="${e}" aria-pressed="${e===Wd}">${t}</button>`).join(``)}
        </div>
        <div id="payments-content"></div>
      </section>
    </main>`;let n=e.querySelector(`#payments-content`),r=t=>{Wd=t,e.querySelectorAll(`[data-pay-section]`).forEach(e=>{e.setAttribute(`aria-pressed`,String(e.dataset.paySection===t))}),({rates:Hd,payees:Fd,earnings:Rd,payroll:zd}[t]??Hd)(n)};e.addEventListener(`click`,e=>{let t=e.target.closest(`[data-pay-section]`);t&&r(t.dataset.paySection)},{signal:t.signal}),r(Wd)}var qd=`2026-11`;function Jd(e){return`I am the parent or legal guardian of ${e}. I give permission for ${e} to umpire games for Redwood City Little League. I understand that I can withdraw this permission at any time on this page, and that ${e} will not be assigned to games while it is withdrawn.`}var Yd=[[`mother`,`Mother`],[`father`,`Father`],[`guardian`,`Guardian`],[`other`,`Other`]],Xd=e=>Yd.find(([t])=>t===e)?.[1]??e,Zd=e=>e.split(`-`).map(Number),Qd=(e,t)=>{let[n,r,i]=Zd(e),[a,o,s]=Zd(t);return Math.round((Date.UTC(a,o-1,s)-Date.UTC(n,r-1,i))/864e5)},$d=e=>{let[t,n,r]=Zd(e);return new Date(t,n-1,r).toLocaleDateString(`en-US`,{month:`short`,day:`numeric`,year:`numeric`})},ef={consent:0,turned_18:1,turning_18:2,no_guardian:3};function tf(e,t){let n=[];for(let r of e){let e=r.age!==null&&r.age>=18;if(r.needs_consent&&!r.has_consent&&n.push({kind:`consent`,umpire:r,text:r.guardians.length===0?`Needs a parent or guardian's consent before they can be assigned, and no parent or guardian is linked yet.`:`Needs a parent or guardian's consent before they can be assigned.`}),e)n.push({kind:`turned_18`,umpire:r,text:`Turned 18 (age ${r.age}). Change them to an adult umpire.`});else if(r.turns_18_on){let e=Qd(t,r.turns_18_on);e>=0&&e<=60&&n.push({kind:`turning_18`,umpire:r,text:`Turns 18 on ${$d(r.turns_18_on)} (in ${e} ${e===1?`day`:`days`}).`})}r.guardians.length!==0||e||r.needs_consent&&!r.has_consent||n.push({kind:`no_guardian`,umpire:r,text:`No parent or guardian is linked. A youth umpire is paid through a parent or guardian.`})}return n.sort((e,t)=>ef[e.kind]-ef[t.kind]||e.umpire.display_name.localeCompare(t.umpire.display_name))}function nf(e,t=null){let n=e.filter(e=>e.children===0),r=e.filter(e=>e.children>0),i=e=>`<option value="${V(e.profile_id)}"${e.profile_id===t?` selected`:``}>${V(e.display_name)}${e.email&&e.email!==e.display_name?` (${V(e.email)})`:``}</option>`;return`${n.length?`<optgroup label="Not linked to a child yet">${n.map(i).join(``)}</optgroup>`:``}${r.length?`<optgroup label="Already linked to a child">${r.map(i).join(``)}</optgroup>`:``}`}function rf(e){return`${new Date(e.acted_at).toLocaleString(`en-US`,{month:`short`,day:`numeric`,hour:`numeric`,minute:`2-digit`}).replace(/\u202f/g,` `)} \u00b7 ${e.actor_name}: ${e.detail}`}function af(e){let t=tf(e.umpires,e.todayKey),n=e=>`<select class="rel-select" ${e} aria-label="Relationship">${Yd.map(([e,t])=>`<option value="${e}">${t}</option>`).join(``)}</select>`,r=e.consentBelow>e.minAge?`Umpires aged <strong>${e.minAge} to ${e.consentBelow-1}</strong> need a linked parent or guardian's consent before they can be assigned.`:`Nobody under ${e.minAge} can be approved, so consent does not come up.`;return`
    <section class="families" aria-labelledby="families-title">
      <h2 id="families-title">Parents and guardians</h2>
      <p class="report-privacy">
        <strong>Only you can link</strong> a parent or guardian to a youth umpire: nobody can attach themselves to a child.
        A parent sees, read-only, their own children's games, earnings and the payments made to them. Minimum age <strong>${e.minAge}</strong>.
        ${r}
      </p>
      <p id="families-message" class="message" role="status" aria-live="polite"></p>

      <h3>Needs attention</h3>
      ${t.length===0?`<p class="report-none">Nothing needs attention.</p>`:`<ul class="attention-list">${t.map(e=>`
            <li class="attention attention-${e.kind}" data-attention="${e.kind}" data-umpire="${V(e.umpire.umpire_id)}">
              <strong>${V(e.umpire.display_name)}</strong>: ${V(e.text)}
              ${e.kind===`turned_18`?`<button type="button" class="secondary-button rate-copy" data-convert="${V(e.umpire.umpire_id)}">Change to adult</button>`:``}
            </li>`).join(``)}</ul>`}

      <h3>Youth umpires</h3>
      ${e.umpires.length===0?`<p class="report-none">There are no youth umpires yet.</p>`:e.umpires.map(e=>`
        <article class="family-card" data-family="${V(e.umpire_id)}">
          <h4>${V(e.display_name)}
            <span class="family-meta">${e.age===null?`age unknown`:`age ${e.age}`}${e.has_account?``:` · no account`}${e.eligibility_status===`active`?``:` \u00b7 ${V(e.eligibility_status)}`}</span>
            ${e.needs_consent?e.has_consent?`<span class="family-badge family-badge-ok">Consent given</span>`:`<span class="family-badge family-badge-wait">Waiting for consent</span>`:``}
          </h4>
          ${e.guardians.length===0?`<p class="report-none">No parent or guardian linked.</p>`:`<ul class="guardian-list">${e.guardians.map(t=>`
            <li data-link="${V(t.link_id)}">${V(t.name)} <span class="family-meta">(${V(Xd(t.relationship))}${t.email?`, ${V(t.email)}`:``}${e.needs_consent?`, ${t.consent?`has given consent`:`no consent yet`}`:``})</span>
              <button type="button" class="secondary-button rate-copy" data-unlink="${V(t.link_id)}" aria-label="Unlink ${V(t.name)} from ${V(e.display_name)}">Unlink</button></li>`).join(``)}</ul>`}
          ${e.guardians.length>=4?`<p class="field-help">The most (4) are linked.</p>`:`
          <div class="link-form">
            <select class="parent-select" data-link-parent="${V(e.umpire_id)}" aria-label="Parent or guardian to link to ${V(e.display_name)}"><option value="">Choose a parent or guardian&hellip;</option></select>
            ${n(`data-link-rel="${V(e.umpire_id)}"`)}
            <button type="button" class="secondary-button" data-link-add="${V(e.umpire_id)}">Link</button>
          </div>`}
        </article>`).join(``)}

      <h3>Parent and guardian accounts</h3>
      ${e.parents.length===0?`<p class="report-none">No parent or guardian accounts are approved yet.</p>`:`<ul class="guardian-list">${e.parents.map(e=>`
        <li data-parent="${V(e.profile_id)}"><strong>${V(e.display_name)}</strong> <span class="family-meta">${V(e.email??``)}</span>
          ${e.children===0?`<span class="family-badge family-badge-wait">not linked to a child</span>`:`<span class="family-meta">${e.children} ${e.children===1?`child`:`children`}</span>`}
          ${e.registration_note?`<br><span class="family-meta">Said: ${V(e.registration_note)}</span>`:``}</li>`).join(``)}</ul>`}

      <h3 class="rates-log-title">Recent activity</h3>
      ${e.log.length===0?`<p class="report-none">Nothing yet.</p>`:`<ul class="rates-log">${e.log.map(e=>`<li>${V(rf(e))}</li>`).join(``)}</ul>`}
    </section>`}var of=e=>e?Yu.find(([t])=>t===e)?.[1]??e:``;function sf(e){return new Date(e).toLocaleString(`en-US`,{timeZone:`America/Los_Angeles`,weekday:`short`,month:`short`,day:`numeric`,hour:`numeric`,minute:`2-digit`}).replace(/\u202f/g,` `)}function cf(e){return e.game_status===`canceled`?`Game canceled`:e.attendance===`arrived`?`Arrived`:e.attendance===`no_show`?`Did not arrive`:e.assignment_status===`confirmed`?`Confirmed`:e.assignment_status===`declined`?`Declined`:`Assigned: not confirmed yet`}var lf={waiting:`Waiting to be paid`,approved:`Approved: payment coming`,paid:`Paid`};function uf(e){let t={waiting:0,approved:0,paid:0};for(let n of e)t[n.state]=(t[n.state]??0)+n.amount_cents;return t}var df=e=>e<0?`-${X(-e)}`:X(e);function ff(e){return e.needs_consent?e.has_consent?e.i_consented?`<div class="consent-box consent-given"><p>You gave consent for ${V(e.display_name)} to umpire.
        <button type="button" class="secondary-button" data-withdraw-consent="${V(e.umpire_id)}">Withdraw consent</button></p></div>`:`<div class="consent-box consent-given"><p>Another parent or guardian has given consent for ${V(e.display_name)}.</p></div>`:`
      <div class="consent-box consent-needed" role="group" aria-label="Consent for ${V(e.display_name)}">
        <p><strong>${V(e.display_name)} cannot be assigned to games until you give consent.</strong></p>
        <p class="consent-text">${V(Jd(e.display_name))}</p>
        <button type="button" class="primary-button" data-give-consent="${V(e.umpire_id)}">I give consent</button>
      </div>`:``}function pf(e){let t=e.payments.filter(e=>e.status===`paid`).reduce((e,t)=>e+t.amount_cents,0),n=e.payments.filter(e=>e.status!==`paid`).reduce((e,t)=>e+t.amount_cents,0);return`
    <section class="my-family" aria-labelledby="my-family-title">
      <h2 id="my-family-title">My family</h2>
      <p class="report-privacy">This page is <strong>read-only</strong>. It shows your own children's games, earnings and the payments made to you. Nothing here can be changed except consent.</p>
      <p id="family-message" class="message" role="status" aria-live="polite"></p>

      <h3>Payments to you</h3>
      ${e.payments.length===0?`<p class="report-none">No payments yet.</p>`:`
        <p class="earn-summary">Paid to you so far: <strong>${X(t)}</strong>${n>0?`. Coming: <strong>${X(n)}</strong>`:``}.</p>
        <div class="rates-table-wrap"><table class="rates-table pay-table">
          <caption class="visually-hidden">Payments made to you</caption>
          <thead><tr><th scope="col">Period</th><th scope="col">Children</th><th scope="col">Amount</th><th scope="col">Status</th></tr></thead>
          <tbody>${e.payments.map(e=>`<tr><th scope="row">${V($d(e.period_start))} to ${V($d(e.period_end))}</th><td>${e.umpire_count}</td><td class="money">${X(e.amount_cents)}</td><td>${e.status===`paid`?`Paid${e.method?` by ${V(e.method.replace(`_`,` `))}`:``}`:`Coming`}</td></tr>`).join(``)}</tbody>
        </table></div>`}

      ${e.children.length===0?`<p class="report-none">No children are linked to your account yet. An administrator links your account to your child. If you have signed up recently, please wait for them.</p>`:e.children.map(t=>{let n=e.schedules[t.umpire_id]??[],r=n.filter(t=>t.starts_at>=e.nowIso),i=n.filter(t=>t.starts_at<e.nowIso).reverse(),a=e.earnings[t.umpire_id]??[],o=uf(a),s=(e,t)=>e.length===0?`<p class="report-none">None.</p>`:`
          <div class="rates-table-wrap"><table class="rates-table sched-table">
            <caption class="visually-hidden">${V(t)}</caption>
            <thead><tr><th scope="col">When</th><th scope="col">Game</th><th scope="col">Field</th><th scope="col">Place</th><th scope="col">Status</th></tr></thead>
            <tbody>${e.map(e=>`<tr><th scope="row">${V(sf(e.starts_at))}</th><td>${V(e.home_team??`?`)} vs ${V(e.away_team??`?`)}${e.division_name?` <span class="family-meta">(${V(e.division_name)})</span>`:``}</td><td>${V(e.location_name??``)}</td><td>${V(of(e.place))}</td><td>${V(cf(e))}</td></tr>`).join(``)}</tbody>
          </table></div>`;return`
          <article class="family-card" data-child="${V(t.umpire_id)}">
            <h3>${V(t.display_name)} <span class="family-meta">${t.age===null?``:`age ${t.age}, `}you are their ${V(Xd(t.relationship).toLowerCase())}</span>
              ${t.needs_consent&&!t.has_consent?`<span class="family-badge family-badge-wait">Waiting for consent</span>`:t.eligibility_status===`active`?`<span class="family-badge family-badge-ok">Active</span>`:`<span class="family-badge family-badge-wait">${V(t.eligibility_status)}</span>`}
            </h3>
            ${ff(t)}
            <h4>Coming up</h4>
            ${s(r,`${t.display_name}'s upcoming games`)}
            <h4>Earlier games</h4>
            ${s(i,`${t.display_name}'s earlier games`)}
            <h4>Earnings</h4>
            ${a.length===0?`<p class="report-none">No earnings yet.</p>`:`
              <p class="earn-summary">Waiting to be paid: <strong>${df(o.waiting)}</strong> &middot; Approved: <strong>${df(o.approved)}</strong> &middot; Paid: <strong>${df(o.paid)}</strong></p>
              <div class="rates-table-wrap"><table class="rates-table earn-table">
                <caption class="visually-hidden">${V(t.display_name)}'s earnings</caption>
                <thead><tr><th scope="col">Date</th><th scope="col">For</th><th scope="col">Amount</th><th scope="col">Status</th></tr></thead>
                <tbody>${a.map(e=>`<tr><th scope="row">${V($d(e.on_date))}</th><td>${e.kind===`adjustment`?`Adjustment: ${V(e.label)}`:`${V(e.label)}, ${V(of(e.place).toLowerCase())}`}</td><td class="money">${df(e.amount_cents)}</td><td>${V(lf[e.state]??e.state)}</td></tr>`).join(``)}</tbody>
              </table></div>`}
          </article>`}).join(``)}
    </section>`}var mf=``;async function hf(e){let t=ld(e),n=e=>`<main class="page"><section class="auth-card admin-card families-card"><p class="eyebrow">RWCLL &middot; FAMILIES</p><h1>Families</h1>${e}</section></main>`;e.innerHTML=n(`<p>Loading&hellip;</p>`);let[r,i,a,o,s]=await Promise.all([R.rpc(`families_overview`),R.rpc(`parent_accounts`),R.from(`family_log`).select(`action, detail, actor_name, acted_at`).limit(60),R.rpc(`umpire_min_age`),R.rpc(`parent_consent_below_age`)]);if(r.error||i.error||a.error){e.innerHTML=n(`<p class="message error">The families could not be loaded. Refresh and try again.</p>`);return}let c=r.data??[],l=i.data??[];e.innerHTML=n(af({umpires:c,parents:l,log:(a.data??[]).sort((e,t)=>t.acted_at.localeCompare(e.acted_at)).slice(0,30),todayKey:H(z()),minAge:Number(o.data??13),consentBelow:Number(s.data??13)})),mf&&=(dd(e,`#families-message`,mf,`success`),``);let u=t=>{mf=t,hf(e)},d=e=>c.find(t=>t.umpire_id===e)?.display_name??`that umpire`,f=e=>{let t=e.target.closest(`.parent-select`);t&&!t.dataset.filled&&(t.insertAdjacentHTML(`beforeend`,nf(l)),t.dataset.filled=`1`)};e.addEventListener(`focusin`,f,{signal:t.signal}),e.addEventListener(`pointerdown`,f,{signal:t.signal,capture:!0}),e.addEventListener(`click`,t=>{let n=t.target,r=t=>dd(e,`#families-message`,t),i=n.closest(`[data-link-add]`);if(i){let t=i.dataset.linkAdd,n=e.querySelector(`[data-link-parent="${t}"]`).value,a=e.querySelector(`[data-link-rel="${t}"]`).value;if(!n)return r(`Choose a parent or guardian first.`);i.disabled=!0,(async()=>{let{error:e}=await R.rpc(`link_guardian`,{p_umpire_id:t,p_parent_id:n,p_relationship:a});if(e)return i.disabled=!1,r(`Could not link. ${e.message}`);u(`Linked to ${d(t)}.`)})();return}let a=n.closest(`[data-unlink]`);if(a){if(!window.confirm(`Unlink this parent or guardian? They will no longer see this child, and any consent they gave is withdrawn.`))return;a.disabled=!0,(async()=>{let{error:e}=await R.rpc(`unlink_guardian`,{p_link_id:a.dataset.unlink});if(e)return a.disabled=!1,r(`Could not unlink. ${e.message}`);u(`Unlinked.`)})();return}let o=n.closest(`[data-convert]`);if(o){let e=o.dataset.convert;if(!window.confirm(`Change ${d(e)} to an adult umpire? They will be paid adult rates, to themselves, their parents' links will end, and their account's role changes. This cannot be undone here.`))return;o.disabled=!0,(async()=>{let{error:t}=await R.rpc(`convert_to_adult`,{p_umpire_id:e});if(t)return o.disabled=!1,r(`Could not change them. ${t.message}`);u(`${d(e)} is now an adult umpire.`)})()}},{signal:t.signal})}var gf=``;async function _f(e){let t=ld(e),n=e=>`<main class="page"><section class="auth-card admin-card family-page">${e}</section></main>`;e.innerHTML=n(`<p>Loading&hellip;</p>`);let[r,i]=await Promise.all([R.rpc(`my_family`),R.rpc(`my_payments`)]);if(r.error||i.error){e.innerHTML=n(`<p class="message error">Your family page could not be loaded. Refresh and try again.</p>`);return}let a=r.data??[],o={},s={};await Promise.all(a.map(async e=>{let[t,n]=await Promise.all([R.rpc(`family_schedule`,{p_umpire_id:e.umpire_id}),R.rpc(`family_earnings`,{p_umpire_id:e.umpire_id})]);o[e.umpire_id]=t.data??[],s[e.umpire_id]=n.data??[]})),e.innerHTML=n(pf({children:a,schedules:o,earnings:s,payments:i.data??[],nowIso:z().toISOString()})),gf&&=(dd(e,`#family-message`,gf,`success`),``);let c=t=>{gf=t,_f(e)},l=e=>a.find(t=>t.umpire_id===e)?.display_name??`your child`;e.addEventListener(`click`,t=>{let n=t.target,r=n.closest(`[data-give-consent]`);if(r){let t=r.dataset.giveConsent;r.disabled=!0,(async()=>{let{error:n}=await R.rpc(`give_consent`,{p_umpire_id:t,p_text_version:qd});if(n)return r.disabled=!1,dd(e,`#family-message`,`Could not record your consent. ${n.message}`);c(`Thank you. Your consent for ${l(t)} is recorded.`)})();return}let i=n.closest(`[data-withdraw-consent]`);if(i){let t=i.dataset.withdrawConsent;if(!window.confirm(`Withdraw your consent for ${l(t)} to umpire? They will not be assigned to games until consent is given again.`))return;i.disabled=!0,(async()=>{let{error:n}=await R.rpc(`withdraw_consent`,{p_umpire_id:t});if(n)return i.disabled=!1,dd(e,`#family-message`,`Could not withdraw your consent. ${n.message}`);c(`Your consent for ${l(t)} is withdrawn.`)})()}},{signal:t.signal})}async function vf(){let{data:e,error:t}=await R.from(`app_settings`).select(`value`).eq(`key`,`demo_clock_allowed`).maybeSingle();return!t&&e?.value===`true`}var yf=e=>e.toLocaleString(`en-US`,{weekday:`short`,month:`short`,day:`numeric`,hour:`numeric`,minute:`2-digit`}).replace(/\u202f/g,` `),bf=e=>String(e).padStart(2,`0`),xf=e=>`${e.getFullYear()}-${bf(e.getMonth()+1)}-${bf(e.getDate())}`,Sf=e=>`${bf(e.getHours())}:${bf(e.getMinutes())}`,Cf;function wf(){document.getElementById(`demo-clock`)?.remove(),Cf!==void 0&&window.clearInterval(Cf),Cf=void 0}async function Tf(){if(wf(),!await vf()){Aa()&&(Ma(),window.location.reload());return}let e=Aa(),t=z(),n=document.createElement(`div`);n.id=`demo-clock`,n.className=`demo-clock${e?` demo-clock-on`:``}`,n.setAttribute(`role`,`region`),n.setAttribute(`aria-label`,`Demo clock`),n.innerHTML=`
    <div class="demo-clock-row">
      <span class="demo-clock-text">${e?`Pretend time: <strong id="demo-clock-now">${V(yf(t))}</strong> (not real)`:`Demo clock`}</span>
      <button type="button" id="demo-clock-open" class="secondary-button">${e?`Change`:`Set pretend time`}</button>
      ${e?`<button type="button" id="demo-clock-reset" class="secondary-button">Use real time</button>`:``}
    </div>
    <form id="demo-clock-form" class="demo-clock-form" hidden>
      <label>Date <input id="demo-clock-date" type="date" required value="${xf(t)}" /></label>
      <label>Time <input id="demo-clock-time" type="time" required value="${Sf(t)}" /></label>
      <button type="submit" class="primary-button">Set</button>
      <button type="button" id="demo-clock-cancel" class="secondary-button">Cancel</button>
      <p class="demo-clock-help">The app will behave as if it were this time, and the clock keeps ticking from here. It applies to this browser only.</p>
    </form>`,document.body.appendChild(n);let r=n.querySelector(`#demo-clock-form`);n.querySelector(`#demo-clock-open`)?.addEventListener(`click`,()=>{r.hidden=!r.hidden}),n.querySelector(`#demo-clock-cancel`)?.addEventListener(`click`,()=>{r.hidden=!0}),n.querySelector(`#demo-clock-reset`)?.addEventListener(`click`,()=>{Ma(),window.location.reload()}),r.addEventListener(`submit`,e=>{e.preventDefault();let t=n.querySelector(`#demo-clock-date`).value,r=n.querySelector(`#demo-clock-time`).value,i=new Date(`${t}T${r}:00`);Number.isNaN(i.getTime())||(ja(i),window.location.reload())}),e&&(Cf=window.setInterval(()=>{let e=document.getElementById(`demo-clock-now`);if(!e)return wf();e.textContent=yf(z())},15e3))}function Ef(e){if(e==null)return 30;let t=e.trim();if(!/^\d+$/.test(t))return 30;let n=Number(t);return n===0?0:n>=1&&n<=480?n:30}function Df(e,t,n=6e4){return e>=t?{kind:`expired`}:e>=t-Math.min(n,t/2)?{kind:`warning`,secondsLeft:Math.ceil((t-e)/1e3)}:{kind:`active`}}var Of=[`youth_umpire`,`adult_umpire`,`parent_guardian`];function kf(e){return e.some(e=>!Of.includes(e))}function Af(e){return`You were signed out because the app was not used for ${e} ${e===1?`minute`:`minutes`}.`}var jf=`rwcll-last-activity-ms`,Mf=`rwcll-idle-signout-notice`,Nf=[`pointerdown`,`keydown`,`touchstart`,`scroll`,`wheel`,`mousemove`],Pf=null,Ff=0,If=Date.now();function Lf(){try{let e=Number(localStorage.getItem(jf));return Number.isFinite(e)&&e>0?Math.max(e,If):If}catch{return If}}function Rf(){If=Date.now();try{localStorage.setItem(jf,String(If))}catch{}}async function zf(e){let{data:t,error:n}=await R.from(`app_settings`).select(`value`).eq(`key`,e?`idle_logout_minutes`:`idle_logout_minutes_umpire`).maybeSingle();return Ef(n?null:t?.value)}function Bf(){Ff+=1,Pf?.(),Pf=null}function Vf(){try{let e=localStorage.getItem(Mf);return localStorage.removeItem(Mf),e}catch{return null}}async function Hf(e){Bf();let t=Ff,n=await zf(e.isAdministrator);if(t!==Ff||n===0)return;let r=n*6e4;Rf();let i=Date.now(),a=()=>{Date.now()-i<1e3||(i=Date.now(),Rf())};Nf.forEach(e=>window.addEventListener(e,a,{passive:!0,capture:!0}));let o=document.createElement(`div`);o.id=`idle-warning`,o.className=`idle-warning`,o.setAttribute(`role`,`alertdialog`),o.setAttribute(`aria-labelledby`,`idle-warning-title`),o.setAttribute(`aria-describedby`,`idle-warning-text`),o.hidden=!0,o.innerHTML=`
    <p id="idle-warning-title" class="idle-warning-title">Are you still there?</p>
    <p id="idle-warning-text">
      You will be signed out in <strong id="idle-seconds">60</strong> seconds because the app has not been used
      for ${V(String(n))} ${n===1?`minute`:`minutes`}.
    </p>
    <button type="button" id="idle-stay" class="primary-button">Stay signed in</button>
  `,document.body.appendChild(o),o.querySelector(`#idle-stay`).addEventListener(`click`,()=>{i=Date.now(),Rf(),o.hidden=!0});let s=()=>{let t=Df(Date.now()-Lf(),r);if(t.kind===`expired`){try{localStorage.setItem(Mf,Af(n))}catch{}Bf(),e.signOut()}else if(t.kind===`warning`){let e=o.hidden;o.hidden=!1,o.querySelector(`#idle-seconds`).textContent=String(t.secondsLeft),e&&o.querySelector(`#idle-stay`).focus()}else o.hidden=!0},c=window.setInterval(s,1e3),l=()=>{document.visibilityState===`visible`&&s()};document.addEventListener(`visibilitychange`,l),Pf=()=>{window.clearInterval(c),document.removeEventListener(`visibilitychange`,l),Nf.forEach(e=>window.removeEventListener(e,a,{capture:!0})),o.remove()}}var Uf=`rwcll-logo.png`,Wf=`Redwood City Little League`;function Gf(e){return`<img class="${e}" src="${Uf}" alt="${Wf}" />`}var Kf=[`super_admin`,`umpire_chief`,`scheduler`,`treasurer`,`feedback_reviewer`,`read_only_admin`,`adult_umpire`,`youth_umpire`,`parent_guardian`];function qf(e){let t=e.replace(/_/g,` `).trim();return t.charAt(0).toUpperCase()+t.slice(1)}function Jf(e){let t=[...new Set(e)],n=e=>{let t=Kf.indexOf(e);return t===-1?Kf.length:t};return t.sort((e,t)=>n(e)-n(t)||e.localeCompare(t)).map(qf).join(`, `)}var Yf=/^[0-9+() .-]{7,30}$/;async function Xf(e,t={}){let n=t.heading??!0;e.innerHTML=`
    <p class="directory-description">Loading your details&hellip;</p>
  `;let{data:r}=await R.auth.getSession(),i=r.session?.user;if(!i){e.innerHTML=``;return}let[a,o,s]=await Promise.all([R.from(`account_contact`).select(`phone, sms_opt_in`).eq(`profile_id`,i.id).maybeSingle(),R.from(`profiles`).select(`email`).eq(`id`,i.id).maybeSingle(),R.from(`user_roles`).select(`role_id`).eq(`user_id`,i.id)]);if(a.error){e.innerHTML=`
      <p class="message error">
        Unable to load your details. Refresh and try again.
      </p>
    `,console.error(`My details load failed:`,a.error.message);return}let c=a.data??null,l=o.data?.email??i.email??``,u=Jf((s.data??[]).map(e=>e.role_id));e.innerHTML=`
    <section class="my-details">
      ${n?`<h2>My details</h2>`:``}

      <p class="season-dates">
        Email: ${V(l||`not available`)}
        (this is how you sign in)
      </p>

      <p class="season-dates" id="my-roles">
        Your roles: <em>${V(u||`none`)}</em>
      </p>

      <form id="my-details-form">
        <label for="my-phone">Phone number</label>
        <input id="my-phone" name="phone" type="tel" maxlength="30"
          autocomplete="tel" placeholder="e.g. 650-555-0123"
          value="${V(c?.phone??``)}" />

        <label class="season-checkbox-label">
          <input name="sms_opt_in" type="checkbox"
            ${c?.sms_opt_in?`checked`:``} />
          I would like text message (SMS) notifications when they
          become available
        </label>
        <p class="season-dates">
          Text messages are not available yet. Choosing this only records
          your preference. Nothing will be sent until the feature is
          turned on, and you can change your mind here at any time.
        </p>

        <button id="my-details-save" class="primary-button" type="submit">
          Save my details
        </button>
        <p id="my-details-message" class="message" role="status"
          aria-live="polite"></p>
      </form>
    </section>
  `;let d=e.querySelector(`#my-details-form`),f=e.querySelector(`#my-details-message`);if(!d||!f)return;let p=(e,t)=>{f.textContent=e,f.className=`message ${t}`};d.addEventListener(`submit`,async t=>{t.preventDefault();let n=String(new FormData(d).get(`phone`)??``).trim(),r=d.querySelector(`[name="sms_opt_in"]`)?.checked??!1;if(n&&!Yf.test(n)){p(`Enter the phone number using digits, spaces, and + ( ) . - only.`,`error`);return}if(r&&!n){p(`Enter a mobile number to choose text messages.`,`error`);return}let a=e.querySelector(`#my-details-save`);a&&(a.disabled=!0,a.textContent=`Saving…`),p(``,`success`);let{error:o}=await R.from(`account_contact`).upsert({profile_id:i.id,phone:n||null,sms_opt_in:r},{onConflict:`profile_id`});a&&(a.disabled=!1,a.textContent=`Save my details`),o?p(`Could not save your details: ${o.message}`,`error`):p(`Your details were saved.`,`success`)})}var Zf={youth_umpire:`Youth umpire`,adult_umpire:`Adult umpire`,parent_guardian:`Parent or guardian`},Qf=13,$f=13;function ep(e,t){if(!e)return t===`youth`?`A birth date is required for a youth umpire. Check it against the league's records.`:`A birth date is optional for an adult umpire.`;let n=Na(e);return n===null?`Enter a valid birth date.`:n<0?`That birth date is in the future.`:n<Qf?`Age ${n}. The league's minimum age for umpires is ${Qf}, so they cannot be approved.`:n<$f?`Age ${n}. Under ${$f}, they cannot be assigned to games until a linked parent or guardian gives consent (see Families).`:t===`youth`&&n>=18?`Age ${n}. This person is 18 or older, so approve them as an adult umpire.`:t===`adult`&&n<18?`Age ${n}. This person is under 18, so approve them as a youth umpire.`:`Age ${n}.`}async function tp(e){e.innerHTML=`
    <section class="directory-section">
      <h2>Umpire registrations</h2>
      <p class="directory-description">Loading registrations&hellip;</p>
    </section>
  `;let[t,n]=await Promise.all([R.rpc(`umpire_min_age`),R.rpc(`parent_consent_below_age`)]);typeof t.data==`number`&&(Qf=t.data),typeof n.data==`number`&&($f=n.data);let r=await R.from(`profiles`).select(`id, display_name, email, registration_kind, registration_note, created_at`).eq(`account_status`,`pending`).in(`registration_kind`,[`youth_umpire`,`adult_umpire`,`parent_guardian`]).order(`created_at`);if(r.error){e.innerHTML=`
      <section class="directory-section">
        <h2>Umpire registrations</h2>
        <p class="message error">
          Unable to load registrations. Refresh and try again.
        </p>
      </section>
    `,console.error(`Registrations load failed:`,r.error.message);return}let i=r.data??[],a=[];if(i.length>0){let e=await R.from(`umpires`).select(`profile_id`).in(`profile_id`,i.map(e=>e.id));e.error?console.error(`Registrations lookup failed:`,e.error.message):a=e.data??[]}let o=i.filter(e=>e.registration_kind!==`parent_guardian`&&a.some(t=>t.profile_id===e.id)),s=i.filter(e=>e.registration_kind===`parent_guardian`);e.innerHTML=`
    <section class="directory-section" id="registrations">
      <div class="directory-header">
        <div>
          <h2>Umpire registrations</h2>
          <p class="directory-description">
            People who signed up as umpires and confirmed their email.
            Approving does everything in one step: approves the account,
            gives the youth or adult umpire role, and activates the record.
          </p>
        </div>
        <button id="refresh-registrations" class="secondary-button"
          type="button">Refresh</button>
      </div>

      <p id="registrations-message" class="message"
        role="status" aria-live="polite"></p>

      ${o.length?`<ul class="role-list">${o.map(e=>{let t=e.registration_kind,n=t===`youth_umpire`?`youth`:`adult`,r=e.display_name||`Name not provided`;return`
              <li class="role-account" data-profile-id="${V(e.id)}">
                <span class="role-account-name">${V(r)}</span>
                <span class="role-account-email">
                  ${V(e.email??`Email unavailable`)}
                </span>
                <span class="role-account-contact">
                  Signed up as: ${V(Zf[t]??t)}
                  &middot; ${V(e.created_at.slice(0,10))}
                </span>

                <label for="reg-class-${V(e.id)}">Approve as</label>
                <select id="reg-class-${V(e.id)}"
                  data-reg-class="${V(e.id)}">
                  <option value="adult" ${n===`adult`?`selected`:``}>
                    Adult umpire
                  </option>
                  <option value="youth" ${n===`youth`?`selected`:``}>
                    Youth umpire
                  </option>
                </select>

                <label for="reg-birth-${V(e.id)}">Birth date</label>
                <input id="reg-birth-${V(e.id)}" type="date"
                  data-reg-birth="${V(e.id)}" />
                <p class="season-dates" data-reg-hint="${V(e.id)}">
                  ${V(ep(``,n))}
                </p>

                <div class="account-actions">
                  <button type="button" class="primary-button"
                    data-approve="${V(e.id)}">Approve</button>
                  <button type="button" class="secondary-button"
                    data-reject="${V(e.id)}">Reject</button>
                </div>
              </li>
            `}).join(``)}</ul>`:`<p class="directory-empty">
            No umpire registrations are waiting for review.
          </p>`}

      <h3>Parent and guardian registrations</h3>
      <p class="directory-description">
        Approving gives them the parent role. You then link them to their child in
        <strong>Families</strong>: nobody can link themselves to a child.
      </p>
      ${s.length?`<ul class="role-list">${s.map(e=>`
            <li class="role-account" data-parent-id="${V(e.id)}">
              <span class="role-account-name">${V(e.display_name||`Name not provided`)}</span>
              <span class="role-account-email">${V(e.email??`Email unavailable`)}</span>
              <span class="role-account-contact">
                Signed up as: Parent or guardian &middot; ${V(e.created_at.slice(0,10))}
              </span>
              <span class="role-account-contact">Says they are the parent of: ${V(e.registration_note||`(nothing written)`)}</span>
              <div class="account-actions">
                <button type="button" class="primary-button" data-approve-parent="${V(e.id)}">Approve</button>
                <button type="button" class="secondary-button" data-reject-parent="${V(e.id)}">Reject</button>
              </div>
            </li>`).join(``)}</ul>`:`<p class="directory-empty">No parent or guardian registrations are waiting for review.</p>`}
    </section>
  `;let c=e.querySelector(`#registrations`);if(!c)return;let l=(e,t)=>{let n=c.querySelector(`#registrations-message`);n&&(n.textContent=e,n.className=`message ${t}`)},u=async t=>{await tp(e);let n=e.querySelector(`#registrations-message`);n&&(n.textContent=t,n.className=`message success`)},d=e=>({select:c.querySelector(`[data-reg-class="${CSS.escape(e)}"]`),date:c.querySelector(`[data-reg-birth="${CSS.escape(e)}"]`),hint:c.querySelector(`[data-reg-hint="${CSS.escape(e)}"]`)}),f=e=>{let{select:t,date:n,hint:r}=d(e);t&&n&&r&&(r.textContent=ep(n.value,t.value))},p=e=>{let t=e.target;if(!(t instanceof HTMLElement))return;let n=t.dataset.regClass??t.dataset.regBirth;n&&f(n)};c.addEventListener(`input`,p),c.addEventListener(`change`,p),c.querySelector(`#refresh-registrations`)?.addEventListener(`click`,()=>{tp(e)}),c.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`[data-approve-parent]`),r=t.closest(`[data-reject-parent]`);if(n||r){let e=n??r,t=(n?n.dataset.approveParent:r?.dataset.rejectParent)??``,a=i.find(e=>e.id===t)?.display_name||`this person`;if(r&&!window.confirm(`Reject the registration from ${a}? They will not get access.`))return;e.disabled=!0,(async()=>{let{error:r}=await R.rpc(n?`approve_parent_registration`:`reject_parent_registration`,{p_profile_id:t});r?(l(`Could not ${n?`approve`:`reject`}: ${r.message}`,`error`),e.disabled=!1):await u(n?`Approved ${a} as a parent or guardian. Link them to their child in Families.`:`Rejected the registration from ${a}.`)})();return}let a=t.closest(`[data-approve]`);if(a){let e=a.dataset.approve??``,{select:t,date:n}=d(e),r=t?.value??``,i=n?.value??``,s=o.find(t=>t.id===e)?.display_name||`this person`;if(r===`youth`&&!i){l(`Enter a birth date to approve a youth umpire.`,`error`);return}if(i){let e=Na(i);if(e===null||e<0){l(`Enter a valid birth date that is not in the future.`,`error`);return}if(e<Qf){l(`The league's minimum age for umpires is ${Qf}, so they cannot be approved.`,`error`);return}if(r===`adult`&&e<18){l(`This person is under 18, so approve them as a youth umpire.`,`error`);return}if(r===`youth`&&e>=18){l(`This person is 18 or older, so approve them as an adult umpire.`,`error`);return}}a.disabled=!0,(async()=>{let{error:t}=await R.rpc(`approve_umpire_registration`,{p_profile_id:e,p_classification:r,p_birth_date:i||null});t?(l(`Could not approve: ${t.message}`,`error`),a.disabled=!1):await u(`Approved ${s} as ${r===`youth`?`a youth`:`an adult`} umpire.`)})();return}let s=t.closest(`[data-reject]`);if(s){let e=s.dataset.reject??``,t=o.find(t=>t.id===e)?.display_name||`this person`;if(!window.confirm(`Reject the registration from ${t}? They will not get access.`))return;s.disabled=!0,(async()=>{let{error:n}=await R.rpc(`reject_umpire_registration`,{p_profile_id:e});n?(l(`Could not reject: ${n.message}`,`error`),s.disabled=!1):await u(`Rejected the registration from ${t}.`)})()}})}var np={queued:`Waiting`,sent:`Sent`,failed:`Failed`,skipped:`Skipped`},rp={invitation:`Invitation`,assignment:`Assignment`,schedule_change:`Schedule change`,reminder:`Reminder`,broadcast:`Announcement`,other:`Message`},ip=!1;async function ap(e){e.innerHTML=`
    <p class="directory-description">Loading the outbox&hellip;</p>
  `;let{data:t,error:n}=await R.from(`email_outbox`).select(`id, kind, to_email, subject, body, status, sent_via, created_at, sent_at, attempts, last_error`).order(`created_at`,{ascending:!1}).limit(200);if(n){e.innerHTML=`
      <p class="message error">
        Unable to load the outbox. Refresh and try again.
      </p>
    `,console.error(`Outbox load failed:`,n.message);return}let r=await R.from(`sending_settings`).select(`key, value`).in(`key`,[`email_mode`]),i=r.error?`off`:(r.data??[]).find(e=>e.key===`email_mode`)?.value??`off`,a=i===`live`||i===`safe`?i:`off`,o=t??[],s=o.filter(e=>e.status===`queued`||e.status===`failed`),c=ip?o:s;e.innerHTML=`
    <section class="outbox" id="outbox-root">
      ${a===`live`?`<p class="directory-description outbox-mode outbox-mode-live">
            <strong>Automatic sending is ON.</strong> Waiting messages go out
            within a few minutes. A message that cannot be sent shows why, and
            you can try it again. Messages older than a few days are not sent.
          </p>`:a===`safe`?`<p class="directory-description outbox-mode outbox-mode-safe">
              <strong>SAFE MODE.</strong> Automatic sending only emails the
              addresses on the safe list. Every other message is set aside
              (it shows as Skipped), so nobody else receives anything. Use
              <strong>Try again</strong> after switching to live.
            </p>`:`<p class="directory-description outbox-mode outbox-mode-off">
              Automatic sending is off (not set up yet), so messages wait
              here. Open a message, copy it, send it yourself, then press
              <strong>Mark as sent</strong>. When automatic sending is switched
              on, waiting messages go out by themselves.
            </p>`}

      <label for="outbox-filter">Show</label>
      <div class="role-add">
        <select id="outbox-filter">
          <option value="waiting" ${ip?``:`selected`}>
            Waiting only (${s.length})
          </option>
          <option value="all" ${ip?`selected`:``}>
            Everything (${o.length})
          </option>
        </select>
        <button id="outbox-refresh" class="secondary-button"
          type="button">Refresh</button>
        <button id="outbox-test" class="secondary-button"
          type="button">Send me a test message</button>
      </div>

      <p id="outbox-message" class="message" role="status"
        aria-live="polite"></p>

      ${c.length?`<ul class="role-list">${c.map(e=>`
            <li class="role-account" data-message-id="${V(e.id)}">
              <span class="role-account-name">${V(e.subject)}</span>
              <span class="role-account-email">To: ${V(e.to_email)}</span>
              <span class="role-account-contact">
                ${V(rp[e.kind]??e.kind)}
                &middot; ${V(e.status===`queued`&&(e.attempts??0)>0&&e.last_error?`Will try again`:np[e.status]??e.status)}
                &middot; ${V(e.created_at.slice(0,10))}
                ${e.sent_at?`&middot; sent ${V(e.sent_at.slice(0,10))}${e.sent_via===`manual`?` by hand`:``}`:``}
              </span>

              ${e.last_error&&e.status!==`sent`?`<span class="outbox-problem">${e.status===`skipped`?`Why it was not sent`:`Problem`}: ${V(e.last_error)}${(e.attempts??0)>1?` (tried ${V(String(e.attempts))} times)`:``}</span>`:``}

              <details class="outbox-body">
                <summary>Show message</summary>
                <textarea readonly rows="8">${V(e.body)}</textarea>
                <button type="button" class="secondary-button"
                  data-copy="${V(e.id)}">Copy message</button>
              </details>

              ${e.status===`failed`||e.status===`skipped`?`<div class="account-actions">
                    <button type="button" class="secondary-button"
                      data-retry="${V(e.id)}">Try again</button>
                  </div>`:``}

              ${e.status===`queued`||e.status===`failed`?`<div class="account-actions">
                    <button type="button" class="primary-button"
                      data-sent="${V(e.id)}">Mark as sent</button>
                    <button type="button" class="secondary-button"
                      data-skip="${V(e.id)}">Skip</button>
                  </div>`:``}
            </li>
          `).join(``)}</ul>`:`<p class="directory-empty">
            ${ip?`The outbox is empty.`:`No messages are waiting to be sent.`}
          </p>`}
    </section>
  `;let l=e.querySelector(`#outbox-root`);if(!l)return;let u=(e,t)=>{let n=l.querySelector(`#outbox-message`);n&&(n.textContent=e,n.className=`message ${t}`)},d=async t=>{await ap(e);let n=e.querySelector(`#outbox-message`);n&&(n.textContent=t,n.className=`message success`)};l.querySelector(`#outbox-refresh`)?.addEventListener(`click`,()=>{ap(e)}),l.querySelector(`#outbox-filter`)?.addEventListener(`change`,t=>{ip=t.target.value===`all`,ap(e)}),l.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`[data-copy]`);if(n){let e=n.parentElement?.querySelector(`textarea`);if(!e)return;(async()=>{try{await navigator.clipboard.writeText(e.value),u(`Message copied.`,`success`)}catch{e.select(),u(`Press Ctrl+C to copy the selected message.`,`success`)}})();return}let r=t.closest(`[data-retry]`);if(r){r.disabled=!0,(async()=>{let{error:e}=await R.rpc(`retry_outbox_message`,{p_id:r.dataset.retry});e?(u(`Could not try again: ${e.message}`,`error`),r.disabled=!1):await d(`It is waiting to be sent again.`)})();return}if(t.closest(`#outbox-test`)){(async()=>{let{error:e}=await R.rpc(`queue_test_email`);e?u(`Could not queue the test message: ${e.message}`,`error`):await d(a===`off`?`A test message is waiting below. Automatic sending is off, so copy it and send it yourself.`:`A test message is queued. It should arrive within a few minutes.`)})();return}let i=t.closest(`[data-sent]`);if(i){let e=i.dataset.sent??``;i.disabled=!0,(async()=>{let{error:t}=await R.rpc(`mark_email_sent`,{p_id:e});t?(u(`Could not update the message: ${t.message}`,`error`),i.disabled=!1):await d(`Marked as sent.`)})();return}let o=t.closest(`[data-skip]`);if(o){let e=o.dataset.skip??``;if(!window.confirm(`Skip this message? It will not be sent, but a record of it is kept.`))return;o.disabled=!0,(async()=>{let{error:t}=await R.rpc(`skip_email`,{p_id:e});t?(u(`Could not update the message: ${t.message}`,`error`),o.disabled=!1):await d(`Skipped.`)})()}})}var op=()=>({plate:``,first_base:``,second_base:``,third_base:``,field:``});function sp(e,t){let{context:n,game:r}=t,i=vl(n.divisions.find(e=>e.id===r.division_id),r.game_type),a=Sl(t.assignments).get(r.id)??{},o={...op(),...a},s={...o},c=yl(r,()=>i),l=r.umpires_needed===null||r.umpires_needed===void 0?``:String(r.umpires_needed),u=!1,d=null,f=new Map;e.innerHTML=`
    <form id="assign-form" class="create-umpire-form game-form assign-panel" novalidate>
      <h3>Umpires for this game</h3>
      <p class="season-dates"><strong>${V(t.title)}</strong><br>${V(t.detail)}</p>

      <label for="assign-needed">Umpires needed for this game</label>
      <select id="assign-needed">
        <option value="">Use the division's default (${V(_l(i).replace(` needed`,``))})</option>
        ${Array.from({length:5},(e,t)=>`<option value="${t}">${V(_l(t))}</option>`).join(``)}
      </select>

      <div id="assign-slots"></div>
      <div id="assign-notes" aria-live="polite"></div>

      <div class="account-actions">
        <button id="assign-save" class="primary-button" type="submit">Save umpires</button>
        <button id="assign-cancel" class="secondary-button" type="button">Cancel</button>
      </div>

      <p id="assign-message" class="message" role="status" aria-live="polite"></p>
    </form>
  `;let p=e.querySelector(`#assign-form`),m=p.querySelector(`#assign-needed`),h=p.querySelector(`#assign-slots`),g=p.querySelector(`#assign-notes`),_=p.querySelector(`#assign-message`);m.value=l;let v=(e,t=`error`)=>{_.textContent=e,_.className=`message ${t}`},y=e=>n.umpires.find(t=>t.id===e)?.name??n.umpireNames.get(e)??`An umpire`,b=e=>d?Wa(r,d.get(e)):null,x=e=>/division they play in/.test(f.get(e)?.problem??``),S=e=>`${e} ${e===1?`game`:`games`}`,C=e=>{let i=o[e];return`
      <option value="">&mdash; open &mdash;</option>
      ${n.umpires.filter(e=>e.eligibility===`active`||e.id===i).sort((e,t)=>e.name.localeCompare(t.name)).map(e=>{let n=wl(e.id,r,t.games,t.assignments).length>0,a=!!f.get(e.id)?.problem&&e.id!==i,o=`${e.name}${e.classification===`youth`?` (youth)`:``}${e.eligibility===`active`?``:` (not active)`} \u00b7 ${S(Tl(e.id,t.games,t.assignments))}${n?` · busy at this time`:``}${b(e.id)===`cannot`?` · marked unavailable`:b(e.id)===`unavailable`?` · not available then`:b(e.id)===`none`?` · no availability entered`:``}${a?x(e.id)?` · their own division`:` · age rule`:``}`;return`<option value="${V(e.id)}" ${e.id===i?`selected`:``} ${a?`disabled`:``}>${V(o)}</option>`}).join(``)}
    `},w=()=>{let e=[];for(let n of fl){let i=o[n];if(!i)continue;for(let n of wl(i,r,t.games,t.assignments))e.push({kind:`warn`,text:`${y(i)} is also assigned to ${t.sideText(n)} at ${W(n.starts_at)} (${t.fieldName(n.location_id)}), which overlaps this game.`});b(i)===`cannot`?e.push({kind:`warn`,text:`${y(i)} has marked themselves unavailable at this time.`}):b(i)===`unavailable`&&e.push({kind:`warn`,text:`${y(i)} has not said they can umpire at this time.`});let a=f.get(i);a?.problem&&e.push({kind:`warn`,text:`${y(i)}: ${a.problem}`}),a?.note&&e.push({kind:`info`,text:`${y(i)}: ${a.note}`})}let i=n.umpires.filter(e=>e.eligibility===`active`&&f.get(e.id)?.problem&&!fl.some(t=>o[t]===e.id)),a=i.filter(e=>x(e.id)),s=i.filter(e=>!x(e.id)),c=e=>e.map(e=>e.name).sort((e,t)=>e.localeCompare(t)).join(`, `);s.length&&e.push({kind:`info`,text:`Not available for this division because of the youth age rule: ${c(s)}.`}),a.length&&e.push({kind:`info`,text:`Not available because it is the division they play in: ${c(a)}.`}),g.innerHTML=e.length?`<ul class="imp-list assign-clashes">${e.map(e=>`<li class="${e.kind===`warn`?`imp-warn`:`imp-note`}">${V(e.text)}</li>`).join(``)}</ul>`:``},T=e=>{let n=o[e];if(!n||n!==s[e])return``;let i=t.assignments.find(e=>e.game_id===r.id&&e.umpire_id===n);return i?i.status===`confirmed`?`<p class="assign-status assign-status-confirmed">Confirmed${i.self_assigned?` (they assigned themselves)`:``}</p>`:`<p class="assign-status assign-status-assigned">Assigned, waiting for ${V(y(n))} to confirm.
      <button type="button" class="secondary-button assign-confirm" data-confirm-umpire="${V(n)}">Mark as confirmed</button></p>`:``},E=()=>{let e=gl(c),t=fl.filter(t=>e.includes(t)||o[t]||s[t]);h.innerHTML=t.length?t.map(e=>`
          <label for="assign-${e}">${ml[e]} umpire</label>
          <select id="assign-${e}" data-position="${e}">${C(e)}</select>
          ${T(e)}
        `).join(``):`<p class="directory-description">No umpire is needed for this game. Change the number above if one is.</p>`,w()};E(),(async()=>{let{data:t,error:n}=await R.rpc(`game_umpire_eligibility`,{p_game_id:r.id});!n&&Array.isArray(t)&&(f=new Map(t.map(e=>[e.umpire_id,{problem:e.problem??null,note:e.note??null}])),e.contains(p)&&E())})(),(async()=>{d=await Ko(),d&&e.contains(p)&&E()})(),m.addEventListener(`change`,()=>{l=m.value,c=l===``?i:Number(l),E()}),h.addEventListener(`click`,e=>{let n=e.target.closest(`[data-confirm-umpire]`);if(!n)return;let i=n.dataset.confirmUmpire;n.disabled=!0,(async()=>{let{error:e}=await R.rpc(`admin_confirm_assignment`,{p_game_id:r.id,p_umpire_id:i});if(e){n.disabled=!1,v(`Could not record the confirmation. ${e.message}`);return}let a=t.assignments.find(e=>e.game_id===r.id&&e.umpire_id===i);a&&(a.status=`confirmed`,a.confirmed_at=new Date().toISOString()),u=!0,v(`Recorded: ${y(i)} has confirmed.`,`success`),E()})()}),h.addEventListener(`change`,e=>{let t=e.target;if(!(t instanceof HTMLSelectElement)||!t.dataset.position)return;let n=t.dataset.position;if(t.value){let e=fl.find(e=>e!==n&&o[e]===t.value);e&&(o[e]=o[n])}o[n]=t.value,E()}),p.addEventListener(`submit`,e=>{e.preventDefault(),D()}),p.querySelector(`#assign-cancel`)?.addEventListener(`click`,()=>t.onDone(u?`Confirmation recorded.`:null));async function D(){let e=p.querySelector(`#assign-save`);e.disabled=!0;let n=l===``?null:Number(l);if(n!==(r.umpires_needed??null)){let{data:t,error:i}=await R.from(`games`).update({umpires_needed:n}).eq(`id`,r.id).select(`id`);if(i||!t||t.length===0){e.disabled=!1,v(i?`Could not change the number of umpires: ${i.message}`:`The number of umpires was not changed. You may not have permission.`);return}}if(fl.some(e=>o[e]!==s[e])){let t={};for(let e of fl)t[e]=o[e]||null;let{error:n}=await R.rpc(`set_game_umpires`,{p_game_id:r.id,p_umpires:t});if(n){e.disabled=!1,v(`The umpires were not saved. ${n.message}`);return}}t.onDone(`Umpires saved for ${t.title}.`)}}var cp=`__undecided`,lp={draft:`Draft`,scheduled:`Scheduled`,canceled:`Canceled`,completed:`Completed`},up={regular:`Regular season`,tournament:`Tournament`,scrimmage:`Scrimmage`};function dp(e){let t=e.message;return e.code===`23505`&&t.includes(`games_season_external_id_unique`)?`Another game in this season already has that master calendar Game ID.`:t.includes(`games_home_team_in_division`)?`The home team must belong to this season's chosen division.`:t.includes(`games_away_team_in_division`)?`The away team must belong to this season's chosen division.`:t.includes(`games_home_team_in_season`)||t.includes(`games_away_team_in_season`)?`Both teams must belong to the chosen season.`:t.includes(`games_valid_time`)?`The game must end after it starts.`:t.includes(`games_different_teams`)?`A team cannot play itself.`:e.code===`42501`?`You do not have permission to change games.`:`The game could not be saved: ${t}`}function fp(e,t,n){let{game:r}=n,i=r!==null,a=r?.status??`scheduled`,o=r?.game_type??`regular`,s=r?oo(r.starts_at,r.ends_at):120;e.innerHTML=`
    <form id="game-form" class="create-umpire-form game-form" novalidate>
      <h3>${i?`Edit game`:`Add game`}</h3>

      ${r?.external_game_id?`<p class="season-dates">
            This game has master calendar Game ID
            <strong>${V(r.external_game_id)}</strong>, so it is a
            copy of a game on the master calendar. Changes made here may be
            replaced the next time the master calendar spreadsheet is imported.
          </p>`:``}

      <label for="game-season">Season</label>
      <select id="game-season">
        ${t.seasons.map(e=>`
          <option value="${V(e.id)}">${V(e.name)}</option>
        `).join(``)}
      </select>

      <label for="game-division">Division</label>
      <select id="game-division"></select>

      <label for="game-type">Game type</label>
      <select id="game-type">
        ${Object.keys(up).map(e=>`
          <option value="${e}" ${e===o?`selected`:``}>${up[e]}</option>
        `).join(``)}
      </select>

      <label for="game-home">Home team</label>
      <select id="game-home"></select>
      <input id="game-home-label" type="text" maxlength="100" hidden
        placeholder="For example: Winner of Game 3"
        aria-label="Home side label" />

      <label for="game-away">Away team</label>
      <select id="game-away"></select>
      <input id="game-away-label" type="text" maxlength="100" hidden
        placeholder="For example: Winner of Game 4"
        aria-label="Away side label" />

      <label for="game-field">Field</label>
      <select id="game-field"></select>

      <label for="game-start">Starts</label>
      <input id="game-start" type="datetime-local"
        value="${r?V(ro(r.starts_at)):``}" />

      <label for="game-duration">Length in minutes</label>
      <input id="game-duration" type="number" min="15" max="600" step="5"
        value="${s}" />

      <label for="game-umpires">Umpires needed for this game</label>
      <select id="game-umpires">
        <option value="">Use the division's default</option>
        <option value="0">No umpire needed</option>
        <option value="1">1 umpire (plate)</option>
        <option value="2">2 umpires (plate, field)</option>
        <option value="3">3 umpires (plate, first base, third base)</option>
        <option value="4">4 umpires (plate, first, second, third base)</option>
      </select>

      <label for="game-status">Status</label>
      <select id="game-status">
        ${Object.keys(lp).map(e=>`
          <option value="${e}" ${e===a?`selected`:``}>${lp[e]}</option>
        `).join(``)}
      </select>

      <label for="game-external-id">Master calendar Game ID (optional)</label>
      <input id="game-external-id" type="text" maxlength="100"
        value="${V(r?.external_game_id??``)}"
        placeholder="Leave empty for a game that is not on the master calendar" />

      <label for="game-notes">Notes</label>
      <textarea id="game-notes" rows="3">${V(r?.notes??``)}</textarea>

      <div class="account-actions">
        <button id="game-save" class="primary-button" type="submit">
          ${i?`Save changes`:`Add game`}
        </button>
        <button id="game-cancel" class="secondary-button" type="button">Cancel</button>
        ${i?`<button id="delete-game" class="secondary-button"
              type="button">Delete game</button>`:``}
      </div>

      <p id="game-form-message" class="message" role="status"
        aria-live="polite"></p>
    </form>
  `;let c=e.querySelector(`#game-form`),l=e=>c.querySelector(`#${e}`),u=l(`game-season`),d=l(`game-division`),f=l(`game-home`),p=l(`game-away`),m=l(`game-home-label`),h=l(`game-away-label`),g=l(`game-field`),_=l(`game-umpires`),v=l(`game-form-message`),y=(e,t=`error`)=>{v.textContent=e,v.className=`message ${t}`};u.value=r?.season_id??n.defaultSeasonId;let b=e=>{d.innerHTML=t.divisions.filter(t=>t.is_active||t.id===e).map(e=>`
        <option value="${V(e.id)}">${V(e.name)}</option>
      `).join(``),d.value=t.divisions.some(t=>t.id===e)?e:d.options[0]?.value??``},x=(e,n,r,i)=>{let a=t.teams.filter(e=>e.season_id===u.value&&e.division_id===d.value&&(e.is_active||e.id===r)).sort((e,t)=>e.name.localeCompare(t.name));e.innerHTML=`
      <option value="">Choose a team</option>
      ${a.map(e=>`
        <option value="${V(e.id)}">${V(e.name)}</option>
      `).join(``)}
      <option value="${cp}">Not decided yet (bracket slot)</option>
    `,i===null?e.value=r&&a.some(e=>e.id===r)?r:``:(e.value=cp,n.value=i),n.hidden=e.value!==cp},S=()=>{let e=r?.location_id??``;g.innerHTML=`
      <option value="">Choose a field</option>
      ${t.locations.filter(t=>t.is_active||t.id===e).map(e=>`
          <option value="${V(e.id)}">${V(e.name)}</option>
        `).join(``)}
    `,g.value=e},C=()=>{let e=vl(t.divisions.find(e=>e.id===d.value),l(`game-type`).value);_.options[0].textContent=`Use the division's default (${e===0?`no umpire`:`${e} ${e===1?`umpire`:`umpires`}`})`};b(r?.division_id??n.defaultDivisionId),_.value=r?.umpires_needed===null||r?.umpires_needed===void 0?``:String(r.umpires_needed),C(),x(f,m,r?.home_team_id??null,r?.home_label??null),x(p,h,r?.away_team_id??null,r?.away_label??null),S();let w=()=>{x(f,m,f.value&&f.value!==cp?f.value:null,f.value===cp?m.value:null),x(p,h,p.value&&p.value!==cp?p.value:null,p.value===cp?h.value:null)};u.addEventListener(`change`,w),d.addEventListener(`change`,()=>{w(),C()}),l(`game-type`).addEventListener(`change`,C);for(let[e,t]of[[f,m],[p,h]])e.addEventListener(`change`,()=>{t.hidden=e.value!==cp,t.hidden||t.focus()});c.addEventListener(`submit`,e=>{e.preventDefault(),T()});async function T(){let e=io(l(`game-start`).value),t=Number(l(`game-duration`).value),i=l(`game-external-id`).value.trim(),a=l(`game-notes`).value.trim(),o=(e,t,n)=>{if(e.value===cp){let e=t.value.trim();return e?{team:null,label:e}:`Type a short label for the ${n} side (for example "Winner of Game 3").`}return e.value?{team:e.value,label:null}:`Choose the ${n} team, or mark it as not decided yet.`},s=o(f,m,`home`),c=o(p,h,`away`);if(!u.value)return y(`Choose a season.`);if(!d.value)return y(`Choose a division.`);if(typeof s==`string`)return y(s);if(typeof c==`string`)return y(c);if(s.team&&s.team===c.team)return y(`A team cannot play itself.`);if(!g.value)return y(`Choose a field.`);if(!e)return y(`Enter the date and time the game starts.`);if(!Number.isInteger(t)||t<15||t>600)return y(`The length must be a whole number of minutes between 15 and 600.`);let v={season_id:u.value,division_id:d.value,game_type:l(`game-type`).value,home_team_id:s.team,away_team_id:c.team,home_label:s.label,away_label:c.label,location_id:g.value,starts_at:e,ends_at:ao(e,t),umpires_needed:_.value===``?null:Number(_.value),status:l(`game-status`).value,notes:a||null,external_game_id:i||null},b=l(`game-save`);b.disabled=!0;let x=r?await R.from(`games`).update(v).eq(`id`,r.id).select(`id`):await R.from(`games`).insert(v);if(b.disabled=!1,x.error)return y(dp(x.error));if(r&&(!x.data||x.data.length===0))return y(`The game was not saved. You may not have permission, or someone else removed it. Refresh the list and try again.`);n.onDone(r?`Game saved.`:`Game added.`)}c.querySelector(`#game-cancel`)?.addEventListener(`click`,()=>{n.onDone(null)}),c.querySelector(`#delete-game`)?.addEventListener(`click`,()=>{if(!r)return;let e=n.assignmentCount?` Its ${n.assignmentCount} umpire assignment${n.assignmentCount===1?``:`s`} will be removed too.`:``,t=r.external_game_id?` This game is on the master calendar, so importing the spreadsheet again would add it back. Setting the status to Canceled is usually better.`:``;window.confirm(`Delete this game for good?${e}${t}`)&&(async()=>{let{data:e,error:t}=await R.from(`games`).delete().eq(`id`,r.id).select(`id`);if(t)return y(`The game could not be deleted: ${t.message}`);if(!e||e.length===0)return y(`The game was not deleted. You may not have permission, or someone else already removed it.`);n.onDone(`Game deleted.`)})()})}function pp(e){return`${e.location}|${e.field}`}function mp(e,t){return e.filter(e=>!Zs(e)&&t[Qs(e)]!==!1)}function hp(e,t){let n=new Map;for(let t of e){let e=Qs(t),r=n.get(e)??{rows:0,practiceRows:0};r.rows+=1,Zs(t)&&(r.practiceRows+=1),n.set(e,r)}let r=mp(e,t.includeEvents),i=(e,t)=>{let n=new Map;for(let r of e){let e=t(r),i=n.get(e);i?i.count+=1:n.set(e,{first:r,count:1})}return n},a=i(r,e=>Qs(e)),o=i(r,e=>pp(e)),s=i(r.flatMap(e=>[e.home,e.away]).filter(e=>e!==``),e=>Y(e));return{events:[...n].map(([e,n])=>({label:e,rows:n.rows,practiceRows:n.practiceRows,include:n.rows>n.practiceRows&&t.includeEvents[e]!==!1})),divisions:[...a].map(([e,t])=>({label:e,games:t.count})),fields:[...o].map(([e,t])=>({key:e,location:t.first.location,field:t.first.field,games:t.count})),teams:[...s].map(([e,t])=>({key:e,name:t.first,games:t.count}))}}function gp(e,t,n){let r={};for(let t of e){let e=Qs(t);r[e]===void 0&&(r[e]=!1),Zs(t)||(r[e]=!0)}if(n)for(let[e,t]of Object.entries(n.includeEvents))e in r&&(r[e]=t);let i=mp(e,r),a={};for(let e of i){let n=Qs(e);n in a||(a[n]=ac(n,t.divisions))}let o=new Map;for(let e of i){let t=o.get(e.location)??new Set;t.add(e.field),o.set(e.location,t)}let s={};for(let e of i){let n=pp(e);if(n in s)continue;let r=(o.get(e.location)?.size??0)<=1,i=e.location||e.field,a=e.location&&e.field?`${e.location} - ${e.field}`:i,c=r?[a,i]:[a],l=t.locations.find(e=>c.some(t=>Y(e.name)===Y(t)));s[n]=l?{kind:`existing`,id:l.id}:{kind:`new`,name:r?i:a}}let c=t.teams.filter(e=>e.season_id===t.seasonId),l={};for(let e of i)for(let t of[e.home,e.away]){let e=Y(t);if(!t||e in l)continue;let n=c.find(t=>Y(t.name)===e);l[e]=n?{kind:`existing`,id:n.id}:oc(t)?{kind:`new`}:{kind:`label`}}if(n){for(let e of Object.keys(a))e in n.divisionByLabel&&(a[e]=n.divisionByLabel[e]);for(let e of Object.keys(s))e in n.locationByKey&&(s[e]=n.locationByKey[e]);for(let e of Object.keys(l))e in n.teamByKey&&(l[e]=n.teamByKey[e])}return{includeEvents:r,divisionByLabel:a,locationByKey:s,teamByKey:l}}function _p(e){let t=e.trim().toLowerCase();return t?/cancel|postpone|rain|forfeit/.test(t)?`canceled`:/complete|final/.test(t)?`completed`:/schedul|confirm|active/.test(t)?`scheduled`:null:null}function vp(e){let{rows:t,settings:n,context:r,existingGames:i,assignedCount:a,newId:o}=e,s=new Map(r.divisions.map(e=>[e.id,e.name])),c=new Map(r.teams.map(e=>[e.id,e])),l=new Set(r.teams.filter(e=>e.season_id===r.seasonId).map(e=>e.id)),u=new Map(r.locations.map(e=>[e.id,e.name])),d=new Map;for(let e of i)e.external_game_id&&d.set(e.external_game_id,e);let f=t.filter(Zs).length,p=mp(t,n.includeEvents),m=t.length-f-p.length,h=new Map;for(let e of p){if(!e.externalId)continue;let t=h.get(e.externalId)??[];t.push(e.line),h.set(e.externalId,t)}let g=[],_=[];for(let e of p){let t=[];e.externalId?(h.get(e.externalId)?.length??0)>1&&t.push(`Game ID ${e.externalId} is used on more than one line (${h.get(e.externalId).join(`, `)}). Each game needs its own ID.`):t.push(`It has no Game ID.`);let r=$s(e.date),i=tc(e.start),a=tc(e.end);r||t.push(`The date "${e.date}" cannot be read.`),i||t.push(`The start time "${e.start}" cannot be read.`),a||t.push(`The end time "${e.end}" cannot be read.`);let o=r&&i?nc(r,i):null,u=r&&a?nc(r,a):null;r&&i&&!o&&t.push(`The start time does not exist on that date (clock change).`),r&&a&&!u&&t.push(`The end time does not exist on that date (clock change).`),o&&u&&new Date(u)<=new Date(o)&&t.push(`The game ends at or before it starts.`);let d=Qs(e),f=n.divisionByLabel[d]??null;f&&s.has(f)||t.push(`Its division "${rc(d)||d}" is not matched to one of your divisions.`);let p=null;!e.location&&!e.field?t.push(`It has no field or location.`):(p=n.locationByKey[pp(e)]??null,p||t.push(`Its field "${e.location||e.field}" is not matched.`));let m=[];for(let[r,i]of[[`home`,e.home],[`away`,e.away]]){let e=Y(i);if(!i){t.push(`It has no ${r} team.`);continue}let a=n.teamByKey[e];if(!a)t.push(`The team "${i}" is not matched.`);else{if(a.kind===`existing`){let e=c.get(a.id);if(!e||!l.has(a.id)){t.push(`The team "${i}" is not a team in this season.`);continue}if(f&&e.division_id!==f){t.push(`The team "${e.name}" is in the ${s.get(e.division_id??``)??`no`} division, but this game is in ${s.get(f)??`another division`}.`);continue}}m.push({name:i,key:e,target:a})}}if(m.length===2){let[e,n]=m;(e.key===n.key||e.target.kind===`existing`&&n.target.kind===`existing`&&e.target.id===n.target.id)&&t.push(`The same team is on both sides.`)}t.length>0||!o||!u||!f||!p||m.length!==2?g.push({line:e.line,externalId:e.externalId,messages:t}):_.push({row:e,divisionId:f,locationTarget:p,home:m[0],away:m[1],startsAt:o,endsAt:u,status:_p(e.status)})}let v=new Map;for(let e of _)for(let t of[e.home,e.away]){if(t.target.kind!==`new`)continue;let n=v.get(t.key)??new Set;n.add(e.divisionId),v.set(t.key,n)}let y=new Set([...v].filter(([,e])=>e.size>1).map(([e])=>e)),b=new Set(r.locations.map(e=>Y(e.name))),x=[];for(let e of _){let t=[];for(let n of[e.home,e.away])n.target.kind===`new`&&y.has(n.key)&&t.push(`The team "${n.name}" would have to be created in more than one division. Choose which team it is, or mark it as an outside team.`);e.locationTarget.kind===`new`&&b.has(Y(e.locationTarget.name))&&t.push(`A field called "${e.locationTarget.name}" already exists. Choose it from the list instead of creating it again.`),t.length>0?g.push({line:e.row.line,externalId:e.row.externalId,messages:t}):x.push(e)}let S=[],C=new Map,w=[],T=new Map,E=(e,t)=>{let n=C.get(e.key);return n||(n=o(),C.set(e.key,n),S.push({id:n,name:e.name,divisionId:t})),n},D=e=>{if(e.kind===`existing`)return e.id;let t=Y(e.name),n=T.get(t);return n||(n=o(),T.set(t,n),w.push({id:n,name:e.name})),n},O=e=>e.target.kind===`existing`?c.get(e.target.id)?.name??e.name:e.name,ee=(e,t)=>{let n=t===`home`?e.home_team_id:e.away_team_id,r=t===`home`?e.home_label:e.away_label;return n?c.get(n)?.name??`a team`:r??`?`},te=[],ne=0;for(let e of x){let t=t=>t.target.kind===`label`?{team:null,label:t.name}:t.target.kind===`existing`?{team:t.target.id,label:null}:{team:E(t,e.divisionId),label:null},n=t(e.home),r=t(e.away),i=D(e.locationTarget),o={division_id:e.divisionId,home_team_id:n.team,away_team_id:r.team,home_label:n.label,away_label:r.label,location_id:i,starts_at:e.startsAt,ends_at:e.endsAt,status:e.status},c=e.locationTarget.kind===`new`?e.locationTarget.name:u.get(e.locationTarget.id)??``,l={externalId:e.row.externalId,line:e.row.line,title:`${O(e.home)} vs ${O(e.away)}`,when:`${U(e.startsAt)}, ${W(e.startsAt)} - ${W(e.endsAt)}`,where:`${s.get(e.divisionId)??``}, ${c}`,payload:o},f=d.get(e.row.externalId);if(!f){te.push({...l,op:`insert`,id:null,changes:[],hasUmpires:!1});continue}let p=[];f.division_id!==o.division_id&&p.push(`Division: ${s.get(f.division_id)??`?`} \u2192 ${s.get(o.division_id)??`?`}`),((f.home_team_id??null)!==o.home_team_id||(f.home_label??null)!==o.home_label)&&p.push(`Home team: ${ee(f,`home`)} \u2192 ${O(e.home)}`),((f.away_team_id??null)!==o.away_team_id||(f.away_label??null)!==o.away_label)&&p.push(`Away team: ${ee(f,`away`)} \u2192 ${O(e.away)}`),f.location_id!==o.location_id&&p.push(`Field: ${u.get(f.location_id)??`?`} \u2192 ${c}`),(Date.parse(f.starts_at)!==Date.parse(o.starts_at)||Date.parse(f.ends_at)!==Date.parse(o.ends_at))&&p.push(`Time: ${U(f.starts_at)}, ${W(f.starts_at)} - ${W(f.ends_at)} \u2192 ${U(o.starts_at)}, ${W(o.starts_at)} - ${W(o.ends_at)}`),o.status&&o.status!==f.status&&p.push(`Status: ${f.status} \u2192 ${o.status}`),p.length===0?ne+=1:te.push({...l,op:`update`,id:f.id,changes:p,hasUmpires:(a.get(f.id)??0)>0})}te.sort((e,t)=>e.payload.starts_at.localeCompare(t.payload.starts_at)||e.externalId.localeCompare(t.externalId));let re=new Set(p.map(e=>e.externalId).filter(Boolean)),ie=[],ae=new Set;for(let e of p){let t=$s(e.date);t&&ie.push(`${t.y}-${String(t.m).padStart(2,`0`)}-${String(t.d).padStart(2,`0`)}`);let r=n.divisionByLabel[Qs(e)];r&&ae.add(r)}ie.sort();let oe=ie.length===0?[]:i.filter(e=>e.external_game_id!==null&&!re.has(e.external_game_id)&&e.status!==`canceled`&&ae.has(e.division_id)&&G(e.starts_at)>=ie[0]&&G(e.starts_at)<=ie[ie.length-1]);return g.sort((e,t)=>e.line-t.line),{totalRows:t.length,practicesSkipped:f,eventsSkipped:m,considered:p.length,games:te,newCount:te.filter(e=>e.op===`insert`).length,changedCount:te.filter(e=>e.op===`update`).length,unchangedCount:ne,problems:g,newTeams:S,newLocations:w,missing:oe,changedWithUmpires:te.filter(e=>e.hasUmpires).length}}var yp=`__new__`,bp=`__label__`,xp=5242880,Sp=[`externalId`,`event`,`group`,`home`,`away`,`date`,`start`,`end`,`field`,`location`,`status`];function Cp(){if(typeof crypto.randomUUID==`function`)return crypto.randomUUID();let e=crypto.getRandomValues(new Uint8Array(16));e[6]=e[6]&15|64,e[8]=e[8]&63|128;let t=[...e].map(e=>e.toString(16).padStart(2,`0`)).join(``);return`${t.slice(0,8)}-${t.slice(8,12)}-${t.slice(12,16)}-${t.slice(16,20)}-${t.slice(20)}`}function wp(e){let t=``;return e.includes(`games_season_external_id_unique`)?t=` Another game in this season already has that master Game ID.`:e.includes(`games_home_team_in_division`)||e.includes(`games_away_team_in_division`)?t=` A team is not in that game's division.`:e.includes(`games_home_team_in_season`)||e.includes(`games_away_team_in_season`)?t=` A team is not in this season.`:/row-level security|permission denied/i.test(e)&&(t=` You may not have permission to import games.`),`Nothing was imported. ${e}${t}`}function Tp(e,t){let{context:n}=t,r=Intl.DateTimeFormat().resolvedOptions().timeZone,i=t.seasonId,a=null,o=null,s=[],c=null,l=[],u=new Map,d=null,f=!1;e.innerHTML=`
    <section class="importer" id="importer">
      <h3>Import games from a spreadsheet</h3>
      <p class="directory-description">
        Choose the master calendar file (saved as CSV). Nothing is changed
        until you press <strong>Import</strong> at the bottom. Games are matched
        on the master Game ID: games already here are updated, new ones are
        added, and nothing is added twice. Times in the file are read as
        <strong>${V(r)}</strong> time (your computer's time zone).
      </p>

      <label for="imp-season">Import into season</label>
      <select id="imp-season">
        ${n.seasons.map(e=>`
          <option value="${V(e.id)}" ${e.id===i?`selected`:``}>${V(e.name)}</option>
        `).join(``)}
      </select>

      <label for="imp-file">Master calendar file (.csv)</label>
      <input id="imp-file" type="file" accept=".csv,text/csv" />

      <p id="imp-message" class="message" role="status" aria-live="polite"></p>

      <div id="imp-body"></div>

      <div class="account-actions">
        <button id="imp-close" class="secondary-button" type="button">Close</button>
      </div>
    </section>
  `;let p=e.querySelector(`#importer`),m=p.querySelector(`#imp-body`),h=p.querySelector(`#imp-message`),g=(e,t=`error`)=>{h.textContent=e,h.className=e?`message ${t}`:`message`},_=()=>({seasonId:i,divisions:n.divisions,teams:n.teams,locations:n.locations}),v=Promise.resolve(),y=async()=>{let e=await No(i);if(e.error)l=[],u=new Map,g(`Could not read this season's games, so changes cannot be worked out. Close and try again.`);else{l=e.games,u=new Map;for(let t of e.assignments)u.set(t.game_id,(u.get(t.game_id)??0)+1)}},b=()=>{c&&(d=vp({rows:s,settings:c,context:_(),existingGames:l,assignedCount:u,newId:Cp}))},x=()=>{if(!a||!o)return;let e=Ys(o);s=e.length?[]:Xs(a,o),c=e.length?null:gp(s,_()),d=null,c&&b(),C()},S=e=>e===1?`game`:`games`,C=()=>{if(!a||!o){m.innerHTML=``;return}let e=a[0],t=Ys(o),r=`
      <details id="imp-columns" ${t.length?`open`:``}>
        <summary>Columns in the file (${e.length})</summary>
        ${t.length?`<p class="message error">These could not be found, so please choose them below: ${t.map(e=>V(Ws[e])).join(`, `)}.</p>`:`<p class="directory-description">These were recognised from the headings. Change one only if it is wrong.</p>`}
        <div class="table-scroll">
          <table class="umpire-table imp-table" aria-label="Columns">
            <thead><tr><th>Needed for</th><th>Column in your file</th></tr></thead>
            <tbody>
              ${Sp.map(t=>`
                <tr>
                  <td data-label="Needed for">${V(Ws[t])}</td>
                  <td data-label="Column in your file">
                    <select data-column="${t}" aria-label="${V(Ws[t])}">
                      <option value="">(none)</option>
                      ${e.map((e,n)=>`
                        <option value="${n}" ${o[t]===n?`selected`:``}>${V(e)}</option>
                      `).join(``)}
                    </select>
                  </td>
                </tr>
              `).join(``)}
            </tbody>
          </table>
        </div>
      </details>
    `;if(t.length||!c){m.innerHTML=r;return}let l=hp(s,c),u=`
      <h4>What is in the file</h4>
      <p class="directory-description">
        ${s.length} rows. Practices (rows with "Practice" where the
        opponent would be) are skipped automatically. Untick any other kind
        of row you do not want as games.
      </p>
      <div class="table-scroll">
        <table class="umpire-table imp-table" aria-label="Kinds of rows">
          <thead><tr><th>Kind of row</th><th>Rows</th><th>Import as games</th></tr></thead>
          <tbody>
            ${l.events.map(e=>{let t=e.rows-e.practiceRows;return`
                <tr>
                  <td data-label="Kind of row">${V(e.label||`(no name)`)}</td>
                  <td data-label="Rows">${e.rows}${e.practiceRows?` (${e.practiceRows} practice)`:``}</td>
                  <td data-label="Import as games">
                    ${t===0?`<span class="season-dates">Practices: skipped</span>`:`<label class="season-checkbox-label"><input type="checkbox" data-event="${V(e.label)}" ${e.include?`checked`:``} /> Import</label>`}
                  </td>
                </tr>
              `}).join(``)}
          </tbody>
        </table>
      </div>
    `,d=l.divisions.length?`
      <h4>Divisions</h4>
      <div class="table-scroll">
        <table class="umpire-table imp-table" aria-label="Divisions">
          <thead><tr><th>In the file</th><th>Games</th><th>Your division</th></tr></thead>
          <tbody>
            ${l.divisions.map(e=>`
              <tr>
                <td data-label="In the file">${V(rc(e.label)||e.label)}</td>
                <td data-label="Games">${e.games}</td>
                <td data-label="Your division">
                  <select data-division="${V(e.label)}" aria-label="Division for ${V(e.label)}">
                    <option value="">Choose a division&hellip;</option>
                    ${n.divisions.map(t=>`
                      <option value="${V(t.id)}" ${c.divisionByLabel[e.label]===t.id?`selected`:``}>${V(t.name)}</option>
                    `).join(``)}
                  </select>
                </td>
              </tr>
            `).join(``)}
          </tbody>
        </table>
      </div>
    `:``,f=l.fields.length?`
      <h4>Fields</h4>
      <div class="table-scroll">
        <table class="umpire-table imp-table" aria-label="Fields">
          <thead><tr><th>In the file</th><th>Games</th><th>Your field</th></tr></thead>
          <tbody>
            ${l.fields.map(e=>{let t=c.locationByKey[e.key],r=t?.kind===`new`;return`
                <tr>
                  <td data-label="In the file">${V(e.location||e.field)}${e.location&&e.field?` <span class="season-dates">(${V(e.field)})</span>`:``}</td>
                  <td data-label="Games">${e.games}</td>
                  <td data-label="Your field">
                    <select data-field="${V(e.key)}" aria-label="Field for ${V(e.location||e.field)}">
                      <option value="${yp}" ${r?`selected`:``}>Create a new field</option>
                      ${n.locations.map(e=>`
                        <option value="${V(e.id)}" ${t?.kind===`existing`&&t.id===e.id?`selected`:``}>${V(e.name)}</option>
                      `).join(``)}
                    </select>
                    <input type="text" data-field-name="${V(e.key)}" maxlength="100"
                      value="${V(t?.kind===`new`?t.name:``)}"
                      aria-label="Name of the new field" ${r?``:`hidden`} />
                  </td>
                </tr>
              `}).join(``)}
          </tbody>
        </table>
      </div>
    `:``,p=n.teams.filter(e=>e.season_id===i).sort((e,t)=>e.name.localeCompare(t.name)),h=l.teams.length?`
      <h4>Teams</h4>
      <p class="directory-description">
        Teams that match one of this season's teams are matched for you.
        Names that look like league teams are set to be created; other names
        (other clubs) are kept as plain names, with no team record.
      </p>
      <div class="table-scroll">
        <table class="umpire-table imp-table" aria-label="Teams">
          <thead><tr><th>In the file</th><th>Games</th><th>Your team</th></tr></thead>
          <tbody>
            ${l.teams.map(e=>{let t=c.teamByKey[e.key];return`
                <tr>
                  <td data-label="In the file">${V(e.name)}</td>
                  <td data-label="Games">${e.games}</td>
                  <td data-label="Your team">
                    <select data-team="${V(e.key)}" aria-label="Team for ${V(e.name)}">
                      <option value="${yp}" ${t?.kind===`new`?`selected`:``}>Create a new team</option>
                      <option value="${bp}" ${t?.kind===`label`?`selected`:``}>Outside team (name only)</option>
                      ${p.map(e=>`
                        <option value="${V(e.id)}" ${t?.kind===`existing`&&t.id===e.id?`selected`:``}>${V(e.name)}</option>
                      `).join(``)}
                    </select>
                  </td>
                </tr>
              `}).join(``)}
          </tbody>
        </table>
      </div>
    `:``;m.innerHTML=`
      ${r}
      ${u}
      ${d}
      ${f}
      ${h}
      <div id="imp-preview"></div>
    `,w()},w=()=>{let e=m.querySelector(`#imp-preview`);if(!e||!d)return;let t=d,r=t.games.length,i=t.games.filter(e=>e.op===`update`),a=t.games.filter(e=>e.op===`insert`);e.innerHTML=`
      <h4>Preview</h4>
      <p id="imp-summary" class="imp-summary">
        ${t.considered} ${S(t.considered)} found in the file${t.practicesSkipped?`, ${t.practicesSkipped} practice rows skipped`:``}${t.eventsSkipped?`, ${t.eventsSkipped} rows skipped (switched off)`:``}.
      </p>

      <ul class="imp-badges">
        <li class="imp-badge imp-new"><strong id="imp-count-new">${t.newCount}</strong> new</li>
        <li class="imp-badge imp-changed"><strong id="imp-count-changed">${t.changedCount}</strong> changed</li>
        <li class="imp-badge"><strong id="imp-count-unchanged">${t.unchangedCount}</strong> unchanged</li>
        <li class="imp-badge ${t.problems.length?`imp-problem`:``}"><strong id="imp-count-problems">${t.problems.length}</strong> ${t.problems.length===1?`problem`:`problems`}</li>
        <li class="imp-badge ${t.missing.length?`imp-changed`:``}"><strong id="imp-count-missing">${t.missing.length}</strong> not in the file</li>
      </ul>

      ${t.newTeams.length||t.newLocations.length?`
        <p id="imp-creates" class="imp-creates">
          Will also be created: ${[t.newTeams.length?`${t.newTeams.length} new ${t.newTeams.length===1?`team`:`teams`}`:``,t.newLocations.length?`${t.newLocations.length} new ${t.newLocations.length===1?`field`:`fields`}`:``].filter(Boolean).join(` and `)}.
        </p>
        <details>
          <summary>Show what will be created</summary>
          <ul class="imp-list">
            ${t.newTeams.map(e=>`<li>Team: ${V(e.name)} <span class="season-dates">(${V(n.divisions.find(t=>t.id===e.divisionId)?.name??``)})</span></li>`).join(``)}
            ${t.newLocations.map(e=>`<li>Field: ${V(e.name)}</li>`).join(``)}
          </ul>
        </details>
      `:``}

      ${t.problems.length?`
        <div class="imp-section imp-problems">
          <h5>${t.problems.length} ${t.problems.length===1?`row has`:`rows have`} a problem and will be skipped</h5>
          <ul class="imp-list">
            ${t.problems.map(e=>`
              <li>Line ${e.line}${e.externalId?` (Game ID ${V(e.externalId)})`:``}: ${e.messages.map(V).join(` `)}</li>
            `).join(``)}
          </ul>
        </div>
      `:``}

      ${i.length?`
        <div class="imp-section" id="imp-changed-list">
          <h5>${i.length} ${S(i.length)} will be changed</h5>
          ${t.changedWithUmpires?`<p class="imp-warn">${t.changedWithUmpires} of these ${t.changedWithUmpires===1?`has`:`have`} umpires assigned, so they may need to be told.</p>`:``}
          <ul class="imp-list">
            ${i.map(e=>`
              <li>
                <strong>${V(e.title)}</strong> <span class="season-dates">(Game ID ${V(e.externalId)})</span>
                ${e.hasUmpires?`<span class="imp-umpires">umpires assigned</span>`:``}
                <ul>${e.changes.map(e=>`<li>${V(e)}</li>`).join(``)}</ul>
              </li>
            `).join(``)}
          </ul>
        </div>
      `:``}

      ${a.length?`
        <details class="imp-section" id="imp-new-list">
          <summary>${a.length} new ${S(a.length)}</summary>
          <ul class="imp-list">
            ${a.map(e=>`
              <li><strong>${V(e.title)}</strong> <span class="season-dates">${V(e.when)}, ${V(e.where)} (Game ID ${V(e.externalId)})</span></li>
            `).join(``)}
          </ul>
        </details>
      `:``}

      ${t.missing.length?`
        <div class="imp-section" id="imp-missing-list">
          <h5>${t.missing.length} ${S(t.missing.length)} here ${t.missing.length===1?`is`:`are`} not in the file</h5>
          <p class="directory-description">
            They fall on the same days and in the same divisions as the file.
            They have <strong>not</strong> been touched. If they were removed from
            the master calendar, open each one on the Games tab and set it to Canceled.
          </p>
          <ul class="imp-list">
            ${t.missing.map(e=>`<li>Game ID ${V(e.external_game_id??``)}</li>`).join(``)}
          </ul>
        </div>
      `:``}

      <div class="account-actions">
        <button id="imp-apply" class="primary-button" type="button" ${r===0||f?`disabled`:``}>
          ${r===0?`Nothing to import`:`Import ${r} ${S(r)} (${t.newCount} new, ${t.changedCount} changed)`}
        </button>
      </div>
    `},T=async()=>{if(!d||f||d.games.length===0||d.problems.length>0&&!window.confirm(`${d.problems.length} ${d.problems.length===1?`row has a problem and will`:`rows have problems and will`} be skipped. Import the other games anyway?`))return;f=!0,g(`Importing…`,`success`),w();let{data:e,error:n}=await R.rpc(`import_games`,{p_season_id:i,p_new_teams:d.newTeams.map(e=>({id:e.id,name:e.name,division_id:e.divisionId})),p_new_locations:d.newLocations.map(e=>({id:e.id,name:e.name})),p_games:d.games.map(e=>({op:e.op,id:e.id,external_game_id:e.externalId,...e.payload}))});if(f=!1,n){g(wp(n.message),`error`),w();return}let r=e??{},a=[`Imported ${(r.games_inserted??0)+(r.games_updated??0)} games (${r.games_inserted??0} new, ${r.games_updated??0} changed).`];r.teams_created&&a.push(`Created ${r.teams_created} ${r.teams_created===1?`team`:`teams`}.`),r.locations_created&&a.push(`Created ${r.locations_created} ${r.locations_created===1?`field`:`fields`}.`);let o=lo(z()).toISOString();d.games.some(e=>e.payload.starts_at<o)&&a.push(`The list starts from today: change From to see earlier games.`),t.onImported(a.join(` `))},E=async e=>{if(g(``),a=null,o=null,c=null,d=null,C(),/\.xlsx?$/i.test(e.name)){g(`That is an Excel file. Please save it as CSV first (in Excel or Google Sheets: File, Save as or Download, Comma-separated values) and choose that file.`);return}if(e.size>xp){g(`That file is too large (the limit is 5 MB).`);return}let t;try{t=bc(await e.text())}catch(e){g(e instanceof Error?e.message:`That file could not be read.`);return}t.length<2?g(`That file has no rows below the headings.`):(await v,a=t,o=Js(t[0]),x())};p.querySelector(`#imp-file`)?.addEventListener(`change`,e=>{let t=e.target.files?.[0];t&&E(t)}),p.querySelector(`#imp-season`)?.addEventListener(`change`,e=>{i=e.target.value,v=y().then(()=>{a&&x()})}),p.querySelector(`#imp-close`)?.addEventListener(`click`,t.onClose),m.addEventListener(`click`,e=>{let t=e.target;t instanceof Element&&t.closest(`#imp-apply`)&&T()}),m.addEventListener(`change`,e=>{let t=e.target;if(t instanceof HTMLElement){if(t instanceof HTMLSelectElement&&t.dataset.column&&o)o[t.dataset.column]=t.value===``?null:Number(t.value),x();else if(c){if(t instanceof HTMLInputElement&&t.dataset.event!==void 0)c.includeEvents[t.dataset.event]=t.checked,c=gp(s,_(),c),b(),C();else{if(t instanceof HTMLSelectElement&&t.dataset.division!==void 0)c.divisionByLabel[t.dataset.division]=t.value||null;else if(t instanceof HTMLSelectElement&&t.dataset.field!==void 0){let e=t.dataset.field,n=m.querySelector(`[data-field-name="${CSS.escape(e)}"]`);if(t.value===yp){let t=s.find(t=>pp(t)===e),r=n?.value.trim()||t?.location||t?.field||`New field`;c.locationByKey[e]={kind:`new`,name:r},n&&(n.value=r,n.hidden=!1)}else c.locationByKey[e]={kind:`existing`,id:t.value},n&&(n.hidden=!0)}else if(t instanceof HTMLSelectElement&&t.dataset.team!==void 0)c.teamByKey[t.dataset.team]=t.value===yp?{kind:`new`}:t.value===bp?{kind:`label`}:{kind:`existing`,id:t.value};else return;b(),w()}}}}),m.addEventListener(`input`,e=>{let t=e.target;if(!(t instanceof HTMLInputElement)||t.dataset.fieldName===void 0||!c)return;let n=t.value.trim();n&&(c.locationByKey[t.dataset.fieldName]={kind:`new`,name:n},b(),w())}),v=y()}function Ep(e){let t=e??``;return/^[=+\-@\t\r]/.test(t)&&(t=`'${t}`),/[",\r\n]/.test(t)?`"${t.replace(/"/g,`""`)}"`:t}function Dp(e){return`\uFEFF${e.map(e=>e.map(Ep).join(`,`)).join(`\r
`)}\r\n`}function Op(e){return e.replace(/[^A-Za-z0-9._-]+/g,`-`).replace(/-+/g,`-`).replace(/^-|-$/g,``)||`download`}function kp(e,t){let n=new Blob([t],{type:`text/csv;charset=utf-8`}),r=URL.createObjectURL(n),i=document.createElement(`a`);i.href=r,i.download=e,document.body.appendChild(i),i.click(),i.remove(),window.setTimeout(()=>URL.revokeObjectURL(r),1e3)}function Ap(e,t){let{umpireName:n,items:r}=t;e.innerHTML=`
    <div class="schedule-view">
      <div class="game-filters">
        <div>
          <label for="sv-from">From</label>
          <input id="sv-from" type="date" value="${V(G(z().toISOString()))}" />
        </div>
        <div>
          <label for="sv-to">To</label>
          <input id="sv-to" type="date" />
        </div>
        <label class="season-checkbox-label game-filter-wide">
          <input id="sv-canceled" type="checkbox" /> Include canceled games
        </label>
      </div>

      <p id="sv-summary" class="game-summary" role="status" aria-live="polite"></p>
      <p id="sv-message" class="message" role="status" aria-live="polite"></p>
      <div id="sv-list"></div>
      <div id="sv-decline"></div>

      <div class="account-actions">
        <button id="sv-print" class="primary-button" type="button">Print this schedule</button>
        <button id="sv-csv" class="secondary-button" type="button">Download CSV</button>
      </div>
    </div>
  `;let i=t=>e.querySelector(`#${t}`),a=()=>{let e=i(`sv-from`).value,t=i(`sv-to`).value,n=i(`sv-canceled`).checked;return r.filter(r=>(!e||r.day>=e)&&(!t||r.day<=t)&&(n||r.status!==`canceled`))},o=()=>{let e=i(`sv-from`).value,t=i(`sv-to`).value,n=e=>U(new Date(`${e}T12:00:00`).toISOString());return e&&t?`From ${n(e)} to ${n(t)}`:e?`From ${n(e)}`:t?`Up to ${n(t)}`:`All dates`},s=e=>!!t.onAnswer&&e.status!==`canceled`&&Date.parse(e.startsAt)>ka(),c=e=>e.status===`canceled`?`&mdash;`:e.myStatus===`confirmed`?`<span class="sv-status sv-status-confirmed">Confirmed</span>`:s(e)?`<span class="sv-status sv-status-pending">Needs your answer</span>
        <div class="sv-actions">
          <button type="button" class="primary-button" data-sv-confirm="${V(e.id)}">Confirm</button>
          <button type="button" class="secondary-button" data-sv-decline="${V(e.id)}">Decline</button>
        </div>`:`<span class="sv-status sv-status-assigned">Assigned</span>`,l=(e,t=`error`)=>{let n=i(`sv-message`);n.textContent=e,n.className=e?`message ${t}`:`message`},u=async(e,n,r)=>{l(``);let i=await t.onAnswer(e,n,r);return i?(l(i),!1):(t.onAnswered?.(n===`confirm`?`Thank you. You have confirmed this game.`:`You have declined this game, and the administrators have been told.`),!0)},d=e=>{let t=i(`sv-decline`);t.innerHTML=`
      <section class="importer sv-decline-panel">
        <h3>Decline this game?</h3>
        <p class="directory-description">
          ${V(e.home)} vs ${V(e.away)}<br>
          ${V(U(e.startsAt))}, ${V(e.time)} (${V(e.position)}, ${V(e.field)})
        </p>
        <label for="sv-reason">Reason (optional)</label>
        <textarea id="sv-reason" rows="3" maxlength="500"></textarea>
        <div class="account-actions">
          <button id="sv-decline-go" class="primary-button" type="button">Decline this game</button>
          <button id="sv-decline-keep" class="secondary-button" type="button">Keep it</button>
        </div>
      </section>
    `,t.querySelector(`#sv-decline-keep`)?.addEventListener(`click`,()=>{t.innerHTML=``}),t.querySelector(`#sv-decline-go`)?.addEventListener(`click`,async n=>{let r=n.currentTarget;r.disabled=!0;let i=t.querySelector(`#sv-reason`).value;await u(e.id,`decline`,i)||(r.disabled=!1)}),t.scrollIntoView({behavior:`smooth`,block:`nearest`})},f=()=>{let e=a(),n=i(`sv-summary`),s=i(`sv-list`),l=e.length===0;i(`sv-print`).disabled=l,i(`sv-csv`).disabled=l,n.textContent=`${e.length} ${e.length===1?`game`:`games`} \u00b7 ${o()}`,s.innerHTML=e.length===0?`<p class="directory-empty">${r.length===0?V(t.emptyText):`No games in these dates. Change From and To to see more.`}</p>`:`
      <div class="table-scroll">
        <table class="umpire-table imp-table" aria-label="Schedule">
          <thead>
            <tr><th>Date</th><th>Time</th><th>Position</th><th>Field</th><th>Game</th><th>Division</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${e.map(e=>`
              <tr class="${e.status===`canceled`?`game-row-canceled`:``}">
                <td data-label="Date" class="sv-date">${V(U(e.startsAt))}</td>
                <td data-label="Time" class="sv-time">${V(e.time)}</td>
                <td data-label="Position" class="sv-position"><strong>${V(e.position)}</strong></td>
                <td data-label="Field" class="sv-field">${V(e.field)}${e.address?`<br><span class="game-where">${V(e.address)}</span>`:``}</td>
                <td data-label="Game" class="sv-game">${V(e.home)} vs ${V(e.away)}${e.status===`canceled`?` (canceled)`:``}</td>
                <td data-label="Division" class="sv-division">${V(e.division)}</td>
                <td data-label="Status" class="sv-status-cell">${c(e)}</td>
              </tr>
            `).join(``)}
          </tbody>
        </table>
      </div>
    `};i(`sv-list`).addEventListener(`click`,e=>{let t=e.target,n=t.closest(`[data-sv-confirm]`);if(n){n.disabled=!0,u(n.dataset.svConfirm,`confirm`,``).then(e=>{e||(n.disabled=!1)});return}let i=t.closest(`[data-sv-decline]`);if(i){let e=r.find(e=>e.id===i.dataset.svDecline);e&&d(e)}});for(let e of[`sv-from`,`sv-to`,`sv-canceled`])i(e).addEventListener(`change`,f);i(`sv-print`).addEventListener(`click`,()=>{let e=a();e.length!==0&&tu(Uu(n,e,{title:`Umpire schedule`,lines:[o(),i(`sv-canceled`).checked?`Including canceled games`:`Canceled games are not shown`],printedAt:_o(new Date)}))}),i(`sv-csv`).addEventListener(`click`,()=>{let e=a();if(e.length===0)return;let t=i(`sv-from`).value||`start`,r=i(`sv-to`).value||`end`;kp(`${Op(`RWCLL-schedule-${n}-${t}-${r}`)}.csv`,Dp([Iu,...Lu(e)]))}),f()}function jp(e,t){let{context:n}=t;e.innerHTML=`
    <section class="importer" id="umpire-schedule-panel">
      <h3>One umpire's schedule</h3>
      <p class="directory-description">
        Choose an umpire to see, print or download all of their games, in
        every season. Times are shown in your computer's time zone.
      </p>

      <label for="us-umpire">Umpire</label>
      <select id="us-umpire">
        <option value="">Choose an umpire&hellip;</option>
        ${[...n.umpireNames.entries()].sort((e,t)=>e[1].localeCompare(t[1])).map(([e,t])=>`<option value="${V(e)}">${V(t)}</option>`).join(``)}
      </select>

      <p id="us-message" class="message" role="status" aria-live="polite"></p>
      <div id="us-view"></div>

      <div class="account-actions">
        <button id="us-close" class="secondary-button" type="button">Close</button>
      </div>
    </section>
  `;let r=e.querySelector(`#us-view`),i=e.querySelector(`#us-message`),a=0;e.querySelector(`#us-umpire`)?.addEventListener(`change`,async e=>{let t=e.target.value,o=++a;if(r.innerHTML=``,i.textContent=``,i.className=`message`,!t)return;i.textContent=`Loading…`;let s=await Qo(t);o===a&&(s.error?(i.textContent=`Could not load this umpire's games. Try again.`,i.className=`message error`,console.error(`Umpire schedule failed:`,s.error)):(i.textContent=``,Ap(r,{umpireName:n.umpireNames.get(t)??`Umpire`,items:Fu(t,s.games,s.assignments,Ou(n)),emptyText:`This umpire has not been assigned any games yet.`})))}),e.querySelector(`#us-close`)?.addEventListener(`click`,t.onClose)}var Mp=3;function Np(e){return e.status===`draft`||e.status===`scheduled`}var Pp={plate:`plate`,first_base:`first base`,second_base:`second base`,third_base:`third base`,field:`field`};function Fp(e){let t=new Map,n=lo(e.now).getTime(),r=e.games.map(e=>({game:e,start:Date.parse(e.starts_at),end:Date.parse(e.ends_at)}));for(let{game:i,start:a}of r){if(!Np(i)||a<n)continue;let r=e.neededFor?e.neededFor(i):1,o=e.assignedCount.get(i.id)??0;if(r>=1&&o===0)t.set(i.id,[{kind:`no_umpire`,text:`No umpire assigned`}]);else if(o>0&&o<r){let n=e.assignedPositions?.get(i.id),a=n?xl(n,r):[],s=r-o;t.set(i.id,[{kind:`short_staffed`,text:a.length===1?`Needs a ${Pp[a[0]]} umpire`:n?`Needs ${s} more umpires`:`Needs another umpire`}])}}if(e.unconfirmedNames&&e.unconfirmedDaysFor){let n=e.now.getTime();for(let{game:i,start:a}of r){if(!Np(i)||a<=n)continue;let r=e.unconfirmedDaysFor(i);if(!(r>0)||a-n>r*864e5)continue;let o=e.unconfirmedNames.get(i.id)??[];if(o.length===0)continue;let s=o.slice(0,3).join(`, `),c=o.length>3?` and ${o.length-3} more`:``,l=t.get(i.id)??[];l.push({kind:`unconfirmed`,text:`Not confirmed yet: ${s}${c}`}),t.set(i.id,l)}}if(e.unavailableNames){let n=e.now.getTime();for(let{game:i,start:a}of r){if(!Np(i)||a<=n)continue;let r=e.unavailableNames.get(i.id)??[];if(r.length===0)continue;let o=r.slice(0,3).join(`, `),s=r.length>3?` and ${r.length-3} more`:``,c=t.get(i.id)??[];c.push({kind:`unavailable`,text:`Not available: ${o}${s}`}),t.set(i.id,c)}}let i=r.filter(e=>e.game.status!==`canceled`),a=new Map,o=t=>{let n=a.get(t.id);return n===void 0&&(n=W(t.starts_at),a.set(t.id,n)),`${e.sidesText(t)} at ${n}`},s=new Map,c=new Map,l=(e,t,n)=>{let r=e.get(t)??{count:0,lines:[]};r.count+=1,r.lines.length<Mp&&r.lines.push(n()),e.set(t,r)},u=(e,t)=>{let n=[...e].sort((e,t)=>e.start-t.start);for(let e=0;e<n.length;e+=1)for(let r=e+1;r<n.length&&!(n[r].start>=n[e].end);r+=1)t(n[e],n[r])},d=new Map;for(let e of i){let t=d.get(e.game.location_id)??[];t.push(e),d.set(e.game.location_id,t)}for(let t of d.values())u(t,(t,n)=>{let r=e.fieldName(t.game.location_id);Np(t.game)&&l(s,t.game.id,()=>`${r} is also used by ${o(n.game)}`),Np(n.game)&&l(s,n.game.id,()=>`${r} is also used by ${o(t.game)}`)});let f=new Map;for(let e of i)for(let t of[e.game.home_team_id,e.game.away_team_id]){if(!t)continue;let n=f.get(t)??[];n.push(e),f.set(t,n)}for(let[t,n]of f)u(n,(n,r)=>{let i=e.teamName(t);Np(n.game)&&l(c,n.game.id,()=>`${i} also plays ${o(r.game)}`),Np(r.game)&&l(c,r.game.id,()=>`${i} also plays ${o(n.game)}`)});let p=(e,n,r)=>{for(let[i,a]of e){let e=t.get(i)??[];for(let t of a.lines)e.push({kind:n,text:t});if(a.count>a.lines.length){let t=a.count-a.lines.length;e.push({kind:n,text:`...and ${t} more ${r} conflict${t===1?``:`s`}`})}t.set(i,e)}};return p(s,`field_conflict`,`field`),p(c,`team_conflict`,`team`),t}var Ip=null,Lp=!1,Rp=null,zp={draft:`Draft`,scheduled:`Scheduled`,canceled:`Canceled`,completed:`Completed`},Bp={no_umpire:``,short_staffed:``,unconfirmed:``,unavailable:``,field_conflict:`Field conflict: `,team_conflict:`Team conflict: `};function Vp(e){let t=[...e].sort((e,t)=>(t.starts_on??``).localeCompare(e.starts_on??``)||e.name.localeCompare(t.name));return(t.find(e=>e.is_active)??t[0]).id}async function Hp(e){e.innerHTML=`
    <section class="games-page">
      <h2>Games</h2>
      <p class="directory-description">Loading games&hellip;</p>
    </section>
  `;let{context:t,error:n}=await Ao();if(!t){e.innerHTML=`
      <section class="games-page">
        <h2>Games</h2>
        <p class="message error">Unable to load games. Refresh and try again.</p>
      </section>
    `,console.error(`Games context failed:`,n);return}if(t.seasons.length===0){e.innerHTML=`
      <section class="games-page">
        <h2>Games</h2>
        <p class="directory-description">
          There are no seasons yet. Add a season, divisions, teams and fields
          under League Setup first, then come back to add games.
        </p>
      </section>
    `;return}Ip||={seasonId:Vp(t.seasons),divisionId:``,fieldId:``,from:G(z().toISOString()),to:``,status:`not_canceled`,search:``,onlyWarnings:!1};let r=Ip;t.seasons.some(e=>e.id===r.seasonId)||(r.seasonId=Vp(t.seasons));let i=new Map(t.teams.map(e=>[e.id,e.name])),a=new Map(t.locations.map(e=>[e.id,e.name])),o=new Map(t.divisions.map(e=>[e.id,e.name])),s=new Map(t.divisions.map(e=>[e.id,e])),c=[],l=[],u=[],d=null,f=!1,p=(e,t)=>t===`home`?(e.home_team_id?i.get(e.home_team_id):e.home_label)??`?`:(e.away_team_id?i.get(e.away_team_id):e.away_label)??`?`,m=e=>`${p(e,`home`)} vs ${p(e,`away`)}`;e.innerHTML=`
    <section class="games-page">
      <h2>Games</h2>
      <p class="directory-description">
        This is a copy of the master calendar. When the master calendar
        changes, change the game here too (or import the updated spreadsheet).
        Times are shown in your computer's time zone.
      </p>

      <div class="game-filters">
        <div>
          <label for="gf-season">Season</label>
          <select id="gf-season">
            ${t.seasons.map(e=>`
              <option value="${V(e.id)}" ${e.id===r.seasonId?`selected`:``}>${V(e.name)}</option>
            `).join(``)}
          </select>
        </div>
        <div>
          <label for="gf-division">Division</label>
          <select id="gf-division">
            <option value="">All divisions</option>
            ${t.divisions.map(e=>`
              <option value="${V(e.id)}" ${e.id===r.divisionId?`selected`:``}>${V(e.name)}</option>
            `).join(``)}
          </select>
        </div>
        <div>
          <label for="gf-field">Field</label>
          <select id="gf-field">
            <option value="">All fields</option>
            ${t.locations.map(e=>`
              <option value="${V(e.id)}" ${e.id===r.fieldId?`selected`:``}>${V(e.name)}</option>
            `).join(``)}
          </select>
        </div>
        <div>
          <label for="gf-from">From</label>
          <input id="gf-from" type="date" value="${V(r.from)}" />
        </div>
        <div>
          <label for="gf-to">To</label>
          <input id="gf-to" type="date" value="${V(r.to)}" />
        </div>
        <div>
          <label for="gf-status">Status</label>
          <select id="gf-status">
            <option value="not_canceled" ${r.status===`not_canceled`?`selected`:``}>All except canceled</option>
            <option value="all" ${r.status===`all`?`selected`:``}>All</option>
            ${Object.keys(zp).map(e=>`
              <option value="${e}" ${r.status===e?`selected`:``}>${zp[e]}</option>
            `).join(``)}
          </select>
        </div>
        <div class="game-filter-wide">
          <label for="gf-search">Search</label>
          <input id="gf-search" type="search" value="${V(r.search)}"
            placeholder="Team, field, umpire or master Game ID" />
        </div>
        <label class="season-checkbox-label game-filter-wide">
          <input id="gf-warnings" type="checkbox" ${r.onlyWarnings?`checked`:``} />
          Only games with warnings
        </label>
        <label class="season-checkbox-label game-filter-wide">
          <input id="print-page-per-day" type="checkbox" ${Lp?`checked`:``} />
          When printing, start each day on a new page
        </label>
        <label class="season-checkbox-label game-filter-wide">
          <input id="print-phones" type="checkbox" />
          When printing, include phone numbers (private: give the printout only to people who should have it)
        </label>
      </div>

      <div class="account-actions">
        <button id="add-game" class="primary-button" type="button">Add game</button>
        <button id="import-games" class="secondary-button" type="button">Import from spreadsheet</button>
        <button id="print-games" class="secondary-button" type="button">Print schedule</button>
        <button id="download-games" class="secondary-button" type="button">Download CSV</button>
        <button id="umpire-schedule" class="secondary-button" type="button">One umpire's schedule</button>
        <button id="refresh-games" class="secondary-button" type="button">Refresh</button>
      </div>

      <p id="games-message" class="message" role="status" aria-live="polite"></p>

      <div id="importer-container"></div>

      <div id="umpire-schedule-container"></div>

      <div id="game-form-container"></div>

      <p id="game-summary" class="game-summary" role="status" aria-live="polite"></p>

      <div id="game-list"></div>
    </section>
  `;let h=t=>e.querySelector(`#${t}`),g=(e,t=`success`)=>{let n=h(`games-message`);n.textContent=e,n.className=e?`message ${t}`:`message`},_=e=>{if(e.season_id!==r.seasonId||r.divisionId&&e.division_id!==r.divisionId||r.fieldId&&e.location_id!==r.fieldId)return!1;let n=G(e.starts_at);if(r.from&&n<r.from||r.to&&n>r.to||r.status===`not_canceled`&&e.status===`canceled`||r.status!==`not_canceled`&&r.status!==`all`&&e.status!==r.status)return!1;let i=r.search.trim().toLowerCase();if(i){let n=l.filter(t=>t.game_id===e.id).map(e=>t.umpireNames.get(e.umpire_id)??``);if(![p(e,`home`),p(e,`away`),a.get(e.location_id)??``,o.get(e.division_id)??``,e.external_game_id??``,...n].join(` `).toLowerCase().includes(i))return!1}return!0},v=()=>{let e=new Map;for(let t of l)e.set(t.game_id,(e.get(t.game_id)??0)+1);let n=Sl(l),f=e=>yl(e,(e,t)=>vl(s.get(e),t)),g=new Map;for(let e of l){if((e.status??`assigned`)!==`assigned`)continue;let n=g.get(e.game_id)??[];n.push(t.umpireNames.get(e.umpire_id)??`Unknown umpire`),g.set(e.game_id,n)}let v=new Map;if(d){let e=new Map(c.map(e=>[e.id,e]));for(let n of l){let r=e.get(n.game_id);if(!r)continue;let i=Wa(r,d.get(n.umpire_id));if(i!==`unavailable`&&i!==`cannot`)continue;let a=v.get(n.game_id)??[];a.push(t.umpireNames.get(n.umpire_id)??`Unknown umpire`),v.set(n.game_id,a)}}let y=new Map;for(let e of u){let t=y.get(e.game_id)??[];t.some(t=>t.umpire_id===e.umpire_id)||t.push(e),y.set(e.game_id,t)}let b=Fp({games:c,assignedCount:e,now:z(),teamName:e=>i.get(e)??`A team`,fieldName:e=>a.get(e)??`The field`,sidesText:m,neededFor:f,assignedPositions:n,unconfirmedNames:g,unavailableNames:v,unconfirmedDaysFor:e=>t.unconfirmedDays.get(s.get(e.division_id)?.league_id??``)??7}),C=c.filter(_).filter(e=>!r.onlyWarnings||(b.get(e.id)?.length??0)>0).sort((e,t)=>e.starts_at.localeCompare(t.starts_at)||(a.get(e.location_id)??``).localeCompare(a.get(t.location_id)??``));x=C,S=l;let w=e=>C.filter(t=>b.get(t.id)?.some(t=>t.kind===e)).length,T=w(`no_umpire`),E=w(`short_staffed`),D=w(`unconfirmed`),O=w(`unavailable`),ee=w(`field_conflict`),te=w(`team_conflict`),ne=[T?`<strong>${T}</strong> ${T===1?`needs`:`need`} an umpire`:``,E?`<strong>${E}</strong> partly staffed`:``,D?`<strong>${D}</strong> not confirmed yet`:``,O?`<strong>${O}</strong> with an unavailable umpire`:``,ee?`<strong>${ee}</strong> with a field conflict`:``,te?`<strong>${te}</strong> with a team conflict`:``].filter(Boolean),re=h(`game-summary`);re.className=ne.length?`game-summary game-summary-warn`:`game-summary`,re.innerHTML=`${C.length} ${C.length===1?`game`:`games`} shown`+(ne.length?` &middot; ${ne.join(` &middot; `)}`:` &middot; no warnings`);let ie=h(`game-list`);ie.innerHTML=C.length===0?`
        <p class="directory-empty">
          ${c.length===0?`There are no games in this season yet. Add a game above.`:`No games match these filters.`}
        </p>
      `:`
      <div class="table-scroll">
        <table class="umpire-table game-table" aria-label="Games">
          <thead>
            <tr>
              <th>When</th>
              <th>Game</th>
              <th>Umpires</th>
              <th>Status</th>
              <th>Warnings</th>
              <th><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            ${C.map(e=>{let r=b.get(e.id)??[],i=n.get(e.id)??{},s=bl(i,e.status===`canceled`?0:f(e)),c=fl.map(n=>{let r=i[n];if(r){let i=l.find(t=>t.game_id===e.id&&t.position===n),a=i?.status===`confirmed`;return`${pl[n]}: ${V(t.umpireNames.get(r)??`Unknown umpire`)} <span class="game-status game-status-${a?`confirmed`:`assigned`}">&middot; ${a?i?.self_assigned?`Confirmed (self)`:`Confirmed`:`Assigned`}</span>`}return s[n]===`open`?`${pl[n]}: <span class="game-open">OPEN</span>`:``}).filter(Boolean),u=new Set(Object.values(i)),d=e.status===`canceled`||Date.parse(e.starts_at)<=ka()?[]:(y.get(e.id)??[]).filter(e=>!u.has(e.umpire_id)).slice(0,2).map(e=>`<span class="game-declined">Declined: ${V(t.umpireNames.get(e.umpire_id)??`An umpire`)} (${pl[e.position]}, ${V(U(e.created_at))})</span>`);return`
                <tr class="${r.length?`game-row-warn`:``} ${e.status===`canceled`?`game-row-canceled`:``}">
                  <td class="game-when">
                    <span class="game-date">${V(U(e.starts_at))}</span><br>
                    <span class="game-time">${V(W(e.starts_at))} &ndash; ${V(W(e.ends_at))}</span>
                  </td>
                  <td class="game-main">
                    <span class="game-sides">${V(p(e,`home`))} vs ${V(p(e,`away`))}</span>
                    ${e.game_type===`regular`?``:`<span class="game-type">${V(e.game_type)}</span>`}<br>
                    <span class="game-where">${V(o.get(e.division_id)??``)} &middot; ${V(a.get(e.location_id)??``)}</span>
                  </td>
                  <td class="game-umpires" data-label="Umpires">${[...c.length?c:[`&mdash;`],...d].join(`<br>`)}${e.umpires_needed!==null&&e.umpires_needed!==void 0&&e.status!==`canceled`?`<br><span class="game-where">${e.umpires_needed===0?`none needed`:`${e.umpires_needed} needed`} (set for this game)</span>`:``}</td>
                  <td class="game-status" data-label="Status">
                    <span class="game-status-text">${V(zp[e.status])}</span>
                    ${e.external_game_id?`<br><span class="game-master" title="Master calendar Game ID">${V(e.external_game_id)}</span>`:``}
                  </td>
                  <td class="game-warn-cell" data-label="Warnings">${r.length?`<ul class="game-warnings">${r.map(e=>`
                        <li class="game-warning game-warning-${e.kind}">${V(Bp[e.kind]+e.text)}</li>
                      `).join(``)}</ul>`:``}</td>
                  <td class="game-actions-cell"><div class="game-actions">
                    <button type="button" class="secondary-button"
                      data-assign-game="${V(e.id)}">Umpires</button>
                    <button type="button" class="secondary-button"
                      data-edit-game="${V(e.id)}">Edit</button>
                  </div></td>
                </tr>
              `}).join(``)}
          </tbody>
        </table>
      </div>
    `},y=async()=>{h(`game-list`).innerHTML=`<p class="directory-description">Loading games&hellip;</p>`;let[e,t,n]=await Promise.all([No(r.seasonId),Mo(),Ko()]);e.error?(c=[],l=[],u=[],h(`game-summary`).textContent=``,h(`game-list`).innerHTML=`<p class="message error">Unable to load the games. Press Refresh to try again.</p>`,console.error(`Games load failed:`,e.error)):(c=e.games,l=e.assignments,u=t,d=n,v(),f||(f=!0,b()))},b=async()=>{let[e,t]=await Promise.all([R.rpc(`queue_unconfirmed_warnings`),R.rpc(`queue_self_assign_digest`)]);e.error&&console.error(`Reminder check failed:`,e.error.message),t.error&&console.error(`Self-assigned summary failed:`,t.error.message);let n=[],r=e.data,i=t.data;typeof r==`number`&&r>0&&n.push(`A reminder about ${r} unconfirmed ${r===1?`assignment`:`assignments`} was queued for the administrators.`),typeof i==`number`&&i>0&&n.push(`A summary of ${i} ${i===1?`game`:`games`} umpires took for themselves was queued for the administrators.`),n.length>0&&g(n.join(` `))},x=[],S=[],C=()=>{let e=t.seasons.find(e=>e.id===r.seasonId)?.name??``,n=e=>U(new Date(`${e}T12:00:00`).toISOString()),i=r.from&&r.to?`${n(r.from)} to ${n(r.to)}`:r.from?`From ${n(r.from)}`:r.to?`Up to ${n(r.to)}`:`All dates`,s=r.status===`not_canceled`?`Canceled games not shown`:r.status===`all`?`All statuses`:zp[r.status]??r.status;return[[e,r.divisionId?o.get(r.divisionId)??``:`All divisions`,r.fieldId?a.get(r.fieldId)??``:`All fields`,i,s,r.search.trim()?`matching "${r.search.trim()}"`:``,r.onlyWarnings?`only games with warnings`:``].filter(Boolean).join(` · `)]},w=()=>{h(`game-form-container`).innerHTML=``},T=e=>{h(`importer-container`).innerHTML=``,h(`umpire-schedule-container`).innerHTML=``;let n=h(`game-form-container`);sp(n,{context:t,game:e,games:c,assignments:l,title:m(e),detail:`${U(e.starts_at)} \u00b7 ${W(e.starts_at)} \u2013 ${W(e.ends_at)} \u00b7 ${o.get(e.division_id)??``}, ${a.get(e.location_id)??``}`,sideText:m,fieldName:e=>a.get(e)??``,onDone:e=>{w(),e&&(g(e),y())}}),n.scrollIntoView({behavior:`smooth`,block:`start`})},E=e=>{let n=h(`game-form-container`);fp(n,t,{game:e,defaultSeasonId:r.seasonId,defaultDivisionId:r.divisionId||t.divisions[0]?.id||``,assignmentCount:e?l.filter(t=>t.game_id===e.id).length:0,onDone:e=>{w(),e&&(g(e),y())}}),n.scrollIntoView({behavior:`smooth`,block:`start`})},D=(e,t,n)=>{h(e).addEventListener(t,e=>n(e.target))};D(`gf-season`,`change`,e=>{r.seasonId=e.value,w(),g(``),y()}),D(`gf-division`,`change`,e=>{r.divisionId=e.value,v()}),D(`gf-field`,`change`,e=>{r.fieldId=e.value,v()}),D(`gf-from`,`input`,e=>{r.from=e.value,v()}),D(`gf-to`,`input`,e=>{r.to=e.value,v()}),D(`gf-status`,`change`,e=>{r.status=e.value,v()}),D(`gf-search`,`input`,e=>{r.search=e.value,v()}),D(`gf-warnings`,`change`,e=>{r.onlyWarnings=e.checked,v()}),h(`add-game`).addEventListener(`click`,()=>{g(``),h(`importer-container`).innerHTML=``,E(null)}),h(`import-games`).addEventListener(`click`,()=>{g(``),w(),h(`umpire-schedule-container`).innerHTML=``;let n=h(`importer-container`);Tp(n,{context:t,seasonId:r.seasonId,onClose:()=>{n.innerHTML=``},onImported:t=>{Rp=t,Hp(e)}}),n.scrollIntoView({behavior:`smooth`,block:`start`})}),h(`refresh-games`).addEventListener(`click`,()=>{g(``),y()}),D(`print-page-per-day`,`change`,e=>{Lp=e.checked}),h(`print-games`).addEventListener(`click`,async()=>{if(g(``),x.length===0){g(`There are no games to print. Change the filters first.`,`error`);return}let e;if(h(`print-phones`).checked){let t=h(`print-games`);t.disabled=!0,g(`Looking up phone numbers…`);let n=await Zo(S.map(e=>e.umpire_id));if(t.disabled=!1,n.error){console.error(`Phone lookup failed:`,n.error),g(`The phone numbers could not be looked up, so nothing was printed. ${n.error}`,`error`);return}g(``),e=n.contacts}tu(Hu(Mu(ju(x,S,Ou(t),e)),{title:`Umpire schedule`,lines:[...C(),...e?[`Includes private phone numbers: keep this page private`]:[]],printedAt:_o(new Date),pagePerDay:Lp}))}),h(`download-games`).addEventListener(`click`,()=>{if(g(``),x.length===0){g(`There are no games to download. Change the filters first.`,`error`);return}let e=ju(x,S,Ou(t));kp(`${Op(`RWCLL-schedule-${t.seasons.find(e=>e.id===r.seasonId)?.name??`season`}-${r.from||`start`}-${r.to||`end`}`)}.csv`,Dp([Nu,...Pu(e)])),g(`Downloaded ${e.length} ${e.length===1?`game`:`games`}.`,`success`)}),h(`umpire-schedule`).addEventListener(`click`,()=>{g(``),h(`importer-container`).innerHTML=``,w();let e=h(`umpire-schedule-container`);jp(e,{context:t,onClose:()=>{e.innerHTML=``}}),e.scrollIntoView({behavior:`smooth`,block:`start`})}),h(`game-list`).addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`[data-assign-game]`);if(n){let e=c.find(e=>e.id===n.dataset.assignGame);e&&(g(``),T(e));return}let r=t.closest(`[data-edit-game]`);if(!r)return;let i=c.find(e=>e.id===r.dataset.editGame);i&&(g(``),E(i))}),await y(),Rp&&=(g(Rp),null)}function Up(){Ip=null}var Wp=12096e5;async function Gp(e,t){let n=ka(),r=e=>`${U(e.startsAt)} \u00b7 ${e.time} \u00b7 ${e.division} \u00b7 ${e.home} vs ${e.away}`,i=t.items.filter(e=>e.status!==`canceled`&&Date.parse(e.startsAt)<=n&&Date.parse(e.endsAt)+Wp>=n).sort((e,t)=>t.startsAt.localeCompare(e.startsAt)).map(e=>({id:e.id,label:r(e)})),a=await Vo(),o=new Map(t.items.map(e=>[e.id,e]));e.innerHTML=Du({games:i,reports:a.reports.map(e=>({id:e.id,created_at:e.created_at,category:e.category,body:e.body,authorName:e.author_name,umpireId:e.umpire_id,umpireName:t.umpireName,gameLabel:o.get(e.game_id)?r(o.get(e.game_id)):`A game`,endsOn:null,followups:(a.followups.get(e.id)??[]).map(e=>({id:e.id,author_name:e.author_name,body:e.body,created_at:e.created_at}))}))});let s=t=>{let n=e.querySelector(`#my-reports-message`);n.textContent=t,n.className=`message error`};e.querySelector(`#my-report-form`)?.addEventListener(`submit`,n=>{n.preventDefault();let r=e.querySelector(`#my-report-body`).value.trim();if(!r)return s(`Write what happened.`);let i=e.querySelector(`#my-report-form button[type='submit']`);i.disabled=!0,(async()=>{let{error:n}=await R.rpc(`file_game_report`,{p_game_id:e.querySelector(`#my-report-game`).value,p_category:e.querySelector(`#my-report-category`).value,p_body:r,...B()?{p_now:B()}:{}});if(n)return i.disabled=!1,s(`Could not send the report. ${n.message}`);t.refresh(`Your report was sent. Only the umpire chief and super admins can read it.`)})()}),e.addEventListener(`submit`,e=>{let n=e.target.closest(`form.report-followup-form`);if(!n)return;e.preventDefault();let r=n.querySelector(`.report-followup-text`).value.trim();if(!r)return s(`Write something first.`);let i=n.querySelector(`button`);i.disabled=!0,(async()=>{let{error:e}=await R.rpc(`add_game_report_followup`,{p_report_id:n.dataset.report,p_body:r,...B()?{p_now:B()}:{}});if(e)return i.disabled=!1,s(`Could not add it. ${e.message}`);t.refresh(`Follow-up added. Only the umpire chief and super admins can read it.`)})()})}function Kp(e,t,n,r){let i=new Map(t.filter(e=>e.umpire_id===n).map(e=>[e.game_id,e])),a=H(r),o=[];for(let t of e){let e=i.get(t.id);if(!e||t.status===`canceled`)continue;let n=Qc({starts_at:t.startsAt,ends_at:t.endsAt,status:t.status},e,r);n.kind!==`closed`&&(G(t.startsAt)===a||n.kind===`open`)&&o.push({game:t,state:n})}return o.sort((e,t)=>Date.parse(e.game.startsAt)-Date.parse(t.game.startsAt))}function qp(e,t){let n=e.flatMap(e=>e.state.kind===`early`?[Date.parse(e.state.opensAt)-t.getTime()]:[]).filter(e=>e>0);return n.length?Math.min(...n):null}var Jp=[5,10,15,20,30,45,60];function Yp(e,t){if(e.state.kind!==`open`)return``;let n=t?.umpireId?t.late?.get(`${e.game.id}:${t.umpireId}`):void 0,r=V(e.game.id);return`
    <details class="gd-late"${n?` open`:``}>
      <summary>${n?`Running late (about ${n.minutes} min)`:`I'm running late`}</summary>
      <div class="gd-late-body">
        <label>About how many minutes?
          <select class="gd-late-minutes">
            ${Jp.map(e=>`<option value="${e}"${n?.minutes===e?` selected`:``}>${e}</option>`).join(``)}
          </select>
        </label>
        <button type="button" class="primary-button" data-late-send="${r}">${n?`Update`:`Tell the administrators`}</button>
        ${n?`<button type="button" class="secondary-button" data-late-clear="${r}">I'm not late after all</button>`:``}
      </div>
    </details>`}function Xp(e){let{state:t,game:n}=e;switch(t.kind){case`open`:return`
        <button type="button" class="primary-button gd-button" data-checkin="${V(n.id)}">I'm here</button>
        ${t.markedNoShow?`<p class="gd-note">An administrator marked you as not here. If you are here, check in.</p>`:``}`;case`early`:return`<p class="gd-state">Check-in opens at ${V(W(t.opensAt))}, an hour before the game.</p>`;case`done`:return`<p class="gd-state gd-done">${V(Zc(n.startsAt,t.arrivedAt,`Checked in`))}</p>`;case`over`:return`<p class="gd-state">${t.noShow?`You were marked as not here.`:`The game is over, and no check-in was recorded.`} Ask an administrator if that is wrong.</p>`;default:return``}}function Zp(e,t,n){return e.length===0?``:`
    <section class="game-day" aria-labelledby="game-day-title">
      <h2 id="game-day-title">Game day</h2>
      <p id="game-day-message" class="message" role="status" aria-live="polite"></p>
      <ul class="gd-list">
        ${e.map(e=>{let r=e.game,i=r.address?` <a class="board-map" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(r.address)}" target="_blank" rel="noopener">${V(r.address)}</a>`:``;return`
            <li class="gd-item gd-${e.state.kind}">
              <div class="gd-info">
                <strong>${V(r.time)}</strong>
                <span>${V(r.division)} &middot; ${V(r.home)} vs ${V(r.away)}</span>
                <span>${V(r.position)} at ${V(r.field)}${i}</span>
                ${(n?.partners?.get(r.id)??[]).length?`<span class="gd-with"><strong>With:</strong> ${n.partners.get(r.id).map(e=>`${V(e.name)} (${V(pl[e.position]??e.position)})`).join(`, `)}</span>`:``}
                ${r.directions?`<span class="gd-directions"><strong>Parking and directions:</strong> ${V(r.directions)}</span>`:``}
                ${n?.access?.get(r.id)?`<span class="gd-access"><strong>Gate or access:</strong> ${V(n.access.get(r.id))}</span>`:``}
              </div>
              <div class="gd-action">${Xp(e)}${Yp(e,n)}</div>
              <div class="gd-notes">${ul(r.id,t?.get(r.id)??[],{canRemove:!1})}</div>
            </li>`}).join(``)}
      </ul>
    </section>`}function Qp(e,t,n){let r=e.querySelector(`#game-day-message`),i=e=>{r&&(r.textContent=e,r.className=`message error`)};e.addEventListener(`click`,e=>{let t=e.target,a=t.closest(`[data-late-send]`),o=t.closest(`[data-late-clear]`);if(a||o){let e=a??o;e.disabled=!0,(async()=>{let t=B();if(a){let r=Number(a.closest(`.gd-late-body`)?.querySelector(`.gd-late-minutes`)?.value),{error:o}=await R.rpc(`report_running_late`,{p_game_id:a.dataset.lateSend,p_minutes:r,...t?{p_now:t}:{}});return o?(e.disabled=!1,i(`Could not tell them. ${o.message}`)):n(`Thank you. The administrators know you are running about ${r} minutes late.`)}let{error:r}=await R.rpc(`clear_running_late`,{p_game_id:o.dataset.lateClear});if(r)return e.disabled=!1,i(`Could not do that. ${r.message}`);n(`Okay. You are no longer marked as running late.`)})();return}let s=t.closest(`[data-checkin]`);s&&(s.disabled=!0,(async()=>{let e=B(),{error:t}=await R.rpc(`check_in`,{p_game_id:s.dataset.checkin,...e?{p_now:e}:{}});t?(s.disabled=!1,r&&(r.textContent=`Could not check you in. ${t.message}`,r.className=`message error`)):n(`You are checked in. Thank you!`)})())});let a=qp(t,z());a!==null&&window.setTimeout(()=>{e.isConnected&&n(``)},Math.min(a+1e3,216e5))}function $p(e){let t=new Map;for(let n of e){let e=t.get(n.game_id)??new Set;e.add(n.place),t.set(n.game_id,e)}let n=new Map;for(let[e,r]of t)n.set(e,fl.filter(e=>r.has(e)));return n}var em=e=>{let t=z();return t.setDate(t.getDate()+e),G(t.toISOString())};async function tm(e,t){e.innerHTML=``;let n=async(e,n)=>{let r=new Date(`${e}T00:00:00`),i=new Date(`${n}T00:00:00`);i.setDate(i.getDate()+1);let{data:a,error:o}=await R.rpc(`self_assign_options`,{p_from:Number.isNaN(r.getTime())?null:r.toISOString(),p_to:Number.isNaN(i.getTime())?null:i.toISOString()});if(o)return{rows:[],games:[],error:o.message};let s=a??[],c=await Xo(s.map(e=>e.game_id));return c.error?{rows:[],games:[],error:c.error}:{rows:s,games:ju(c.games,[],Ou(t.context)),error:null}},r=await n(em(0),em(30));if(r.error){console.error(`Games to take failed:`,r.error);return}if(r.rows.length===0)return;e.innerHTML=`
    <section class="open-games">
      <h2>Games you can take</h2>
      <p class="directory-description">
        Open places in games you are allowed to take for yourself. A game you
        take is confirmed straight away, and you can decline it later from
        your schedule. You cannot take a game that overlaps one of yours.
      </p>
      <div class="game-filters">
        <div>
          <label for="og-from">From</label>
          <input id="og-from" type="date" value="${V(em(0))}" />
        </div>
        <div>
          <label for="og-to">To</label>
          <input id="og-to" type="date" value="${V(em(30))}" />
        </div>
      </div>
      <p id="og-message" class="message" role="status" aria-live="polite"></p>
      <div id="og-list"></div>
    </section>
  `;let i=t=>e.querySelector(`#${t}`),a=(e,t=`error`)=>{let n=i(`og-message`);n.textContent=e,n.className=e?`message ${t}`:`message`},o=[],s=(e,t)=>{o=t;let n=$p(e),r=t.filter(e=>n.has(e.id)),a=i(`og-list`);a.innerHTML=r.length===0?`<p class="directory-empty">There are no open games you can take in these dates.</p>`:`
      ${e.length>=500?`<p class="directory-description">Only the first 500 places are shown. Choose a shorter range to see the rest.</p>`:``}
      <div class="table-scroll">
        <table class="umpire-table imp-table" aria-label="Games you can take">
          <thead>
            <tr><th>Date</th><th>Time</th><th>Field</th><th>Game</th><th>Division</th><th>Take</th></tr>
          </thead>
          <tbody>
            ${r.map(e=>`
              <tr>
                <td data-label="Date" class="og-date">${V(U(e.startsAt))}</td>
                <td data-label="Time" class="og-time">${V(e.time)}</td>
                <td data-label="Field" class="og-field">${V(e.field)}${e.address?`<br><span class="game-where">${V(e.address)}</span>`:``}</td>
                <td data-label="Game" class="og-game">${V(e.home)} vs ${V(e.away)}</td>
                <td data-label="Division" class="og-division">${V(e.division)}</td>
                <td data-label="Take" class="og-take"><div class="sv-actions">${(n.get(e.id)??[]).map(t=>`
                  <button type="button" class="primary-button" data-take-game="${V(e.id)}" data-take-place="${t}">Take ${V(ml[t])}</button>`).join(``)}</div></td>
              </tr>
            `).join(``)}
          </tbody>
        </table>
      </div>
    `},c=async()=>{let e=await n(i(`og-from`).value,i(`og-to`).value);e.error?a(`The list could not be loaded. ${e.error}`):s(e.rows,e.games)};s(r.rows,r.games);for(let e of[`og-from`,`og-to`])i(e).addEventListener(`change`,()=>{a(``),c()});i(`og-list`).addEventListener(`click`,n=>{let r=n.target.closest(`[data-take-game]`);if(!r)return;let i=r.dataset.takeGame,s=r.dataset.takePlace,l=o.find(e=>e.id===i);for(let t of e.querySelectorAll(`[data-take-game]`))t.disabled=!0;a(``),(async()=>{let{error:e}=await R.rpc(`self_assign`,{p_game_id:i,p_place:s});e?(a(`That did not work. ${e.message}`),await c()):t.onTaken(`You have taken the ${ml[s].toLowerCase()} place for ${l?`${l.home} vs ${l.away}`:`that game`}. It is confirmed and on your schedule.`)})()})}async function nm(e,t=``){e.innerHTML=`
    <section class="my-schedule">
      <h2>My schedule</h2>
      <p class="directory-description">Loading your games&hellip;</p>
    </section>
  `;let n=t=>{e.innerHTML=`
      <section class="my-schedule">
        <h2>My schedule</h2>
        <p class="directory-empty">${V(t)}</p>
      </section>
    `},{data:r}=await R.auth.getSession(),i=r.session?.user.id;if(!i)return n(`Sign in again to see your schedule.`);let{data:a,error:o}=await R.from(`umpires`).select(`id, display_name`).eq(`profile_id`,i).maybeSingle();if(o)return console.error(`My schedule failed:`,o.message),n(`Your schedule could not be loaded. Refresh and try again.`);if(!a)return n(`Your account is not connected to an umpire record yet, so there is no schedule to show. Please ask an administrator.`);let[{context:s,error:c},l]=await Promise.all([Ao(),Qo(a.id)]);if(!s||l.error)return console.error(`My schedule failed:`,c??l.error),n(`Your schedule could not be loaded. Refresh and try again.`);let u=Fu(a.id,l.games,l.assignments,Ou(s)),d=u.filter(e=>e.myStatus===`assigned`&&e.status!==`canceled`&&Date.parse(e.startsAt)>ka()).length,f=Kp(u,l.assignments,a.id,z()),p=f.length?(await Fo(f.map(e=>e.game.id))).notes:void 0,m=f.map(e=>e.game.id),h={umpireId:a.id};if(m.length){let[e,t,n]=await Promise.all([Bo(m),zo(m),Promise.all(m.map(async e=>[e,await Lo(e)]))]);h.partners=e,h.late=t,h.access=new Map(n.filter(e=>e[1]!==null))}e.innerHTML=`
    <div id="my-game-day">${Zp(f,p,h)}</div>
    <section class="my-schedule">
      <h2>My schedule</h2>
      ${t?`<p class="message success" role="status">${V(t)}</p>`:``}
      ${d?`<p class="my-pending" role="status">You have <strong>${d}</strong> ${d===1?`game`:`games`} waiting for your answer. Please confirm or decline ${d===1?`it`:`them`} below.</p>`:``}
      <p class="directory-description">
        Your assigned games. Times are shown in your computer's time zone.
      </p>
      <div id="my-schedule-view"></div>
    </section>
    <div id="my-reports"></div>
    <div id="my-availability"></div>
    <div id="my-open-games"></div>
  `,Qp(e.querySelector(`#my-game-day`),f,t=>{nm(e,t)}),eu(e.querySelector(`#my-game-day`),t=>{nm(e,t)}),Ap(e.querySelector(`#my-schedule-view`),{umpireName:a.display_name||`Me`,items:u,emptyText:`You have not been assigned any games yet. They will appear here as soon as the scheduler assigns you.`,onAnswer:async(e,t,n)=>{let{error:r}=t===`confirm`?await R.rpc(`confirm_assignment`,{p_game_id:e}):await R.rpc(`decline_assignment`,{p_game_id:e,p_reason:n});return r?`That did not work. ${r.message}`:null},onAnswered:t=>{nm(e,t)}}),Gp(e.querySelector(`#my-reports`),{items:u,umpireName:a.display_name||`Me`,refresh:t=>void nm(e,t)}),ns(e.querySelector(`#my-availability`),{umpireId:a.id,own:!0}),tm(e.querySelector(`#my-open-games`),{context:s,onTaken:t=>{nm(e,t)}})}function rm(e,t,n,r=``){e.querySelector(`.topbar`)?.remove(),e.insertAdjacentHTML(`afterbegin`,`
      <header class="topbar">
        <a class="topbar-brand" href="#/" aria-label="Redwood City Little League: home">
          ${Gf(`topbar-logo`)}
        </a>
        <span class="topbar-user">
          <span class="topbar-name">
            ${t?`Signed in as ${V(t)}`:`Signed in`}
          </span>
          ${r?`<em class="topbar-roles" title="${V(r)}">${V(r)}</em>`:``}
        </span>
        <button id="topbar-signout" class="secondary-button"
          type="button">Sign out</button>
      </header>
    `),e.querySelector(`#topbar-signout`)?.addEventListener(`click`,n)}var im=null;function am(e,t){let{pages:n}=t;e.innerHTML=`
    <nav class="app-nav" aria-label="Main menu" ${n.length<2?`hidden`:``}>
      <ul>
        ${n.map(e=>`
          <li>
            <button type="button" class="app-nav-button"
              data-page="${V(e.id)}">
              ${V(e.label)}
            </button>
          </li>
        `).join(``)}
      </ul>
    </nav>
    <div id="page-content"></div>
  `,rm(e,t.name,t.onSignOut,t.roles??``);let r=e=>{window.location.hash=`#/${e}`};e.querySelector(`.app-nav`)?.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`[data-page]`);n?.dataset.page&&r(n.dataset.page)});let i=()=>{let e=document.querySelector(`#page-content`);if(!e)return;let t=/^#\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/.exec(window.location.hash),i=t?.[1],a=n.find(e=>e.id===i)??n[0];if(!a)return;let o=a.id===i?t?.[2]:void 0;document.querySelectorAll(`.app-nav-button`).forEach(e=>{e.dataset.page===a.id?e.setAttribute(`aria-current`,`page`):e.removeAttribute(`aria-current`)}),e.innerHTML=``,a.render(e,r,o),window.scrollTo(0,0)};im&&window.removeEventListener(`hashchange`,im),im=i,window.addEventListener(`hashchange`,im),i()}var om=document.querySelector(`#app`);if(!om)throw Error(`Application container was not found.`);var Q=`login`,sm=!1,cm=new URLSearchParams(`${window.location.hash.replace(/^#/,``)}&${window.location.search.replace(/^\?/,``)}`),lm=cm.get(`type`)===`recovery`,um=cm.has(`error_description`),dm=null;function fm(){let e=document.querySelector(`#outbox-details`),t=document.querySelector(`#outbox-container`);e&&t&&(e.addEventListener(`toggle`,()=>{e.open&&ap(t)}),dm&&document.removeEventListener(`outbox:changed`,dm),dm=()=>{e.isConnected&&e.open&&ap(t)},document.addEventListener(`outbox:changed`,dm))}function pm(e,t=``){rm(om,e,()=>void Fm(),t)}function $(e,t=`error`){let n=document.querySelector(`#message`);n&&(n.textContent=e,n.className=`message ${t}`)}function mm(){wf(),Bf();let e=Vf();om.innerHTML=`
    <main class="page">
      <section class="auth-card">
        ${Gf(`auth-logo`)}
        <p class="eyebrow">RWCLL</p>
        <h1>Umpire Management</h1>
        <p class="intro">
          Manage game assignments, scheduling, and your umpire account.
        </p>

        <div class="tabs" role="tablist" aria-label="Account access">
          <button id="login-tab" class="tab" type="button"
            aria-selected="${Q===`login`}">
            Sign in
          </button>
          <button id="signup-tab" class="tab" type="button"
            aria-selected="${Q===`signup`}">
            Create account
          </button>
        </div>

        ${e?`<p class="message" role="status">${Dm(e)}</p>`:``}

        <h2>${Q===`signup`?`Create your account`:`Welcome back`}</h2>
        <p class="form-intro">
          ${Q===`signup`?`Register to request access to the umpire system.`:`Sign in to check your account and assignments.`}
        </p>

        <form id="auth-form">
          ${Q===`signup`?`
                <label for="display-name">Full name</label>
                <input id="display-name" name="displayName"
                  type="text" autocomplete="name" maxlength="100"
                  required placeholder="Your full name" />

                <fieldset class="signup-kind">
                  <legend>I am signing up as</legend>
                  <label class="season-checkbox-label">
                    <input type="radio" name="signupKind"
                      value="adult_umpire" required />
                    An adult umpire (18 or older)
                  </label>
                  <label class="season-checkbox-label">
                    <input type="radio" name="signupKind"
                      value="youth_umpire" />
                    A youth umpire (13 to 17)
                  </label>
                  <label class="season-checkbox-label">
                    <input type="radio" name="signupKind"
                      value="parent_guardian" />
                    A parent or guardian of a youth umpire
                  </label>
                  <div id="parent-note" hidden>
                    <label for="registration-note">Your child's name, and the division they umpire in</label>
                    <input id="registration-note" name="registrationNote"
                      type="text" maxlength="200" autocomplete="off"
                      placeholder="For example: Alex Kim, Majors" />
                    <p class="season-dates">
                      An administrator will check this and link your account to
                      your child. You will then see your child's games,
                      earnings and payments (read-only). You cannot link
                      yourself to a child.
                    </p>
                  </div>
                  <div id="age-confirm" hidden>
                    <label class="season-checkbox-label">
                      <input type="checkbox" name="ageConfirm" />
                      I am 13 or older
                    </label>
                    <p class="season-dates">
                      If you are under 13, a parent or the league has to set
                      up your account. Please contact your league
                      administrator.
                    </p>
                  </div>
                </fieldset>
              `:``}

          <label for="email">Email address</label>
          <input id="email" name="email" type="email"
            autocomplete="email" required maxlength="254"
            placeholder="you@example.com" />

          <label for="password">Password</label>
          <input id="password" name="password" type="password"
            autocomplete="${Q===`signup`?`new-password`:`current-password`}"
            minlength="8" required placeholder="At least 8 characters" />

          ${Q===`login`?`<button id="forgot-password-button" class="link-button"
                  type="button">Forgot your password?</button>`:``}

          ${Q===`signup`?`
                <label for="confirm-password">Confirm password</label>
                <input id="confirm-password" name="confirmPassword"
                  type="password" autocomplete="new-password"
                  minlength="8" required placeholder="Enter password again" />
              `:``}

          <button id="submit-button" class="primary-button" type="submit">
            ${Q===`signup`?`Create account`:`Sign in`}
          </button>
          <p id="message" class="message" role="status" aria-live="polite"></p>
        </form>

        <p class="security-note">
          New accounts require administrator approval before protected
          umpire features are available.
        </p>
      </section>
    </main>
  `,document.querySelector(`#login-tab`)?.addEventListener(`click`,()=>{Q=`login`,mm()}),document.querySelector(`#signup-tab`)?.addEventListener(`click`,()=>{Q=`signup`,mm()}),document.querySelector(`#auth-form`)?.addEventListener(`submit`,e=>{e.preventDefault(),hm()}),document.querySelector(`#forgot-password-button`)?.addEventListener(`click`,()=>{jm()}),document.querySelectorAll(`input[name="signupKind"]`).forEach(e=>{e.addEventListener(`change`,()=>{let e=document.querySelector(`input[name="signupKind"][value="youth_umpire"]`)?.checked??!1,t=document.querySelector(`#age-confirm`);t&&(t.hidden=!e);let n=document.querySelector(`input[name="signupKind"][value="parent_guardian"]`)?.checked??!1,r=document.querySelector(`#parent-note`);r&&(r.hidden=!n)})})}async function hm(){if(sm)return;let e=document.querySelector(`#auth-form`),t=document.querySelector(`#submit-button`);if(!e||!t)return;let n=new FormData(e),r=String(n.get(`email`)??``).trim(),i=String(n.get(`password`)??``);sm=!0,t.disabled=!0,t.textContent=Q===`signup`?`Creating account…`:`Signing in…`,$(``);try{if(Q===`signup`){let e=String(n.get(`displayName`)??``).trim(),t=String(n.get(`confirmPassword`)??``);if(!e){$(`Please enter your full name.`);return}if(i.length<8){$(`Your password must be at least 8 characters.`);return}if(i!==t){$(`The passwords do not match.`);return}let a=String(n.get(`signupKind`)??``);if(a!==`adult_umpire`&&a!==`youth_umpire`&&a!==`parent_guardian`){$(`Please choose whether you are an adult umpire, a youth umpire, or a parent or guardian.`);return}let o=String(n.get(`registrationNote`)??``).trim();if(a===`parent_guardian`&&!o){$(`Please write your child's name and division, so an administrator can link you.`);return}if(a===`youth_umpire`&&!n.get(`ageConfirm`)){$(`Umpires under 13 cannot register themselves. Please ask a parent or your league administrator to set up your account.`);return}let{data:s,error:c}=await R.auth.signUp({email:r,password:i,options:{data:{display_name:e,signup_kind:a,...a===`parent_guardian`?{registration_note:o}:{}},emailRedirectTo:`${window.location.origin}/`}});if(c)throw c;s.session?await gm(s.session):(mm(),$(`Registration submitted. Check your email for a confirmation link. After confirming, sign in to check your account approval status.`,`success`))}else{let{data:e,error:t}=await R.auth.signInWithPassword({email:r,password:i});if(t)throw t;await gm(e.session)}}catch(e){$(e instanceof Error?e.message:`Something went wrong. Please try again.`)}finally{sm=!1;let e=document.querySelector(`#submit-button`);e&&(e.disabled=!1,e.textContent=Q===`signup`?`Create account`:`Sign in`)}}async function gm(e,t=!1){let{data:n,error:r}=await R.from(`profiles`).select(`display_name, account_status`).eq(`id`,e.user.id).single();if(lm)return;if(r||!n){om.innerHTML=`
      <main class="page">
        <section class="auth-card">
          ${Gf(`auth-logo`)}
          <h1>Account status unavailable</h1>
          <p>We couldn't load your profile. Please try again later.</p>
          <button id="signout-button" class="secondary-button">
            Sign out
          </button>
        </section>
      </main>
    `,document.querySelector(`#signout-button`)?.addEventListener(`click`,()=>void Fm()),pm(``);return}if(n.account_status===`pending`&&!t){let{data:t}=await R.rpc(`claim_registration`);if(lm)return;if(t===`invited`){await gm(e,!0);return}}let{data:i,error:a}=await R.from(`user_roles`).select(`role_id`).eq(`user_id`,e.user.id);if(lm)return;if(a){_m(n),$(`Unable to check account permissions. Please try again.`);return}let o=(i??[]).map(e=>e.role_id);if(n.account_status===`approved`){let e=Em({isSuperAdmin:o.includes(`super_admin`),isTreasurer:o.includes(`treasurer`),isParent:o.includes(`parent_guardian`),isUmpireChief:o.includes(`umpire_chief`),isScheduler:o.includes(`scheduler`),isUmpire:o.includes(`youth_umpire`)||o.includes(`adult_umpire`)},n);if(e.length>0){am(om,{name:n.display_name,roles:Jf(o),pages:e,onSignOut:()=>void Fm()}),Tf(),Hf({isAdministrator:kf(o),signOut:()=>void Fm()});return}}_m(n,Jf(o))}function _m(e,t=``){wf(),Bf();let n={pending:{title:`Awaiting approval`,text:`Your account has been created, but an administrator must approve it before you can access protected umpire features.`},approved:{title:`Account approved`,text:`Your account is approved. The scheduling dashboard will be added in a later step.`},rejected:{title:`Account not approved`,text:`Your account has not been approved. Please contact your league administrator if you believe this is a mistake.`},suspended:{title:`Account suspended`,text:`Access to the umpire system is currently suspended. Please contact your league administrator.`}},r=n[e.account_status]??n.pending;if(om.innerHTML=`
    <main class="page">
      <section class="auth-card">
        ${Gf(`auth-logo`)}
        <p class="eyebrow">RWCLL</p>
        <h1 id="account-heading"></h1>
        <p id="account-message" class="intro"></p>
        <div class="status">
          <span class="status-dot"></span>
          <span id="account-status"></span>
        </div>

        <div id="my-details-container"></div>

        <button id="signout-button" class="secondary-button" type="button">
          Sign out
        </button>
      </section>
    </main>
  `,document.querySelector(`#account-heading`).textContent=r.title,document.querySelector(`#account-message`).textContent=r.text,document.querySelector(`#account-status`).textContent=`Signed in as ${e.display_name||`user`} · ${e.account_status}`,e.account_status===`approved`){let e=document.querySelector(`#my-details-container`);e&&Xf(e)}document.querySelector(`#signout-button`)?.addEventListener(`click`,()=>{Fm()}),pm(e.display_name,t)}function vm(e,t,n){let r=Fa(n);if(!r){e.innerHTML=Ia(),e.querySelector(`.admin-menu`)?.addEventListener(`click`,e=>{let n=e.target.closest(`[data-admin-section]`);n?.dataset.adminSection&&t(`admin/${n.dataset.adminSection}`)});return}e.innerHTML=`
    <main class="page">
      <section class="auth-card admin-card">
        <p class="eyebrow">RWCLL · ADMINISTRATION</p>
        ${La(r.id)}
        <div id="admin-section"></div>
      </section>
    </main>
  `,e.querySelector(`.admin-subnav`)?.addEventListener(`click`,e=>{let n=e.target.closest(`[data-admin-section]`);if(!n)return;let r=n.dataset.adminSection;t(r?`admin/${r}`:`admin`)});let i=e.querySelector(`#admin-section`);switch(r.id){case`approvals`:ym(i);break;case`roles`:i.innerHTML=`<div id="role-manager-container"></div>`,Yc(i.querySelector(`#role-manager-container`));break;case`setup`:i.innerHTML=`<div id="league-setup-container"></div>`,Uc(i.querySelector(`#league-setup-container`),`setup`);break;case`locations`:i.innerHTML=`<div id="league-setup-container"></div>`,Uc(i.querySelector(`#league-setup-container`),`locations`);break;case`umpires`:i.innerHTML=`<div id="umpire-directory-container"></div>`,ws(i.querySelector(`#umpire-directory-container`));break;case`outbox`:{i.innerHTML=`
        <h2>Outbox</h2>
        <p class="directory-description">Messages waiting to be sent.</p>
        <div id="outbox-container"></div>
      `;let e=i.querySelector(`#outbox-container`);ap(e),dm&&document.removeEventListener(`outbox:changed`,dm),dm=()=>{e.isConnected&&ap(e)},document.addEventListener(`outbox:changed`,dm);break}case`details`:Xf(i)}}function ym(e){e.innerHTML=`
    <h2>Approvals</h2>
    <p class="directory-description">
      New accounts and umpire registrations that are waiting for approval.
    </p>

    <p id="admin-message" class="message"
      role="status" aria-live="polite"></p>

    <div id="registrations-container"></div>

    <hr class="directory-divider" />

    <h2>Other pending accounts</h2>
    <div id="pending-accounts">
      <p>Loading pending accounts…</p>
    </div>

    <button id="refresh-accounts" class="secondary-button"
      type="button">Refresh list</button>
  `,e.querySelector(`#refresh-accounts`)?.addEventListener(`click`,()=>void Om()),e.querySelector(`#pending-accounts`)?.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof HTMLButtonElement))return;let n=t.dataset.userId,r=t.dataset.status;!n||r!==`approved`&&r!==`rejected`||km(n,r)}),Om(),tp(e.querySelector(`#registrations-container`))}function bm(e){e.innerHTML=`
    <main class="page">
      <section class="auth-card admin-card">
        <p class="eyebrow">RWCLL · UMPIRE CHIEF</p>
        <h1>Umpire Management</h1>
        <p class="intro">
          Review new umpire registrations and manage the umpire directory.
        </p>

        <details class="role-legend">
          <summary>My details (phone and text messages)</summary>
          <div id="my-details-admin"></div>
        </details>

        <details class="role-legend" id="outbox-details">
          <summary>Outbox (messages waiting to be sent)</summary>
          <div id="outbox-container"></div>
        </details>

        <div id="registrations-container"></div>

        <hr class="directory-divider" />

        <div id="umpire-directory-container"></div>
      </section>
    </main>
  `;let t=document.querySelector(`#umpire-directory-container`);t&&ws(t);let n=document.querySelector(`#registrations-container`);n&&tp(n);let r=document.querySelector(`#my-details-admin`);r&&Xf(r,{heading:!1}),fm()}function xm(e){e.innerHTML=`
    <main class="page">
      <section class="auth-card admin-card">
        <div id="games-container"></div>
      </section>
    </main>
  `;let t=e.querySelector(`#games-container`);t&&Hp(t)}function Sm(e){e.innerHTML=`
    <main class="page">
      <section class="auth-card admin-card">
        <details class="role-legend" id="outbox-details">
          <summary>Outbox (messages waiting to be sent)</summary>
          <div id="outbox-container"></div>
        </details>

        <div id="umpire-directory-container"></div>
      </section>
    </main>
  `;let t=e.querySelector(`#umpire-directory-container`);t&&ws(t),fm()}function Cm(e){e.innerHTML=`
    <main class="page">
      <section class="auth-card admin-card">
        <div id="league-setup-container"></div>
      </section>
    </main>
  `;let t=e.querySelector(`#league-setup-container`);t&&Uc(t)}function wm(e){e.innerHTML=`
    <main class="page">
      <section class="auth-card admin-card">
        <div id="my-details-page"></div>
      </section>
    </main>
  `;let t=e.querySelector(`#my-details-page`);t&&Xf(t)}function Tm(e,t,n){e.innerHTML=`
    <main class="page">
      <section class="auth-card admin-card">
        <p class="eyebrow">RWCLL · UMPIRE</p>
        <h1>Welcome${t?`, ${Dm(t)}`:``}</h1>
        <p class="intro">
          Your umpire account is active. Your game assignments appear below
          as soon as the scheduler assigns you, and you can print them.
          Entering your availability will be added here soon. Meanwhile,
          please keep your contact details up to date.
        </p>
        ${n?`<button id="home-open-details" class="secondary-button"
              type="button">Open My details</button>`:``}

        <div id="my-schedule-container"></div>
      </section>
    </main>
  `;let r=e.querySelector(`#my-schedule-container`);r&&nm(r),n&&e.querySelector(`#home-open-details`)?.addEventListener(`click`,n)}function Em(e,t){let n=[];e.isSuperAdmin?n.push({id:`admin`,label:`Administration`,render:(e,t,n)=>vm(e,t,n)}):(e.isUmpireChief&&n.push({id:`chief`,label:`Umpire Management`,render:e=>bm(e)}),e.isScheduler&&!e.isUmpireChief&&n.push({id:`umpires`,label:`Umpires`,render:Sm})),(e.isSuperAdmin||e.isUmpireChief||e.isScheduler)&&(n.push({id:`games`,label:`Games`,render:e=>xm(e)}),n.push({id:`board`,label:`Field board`,render:(e,t,n)=>du(e,t,n)})),(e.isSuperAdmin||e.isUmpireChief)&&n.push({id:`reports`,label:`Reports`,render:t=>Ju(t,e.isSuperAdmin)}),(e.isSuperAdmin||e.isUmpireChief)&&n.push({id:`families`,label:`Families`,render:e=>hf(e)}),e.isParent&&n.push({id:`family`,label:`My family`,render:e=>_f(e)}),(e.isSuperAdmin||e.isTreasurer)&&n.push({id:`payments`,label:`Payments`,render:e=>Kd(e)}),!e.isSuperAdmin&&e.isScheduler&&n.push({id:`setup`,label:`League Setup`,render:Cm});let r=!e.isSuperAdmin&&!e.isUmpireChief;return e.isUmpire&&n.push({id:`home`,label:n.length===0?`Home`:`As an umpire`,render:(e,n)=>Tm(e,t.display_name,r?()=>n(`details`):null)}),r&&n.length>0&&n.push({id:`details`,label:`My details`,render:wm}),n}function Dm(e){return e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e])}async function Om(){let e=document.querySelector(`#pending-accounts`);if(!e)return;e.replaceChildren();let t=document.createElement(`p`);t.textContent=`Loading pending accounts…`,e.append(t);let{data:n,error:r}=await R.from(`profiles`).select(`id, display_name, email`).eq(`account_status`,`pending`).is(`registration_kind`,null).order(`display_name`);if(e.replaceChildren(),r){let t=document.createElement(`p`);t.textContent=`Unable to load pending accounts.`,e.append(t),Am(r.message);return}let i=n??[];if(i.length===0){let t=document.createElement(`p`);t.textContent=`There are no pending accounts.`,e.append(t)}else for(let t of i){let n=document.createElement(`div`);n.className=`pending-account`;let r=document.createElement(`h3`);r.textContent=t.display_name||`Name not provided`;let i=document.createElement(`p`);i.textContent=t.email||`Email unavailable`;let a=document.createElement(`div`);a.className=`account-actions`;for(let e of[{label:`Approve`,status:`approved`},{label:`Reject`,status:`rejected`}]){let n=document.createElement(`button`);n.type=`button`,n.textContent=e.label,n.className=e.status===`approved`?`primary-button`:`secondary-button`,n.dataset.userId=t.id,n.dataset.status=e.status,a.append(n)}n.append(r,i,a),e.append(n)}}async function km(e,t){let n=t===`approved`?`Approve this account?`:`Reject this account?`;if(!window.confirm(n))return;let r=document.querySelectorAll(`[data-user-id="${CSS.escape(e)}"]`);r.forEach(e=>{e.disabled=!0});let{error:i}=await R.rpc(`set_account_status`,{target_user_id:e,new_status:t});i?(Am(`Could not update account: ${i.message}`),r.forEach(e=>{e.disabled=!1})):(Am(t===`approved`?`Account approved.`:`Account rejected.`,`success`),await Om())}function Am(e,t=`error`){let n=document.querySelector(`#admin-message`);n&&(n.textContent=e,n.className=`message ${t}`)}function jm(){om.innerHTML=`
    <main class="page">
      <section class="auth-card">
        ${Gf(`auth-logo`)}
        <p class="eyebrow">RWCLL</p>
        <h1>Reset your password</h1>
        <p class="intro">
          Enter the email address you registered with. If an account exists
          for it, we will send a link that lets you choose a new password.
        </p>

        <form id="forgot-form">
          <label for="forgot-email">Email address</label>
          <input id="forgot-email" name="email" type="email"
            autocomplete="email" required maxlength="254"
            placeholder="you@example.com" />

          <button id="forgot-submit" class="primary-button" type="submit">
            Send reset link
          </button>
          <p id="message" class="message" role="status"
            aria-live="polite"></p>
        </form>

        <button id="forgot-back" class="secondary-button" type="button">
          Back to sign in
        </button>
      </section>
    </main>
  `,document.querySelector(`#forgot-back`)?.addEventListener(`click`,()=>{Q=`login`,mm()}),document.querySelector(`#forgot-form`)?.addEventListener(`submit`,e=>{e.preventDefault(),Mm()})}async function Mm(){if(sm)return;let e=document.querySelector(`#forgot-form`),t=document.querySelector(`#forgot-submit`);if(!e||!t)return;let n=String(new FormData(e).get(`email`)??``).trim().toLowerCase();sm=!0,t.disabled=!0,t.textContent=`Sending…`,$(``);try{let{error:e}=await R.auth.resetPasswordForEmail(n,{redirectTo:`${window.location.origin}/`});if(e)throw e;$(`If an account exists for that email, a reset link is on its way. Check your inbox and spam folder. The link works for a limited time.`,`success`)}catch(e){$(e instanceof Error?e.message:`Could not send the reset link. Please try again.`)}finally{sm=!1;let e=document.querySelector(`#forgot-submit`);e&&(e.disabled=!1,e.textContent=`Send reset link`)}}function Nm(){om.innerHTML=`
    <main class="page">
      <section class="auth-card">
        ${Gf(`auth-logo`)}
        <p class="eyebrow">RWCLL</p>
        <h1>Choose a new password</h1>
        <p class="intro">
          Enter a new password for your account. Use at least 8 characters.
        </p>

        <form id="new-password-form">
          <label for="new-password">New password</label>
          <input id="new-password" name="password" type="password"
            autocomplete="new-password" minlength="8" required
            placeholder="At least 8 characters" />

          <label for="new-password-confirm">Confirm new password</label>
          <input id="new-password-confirm" name="confirmPassword"
            type="password" autocomplete="new-password" minlength="8"
            required placeholder="Enter password again" />

          <button id="new-password-submit" class="primary-button"
            type="submit">Save new password</button>
          <p id="message" class="message" role="status"
            aria-live="polite"></p>
        </form>

        <button id="new-password-cancel" class="secondary-button"
          type="button">Cancel</button>
      </section>
    </main>
  `,document.querySelector(`#new-password-cancel`)?.addEventListener(`click`,()=>{Fm()}),document.querySelector(`#new-password-form`)?.addEventListener(`submit`,e=>{e.preventDefault(),Pm()}),pm(``)}async function Pm(){if(sm)return;let e=document.querySelector(`#new-password-form`),t=document.querySelector(`#new-password-submit`);if(!e||!t)return;let n=new FormData(e),r=String(n.get(`password`)??``),i=String(n.get(`confirmPassword`)??``);if(r.length<8)$(`Your password must be at least 8 characters.`);else if(r!==i)$(`The passwords do not match.`);else{sm=!0,t.disabled=!0,t.textContent=`Saving…`,$(``);try{let{error:e}=await R.auth.updateUser({password:r});if(e)throw e;await R.auth.signOut({scope:`others`}),lm=!1,window.history.replaceState(null,``,window.location.pathname);let{data:t}=await R.auth.getSession();t.session?await gm(t.session):(Q=`login`,mm(),$(`Your password was changed. Please sign in.`,`success`))}catch(e){let t=e instanceof Error?e.message:``;$(/session missing|not authenticated/i.test(t)?`This reset link has expired or was already used. Please request a new one.`:t||`Could not change the password. Please try again.`)}finally{sm=!1;let e=document.querySelector(`#new-password-submit`);e&&(e.disabled=!1,e.textContent=`Save new password`)}}}async function Fm(){let{error:e}=await R.auth.signOut();e?$(e.message):(lm=!1,Q=`login`,window.history.replaceState(null,``,window.location.pathname),Up(),mm())}async function Im(){if(lm){Nm();return}if(mm(),um){window.history.replaceState(null,``,window.location.pathname),$(`That email link is invalid or has expired. If you were resetting your password, please request a new link.`);return}let{data:e,error:t}=await R.auth.getSession();t?$(`Unable to check your current session. Please sign in again.`):e.session&&await gm(e.session)}R.auth.onAuthStateChange(e=>{e===`PASSWORD_RECOVERY`&&(lm=!0,document.querySelector(`#new-password-form`)||Nm())}),Im();