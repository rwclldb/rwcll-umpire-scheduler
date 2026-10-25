(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=Symbol.for(`@supabase/supabase-js.traceContextExtractor`);function t(){return globalThis[e]}function n(e,t){var n={};for(var r in e)Object.prototype.hasOwnProperty.call(e,r)&&t.indexOf(r)<0&&(n[r]=e[r]);if(e!=null&&typeof Object.getOwnPropertySymbols==`function`)for(var i=0,r=Object.getOwnPropertySymbols(e);i<r.length;i++)t.indexOf(r[i])<0&&Object.prototype.propertyIsEnumerable.call(e,r[i])&&(n[r[i]]=e[r[i]]);return n}function r(e,t,n,r){function i(e){return e instanceof n?e:new n(function(t){t(e)})}return new(n||=Promise)(function(n,a){function o(e){try{c(r.next(e))}catch(e){a(e)}}function s(e){try{c(r.throw(e))}catch(e){a(e)}}function c(e){e.done?n(e.value):i(e.value).then(o,s)}c((r=r.apply(e,t||[])).next())})}var i=e=>e?(...t)=>e(...t):(...e)=>fetch(...e),a=class extends Error{constructor(e,t=`FunctionsError`,n){super(e),this.name=t,this.context=n}toJSON(){return{name:this.name,message:this.message,context:this.context}}},o=class extends a{constructor(e){super(`Failed to send a request to the Edge Function`,`FunctionsFetchError`,e)}},s=class extends a{constructor(e){super(`Relay Error invoking the Edge Function`,`FunctionsRelayError`,e)}},c=class extends a{constructor(e){super(`Edge Function returned a non-2xx status code`,`FunctionsHttpError`,e)}},l;(function(e){e.Any=`any`,e.ApNortheast1=`ap-northeast-1`,e.ApNortheast2=`ap-northeast-2`,e.ApSouth1=`ap-south-1`,e.ApSoutheast1=`ap-southeast-1`,e.ApSoutheast2=`ap-southeast-2`,e.CaCentral1=`ca-central-1`,e.EuCentral1=`eu-central-1`,e.EuWest1=`eu-west-1`,e.EuWest2=`eu-west-2`,e.EuWest3=`eu-west-3`,e.SaEast1=`sa-east-1`,e.UsEast1=`us-east-1`,e.UsWest1=`us-west-1`,e.UsWest2=`us-west-2`})(l||={});var u=class{constructor(e,{headers:t={},customFetch:n,region:r=l.Any}={}){this.url=e,this.headers=t,this.region=r,this.fetch=i(n)}setAuth(e){this.headers.Authorization=`Bearer ${e}`}invoke(e){return r(this,arguments,void 0,function*(e,t={}){var n;let r,i,a;try{let{headers:n,method:l,body:u,signal:d,timeout:f}=t,p={},{region:m}=t;m||=this.region;let h=new URL(`${this.url}/${e}`);m&&m!==`any`&&(p[`x-region`]=m,h.searchParams.set(`forceFunctionRegion`,m));let g,_=!!n&&Object.keys(n).some(e=>e.toLowerCase()===`content-type`);u&&!_?typeof Blob<`u`&&u instanceof Blob||u instanceof ArrayBuffer?(p[`Content-Type`]=u.type||`application/octet-stream`,g=u):typeof u==`string`?(p[`Content-Type`]=`text/plain`,g=u):typeof FormData<`u`&&u instanceof FormData?g=u:(p[`Content-Type`]=`application/json`,g=JSON.stringify(u)):g=u&&typeof u!=`string`&&!(typeof Blob<`u`&&u instanceof Blob)&&!(u instanceof ArrayBuffer)&&!(typeof FormData<`u`&&u instanceof FormData)?JSON.stringify(u):u;let v=d;f&&(i=new AbortController,r=setTimeout(()=>i.abort(),f),d?(v=i.signal,a=()=>i.abort(),d.addEventListener(`abort`,a)):v=i.signal);let y=yield this.fetch(h.toString(),{method:l||`POST`,headers:Object.assign(Object.assign(Object.assign({},p),this.headers),n),body:g,signal:v}).catch(e=>{throw new o(e)}),b=y.headers.get(`x-relay-error`);if(b&&b===`true`)throw new s(y);if(!y.ok)throw new c(y);let x=(y.headers.get(`Content-Type`)??`text/plain`).split(`;`)[0].trim().toLowerCase(),S;return S=x===`application/json`?yield y.json():x===`application/octet-stream`||x===`application/pdf`?yield y.blob():x===`text/event-stream`?y:x===`multipart/form-data`?yield y.formData():yield y.text(),{data:S,error:null,response:y}}catch(e){return{data:null,error:e,response:e instanceof c||e instanceof s?e.context:void 0}}finally{r&&clearTimeout(r),a&&((n=t.signal)==null||n.removeEventListener(`abort`,a))}})}},d=class extends Error{constructor(e){super(e.message),this.name=`PostgrestError`,this.details=e.details,this.hint=e.hint,this.code=e.code}toJSON(){return{name:this.name,message:this.message,details:this.details,hint:this.hint,code:this.code}}},f=3,p=e=>Math.min(1e3*2**e,3e4),m=[520,503],h=[`GET`,`HEAD`,`OPTIONS`];function g(e){"@babel/helpers - typeof";return g=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},g(e)}function _(e,t){if(g(e)!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t||`default`);if(g(r)!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}function v(e){var t=_(e,`string`);return g(t)==`symbol`?t:t+``}function y(e,t,n){return(t=v(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function b(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),n.push.apply(n,r)}return n}function x(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]==null?{}:arguments[t];t%2?b(Object(n),!0).forEach(function(t){y(e,t,n[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):b(Object(n)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))})}return e}function S(e,t){return new Promise(n=>{if(t?.aborted){n();return}let r=setTimeout(()=>{t?.removeEventListener(`abort`,i),n()},e);function i(){clearTimeout(r),n()}t?.addEventListener(`abort`,i)})}function ee(e,t,n,r){return!(!r||n>=f||!h.includes(e)||!m.includes(t))}async function C(e,t,n,r){let i=0;for(;;){let a=x({},n.headers);i>0&&(a[`X-Retry-Count`]=String(i));let o;try{o=await e(t,{method:n.method,headers:a,body:n.body,signal:n.signal})}catch(e){if(e?.name===`AbortError`||e?.code===`ABORT_ERR`||e?.name===`TimeoutError`&&n.signal?.aborted||!h.includes(n.method))throw e;if(r&&i<f){let e=p(i);i++,await S(e,n.signal);continue}throw e}if(ee(n.method,o.status,i,r)){let e=o.headers?.get(`Retry-After`)??null,t=e===null?p(i):Math.max(0,parseInt(e,10)||0)*1e3;await o.text(),i++,await S(t,n.signal)}else return o}}var te=class{constructor(e){this.shouldThrowOnError=!1,this.retryEnabled=!0,this.method=e.method,this.url=e.url,this.headers=new Headers(e.headers),this.schema=e.schema,this.body=e.body,this.shouldThrowOnError=e.shouldThrowOnError??!1,this.signal=e.signal,this.isMaybeSingle=e.isMaybeSingle??!1,this.shouldStripNulls=e.shouldStripNulls??!1,this.urlLengthLimit=e.urlLengthLimit??8e3,this.retryEnabled=e.retry??!0,this.fetch=e.fetch?e.fetch:fetch}throwOnError(){return this.shouldThrowOnError=!0,this}stripNulls(){if(this.headers.get(`Accept`)===`text/csv`)throw Error(`stripNulls() cannot be used with csv()`);return this.shouldStripNulls=!0,this}setHeader(e,t){return this.headers=new Headers(this.headers),this.headers.set(e,t),this}retry(e){return this.retryEnabled=e,this}then(e,t){var n=this;if(this.schema===void 0||([`GET`,`HEAD`].includes(this.method)?this.headers.set(`Accept-Profile`,this.schema):this.headers.set(`Content-Profile`,this.schema)),this.method!==`GET`&&this.method!==`HEAD`&&this.headers.set(`Content-Type`,`application/json`),this.shouldStripNulls){let e=this.headers.get(`Accept`);e===`application/vnd.pgrst.object+json`?this.headers.set(`Accept`,`application/vnd.pgrst.object+json;nulls=stripped`):e&&e!==`application/json`||this.headers.set(`Accept`,`application/vnd.pgrst.array+json;nulls=stripped`)}let r=this.fetch,i=(async()=>{let e={};n.headers.forEach((t,n)=>{e[n]=t});let t=await C(r,n.url.toString(),{method:n.method,headers:e,body:JSON.stringify(n.body,(e,t)=>typeof t==`bigint`?t.toString():t),signal:n.signal},n.retryEnabled);return await n.processResponse(t)})();return this.shouldThrowOnError||(i=i.catch(e=>{let t=``,n=``,r=``,i=e?.cause;if(i){let n=i?.message??``,r=i?.code??``;t=`${e?.name??`FetchError`}: ${e?.message}`,t+=`\n\nCaused by: ${i?.name??`Error`}: ${n}`,r&&(t+=` (${r})`),i?.stack&&(t+=`\n${i.stack}`)}else t=e?.stack??``;let a=this.url.toString().length;return e?.name===`AbortError`||e?.code===`ABORT_ERR`?(r=``,n=`Request was aborted (timeout or manual cancellation)`,a>this.urlLengthLimit&&(n+=`. Note: Your request URL is ${a} characters, which may exceed server limits. If selecting many fields, consider using views. If filtering with large arrays (e.g., .in('id', [many IDs])), consider using an RPC function to pass values server-side.`)):(i?.name===`HeadersOverflowError`||i?.code===`UND_ERR_HEADERS_OVERFLOW`)&&(r=``,n=`HTTP headers exceeded server limits (typically 16KB)`,a>this.urlLengthLimit&&(n+=`. Your request URL is ${a} characters. If selecting many fields, consider using views. If filtering with large arrays (e.g., .in('id', [200+ IDs])), consider using an RPC function instead.`)),{success:!1,error:{message:`${e?.name??`FetchError`}: ${e?.message}`,details:t,hint:n,code:r},data:null,count:null,status:0,statusText:``}})),i.then(e,t)}async processResponse(e){var t=this;let n=null,r=null,i=null,a=e.status,o=e.statusText;if(e.ok){if(t.method!==`HEAD`){let i=await e.text();if(i!==``){if(t.headers.get(`Accept`)===`text/csv`)r=i;else if(t.headers.get(`Accept`)&&t.headers.get(`Accept`)?.includes(`application/vnd.pgrst.plan+text`))r=i;else try{r=JSON.parse(i)}catch{if(n={message:i},r=null,t.shouldThrowOnError)throw new d({message:i,details:``,hint:``,code:``})}}}let s=t.headers.get(`Prefer`)?.match(/count=(exact|planned|estimated)/),c=e.headers.get(`content-range`)?.split(`/`);if(s&&c&&c.length>1&&(i=parseInt(c[1])),t.isMaybeSingle&&Array.isArray(r)){if(r.length>1){if(n={code:`PGRST116`,details:`Results contain ${r.length} rows, application/vnd.pgrst.object+json requires 1 row`,hint:null,message:`JSON object requested, multiple (or no) rows returned`},r=null,i=null,a=406,o=`Not Acceptable`,t.shouldThrowOnError)throw new d(x(x({},n),{},{hint:n.hint??``}))}else r=r.length===1?r[0]:null}}else{let i=await e.text();try{n=JSON.parse(i),Array.isArray(n)&&e.status===404&&(r=[],n=null,a=200,o=`OK`)}catch{e.status===404&&i===``?(a=204,o=`No Content`):n={message:i}}if(n&&t.shouldThrowOnError)throw new d(n)}return{success:n===null,error:n,data:r,count:i,status:a,statusText:o}}returns(){return this}overrideTypes(){return this}},ne=class extends te{throwOnError(){return super.throwOnError()}select(e){let t=!1,n=(e??`*`).split(``).map(e=>/\s/.test(e)&&!t?``:(e===`"`&&(t=!t),e)).join(``);return this.url.searchParams.set(`select`,n),this.headers.append(`Prefer`,`return=representation`),this}order(e,{ascending:t=!0,nullsFirst:n,foreignTable:r,referencedTable:i=r}={}){let a=i?`${i}.order`:`order`,o=this.url.searchParams.get(a);return this.url.searchParams.set(a,`${o?`${o},`:``}${e}.${t?`asc`:`desc`}${n===void 0?``:n?`.nullsfirst`:`.nullslast`}`),this}limit(e,{foreignTable:t,referencedTable:n=t}={}){let r=n===void 0?`limit`:`${n}.limit`;return this.url.searchParams.set(r,`${e}`),this}range(e,t,{foreignTable:n,referencedTable:r=n}={}){let i=r===void 0?`offset`:`${r}.offset`,a=r===void 0?`limit`:`${r}.limit`;return this.url.searchParams.set(i,`${e}`),this.url.searchParams.set(a,`${t-e+1}`),this}abortSignal(e){return this.signal=e,this}single(){return this.headers.set(`Accept`,`application/vnd.pgrst.object+json`),this}maybeSingle(){return this.isMaybeSingle=!0,this}csv(){return this.headers.set(`Accept`,`text/csv`),this}geojson(){return this.headers.set(`Accept`,`application/geo+json`),this}explain({analyze:e=!1,verbose:t=!1,settings:n=!1,buffers:r=!1,wal:i=!1,format:a=`text`}={}){let o=[e?`analyze`:null,t?`verbose`:null,n?`settings`:null,r?`buffers`:null,i?`wal`:null].filter(Boolean).join(`|`),s=this.headers.get(`Accept`)??`application/json`;return this.headers.set(`Accept`,`application/vnd.pgrst.plan+${a}; for="${s}"; options=${o};`),this}rollback(){return this.headers.append(`Prefer`,`tx=rollback`),this}returns(){return this}maxAffected(e){return this.headers.append(`Prefer`,`handling=strict`),this.headers.append(`Prefer`,`max-affected=${e}`),this}},re=RegExp(`[,()]`),w=class extends ne{throwOnError(){return super.throwOnError()}eq(e,t){return this.url.searchParams.append(e,`eq.${t}`),this}neq(e,t){return this.url.searchParams.append(e,`neq.${t}`),this}gt(e,t){return this.url.searchParams.append(e,`gt.${t}`),this}gte(e,t){return this.url.searchParams.append(e,`gte.${t}`),this}lt(e,t){return this.url.searchParams.append(e,`lt.${t}`),this}lte(e,t){return this.url.searchParams.append(e,`lte.${t}`),this}like(e,t){return this.url.searchParams.append(e,`like.${t}`),this}likeAllOf(e,t){return this.url.searchParams.append(e,`like(all).{${t.join(`,`)}}`),this}likeAnyOf(e,t){return this.url.searchParams.append(e,`like(any).{${t.join(`,`)}}`),this}ilike(e,t){return this.url.searchParams.append(e,`ilike.${t}`),this}ilikeAllOf(e,t){return this.url.searchParams.append(e,`ilike(all).{${t.join(`,`)}}`),this}ilikeAnyOf(e,t){return this.url.searchParams.append(e,`ilike(any).{${t.join(`,`)}}`),this}regexMatch(e,t){return this.url.searchParams.append(e,`match.${t}`),this}regexIMatch(e,t){return this.url.searchParams.append(e,`imatch.${t}`),this}is(e,t){return this.url.searchParams.append(e,`is.${t}`),this}isDistinct(e,t){return this.url.searchParams.append(e,`isdistinct.${t}`),this}in(e,t){let n=Array.from(new Set(t)).map(e=>typeof e==`string`&&re.test(e)?`"${e}"`:`${e}`).join(`,`);return this.url.searchParams.append(e,`in.(${n})`),this}notIn(e,t){let n=Array.from(new Set(t)).map(e=>typeof e==`string`&&re.test(e)?`"${e}"`:`${e}`).join(`,`);return this.url.searchParams.append(e,`not.in.(${n})`),this}contains(e,t){return typeof t==`string`?this.url.searchParams.append(e,`cs.${t}`):Array.isArray(t)?this.url.searchParams.append(e,`cs.{${t.join(`,`)}}`):this.url.searchParams.append(e,`cs.${JSON.stringify(t)}`),this}containedBy(e,t){return typeof t==`string`?this.url.searchParams.append(e,`cd.${t}`):Array.isArray(t)?this.url.searchParams.append(e,`cd.{${t.join(`,`)}}`):this.url.searchParams.append(e,`cd.${JSON.stringify(t)}`),this}rangeGt(e,t){return this.url.searchParams.append(e,`sr.${t}`),this}rangeGte(e,t){return this.url.searchParams.append(e,`nxl.${t}`),this}rangeLt(e,t){return this.url.searchParams.append(e,`sl.${t}`),this}rangeLte(e,t){return this.url.searchParams.append(e,`nxr.${t}`),this}rangeAdjacent(e,t){return this.url.searchParams.append(e,`adj.${t}`),this}overlaps(e,t){return typeof t==`string`?this.url.searchParams.append(e,`ov.${t}`):this.url.searchParams.append(e,`ov.{${t.join(`,`)}}`),this}textSearch(e,t,{config:n,type:r}={}){let i=``;r===`plain`?i=`pl`:r===`phrase`?i=`ph`:r===`websearch`&&(i=`w`);let a=n===void 0?``:`(${n})`;return this.url.searchParams.append(e,`${i}fts${a}.${t}`),this}match(e){return Object.entries(e).filter(([e,t])=>t!==void 0).forEach(([e,t])=>{this.url.searchParams.append(e,`eq.${t}`)}),this}not(e,t,n){return this.url.searchParams.append(e,`not.${t}.${n}`),this}or(e,{foreignTable:t,referencedTable:n=t}={}){let r=n?`${n}.or`:`or`;return this.url.searchParams.append(r,`(${e})`),this}filter(e,t,n){return this.url.searchParams.append(e,`${t}.${n}`),this}},ie=class{constructor(e,{headers:t={},schema:n,fetch:r,urlLengthLimit:i=8e3,retry:a}){this.url=e,this.headers=new Headers(t),this.schema=n,this.fetch=r,this.urlLengthLimit=i,this.retry=a}cloneRequestState(){return{url:new URL(this.url.toString()),headers:new Headers(this.headers)}}select(e,t){let{head:n=!1,count:r}=t??{},i=n?`HEAD`:`GET`,a=!1,o=(e??`*`).split(``).map(e=>/\s/.test(e)&&!a?``:(e===`"`&&(a=!a),e)).join(``),{url:s,headers:c}=this.cloneRequestState();return s.searchParams.set(`select`,o),r&&c.append(`Prefer`,`count=${r}`),new w({method:i,url:s,headers:c,schema:this.schema,fetch:this.fetch,urlLengthLimit:this.urlLengthLimit,retry:this.retry})}insert(e,{count:t,defaultToNull:n=!0}={}){let{url:r,headers:i}=this.cloneRequestState();if(t&&i.append(`Prefer`,`count=${t}`),n||i.append(`Prefer`,`missing=default`),Array.isArray(e)){let t=e.reduce((e,t)=>e.concat(Object.keys(t)),[]);if(t.length>0){let e=[...new Set(t)].map(e=>`"${e}"`);r.searchParams.set(`columns`,e.join(`,`))}}return new w({method:`POST`,url:r,headers:i,schema:this.schema,body:e,fetch:this.fetch??fetch,urlLengthLimit:this.urlLengthLimit,retry:this.retry})}upsert(e,{onConflict:t,ignoreDuplicates:n=!1,count:r,defaultToNull:i=!0}={}){let{url:a,headers:o}=this.cloneRequestState();if(o.append(`Prefer`,`resolution=${n?`ignore`:`merge`}-duplicates`),t!==void 0&&a.searchParams.set(`on_conflict`,t),r&&o.append(`Prefer`,`count=${r}`),i||o.append(`Prefer`,`missing=default`),Array.isArray(e)){let t=e.reduce((e,t)=>e.concat(Object.keys(t)),[]);if(t.length>0){let e=[...new Set(t)].map(e=>`"${e}"`);a.searchParams.set(`columns`,e.join(`,`))}}return new w({method:`POST`,url:a,headers:o,schema:this.schema,body:e,fetch:this.fetch??fetch,urlLengthLimit:this.urlLengthLimit,retry:this.retry})}update(e,{count:t}={}){let{url:n,headers:r}=this.cloneRequestState();return t&&r.append(`Prefer`,`count=${t}`),new w({method:`PATCH`,url:n,headers:r,schema:this.schema,body:e,fetch:this.fetch??fetch,urlLengthLimit:this.urlLengthLimit,retry:this.retry})}delete({count:e}={}){let{url:t,headers:n}=this.cloneRequestState();return e&&n.append(`Prefer`,`count=${e}`),new w({method:`DELETE`,url:t,headers:n,schema:this.schema,fetch:this.fetch??fetch,urlLengthLimit:this.urlLengthLimit,retry:this.retry})}};function ae(e,t){try{let t=JSON.parse(e);if(t&&typeof t==`object`&&!Array.isArray(t))return new d({message:String(t.message??e),details:t.details??``,hint:t.hint??``,code:t.code??``})}catch{}return new d({message:e||t,details:``,hint:``,code:``})}function oe(e,t,n){let r=e;return{success:!1,error:new d({message:`${r?.name??`FetchError`}: ${r?.message}`,details:``,hint:``,code:``}),data:null,count:null,status:t,statusText:n}}var se=class e{constructor(e,{headers:t={},schema:n,fetch:r,timeout:i,urlLengthLimit:a=8e3,retry:o}={}){this.url=e,this.headers=new Headers(t),this.schemaName=n,this.urlLengthLimit=a;let s=r??globalThis.fetch;this.fetch=i!==void 0&&i>0?(e,t)=>{let n=new AbortController,r=setTimeout(()=>n.abort(),i),a=t?.signal;if(a){if(a.aborted)return clearTimeout(r),s(e,t);let i=()=>{clearTimeout(r),n.abort()};return a.addEventListener(`abort`,i,{once:!0}),s(e,x(x({},t),{},{signal:n.signal})).finally(()=>{clearTimeout(r),a.removeEventListener(`abort`,i)})}return s(e,x(x({},t),{},{signal:n.signal})).finally(()=>clearTimeout(r))}:s,this.retry=o}from(e){if(!e||typeof e!=`string`||e.trim()===``)throw Error(`Invalid relation name: relation must be a non-empty string.`);return new ie(new URL(`${this.url}/${e}`),{headers:new Headers(this.headers),schema:this.schemaName,fetch:this.fetch,urlLengthLimit:this.urlLengthLimit,retry:this.retry})}schema(t){return new e(this.url,{headers:this.headers,schema:t,fetch:this.fetch,urlLengthLimit:this.urlLengthLimit,retry:this.retry})}async getOpenApiSpec(){var e=this;let t=new Headers(e.headers);t.set(`Accept`,`application/openapi+json`),e.schemaName&&t.set(`Accept-Profile`,e.schemaName);let n={};t.forEach((e,t)=>{n[t]=e});let r=e.fetch??globalThis.fetch,i;try{i=await C(r,`${e.url}/`,{method:`GET`,headers:n},e.retry??!0)}catch(e){return oe(e,0,``)}let a;try{a=await i.text()}catch(e){return oe(e,i.status,i.statusText)}if(i.ok)try{return{success:!0,error:null,data:JSON.parse(a),count:null,status:i.status,statusText:i.statusText}}catch{}return{success:!1,error:ae(a,i.statusText),data:null,count:null,status:i.status,statusText:i.statusText}}rpc(e,t={},{head:n=!1,get:r=!1,count:i}={}){let a,o=new URL(`${this.url}/rpc/${e}`),s,c=e=>typeof e==`object`&&!!e&&(!Array.isArray(e)||e.some(c)),l=n&&Object.values(t).some(c);l?(a=`POST`,s=t):n||r?(a=n?`HEAD`:`GET`,Object.entries(t).filter(([e,t])=>t!==void 0).map(([e,t])=>[e,Array.isArray(t)?`{${t.join(`,`)}}`:`${t}`]).forEach(([e,t])=>{o.searchParams.append(e,t)})):(a=`POST`,s=t);let u=new Headers(this.headers);return l?u.set(`Prefer`,i?`count=${i},return=minimal`:`return=minimal`):i&&u.set(`Prefer`,`count=${i}`),new w({method:a,url:o,headers:u,schema:this.schemaName,body:s,fetch:this.fetch??fetch,urlLengthLimit:this.urlLengthLimit,retry:this.retry})}},ce=class{constructor(){}static detectEnvironment(){if(typeof WebSocket<`u`)return{type:`native`,wsConstructor:WebSocket};let e=globalThis;if(typeof globalThis<`u`&&e.WebSocket!==void 0)return{type:`native`,wsConstructor:e.WebSocket};let t=typeof global<`u`?global:void 0;if(t&&t.WebSocket!==void 0)return{type:`native`,wsConstructor:t.WebSocket};if(typeof globalThis<`u`&&e.WebSocketPair!==void 0&&globalThis.WebSocket===void 0)return{type:`cloudflare`,error:`Cloudflare Workers detected. WebSocket clients are not supported in Cloudflare Workers.`,workaround:`Use Cloudflare Workers WebSocket API for server-side WebSocket handling, or deploy to a different runtime.`};if(typeof globalThis<`u`&&e.EdgeRuntime||typeof navigator<`u`&&navigator.userAgent?.includes(`Vercel-Edge`))return{type:`unsupported`,error:`Edge runtime detected (Vercel Edge/Netlify Edge). WebSockets are not supported in edge functions.`,workaround:`Use serverless functions or a different deployment target for WebSocket functionality.`};let n=globalThis.process;if(n){let e=n.versions;if(e&&e.node)return{type:`unsupported`,error:`Node.js detected but native WebSocket not found.`,workaround:`Ensure you are running Node.js 22+ or provide a WebSocket implementation via the transport option.`}}return{type:`unsupported`,error:`Unknown JavaScript runtime without WebSocket support.`,workaround:`Ensure you're running in a supported environment (browser, Node.js, Deno) or provide a custom WebSocket implementation.`}}static getWebSocketConstructor(){let e=this.detectEnvironment();if(e.wsConstructor)return e.wsConstructor;let t=e.error||`WebSocket not supported in this environment.`;throw e.workaround&&(t+=`\n\nSuggested solution: ${e.workaround}`),Error(t)}static isWebSocketSupported(){try{return this.detectEnvironment().type===`native`}catch{return!1}}},le=`realtime-js/2.118.0`,ue=`1.0.0`,de=`2.0.0`,fe=de,pe=1e4,me=15e3,he=1e4,ge={closed:`closed`,errored:`errored`,joined:`joined`,joining:`joining`,leaving:`leaving`},_e={close:`phx_close`,error:`phx_error`,join:`phx_join`,reply:`phx_reply`,leave:`phx_leave`,access_token:`access_token`},ve={connecting:`connecting`,open:`open`,closing:`closing`,closed:`closed`},ye=class{constructor(e){this.HEADER_LENGTH=1,this.USER_BROADCAST_PUSH_META_LENGTH=6,this.KINDS={userBroadcastPush:3,userBroadcast:4},this.BINARY_ENCODING=0,this.JSON_ENCODING=1,this.BROADCAST_EVENT=`broadcast`,this.allowedMetadataKeys=[],this.allowedMetadataKeys=e??[]}encode(e,t){if(e.event===this.BROADCAST_EVENT&&!(e.payload instanceof ArrayBuffer)&&typeof e.payload.event==`string`)return t(this._binaryEncodeUserBroadcastPush(e));let n=[e.join_ref,e.ref,e.topic,e.event,e.payload];return t(JSON.stringify(n))}_binaryEncodeUserBroadcastPush(e){return this._isArrayBuffer(e.payload?.payload)?this._encodeBinaryUserBroadcastPush(e):this._encodeJsonUserBroadcastPush(e)}_encodeBinaryUserBroadcastPush(e){let t=e.payload?.payload??new ArrayBuffer(0);return this._encodeUserBroadcastPush(e,this.BINARY_ENCODING,t)}_encodeJsonUserBroadcastPush(e){let t=e.payload?.payload??{},n=new TextEncoder().encode(JSON.stringify(t)).buffer;return this._encodeUserBroadcastPush(e,this.JSON_ENCODING,n)}_encodeUserBroadcastPush(e,t,n){let r=new TextEncoder,i=r.encode(e.topic),a=r.encode(e.ref??``),o=r.encode(e.join_ref??``),s=r.encode(e.payload.event),c=this.allowedMetadataKeys?this._pick(e.payload,this.allowedMetadataKeys):{},l=r.encode(Object.keys(c).length===0?``:JSON.stringify(c));if(o.length>255)throw Error(`joinRef length ${o.length} exceeds maximum of 255`);if(a.length>255)throw Error(`ref length ${a.length} exceeds maximum of 255`);if(i.length>255)throw Error(`topic length ${i.length} exceeds maximum of 255`);if(s.length>255)throw Error(`userEvent length ${s.length} exceeds maximum of 255`);if(l.length>255)throw Error(`metadata length ${l.length} exceeds maximum of 255`);let u=this.USER_BROADCAST_PUSH_META_LENGTH+o.length+a.length+i.length+s.length+l.length,d=new ArrayBuffer(this.HEADER_LENGTH+u),f=new DataView(d),p=new Uint8Array(d),m=0;f.setUint8(m++,this.KINDS.userBroadcastPush),f.setUint8(m++,o.length),f.setUint8(m++,a.length),f.setUint8(m++,i.length),f.setUint8(m++,s.length),f.setUint8(m++,l.length),f.setUint8(m++,t),p.set(o,m),m+=o.length,p.set(a,m),m+=a.length,p.set(i,m),m+=i.length,p.set(s,m),m+=s.length,p.set(l,m),m+=l.length;var h=new Uint8Array(d.byteLength+n.byteLength);return h.set(new Uint8Array(d),0),h.set(new Uint8Array(n),d.byteLength),h.buffer}decode(e,t){if(this._isArrayBuffer(e))return t(this._binaryDecode(e));if(typeof e==`string`){let[n,r,i,a,o]=JSON.parse(e);return t({join_ref:n,ref:r,topic:i,event:a,payload:o})}return t({})}_binaryDecode(e){let t=new DataView(e),n=t.getUint8(0),r=new TextDecoder;switch(n){case this.KINDS.userBroadcast:return this._decodeUserBroadcast(e,t,r)}}_decodeUserBroadcast(e,t,n){let r=t.getUint8(1),i=t.getUint8(2),a=t.getUint8(3),o=t.getUint8(4),s=this.HEADER_LENGTH+4,c=n.decode(e.slice(s,s+r));s+=r;let l=n.decode(e.slice(s,s+i));s+=i;let u=n.decode(e.slice(s,s+a));s+=a;let d=e.slice(s,e.byteLength),f=o===this.JSON_ENCODING?JSON.parse(n.decode(d)):d,p={type:this.BROADCAST_EVENT,event:l,payload:f};return a>0&&(p.meta=JSON.parse(u)),{join_ref:null,ref:null,topic:c,event:this.BROADCAST_EVENT,payload:p}}_isArrayBuffer(e){return e instanceof ArrayBuffer||e?.constructor?.name===`ArrayBuffer`}_pick(e,t){return!e||typeof e!=`object`?{}:Object.fromEntries(Object.entries(e).filter(([e])=>t.includes(e)))}},T;(function(e){e.abstime=`abstime`,e.bool=`bool`,e.date=`date`,e.daterange=`daterange`,e.float4=`float4`,e.float8=`float8`,e.int2=`int2`,e.int4=`int4`,e.int4range=`int4range`,e.int8=`int8`,e.int8range=`int8range`,e.json=`json`,e.jsonb=`jsonb`,e.money=`money`,e.numeric=`numeric`,e.oid=`oid`,e.reltime=`reltime`,e.text=`text`,e.time=`time`,e.timestamp=`timestamp`,e.timestamptz=`timestamptz`,e.timetz=`timetz`,e.tsrange=`tsrange`,e.tstzrange=`tstzrange`})(T||={});var be=(e,t,n={})=>{let r=n.skipTypes??[];return t?Object.keys(t).reduce((n,i)=>(n[i]=xe(i,e,t,r),n),{}):{}},xe=(e,t,n,r)=>{let i=t.find(t=>t.name===e)?.type,a=n[e];return i&&!r.includes(i)?Se(i,a):Ce(a)},Se=(e,t)=>{if(e.charAt(0)===`_`)return De(t,e.slice(1,e.length));switch(e){case T.bool:return we(t);case T.float4:case T.float8:case T.int2:case T.int4:case T.int8:case T.numeric:case T.oid:return Te(t);case T.json:case T.jsonb:return Ee(t);case T.timestamp:return Oe(t);case T.abstime:case T.date:case T.daterange:case T.int4range:case T.int8range:case T.money:case T.reltime:case T.text:case T.time:case T.timestamptz:case T.timetz:case T.tsrange:case T.tstzrange:return Ce(t);default:return Ce(t)}},Ce=e=>e,we=e=>{switch(e){case`t`:return!0;case`f`:return!1;default:return e}},Te=e=>{if(typeof e==`string`){let t=parseFloat(e);if(!Number.isNaN(t))return t}return e},Ee=e=>{if(typeof e==`string`)try{return JSON.parse(e)}catch{return e}return e},De=(e,t)=>{if(typeof e!=`string`)return e;let n=e.length-1,r=e[n];if(e[0]===`{`&&r===`}`){let r,i=e.slice(1,n);try{r=JSON.parse(`[`+i+`]`)}catch{r=i?i.split(`,`):[]}return r.map(e=>Se(t,e))}return e},Oe=e=>typeof e==`string`?e.replace(` `,`T`):e,ke=e=>{let t=new URL(e);return t.protocol=t.protocol.replace(/^ws/i,`http`),t.pathname=t.pathname.replace(/\/+$/,``).replace(/\/socket\/websocket$/i,``).replace(/\/socket$/i,``).replace(/\/websocket$/i,``),t.pathname===``||t.pathname===`/`?t.pathname=`/api/broadcast`:t.pathname+=`/api/broadcast`,t.href},Ae=e=>typeof e==`function`?e:function(){return e},je=typeof self<`u`?self:null,Me=typeof window<`u`?window:null,Ne=je||Me||globalThis,Pe=`2.0.0`,Fe=1e4,Ie=1e3,Le=100,Re={connecting:0,open:1,closing:2,closed:3},E={closed:`closed`,errored:`errored`,joined:`joined`,joining:`joining`,leaving:`leaving`},ze={close:`phx_close`,error:`phx_error`,join:`phx_join`,reply:`phx_reply`,leave:`phx_leave`},Be={longpoll:`longpoll`,websocket:`websocket`},Ve={complete:4},He=`base64url.bearer.phx.`,Ue=class{constructor(e,t,n,r){this.channel=e,this.event=t,this.payload=n||function(){return{}},this.receivedResp=null,this.timeout=r,this.timeoutTimer=null,this.recHooks=[],this.sent=!1,this.ref=void 0}resend(e){this.timeout=e,this.reset(),this.send()}send(){this.hasReceived(`timeout`)||(this.startTimeout(),this.sent=!0,this.channel.socket.push({topic:this.channel.topic,event:this.event,payload:this.payload(),ref:this.ref,join_ref:this.channel.joinRef()}))}receive(e,t){return this.hasReceived(e)&&t(this.receivedResp.response),this.recHooks.push({status:e,callback:t}),this}reset(){this.cancelRefEvent(),this.ref=null,this.refEvent=null,this.receivedResp=null,this.sent=!1}destroy(){this.cancelRefEvent(),this.cancelTimeout()}matchReceive({status:e,response:t,_ref:n}){this.recHooks.filter(t=>t.status===e).forEach(e=>e.callback(t))}cancelRefEvent(){this.refEvent&&this.channel.off(this.refEvent)}cancelTimeout(){clearTimeout(this.timeoutTimer),this.timeoutTimer=null}startTimeout(){this.timeoutTimer&&this.cancelTimeout(),this.ref=this.channel.socket.makeRef(),this.refEvent=this.channel.replyEventName(this.ref),this.channel.on(this.refEvent,e=>{this.cancelRefEvent(),this.cancelTimeout(),this.receivedResp=e,this.matchReceive(e)}),this.timeoutTimer=setTimeout(()=>{this.trigger(`timeout`,{})},this.timeout)}hasReceived(e){return this.receivedResp&&this.receivedResp.status===e}trigger(e,t){this.channel.trigger(this.refEvent,{status:e,response:t})}},We=class{constructor(e,t){this.callback=e,this.timerCalc=t,this.timer=void 0,this.tries=0}reset(){this.tries=0,clearTimeout(this.timer)}scheduleTimeout(){clearTimeout(this.timer),this.timer=setTimeout(()=>{this.tries+=1,this.callback()},this.timerCalc(this.tries+1))}},Ge=class{constructor(e,t,n){this.state=E.closed,this.topic=e,this.params=Ae(t||{}),this.socket=n,this.bindings=[],this.bindingRef=0,this.timeout=this.socket.timeout,this.joinedOnce=!1,this.joinPush=new Ue(this,ze.join,this.params,this.timeout),this.pushBuffer=[],this.stateChangeRefs=[],this.rejoinTimer=new We(()=>{this.socket.isConnected()&&this.rejoin()},this.socket.rejoinAfterMs),this.stateChangeRefs.push(this.socket.onError(()=>this.rejoinTimer.reset())),this.stateChangeRefs.push(this.socket.onOpen(()=>{this.rejoinTimer.reset(),this.isErrored()&&this.rejoin()})),this.joinPush.receive(`ok`,()=>{this.state=E.joined,this.rejoinTimer.reset(),this.pushBuffer.forEach(e=>e.send()),this.pushBuffer=[]}),this.joinPush.receive(`error`,e=>{this.state=E.errored,this.socket.hasLogger()&&this.socket.log(`channel`,`error ${this.topic}`,e),this.socket.isConnected()&&this.rejoinTimer.scheduleTimeout()}),this.onClose(()=>{this.rejoinTimer.reset(),this.socket.hasLogger()&&this.socket.log(`channel`,`close ${this.topic}`),this.state=E.closed,this.socket.remove(this)}),this.onError(e=>{this.socket.hasLogger()&&this.socket.log(`channel`,`error ${this.topic}`,e),this.isJoining()&&this.joinPush.reset(),this.state=E.errored,this.socket.isConnected()&&this.rejoinTimer.scheduleTimeout()}),this.joinPush.receive(`timeout`,()=>{this.socket.hasLogger()&&this.socket.log(`channel`,`timeout ${this.topic}`,this.joinPush.timeout),new Ue(this,ze.leave,Ae({}),this.timeout).send(),this.state=E.errored,this.joinPush.reset(),this.socket.isConnected()&&this.rejoinTimer.scheduleTimeout()}),this.on(ze.reply,(e,t)=>{this.trigger(this.replyEventName(t),e)})}join(e=this.timeout){if(this.joinedOnce)throw Error(`tried to join multiple times. 'join' can only be called a single time per channel instance`);return this.timeout=e,this.joinedOnce=!0,this.rejoin(),this.joinPush}teardown(){this.pushBuffer.forEach(e=>e.destroy()),this.pushBuffer=[],this.rejoinTimer.reset(),this.joinPush.destroy(),this.state=E.closed,this.bindings=[]}onClose(e){this.on(ze.close,e)}onError(e){return this.on(ze.error,t=>e(t))}on(e,t){let n=this.bindingRef++;return this.bindings.push({event:e,ref:n,callback:t}),n}off(e,t){this.bindings=this.bindings.filter(n=>n.event!==e||t!==void 0&&t!==n.ref)}canPush(){return this.socket.isConnected()&&this.isJoined()}push(e,t,n=this.timeout){if(t||={},!this.joinedOnce)throw Error(`tried to push '${e}' to '${this.topic}' before joining. Use channel.join() before pushing events`);let r=new Ue(this,e,function(){return t},n);return this.canPush()?r.send():(r.startTimeout(),this.pushBuffer.push(r)),r}leave(e=this.timeout){this.rejoinTimer.reset(),this.joinPush.cancelTimeout(),this.state=E.leaving;let t=()=>{this.socket.hasLogger()&&this.socket.log(`channel`,`leave ${this.topic}`),this.trigger(ze.close,`leave`)},n=new Ue(this,ze.leave,Ae({}),e);return n.receive(`ok`,()=>t()).receive(`timeout`,()=>t()),n.send(),this.canPush()||n.trigger(`ok`,{}),n}onMessage(e,t,n){return t}filterBindings(e,t,n){return!0}isMember(e,t,n,r){return this.topic===e?r&&r!==this.joinRef()?(this.socket.hasLogger()&&this.socket.log(`channel`,`dropping outdated message`,{topic:e,event:t,payload:n,joinRef:r}),!1):!0:!1}joinRef(){return this.joinPush.ref}rejoin(e=this.timeout){this.isLeaving()||(this.socket.leaveOpenTopic(this.topic),this.state=E.joining,this.joinPush.resend(e))}trigger(e,t,n,r){let i=this.onMessage(e,t,n,r);if(t&&!i)throw Error(`channel onMessage callbacks must return the payload, modified or unmodified`);let a=this.bindings.filter(r=>r.event===e&&this.filterBindings(r,t,n));for(let e=0;e<a.length;e++)a[e].callback(i,n,r||this.joinRef())}replyEventName(e){return`chan_reply_${e}`}isClosed(){return this.state===E.closed}isErrored(){return this.state===E.errored}isJoined(){return this.state===E.joined}isJoining(){return this.state===E.joining}isLeaving(){return this.state===E.leaving}},Ke=class{static request(e,t,n,r,i,a,o){if(Ne.XDomainRequest){let n=new Ne.XDomainRequest;return this.xdomainRequest(n,e,t,r,i,a,o)}if(Ne.XMLHttpRequest){let s=new Ne.XMLHttpRequest;return this.xhrRequest(s,e,t,n,r,i,a,o)}if(Ne.fetch&&Ne.AbortController)return this.fetchRequest(e,t,n,r,i,a,o);throw Error(`No suitable XMLHttpRequest implementation found`)}static fetchRequest(e,t,n,r,i,a,o){let s={method:e,headers:n,body:r},c=null;return i&&(c=new AbortController,setTimeout(()=>c.abort(),i),s.signal=c.signal),Ne.fetch(t,s).then(e=>e.text()).then(e=>this.parseJSON(e)).then(e=>o&&o(e)).catch(e=>{e.name===`AbortError`&&a?a():o&&o(null)}),c}static xdomainRequest(e,t,n,r,i,a,o){return e.timeout=i,e.open(t,n),e.onload=()=>{let t=this.parseJSON(e.responseText);o&&o(t)},a&&(e.ontimeout=a),e.onprogress=()=>{},e.send(r),e}static xhrRequest(e,t,n,r,i,a,o,s){e.open(t,n,!0),e.timeout=a;for(let[t,n]of Object.entries(r))e.setRequestHeader(t,n);return e.onerror=()=>s&&s(null),e.onreadystatechange=()=>{e.readyState===Ve.complete&&s&&s(this.parseJSON(e.responseText))},o&&(e.ontimeout=o),e.send(i),e}static parseJSON(e){if(!e||e===``)return null;try{return JSON.parse(e)}catch{return console&&console.log(`failed to parse JSON response`,e),null}}static serialize(e,t){let n=[];for(var r in e){if(!Object.prototype.hasOwnProperty.call(e,r))continue;let i=t?`${t}[${r}]`:r,a=e[r];typeof a==`object`?n.push(this.serialize(a,i)):n.push(encodeURIComponent(i)+`=`+encodeURIComponent(a))}return n.join(`&`)}static appendParams(e,t){return Object.keys(t).length===0?e:`${e}${e.match(/\?/)?`&`:`?`}${this.serialize(t)}`}},qe=e=>{let t=``,n=new Uint8Array(e),r=n.byteLength;for(let e=0;e<r;e++)t+=String.fromCharCode(n[e]);return btoa(t)},Je=class{constructor(e,t){t&&t.length===2&&t[1].startsWith(He)&&(this.authToken=atob(t[1].slice(He.length))),this.endPoint=null,this.token=null,this.skipHeartbeat=!0,this.reqs=new Set,this.awaitingBatchAck=!1,this.currentBatch=null,this.currentBatchTimer=null,this.batchBuffer=[],this.onopen=function(){},this.onerror=function(){},this.onmessage=function(){},this.onclose=function(){},this.pollEndpoint=this.normalizeEndpoint(e),this.readyState=Re.connecting,setTimeout(()=>this.poll(),0)}normalizeEndpoint(e){return e.replace(`ws://`,`http://`).replace(`wss://`,`https://`).replace(RegExp(`(.*)/`+Be.websocket),`$1/`+Be.longpoll)}endpointURL(){return Ke.appendParams(this.pollEndpoint,{token:this.token})}closeAndRetry(e,t,n){this.close(e,t,n),this.readyState=Re.connecting}ontimeout(){this.onerror(`timeout`),this.closeAndRetry(1005,`timeout`,!1)}isActive(){return this.readyState===Re.open||this.readyState===Re.connecting}poll(){let e={Accept:`application/json`};this.authToken&&(e[`X-Phoenix-AuthToken`]=this.authToken),this.ajax(`GET`,e,null,()=>this.ontimeout(),e=>{if(e){var{status:t,token:n,messages:r}=e;if(t===410&&this.token!==null){this.onerror(410),this.closeAndRetry(3410,`session_gone`,!1);return}this.token=n}else t=0;switch(t){case 200:r.forEach(e=>{setTimeout(()=>this.onmessage({data:e}),0)}),this.poll();break;case 204:this.poll();break;case 410:this.readyState=Re.open,this.onopen({}),this.poll();break;case 403:this.onerror(403),this.close(1008,`forbidden`,!1);break;case 0:case 500:this.onerror(500),this.closeAndRetry(1011,`internal server error`,500);break;default:throw Error(`unhandled poll status ${t}`)}})}send(e){typeof e!=`string`&&(e=qe(e)),this.currentBatch?this.currentBatch.push(e):this.awaitingBatchAck?this.batchBuffer.push(e):(this.currentBatch=[e],this.currentBatchTimer=setTimeout(()=>{this.batchSend(this.currentBatch),this.currentBatch=null},0))}batchSend(e,t=0){this.awaitingBatchAck=!0;let n=t+Le,r=e.slice(t,n);this.ajax(`POST`,{"Content-Type":`application/x-ndjson`},r.join(`
`),()=>this.onerror(`timeout`),t=>{!t||t.status!==200?(this.awaitingBatchAck=!1,this.onerror(t&&t.status),this.closeAndRetry(1011,`internal server error`,!1)):n<e.length?this.batchSend(e,n):this.batchBuffer.length>0?(this.batchSend(this.batchBuffer),this.batchBuffer=[]):this.awaitingBatchAck=!1})}close(e,t,n){for(let e of this.reqs)e.abort();this.readyState=Re.closed;let r=Object.assign({code:1e3,reason:void 0,wasClean:!0},{code:e,reason:t,wasClean:n});this.batchBuffer=[],clearTimeout(this.currentBatchTimer),this.currentBatchTimer=null,typeof CloseEvent<`u`?this.onclose(new CloseEvent(`close`,r)):this.onclose(r)}ajax(e,t,n,r,i){let a;a=Ke.request(e,this.endpointURL(),t,n,this.timeout,()=>{this.reqs.delete(a),r()},e=>{this.reqs.delete(a),this.isActive()&&i(e)}),this.reqs.add(a)}},Ye=class e{constructor(t,n={}){let r=n.events||{state:`presence_state`,diff:`presence_diff`};this.state=Object.create(null),this.pendingDiffs=[],this.channel=t,this.joinRef=null,this.caller={onJoin:function(){},onLeave:function(){},onSync:function(){}},this.channel.on(r.state,t=>{let{onJoin:n,onLeave:r,onSync:i}=this.caller;this.joinRef=this.channel.joinRef(),this.state=e.syncState(this.state,t,n,r),this.pendingDiffs.forEach(t=>{this.state=e.syncDiff(this.state,t,n,r)}),this.pendingDiffs=[],i()}),this.channel.on(r.diff,t=>{let{onJoin:n,onLeave:r,onSync:i}=this.caller;this.inPendingSyncState()?this.pendingDiffs.push(t):(this.state=e.syncDiff(this.state,t,n,r),i())})}onJoin(e){this.caller.onJoin=e}onLeave(e){this.caller.onLeave=e}onSync(e){this.caller.onSync=e}list(t){return e.list(this.state,t)}inPendingSyncState(){return!this.joinRef||this.joinRef!==this.channel.joinRef()}static syncState(e,t,n,r){let i=this.toNullProtoObj(this.clone(e));t=this.toNullProtoObj(t);let a=Object.create(null),o=Object.create(null);return this.map(i,(e,n)=>{t[e]||(o[e]=n)}),this.map(t,(e,t)=>{let n=i[e];if(n){let r=t.metas.map(e=>e.phx_ref),i=n.metas.map(e=>e.phx_ref),s=t.metas.filter(e=>i.indexOf(e.phx_ref)<0),c=n.metas.filter(e=>r.indexOf(e.phx_ref)<0);s.length>0&&(a[e]=t,a[e].metas=s),c.length>0&&(o[e]=this.clone(n),o[e].metas=c)}else a[e]=t}),this.syncDiff(i,{joins:a,leaves:o},n,r)}static syncDiff(e,t,n,r){e=this.toNullProtoObj(e);let{joins:i,leaves:a}=this.clone(t);return n||=function(){},r||=function(){},this.map(i,(t,r)=>{let i=e[t];if(e[t]=this.clone(r),i){let n=e[t].metas.map(e=>e.phx_ref),r=i.metas.filter(e=>n.indexOf(e.phx_ref)<0);e[t].metas.unshift(...r)}n(t,i,r)}),this.map(a,(t,n)=>{let i=e[t];if(!i)return;let a=n.metas.map(e=>e.phx_ref);i.metas=i.metas.filter(e=>a.indexOf(e.phx_ref)<0),r(t,i,n),i.metas.length===0&&delete e[t]}),e}static list(e,t){return t||=function(e,t){return t},this.map(e,(e,n)=>t(e,n))}static map(e,t){return Object.getOwnPropertyNames(e).map(n=>t(n,e[n]))}static toNullProtoObj(e){if(Object.getPrototypeOf(e)===null)return e;let t=Object.create(null);return Object.getOwnPropertyNames(e).forEach(n=>{t[n]=e[n]}),t}static clone(e){return JSON.parse(JSON.stringify(e))}},Xe={HEADER_LENGTH:1,META_LENGTH:4,KINDS:{push:0,reply:1,broadcast:2},encode(e,t){if(e.payload.constructor===ArrayBuffer)return t(this.binaryEncode(e));{let n=[e.join_ref,e.ref,e.topic,e.event,e.payload];return t(JSON.stringify(n))}},decode(e,t){if(e.constructor===ArrayBuffer)return t(this.binaryDecode(e));{let[n,r,i,a,o]=JSON.parse(e);return t({join_ref:n,ref:r,topic:i,event:a,payload:o})}},binaryEncode(e){let{join_ref:t,ref:n,event:r,topic:i,payload:a}=e,o=new TextEncoder,s=o.encode(t),c=o.encode(n),l=o.encode(i),u=o.encode(r);this.assertFieldSize(s.byteLength,`join_ref`),this.assertFieldSize(c.byteLength,`ref`),this.assertFieldSize(l.byteLength,`topic`),this.assertFieldSize(u.byteLength,`event`);let d=this.META_LENGTH+s.byteLength+c.byteLength+l.byteLength+u.byteLength,f=new ArrayBuffer(this.HEADER_LENGTH+d),p=new Uint8Array(f),m=new DataView(f),h=0;m.setUint8(h++,this.KINDS.push),m.setUint8(h++,s.byteLength),m.setUint8(h++,c.byteLength),m.setUint8(h++,l.byteLength),m.setUint8(h++,u.byteLength),p.set(s,h),h+=s.byteLength,p.set(c,h),h+=c.byteLength,p.set(l,h),h+=l.byteLength,p.set(u,h),h+=u.byteLength;var g=new Uint8Array(f.byteLength+a.byteLength);return g.set(p,0),g.set(new Uint8Array(a),f.byteLength),g.buffer},assertFieldSize(e,t){if(e>255)throw Error(`unable to convert ${t} to binary: must be less than or equal to 255 bytes, but is ${e} bytes`)},binaryDecode(e){let t=new DataView(e),n=t.getUint8(0),r=new TextDecoder;switch(n){case this.KINDS.push:return this.decodePush(e,t,r);case this.KINDS.reply:return this.decodeReply(e,t,r);case this.KINDS.broadcast:return this.decodeBroadcast(e,t,r)}},decodePush(e,t,n){let r=t.getUint8(1),i=t.getUint8(2),a=t.getUint8(3),o=this.HEADER_LENGTH+this.META_LENGTH-1,s=n.decode(e.slice(o,o+r));o+=r;let c=n.decode(e.slice(o,o+i));o+=i;let l=n.decode(e.slice(o,o+a));return o+=a,{join_ref:s,ref:null,topic:c,event:l,payload:e.slice(o,e.byteLength)}},decodeReply(e,t,n){let r=t.getUint8(1),i=t.getUint8(2),a=t.getUint8(3),o=t.getUint8(4),s=this.HEADER_LENGTH+this.META_LENGTH,c=n.decode(e.slice(s,s+r));s+=r;let l=n.decode(e.slice(s,s+i));s+=i;let u=n.decode(e.slice(s,s+a));s+=a;let d=n.decode(e.slice(s,s+o));s+=o;let f={status:d,response:e.slice(s,e.byteLength)};return{join_ref:c,ref:l,topic:u,event:ze.reply,payload:f}},decodeBroadcast(e,t,n){let r=t.getUint8(1),i=t.getUint8(2),a=this.HEADER_LENGTH+2,o=n.decode(e.slice(a,a+r));a+=r;let s=n.decode(e.slice(a,a+i));return a+=i,{join_ref:null,ref:null,topic:o,event:s,payload:e.slice(a,e.byteLength)}}},Ze=class{constructor(e,t={}){this.stateChangeCallbacks={open:[],close:[],error:[],message:[]},this.channels=[],this.sendBuffer=[],this.ref=0,this.fallbackRef=null,this.timeout=t.timeout||Fe,this.transport=t.transport||Ne.WebSocket||Je,this.conn=void 0,this.primaryPassedHealthCheck=!1,this.longPollFallbackMs=t.longPollFallbackMs,this.fallbackTimer=null;let n=null;try{n=Ne&&Ne.sessionStorage}catch{}this.sessionStore=t.sessionStorage||n,this.establishedConnections=0,this.defaultEncoder=Xe.encode.bind(Xe),this.defaultDecoder=Xe.decode.bind(Xe),this.closeWasClean=!0,this.disconnecting=!1,this.binaryType=t.binaryType||`arraybuffer`,this.connectClock=1,this.pageHidden=!1,this.encode=void 0,this.decode=void 0,this.transport===Je?(this.encode=this.defaultEncoder,this.decode=this.defaultDecoder):(this.encode=t.encode||this.defaultEncoder,this.decode=t.decode||this.defaultDecoder);let r=null;Me&&Me.addEventListener&&(Me.addEventListener(`pagehide`,e=>{this.conn&&(this.disconnect(),r=this.connectClock)}),Me.addEventListener(`pageshow`,e=>{r===this.connectClock&&(r=null,this.connect())}),Me.addEventListener(`visibilitychange`,()=>{document.visibilityState===`hidden`?this.pageHidden=!0:(this.pageHidden=!1,!this.isConnected()&&!this.closeWasClean&&this.teardown(()=>this.connect()))})),this.heartbeatIntervalMs=t.heartbeatIntervalMs||3e4,this.autoSendHeartbeat=t.autoSendHeartbeat??!0,this.heartbeatCallback=t.heartbeatCallback??(()=>{}),this.rejoinAfterMs=e=>t.rejoinAfterMs?t.rejoinAfterMs(e):[1e3,2e3,5e3][e-1]||1e4,this.reconnectAfterMs=e=>t.reconnectAfterMs?t.reconnectAfterMs(e):[10,50,100,150,200,250,500,1e3,2e3][e-1]||5e3,this.logger=t.logger||null,!this.logger&&t.debug&&(this.logger=(e,t,n)=>{console.log(`${e}: ${t}`,n)}),this.longpollerTimeout=t.longpollerTimeout||2e4,this.params=Ae(t.params||{}),this.endPoint=`${e}/${Be.websocket}`,this.vsn=t.vsn||Pe,this.heartbeatTimeoutTimer=null,this.heartbeatTimer=null,this.heartbeatSentAt=null,this.pendingHeartbeatRef=null,this.reconnectTimer=new We(()=>{this.pageHidden?(this.log(`Not reconnecting as page is hidden!`),this.teardown()):this.teardown(async()=>{t.beforeReconnect&&await t.beforeReconnect(),this.connect()})},this.reconnectAfterMs),this.authToken=t.authToken&&Ae(t.authToken)}getLongPollTransport(){return Je}replaceTransport(e){this.connectClock++,this.closeWasClean=!0,clearTimeout(this.fallbackTimer),this.reconnectTimer.reset(),this.conn&&=(this.conn.close(),null),this.transport=e}protocol(){return location.protocol.match(/^https/)?`wss`:`ws`}endPointURL(){let e=Ke.appendParams(Ke.appendParams(this.endPoint,this.params()),{vsn:this.vsn});return e.charAt(0)===`/`?e.charAt(1)===`/`?`${this.protocol()}:${e}`:`${this.protocol()}://${location.host}${e}`:e}disconnect(e,t,n){this.connectClock++,this.disconnecting=!0,this.closeWasClean=!0,clearTimeout(this.fallbackTimer),this.reconnectTimer.reset(),this.teardown(()=>{this.disconnecting=!1,e&&e()},t,n)}connect(e){e&&(console&&console.log(`passing params to connect is deprecated. Instead pass :params to the Socket constructor`),this.params=Ae(e)),(!this.conn||this.disconnecting)&&(this.longPollFallbackMs&&this.transport!==Je?this.connectWithFallback(Je,this.longPollFallbackMs):this.transportConnect())}log(e,t,n){this.logger&&this.logger(e,t,n)}hasLogger(){return this.logger!==null}onOpen(e){let t=this.makeRef();return this.stateChangeCallbacks.open.push([t,e]),t}onClose(e){let t=this.makeRef();return this.stateChangeCallbacks.close.push([t,e]),t}onError(e){let t=this.makeRef();return this.stateChangeCallbacks.error.push([t,e]),t}onMessage(e){let t=this.makeRef();return this.stateChangeCallbacks.message.push([t,e]),t}onHeartbeat(e){this.heartbeatCallback=e}ping(e){if(!this.isConnected())return!1;let t=this.makeRef(),n=Date.now();this.push({topic:`phoenix`,event:`heartbeat`,payload:{},ref:t});let r=this.onMessage(i=>{i.ref===t&&(this.off([r]),e(Date.now()-n))});return!0}transportName(e){switch(e){case Je:return`LongPoll`;default:return e.name}}transportConnect(){this.connectClock++,this.closeWasClean=!1;let e;this.authToken&&(e=[`phoenix`,`${He}${btoa(this.authToken()).replace(/=/g,``)}`]),this.conn=new this.transport(this.endPointURL(),e),this.conn.binaryType=this.binaryType,this.conn.timeout=this.longpollerTimeout,this.conn.onopen=()=>this.onConnOpen(),this.conn.onerror=e=>this.onConnError(e),this.conn.onmessage=e=>this.onConnMessage(e),this.conn.onclose=e=>this.onConnClose(e)}getSession(e){return this.sessionStore&&this.sessionStore.getItem(e)}storeSession(e,t){this.sessionStore&&this.sessionStore.setItem(e,t)}connectWithFallback(e,t=2500){clearTimeout(this.fallbackTimer);let n=!1,r=!0,i,a,o=this.transportName(e),s=t=>{this.log(`transport`,`falling back to ${o}...`,t),this.off([i,a]),r=!1,this.replaceTransport(e),this.transportConnect()};if(this.getSession(`phx:fallback:${o}`))return s(`memorized`);this.fallbackTimer=setTimeout(s,t),a=this.onError(e=>{this.log(`transport`,`error`,e),r&&!n&&(clearTimeout(this.fallbackTimer),s(e))}),this.fallbackRef&&this.off([this.fallbackRef]),this.fallbackRef=this.onOpen(()=>{if(n=!0,!r){let t=this.transportName(e);return this.primaryPassedHealthCheck||this.storeSession(`phx:fallback:${t}`,`true`),this.log(`transport`,`established ${t} fallback`)}clearTimeout(this.fallbackTimer),this.fallbackTimer=setTimeout(s,t),this.ping(e=>{this.log(`transport`,`connected to primary after`,e),this.primaryPassedHealthCheck=!0,clearTimeout(this.fallbackTimer)})}),this.transportConnect()}clearHeartbeats(){clearTimeout(this.heartbeatTimer),clearTimeout(this.heartbeatTimeoutTimer)}onConnOpen(){this.hasLogger()&&this.log(`transport`,`connected to ${this.endPointURL()}`),this.closeWasClean=!1,this.disconnecting=!1,this.establishedConnections++,this.flushSendBuffer(),this.reconnectTimer.reset(),this.autoSendHeartbeat&&this.resetHeartbeat(),this.triggerStateCallbacks(`open`)}heartbeatTimeout(){if(this.pendingHeartbeatRef){this.pendingHeartbeatRef=null,this.heartbeatSentAt=null,this.hasLogger()&&this.log(`transport`,`heartbeat timeout. Attempting to re-establish connection`);try{this.heartbeatCallback(`timeout`)}catch(e){this.log(`error`,`error in heartbeat callback`,e)}this.triggerChanError(Error(`heartbeat timeout`)),this.closeWasClean=!1,this.teardown(()=>this.reconnectTimer.scheduleTimeout(),Ie,`heartbeat timeout`)}}resetHeartbeat(){this.conn&&this.conn.skipHeartbeat||(this.pendingHeartbeatRef=null,this.clearHeartbeats(),this.heartbeatTimer=setTimeout(()=>this.sendHeartbeat(),this.heartbeatIntervalMs))}teardown(e,t,n){if(!this.conn)return e&&e();let r=this.conn;this.waitForBufferDone(r,()=>{t?r.close(t,n||``):r.close(),this.waitForSocketClosed(r,()=>{this.conn===r&&(this.conn.onopen=function(){},this.conn.onerror=function(){},this.conn.onmessage=function(){},this.conn.onclose=function(){},this.conn=null),e&&e()})})}waitForBufferDone(e,t,n=1){n===5||!e.bufferedAmount?t():setTimeout(()=>{this.waitForBufferDone(e,t,n+1)},150*n)}waitForSocketClosed(e,t,n=1){n===5||e.readyState===Re.closed?t():setTimeout(()=>{this.waitForSocketClosed(e,t,n+1)},150*n)}onConnClose(e){this.conn&&(this.conn.onclose=()=>{}),this.hasLogger()&&this.log(`transport`,`close`,e),this.triggerChanError(e),this.clearHeartbeats(),this.closeWasClean||this.reconnectTimer.scheduleTimeout(),this.triggerStateCallbacks(`close`,e)}onConnError(e){this.hasLogger()&&this.log(`transport`,`error`,e);let t=this.transport,n=this.establishedConnections;this.triggerStateCallbacks(`error`,e,t,n),(t===this.transport||n>0)&&this.triggerChanError(e)}triggerChanError(e){this.channels.forEach(t=>{t.isErrored()||t.isLeaving()||t.isClosed()||t.trigger(ze.error,e)})}connectionState(){switch(this.conn&&this.conn.readyState){case Re.connecting:return`connecting`;case Re.open:return`open`;case Re.closing:return`closing`;default:return`closed`}}isConnected(){return this.connectionState()===`open`}remove(e){this.off(e.stateChangeRefs),this.channels=this.channels.filter(t=>t!==e)}off(e){for(let t in this.stateChangeCallbacks)this.stateChangeCallbacks[t]=this.stateChangeCallbacks[t].filter(([t])=>e.indexOf(t)===-1)}channel(e,t={}){let n=new Ge(e,t,this);return this.channels.push(n),n}push(e){if(this.hasLogger()){let{topic:t,event:n,payload:r,ref:i,join_ref:a}=e;this.log(`push`,`${t} ${n} (${a}, ${i})`,r)}this.isConnected()?this.encode(e,e=>this.conn.send(e)):this.sendBuffer.push(()=>this.encode(e,e=>this.conn.send(e)))}makeRef(){let e=this.ref+1;return this.ref=e===this.ref?0:e,this.ref.toString()}sendHeartbeat(){if(!this.isConnected())try{this.heartbeatCallback(`disconnected`)}catch(e){this.log(`error`,`error in heartbeat callback`,e)}else if(this.pendingHeartbeatRef)this.heartbeatTimeout();else{this.pendingHeartbeatRef=this.makeRef(),this.heartbeatSentAt=Date.now(),this.push({topic:`phoenix`,event:`heartbeat`,payload:{},ref:this.pendingHeartbeatRef});try{this.heartbeatCallback(`sent`)}catch(e){this.log(`error`,`error in heartbeat callback`,e)}this.heartbeatTimeoutTimer=setTimeout(()=>this.heartbeatTimeout(),this.heartbeatIntervalMs)}}flushSendBuffer(){this.isConnected()&&this.sendBuffer.length>0&&(this.sendBuffer.forEach(e=>e()),this.sendBuffer=[])}onConnMessage(e){this.decode(e.data,e=>{let{topic:t,event:n,payload:r,ref:i,join_ref:a}=e;if(i&&i===this.pendingHeartbeatRef){let e=this.heartbeatSentAt?Date.now()-this.heartbeatSentAt:void 0;this.clearHeartbeats();try{this.heartbeatCallback(r.status===`ok`?`ok`:`error`,e)}catch(e){this.log(`error`,`error in heartbeat callback`,e)}this.pendingHeartbeatRef=null,this.heartbeatSentAt=null,this.autoSendHeartbeat&&(this.heartbeatTimer=setTimeout(()=>this.sendHeartbeat(),this.heartbeatIntervalMs))}this.hasLogger()&&this.log(`receive`,`${r.status||``} ${t} ${n} ${i&&`(`+i+`)`||``}`.trim(),r);for(let e=0;e<this.channels.length;e++){let o=this.channels[e];o.isMember(t,n,r,a)&&o.trigger(n,r,i,a)}this.triggerStateCallbacks(`message`,e)})}triggerStateCallbacks(e,...t){try{this.stateChangeCallbacks[e].forEach(([n,r])=>{try{r(...t)}catch(t){this.log(`error`,`error in ${e} callback`,t)}})}catch(t){this.log(`error`,`error triggering ${e} callbacks`,t)}}leaveOpenTopic(e){let t=this.channels.find(t=>t.topic===e&&(t.isJoined()||t.isJoining()));t&&(this.hasLogger()&&this.log(`transport`,`leaving duplicate topic "${e}"`),t.leave())}},Qe=class e{constructor(t,n){let r=tt(n);this.presence=new Ye(t.getChannel(),r),this.presence.onJoin((n,r,i)=>{let a=e.onJoinPayload(n,r,i);t.getChannel().trigger(`presence`,a)}),this.presence.onLeave((n,r,i)=>{let a=e.onLeavePayload(n,r,i);t.getChannel().trigger(`presence`,a)}),this.presence.onSync(()=>{t.getChannel().trigger(`presence`,{event:`sync`})})}get state(){return e.transformState(this.presence.state)}static transformState(e){return e=et(e),Object.getOwnPropertyNames(e).reduce((t,n)=>{let r=e[n];return t[n]=$e(r),t},{})}static onJoinPayload(e,t,n){return{event:`join`,key:e,currentPresences:nt(t),newPresences:$e(n)}}static onLeavePayload(e,t,n){return{event:`leave`,key:e,currentPresences:nt(t),leftPresences:$e(n)}}};function $e(e){return e.metas.map(e=>{let t=Object.getOwnPropertyDescriptors(e),n=Object.defineProperties({},t);return n.presence_ref=n.phx_ref,delete n.phx_ref,delete n.phx_ref_prev,n})}function et(e){return JSON.parse(JSON.stringify(e))}function tt(e){return e?.events&&{events:e.events}}function nt(e){return e?.metas?$e(e):[]}var rt;(function(e){e.SYNC=`sync`,e.JOIN=`join`,e.LEAVE=`leave`})(rt||={});var it=class{get state(){return this.presenceAdapter.state}constructor(e,t){this.channel=e,this.presenceAdapter=new Qe(this.channel.channelAdapter,t)}};function at(e){if(e instanceof Error)return e;if(typeof e==`string`)return Error(e);if(e&&typeof e==`object`){let t=e;if(typeof t.code==`number`){let n=typeof t.reason==`string`&&t.reason?` (${t.reason})`:``;return Error(`socket closed: ${t.code}${n}`,{cause:e})}return Error(`channel error: transport failure`,{cause:e})}return Error(`channel error: connection lost`)}var ot=class{constructor(e,t,n){let r=st(n);this.channel=e.getSocket().channel(t,r),this.socket=e}get state(){return this.channel.state}set state(e){this.channel.state=e}get joinedOnce(){return this.channel.joinedOnce}get joinPush(){return this.channel.joinPush}get rejoinTimer(){return this.channel.rejoinTimer}on(e,t){return this.channel.on(e,t)}off(e,t){this.channel.off(e,t)}subscribe(e){return this.channel.join(e)}unsubscribe(e){return this.channel.leave(e)}teardown(){this.channel.teardown()}onClose(e){this.channel.onClose(e)}onError(e){return this.channel.onError(e)}push(e,t,n){let r;try{r=this.channel.push(e,t,n)}catch{throw Error(`tried to push '${e}' to '${this.channel.topic}' before joining. Use channel.subscribe() before pushing events`)}if(this.channel.pushBuffer.length>100){let e=this.channel.pushBuffer.shift();e.cancelTimeout(),this.socket.log(`channel`,`discarded push due to buffer overflow: ${e.event}`,e.payload())}return r}updateJoinPayload(e){let t=this.channel.joinPush.payload();this.channel.joinPush.payload=()=>Object.assign(Object.assign({},t),e)}canPush(){return this.socket.isConnected()&&this.state===ge.joined}isJoined(){return this.state===ge.joined}isJoining(){return this.state===ge.joining}isClosed(){return this.state===ge.closed}isLeaving(){return this.state===ge.leaving}updateFilterBindings(e){this.channel.filterBindings=e}updatePayloadTransform(e){this.channel.onMessage=e}getChannel(){return this.channel}};function st(e){return{config:Object.assign({broadcast:{ack:!1,self:!1},presence:{key:``,enabled:!1},private:!1},e.config)}}var ct=/[,()"\\]/,lt=e=>ct.test(e)||e!==e.trim(),ut=e=>`"${e.replace(/\\/g,`\\\\`).replace(/"/g,`\\"`)}"`,dt=e=>{let t=e===null?`null`:String(e);return lt(t)?ut(t):t},ft=e=>e===null?`null`:String(e),pt=(e,t)=>{if(e===`in`){let e=Array.isArray(t)?t:[t];if(e.length===0)throw Error("Realtime `in` filter requires at least one value.");return`in.(${Array.from(new Set(e)).map(e=>dt(e)).join(`,`)})`}return e===`is`?`is.${ft(t)}`:`${e}.${dt(t)}`},mt=class{constructor(){this.filters=[]}add(e,t,n,r=!1){let i=r?`not.`:``;return this.filters.push(`${e}=${i}${pt(t,n)}`),this}eq(e,t){return this.add(e,`eq`,t)}neq(e,t){return this.add(e,`neq`,t)}gt(e,t){return this.add(e,`gt`,t)}gte(e,t){return this.add(e,`gte`,t)}lt(e,t){return this.add(e,`lt`,t)}lte(e,t){return this.add(e,`lte`,t)}in(e,t){return this.add(e,`in`,t)}like(e,t){return this.add(e,`like`,t)}ilike(e,t){return this.add(e,`ilike`,t)}match(e,t){return this.add(e,`match`,t)}imatch(e,t){return this.add(e,`imatch`,t)}is(e,t){return this.add(e,`is`,t)}isDistinct(e,t){return this.add(e,`isdistinct`,t)}not(e,t,n){return this.add(e,t,n,!0)}build(){return this.filters.join(`,`)}toString(){return this.build()}},ht;(function(e){e.ALL=`*`,e.INSERT=`INSERT`,e.UPDATE=`UPDATE`,e.DELETE=`DELETE`})(ht||={});var gt;(function(e){e.BROADCAST=`broadcast`,e.PRESENCE=`presence`,e.POSTGRES_CHANGES=`postgres_changes`,e.SYSTEM=`system`})(gt||={});var _t;(function(e){e.SUBSCRIBED=`SUBSCRIBED`,e.TIMED_OUT=`TIMED_OUT`,e.CLOSED=`CLOSED`,e.CHANNEL_ERROR=`CHANNEL_ERROR`})(_t||={});var vt=class e{get state(){return this.channelAdapter.state}set state(e){this.channelAdapter.state=e}get joinedOnce(){return this.channelAdapter.joinedOnce}get timeout(){return this.socket.timeout}get joinPush(){return this.channelAdapter.joinPush}get rejoinTimer(){return this.channelAdapter.rejoinTimer}constructor(e,t={config:{}},n){if(this.topic=e,this.params=t,this.socket=n,this.bindings={},this.subTopic=e.replace(/^realtime:/i,``),this.params.config=Object.assign({broadcast:{ack:!1,self:!1},presence:{key:``,enabled:!1},private:!1},t.config),this.channelAdapter=new ot(this.socket.socketAdapter,e,this.params),this.presence=new it(this),this._onClose(()=>{this.socket._remove(this)}),this._updateFilterTransform(),this.broadcastEndpointURL=ke(this.socket.socketAdapter.endPointURL()),this.private=this.params.config.private||!1,!this.private&&this.params.config?.broadcast?.replay)throw Error(`tried to use replay on public channel '${this.topic}'. It must be a private channel.`)}subscribe(e,t=this.timeout){if(this.socket.isConnected()||this.socket.connect(),this.channelAdapter.isClosed()){let{config:{broadcast:n,presence:r,private:i,postgres_changes_options:a}}=this.params,o=this.bindings.postgres_changes?.map(e=>e.filter)??[],s=!!this.bindings[gt.PRESENCE]&&this.bindings[gt.PRESENCE].length>0||this.params.config.presence?.enabled===!0,c={},l=Object.assign({broadcast:n,presence:Object.assign(Object.assign({},r),{enabled:s}),postgres_changes:o,private:i},a?{postgres_changes_options:a}:{});this.socket.accessTokenValue&&(c.access_token=this.socket.accessTokenValue),this._onError(t=>{e?.(_t.CHANNEL_ERROR,at(t))}),this._onClose(()=>e?.(_t.CLOSED)),this.updateJoinPayload(Object.assign({config:l},c)),this._updateFilterMessage();let u=a?.wait&&o.length>0?Math.max(t,(a.timeout??me)+he):t;this.channelAdapter.subscribe(u).receive(`ok`,async({postgres_changes:t})=>{this.socket._isManualToken()||this.socket.setAuth(),t===void 0?e?.(_t.SUBSCRIBED):this._updatePostgresBindings(t,e)}).receive(`error`,t=>{this.state=ge.errored;let n=Object.values(t).join(`, `)||`error`;e?.(_t.CHANNEL_ERROR,Error(n,{cause:t}))}).receive(`timeout`,()=>{e?.(_t.TIMED_OUT)})}return this}_updatePostgresBindings(t,n){let r=this.bindings.postgres_changes,i=r?.length??0,a=[];for(let o=0;o<i;o++){let i=r[o],{filter:{event:s,schema:c,table:l,filter:u}}=i,d=t&&t[o];if(d&&d.event===s&&e.isFilterValueEqual(d.schema,c)&&e.isFilterValueEqual(d.table,l)&&e.isFilterValueEqual(d.filter,u))a.push(Object.assign(Object.assign({},i),{id:d.id}));else{this.unsubscribe(),this.state=ge.errored,n?.(_t.CHANNEL_ERROR,Error(`mismatch between server and client bindings for postgres changes`));return}}this.bindings.postgres_changes=a,this.state!=ge.errored&&n&&n(_t.SUBSCRIBED)}presenceState(){return this.presence.state}async track(e,t={}){return await this.send({type:`presence`,event:`track`,payload:e},t)}async untrack(e={}){return await this.send({type:`presence`,event:`untrack`},e)}on(e,t,n){let r=this.channelAdapter.isJoined()||this.channelAdapter.isJoining(),i=e===gt.PRESENCE||e===gt.POSTGRES_CHANGES;if(r&&i)throw this.socket.log(`channel`,`cannot add \`${e}\` callbacks for ${this.topic} after \`subscribe()\`.`),Error(`cannot add \`${e}\` callbacks for ${this.topic} after \`subscribe()\`.`);return this._on(e,t,n)}async httpSend(e,t,n={}){if(t==null)return Promise.reject(Error(`Payload is required for httpSend()`));let r=t instanceof ArrayBuffer||ArrayBuffer.isView(t),i={apikey:this.socket.apiKey?this.socket.apiKey:``,"Content-Type":r?`application/octet-stream`:`application/json`};this.socket.accessTokenValue&&(i.Authorization=`Bearer ${this.socket.accessTokenValue}`);let a=new URL(this.broadcastEndpointURL);a.pathname+=`/${encodeURIComponent(this.subTopic)}/events/${encodeURIComponent(e)}`,this.private&&a.searchParams.set(`private`,`true`);let o={method:`POST`,headers:i,body:r?t:JSON.stringify(t)},s=await this._fetchWithTimeout(a.toString(),o,n.timeout??this.timeout);if(s.status===202)return{success:!0};if(s.status===404)return Promise.reject(Error(`httpSend() requires Realtime server v2.97.0 or newer; the endpoint returned 404. Update your Supabase CLI to a recent version, or upgrade the Realtime server in your self-hosted setup. See https://github.com/supabase/supabase-js/blob/master/packages/core/realtime-js/migrations/httpsend-server-version.md`));let c=s.statusText;try{let e=await s.json();c=e.error||e.message||c}catch{}return Promise.reject(Error(c))}async send(e,t={}){if(!this.channelAdapter.canPush()&&e.type===`broadcast`){let n=`Realtime send() is automatically falling back to REST API. This behavior will be deprecated in the future. Please use httpSend() explicitly for REST delivery.`;this.socket.hasLogger()?this.socket.log(`channel`,n):console.warn(n);let{event:r,payload:i}=e,a={apikey:this.socket.apiKey?this.socket.apiKey:``,"Content-Type":`application/json`};this.socket.accessTokenValue&&(a.Authorization=`Bearer ${this.socket.accessTokenValue}`);let o={method:`POST`,headers:a,body:JSON.stringify({messages:[{topic:this.subTopic,event:r,payload:i,private:this.private}]})};try{let e=await this._fetchWithTimeout(this.broadcastEndpointURL,o,t.timeout??this.timeout);return await e.body?.cancel(),e.ok?`ok`:`error`}catch(e){return e instanceof Error&&e.name===`AbortError`?`timed out`:`error`}}return new Promise(n=>{let r=this.channelAdapter.push(e.type,e,t.timeout||this.timeout);e.type===`broadcast`&&!this.params?.config?.broadcast?.ack&&n(`ok`),r.receive(`ok`,()=>n(`ok`)),r.receive(`error`,()=>n(`error`)),r.receive(`timeout`,()=>n(`timed out`))})}updateJoinPayload(e){this.channelAdapter.updateJoinPayload(e)}async unsubscribe(e=this.timeout){return new Promise(t=>{this.channelAdapter.unsubscribe(e).receive(`ok`,()=>t(`ok`)).receive(`timeout`,()=>t(`timed out`)).receive(`error`,()=>t(`error`))})}teardown(){this.channelAdapter.teardown()}async _fetchWithTimeout(e,t,n){let r=new AbortController,i=setTimeout(()=>r.abort(),n),a=await this.socket.fetch(e,Object.assign(Object.assign({},t),{signal:r.signal}));return clearTimeout(i),a}_on(t,n,r){let i=t.toLocaleLowerCase(),a=n?.filter;if((a instanceof mt||typeof a==`object`&&a&&typeof a.build==`function`)&&(n=Object.assign(Object.assign({},n),{filter:a.build()})),i===gt.POSTGRES_CHANGES&&this.bindings[i]?.find(t=>e.isSamePostgresFilter(t.filter,n)))return this.socket.log(`error`,`duplicate \`postgres_changes\` binding for ${this.topic} ignored`,n),this;let o=this.channelAdapter.on(t,r),s={type:i,filter:n,callback:r,ref:o};return this.bindings[i]?this.bindings[i].push(s):this.bindings[i]=[s],this._updateFilterMessage(),this}_onClose(e){this.channelAdapter.onClose(e)}_onError(e){this.channelAdapter.onError(e)}_updateFilterMessage(){this.channelAdapter.updateFilterBindings((e,t,n)=>{let r=e.event.toLocaleLowerCase();if(this._notThisChannelEvent(r,n))return!1;let i=this.bindings[r]?.find(t=>t.ref===e.ref);if(!i)return!0;if([`broadcast`,`presence`,`postgres_changes`].includes(r)){if(`id`in i){let e=i.id,n=i.filter?.event;return e&&t.ids?.includes(e)&&(n===`*`||n?.toLocaleLowerCase()===t.data?.type.toLocaleLowerCase())}{let e=(i?.filter?.event)?.toLocaleLowerCase();return e===`*`||e===(t?.event)?.toLocaleLowerCase()}}return i.type.toLocaleLowerCase()===r})}_notThisChannelEvent(e,t){let{close:n,error:r,leave:i,join:a}=_e;return t&&[n,r,i,a].includes(e)&&t!==this.joinPush.ref}_updateFilterTransform(){this.channelAdapter.updatePayloadTransform((e,t,n)=>{if(typeof t==`object`&&`ids`in t){let e=t.data,{schema:n,table:r,commit_timestamp:i,type:a,errors:o}=e;return Object.assign(Object.assign({},{schema:n,table:r,commit_timestamp:i,eventType:a,new:{},old:{},errors:o}),this._getPayloadRecords(e))}return t})}copyBindings(e){if(this.joinedOnce)throw Error(`cannot copy bindings into joined channel`);for(let t in e.bindings)for(let n of e.bindings[t])this._on(n.type,n.filter,n.callback)}static isFilterValueEqual(e,t){return(e??void 0)===(t??void 0)}static isSamePostgresFilter(t,n){let r=(t?.select)?.join()??void 0,i=(n?.select)?.join()??void 0;return t?.event===n?.event&&e.isFilterValueEqual(t?.schema,n?.schema)&&e.isFilterValueEqual(t?.table,n?.table)&&e.isFilterValueEqual(t?.filter,n?.filter)&&r===i}_getPayloadRecords(e){let t={new:{},old:{}};return(e.type===`INSERT`||e.type===`UPDATE`)&&(t.new=be(e.columns,e.record)),(e.type===`UPDATE`||e.type===`DELETE`)&&(t.old=be(e.columns,e.old_record)),t}},yt=class{constructor(e,t){this.socket=new Ze(e,t)}get timeout(){return this.socket.timeout}get endPoint(){return this.socket.endPoint}get transport(){return this.socket.transport}get heartbeatIntervalMs(){return this.socket.heartbeatIntervalMs}get heartbeatCallback(){return this.socket.heartbeatCallback}set heartbeatCallback(e){this.socket.heartbeatCallback=e}get heartbeatTimer(){return this.socket.heartbeatTimer}get pendingHeartbeatRef(){return this.socket.pendingHeartbeatRef}get reconnectTimer(){return this.socket.reconnectTimer}get vsn(){return this.socket.vsn}get encode(){return this.socket.encode}get decode(){return this.socket.decode}get reconnectAfterMs(){return this.socket.reconnectAfterMs}get sendBuffer(){return this.socket.sendBuffer}get stateChangeCallbacks(){return this.socket.stateChangeCallbacks}connect(){this.socket.connect()}disconnect(e,t,n,r=1e4){return new Promise(i=>{setTimeout(()=>i(`timeout`),r),this.socket.disconnect(()=>{e(),i(`ok`)},t,n)})}push(e){this.socket.push(e)}log(e,t,n){this.socket.log(e,t,n)}hasLogger(){return this.socket.hasLogger()}makeRef(){return this.socket.makeRef()}onOpen(e){this.socket.onOpen(e)}onClose(e){this.socket.onClose(e)}onError(e){this.socket.onError(e)}onMessage(e){this.socket.onMessage(e)}isConnected(){return this.socket.isConnected()}isConnecting(){return this.socket.connectionState()==ve.connecting}isDisconnecting(){return this.socket.connectionState()==ve.closing}connectionState(){return this.socket.connectionState()}endPointURL(){return this.socket.endPointURL()}sendHeartbeat(){this.socket.sendHeartbeat()}getSocket(){return this.socket}},bt={HEARTBEAT_INTERVAL:25e3,RECONNECT_DELAY:10,HEARTBEAT_TIMEOUT_FALLBACK:100},xt=[1e3,2e3,5e3,1e4],St=1e4;function Ct(){let e=new Map;return{get length(){return e.size},clear(){e.clear()},getItem(t){return e.has(t)?e.get(t):null},key(t){return Array.from(e.keys())[t]??null},removeItem(t){e.delete(t)},setItem(t,n){e.set(t,String(n))}}}function wt(){try{if(typeof globalThis<`u`&&globalThis.sessionStorage)return globalThis.sessionStorage}catch{}return Ct()}var Tt=`
  addEventListener("message", (e) => {
    if (e.data.event === "start") {
      setInterval(() => postMessage({ event: "keepAlive" }), e.data.interval);
    }
  });`,Et=class{get endPoint(){return this.socketAdapter.endPoint}get timeout(){return this.socketAdapter.timeout}get transport(){return this.socketAdapter.transport}get heartbeatCallback(){return this.socketAdapter.heartbeatCallback}get heartbeatIntervalMs(){return this.socketAdapter.heartbeatIntervalMs}get heartbeatTimer(){return this.worker?this._workerHeartbeatTimer:this.socketAdapter.heartbeatTimer}get pendingHeartbeatRef(){return this.worker?this._pendingWorkerHeartbeatRef:this.socketAdapter.pendingHeartbeatRef}get reconnectTimer(){return this.socketAdapter.reconnectTimer}get vsn(){return this.socketAdapter.vsn}get encode(){return this.socketAdapter.encode}get decode(){return this.socketAdapter.decode}get reconnectAfterMs(){return this.socketAdapter.reconnectAfterMs}get sendBuffer(){return this.socketAdapter.sendBuffer}get stateChangeCallbacks(){return this.socketAdapter.stateChangeCallbacks}constructor(e,t){if(this.channels=[],this.accessTokenValue=null,this.accessToken=null,this.apiKey=null,this.httpEndpoint=``,this.headers={},this.params={},this.ref=0,this.serializer=new ye,this._manuallySetToken=!1,this._authPromise=null,this._authGeneration=0,this._workerHeartbeatTimer=void 0,this._pendingWorkerHeartbeatRef=null,this._pendingDisconnectTimer=null,this._disconnectOnEmptyChannelsAfterMs=0,this._resolveFetch=e=>e?(...t)=>e(...t):(...e)=>fetch(...e),!t?.params?.apikey)throw Error(`API key is required to connect to Realtime`);this.apiKey=t.params.apikey;let n=this._initializeOptions(t);this.socketAdapter=new yt(e,n),this.httpEndpoint=ke(e),this.fetch=this._resolveFetch(t?.fetch)}connect(){if(!(this.isConnecting()||this.isDisconnecting()||this.isConnected())){this.accessToken&&!this._authPromise&&this._setAuthSafely(`connect`),this._setupConnectionHandlers();try{this.socketAdapter.connect()}catch(e){let t=e.message;throw Error(`WebSocket not available: ${t}`)}this._handleNodeJsRaceCondition()}}endpointURL(){return this.socketAdapter.endPointURL()}async disconnect(e,t){return this._cancelPendingDisconnect(),this.isDisconnecting()?`ok`:await this.socketAdapter.disconnect(()=>{clearInterval(this._workerHeartbeatTimer),this._terminateWorker()},e,t)}getChannels(){return this.channels}async removeChannel(e){let t=await e.unsubscribe();return t===`ok`&&e.teardown(),t}async removeAllChannels(){let e=this.channels.map(async e=>{let t=await e.unsubscribe();return e.teardown(),t}),t=await Promise.all(e);return await this.disconnect(),t}log(e,t,n){this.socketAdapter.log(e,t,n)}hasLogger(){return this.socketAdapter.hasLogger()}connectionState(){return this.socketAdapter.connectionState()||ve.closed}isConnected(){return this.socketAdapter.isConnected()}isConnecting(){return this.socketAdapter.isConnecting()}isDisconnecting(){return this.socketAdapter.isDisconnecting()}channel(e,t={config:{}}){let n=`realtime:${e}`,r=this.getChannels().find(e=>e.topic===n);if(r)return r;{let n=new vt(`realtime:${e}`,t,this);return this._cancelPendingDisconnect(),this.channels.push(n),n}}push(e){this.socketAdapter.push(e)}async setAuth(e=null){let t=++this._authGeneration,n=this._performAuth(e,t);t===this._authGeneration&&(this._authPromise=n);try{await n}finally{this._authPromise===n&&(this._authPromise=null)}}_isManualToken(){return this._manuallySetToken}async sendHeartbeat(){this.socketAdapter.sendHeartbeat()}onHeartbeat(e){this.socketAdapter.heartbeatCallback=this._wrapHeartbeatCallback(e)}_makeRef(){return this.socketAdapter.makeRef()}_remove(e){this.channels=this.channels.filter(t=>t.topic!==e.topic),this.channels.length===0&&(this.log(`transport`,`no channels remaining, scheduling disconnect`),this._schedulePendingDisconnect())}_schedulePendingDisconnect(){this._cancelPendingDisconnect(),this._disconnectOnEmptyChannelsAfterMs===0?(this.log(`transport`,`disconnecting immediately - no channels`),this.disconnect()):(this._pendingDisconnectTimer=setTimeout(()=>{this._pendingDisconnectTimer=null,this.channels.length===0&&(this.log(`transport`,`deferred disconnect fired - no channels, disconnecting`),this.disconnect())},this._disconnectOnEmptyChannelsAfterMs),this.log(`transport`,`deferred disconnect scheduled in ${this._disconnectOnEmptyChannelsAfterMs}ms`))}_cancelPendingDisconnect(){this._pendingDisconnectTimer!==null&&(this.log(`transport`,`pending disconnect cancelled - channel activity detected`),clearTimeout(this._pendingDisconnectTimer),this._pendingDisconnectTimer=null)}async _performAuth(e,t){let n,r=!1;if(e)n=e,r=!0;else if(this.accessToken)try{n=await this.accessToken()}catch(e){this.log(`error`,`Error fetching access token from callback`,e),n=this.accessTokenValue}else n=this.accessTokenValue;t===this._authGeneration&&(this.accessToken?this._manuallySetToken=!1:r&&(this._manuallySetToken=!0),this.accessTokenValue!=n&&(this.accessTokenValue=n,this.channels.forEach(e=>{let t={access_token:n,version:le};e.updateJoinPayload(t),e.joinedOnce&&e.channelAdapter.isJoined()&&e.channelAdapter.push(_e.access_token,{access_token:n})})))}async _waitForAuthIfNeeded(){this._authPromise&&await this._authPromise}_setAuthSafely(e=`general`){this._isManualToken()||this.setAuth().catch(t=>{this.log(`error`,`Error setting auth in ${e}`,t)})}_setupConnectionHandlers(){this.socketAdapter.onOpen(()=>{(this._authPromise||(this.accessToken&&!this.accessTokenValue?this.setAuth():Promise.resolve())).catch(e=>{this.log(`error`,`error waiting for auth on connect`,e)}),this.worker&&!this.workerRef&&this._startWorkerHeartbeat()}),this.socketAdapter.onClose(()=>{this.worker&&this.workerRef&&this._terminateWorker()}),this.socketAdapter.onMessage(e=>{e.ref&&e.ref===this._pendingWorkerHeartbeatRef&&(this._pendingWorkerHeartbeatRef=null)})}_handleNodeJsRaceCondition(){this.socketAdapter.isConnected()&&this.socketAdapter.getSocket().onConnOpen()}_wrapHeartbeatCallback(e){return(t,n)=>{t!==`disconnected`&&(t==`sent`&&this._setAuthSafely(),e&&e(t,n))}}_startWorkerHeartbeat(){this.workerUrl?this.log(`worker`,`starting worker for from ${this.workerUrl}`):this.log(`worker`,`starting default worker`);let e=this._workerObjectUrl(this.workerUrl);this.workerRef=new Worker(e),this.workerRef.onerror=e=>{this.log(`worker`,`worker error`,e.message),this._terminateWorker(),this.disconnect()},this.workerRef.onmessage=e=>{e.data.event===`keepAlive`&&this.sendHeartbeat()},this.workerRef.postMessage({event:`start`,interval:this.heartbeatIntervalMs})}_terminateWorker(){this.workerRef&&=(this.log(`worker`,`terminating worker`),this.workerRef.terminate(),void 0)}_workerObjectUrl(e){let t;if(e)t=e;else{let e=new Blob([Tt],{type:`application/javascript`});t=URL.createObjectURL(e)}return t}_initializeOptions(e){this.worker=e?.worker??!1,this.accessToken=e?.accessToken??null;let t={};t.timeout=e?.timeout??pe,t.heartbeatIntervalMs=e?.heartbeatIntervalMs??bt.HEARTBEAT_INTERVAL,this._disconnectOnEmptyChannelsAfterMs=e?.disconnectOnEmptyChannelsAfterMs??2*(e?.heartbeatIntervalMs??bt.HEARTBEAT_INTERVAL),t.transport=e?.transport??ce.getWebSocketConstructor(),t.params=e?.params,t.logger=e?.logger,t.heartbeatCallback=this._wrapHeartbeatCallback(e?.heartbeatCallback),t.sessionStorage=e?.sessionStorage??wt(),t.reconnectAfterMs=e?.reconnectAfterMs??(e=>xt[e-1]||St);let n,r,i=e?.vsn??fe;switch(i){case ue:n=(e,t)=>t(JSON.stringify(e)),r=(e,t)=>t(JSON.parse(e));break;case de:n=this.serializer.encode.bind(this.serializer),r=this.serializer.decode.bind(this.serializer);break;default:throw Error(`Unsupported serializer version: ${t.vsn}`)}if(t.vsn=i,t.encode=e?.encode??n,t.decode=e?.decode??r,t.beforeReconnect=this._reconnectAuth.bind(this),(e?.logLevel||e?.log_level)&&(this.logLevel=e.logLevel||e.log_level,t.params=Object.assign(Object.assign({},t.params),{log_level:this.logLevel})),this.worker){if(typeof window<`u`&&!window.Worker)throw Error(`Web Worker is not supported`);this.workerUrl=e?.workerUrl,t.autoSendHeartbeat=!this.worker}return t}async _reconnectAuth(){await this._waitForAuthIfNeeded(),this.isConnected()||this.connect()}},Dt=class extends Error{constructor(e,t){super(e),this.name=`IcebergError`,this.status=t.status,this.icebergType=t.icebergType,this.icebergCode=t.icebergCode,this.details=t.details,this.isCommitStateUnknown=t.icebergType===`CommitStateUnknownException`||[500,502,504].includes(t.status)&&t.icebergType?.includes(`CommitState`)===!0}isNotFound(){return this.status===404}isConflict(){return this.status===409}isAuthenticationTimeout(){return this.status===419}};function Ot(e,t,n){let r=new URL(t,e);if(n)for(let[e,t]of Object.entries(n))t!==void 0&&r.searchParams.set(e,t);return r.toString()}async function kt(e){return!e||e.type===`none`?{}:e.type===`bearer`?{Authorization:`Bearer ${e.token}`}:e.type===`header`?{[e.name]:e.value}:e.type===`custom`?await e.getHeaders():{}}function At(e){let t=e.fetchImpl??globalThis.fetch;return{async request({method:n,path:r,query:i,body:a,headers:o}){let s=Ot(e.baseUrl,r,i),c=await kt(e.auth),l=await t(s,{method:n,headers:{...a?{"Content-Type":`application/json`}:{},...c,...o},body:a?JSON.stringify(a):void 0}),u=await l.text(),d=(l.headers.get(`content-type`)||``).includes(`application/json`),f=d&&u?JSON.parse(u):u;if(!l.ok){let e=d?f:void 0,t=e?.error;throw new Dt(t?.message??`Request failed with status ${l.status}`,{status:l.status,icebergType:t?.type,icebergCode:t?.code,details:e})}return{status:l.status,headers:l.headers,data:f}}}}function jt(e){return e.join(``)}var Mt=class{constructor(e,t=``){this.client=e,this.prefix=t}async listNamespaces(e){let t=e?{parent:jt(e.namespace)}:void 0;return(await this.client.request({method:`GET`,path:`${this.prefix}/namespaces`,query:t})).data.namespaces.map(e=>({namespace:e}))}async createNamespace(e,t){let n={namespace:e.namespace,properties:t?.properties};return(await this.client.request({method:`POST`,path:`${this.prefix}/namespaces`,body:n})).data}async dropNamespace(e){await this.client.request({method:`DELETE`,path:`${this.prefix}/namespaces/${jt(e.namespace)}`})}async loadNamespaceMetadata(e){return{properties:(await this.client.request({method:`GET`,path:`${this.prefix}/namespaces/${jt(e.namespace)}`})).data.properties}}async namespaceExists(e){try{return await this.client.request({method:`HEAD`,path:`${this.prefix}/namespaces/${jt(e.namespace)}`}),!0}catch(e){if(e instanceof Dt&&e.status===404)return!1;throw e}}async createNamespaceIfNotExists(e,t){try{return await this.createNamespace(e,t)}catch(e){if(e instanceof Dt&&e.status===409)return;throw e}}};function Nt(e){return e.join(``)}var Pt=class{constructor(e,t=``,n){this.client=e,this.prefix=t,this.accessDelegation=n}async listTables(e){return(await this.client.request({method:`GET`,path:`${this.prefix}/namespaces/${Nt(e.namespace)}/tables`})).data.identifiers}async createTable(e,t){let n={};return this.accessDelegation&&(n[`X-Iceberg-Access-Delegation`]=this.accessDelegation),(await this.client.request({method:`POST`,path:`${this.prefix}/namespaces/${Nt(e.namespace)}/tables`,body:t,headers:n})).data.metadata}async updateTable(e,t){let n=await this.client.request({method:`POST`,path:`${this.prefix}/namespaces/${Nt(e.namespace)}/tables/${e.name}`,body:t});return{"metadata-location":n.data[`metadata-location`],metadata:n.data.metadata}}async dropTable(e,t){await this.client.request({method:`DELETE`,path:`${this.prefix}/namespaces/${Nt(e.namespace)}/tables/${e.name}`,query:{purgeRequested:String(t?.purge??!1)}})}async loadTable(e){let t={};return this.accessDelegation&&(t[`X-Iceberg-Access-Delegation`]=this.accessDelegation),(await this.client.request({method:`GET`,path:`${this.prefix}/namespaces/${Nt(e.namespace)}/tables/${e.name}`,headers:t})).data.metadata}async tableExists(e){let t={};this.accessDelegation&&(t[`X-Iceberg-Access-Delegation`]=this.accessDelegation);try{return await this.client.request({method:`HEAD`,path:`${this.prefix}/namespaces/${Nt(e.namespace)}/tables/${e.name}`,headers:t}),!0}catch(e){if(e instanceof Dt&&e.status===404)return!1;throw e}}async createTableIfNotExists(e,t){try{return await this.createTable(e,t)}catch(n){if(n instanceof Dt&&n.status===409)return await this.loadTable({namespace:e.namespace,name:t.name});throw n}}},Ft=class{constructor(e){let t=`v1`;e.catalogName&&(t+=`/${e.catalogName}`);let n=e.baseUrl.endsWith(`/`)?e.baseUrl:`${e.baseUrl}/`;this.client=At({baseUrl:n,auth:e.auth,fetchImpl:e.fetch}),this.accessDelegation=e.accessDelegation?.join(`,`),this.namespaceOps=new Mt(this.client,t),this.tableOps=new Pt(this.client,t,this.accessDelegation)}async listNamespaces(e){return this.namespaceOps.listNamespaces(e)}async createNamespace(e,t){return this.namespaceOps.createNamespace(e,t)}async dropNamespace(e){await this.namespaceOps.dropNamespace(e)}async loadNamespaceMetadata(e){return this.namespaceOps.loadNamespaceMetadata(e)}async listTables(e){return this.tableOps.listTables(e)}async createTable(e,t){return this.tableOps.createTable(e,t)}async updateTable(e,t){return this.tableOps.updateTable(e,t)}async dropTable(e,t){await this.tableOps.dropTable(e,t)}async loadTable(e){return this.tableOps.loadTable(e)}async namespaceExists(e){return this.namespaceOps.namespaceExists(e)}async tableExists(e){return this.tableOps.tableExists(e)}async createNamespaceIfNotExists(e,t){return this.namespaceOps.createNamespaceIfNotExists(e,t)}async createTableIfNotExists(e,t){return this.tableOps.createTableIfNotExists(e,t)}};function It(e){"@babel/helpers - typeof";return It=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},It(e)}function Lt(e,t){if(It(e)!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t||`default`);if(It(r)!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}function Rt(e){var t=Lt(e,`string`);return It(t)==`symbol`?t:t+``}function zt(e,t,n){return(t=Rt(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function Bt(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),n.push.apply(n,r)}return n}function D(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]==null?{}:arguments[t];t%2?Bt(Object(n),!0).forEach(function(t){zt(e,t,n[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):Bt(Object(n)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))})}return e}var Vt=class extends Error{constructor(e,t=`storage`,n,r){super(e),this.__isStorageError=!0,this.namespace=t,this.name=t===`vectors`?`StorageVectorsError`:`StorageError`,this.status=n,this.statusCode=r}toJSON(){return{name:this.name,message:this.message,status:this.status,statusCode:this.statusCode}}};function Ht(e){return typeof e==`object`&&!!e&&`__isStorageError`in e}var Ut=class extends Vt{constructor(e,t,n,r=`storage`,i){super(e,r,t,n),this.name=r===`vectors`?`StorageVectorsApiError`:`StorageApiError`,this.status=t,this.statusCode=n,this.code=i}toJSON(){return D(D({},super.toJSON()),{},{code:this.code})}},Wt=class extends Vt{constructor(e,t,n=`storage`){super(e,n),this.name=n===`vectors`?`StorageVectorsUnknownError`:`StorageUnknownError`,this.originalError=t}};function Gt(e,t,n){let r=D({},e),i=t.toLowerCase();for(let e of Object.keys(r))e.toLowerCase()===i&&delete r[e];return r[i]=n,r}function Kt(e){let t={};for(let[n,r]of Object.entries(e))t[n.toLowerCase()]=r;return t}var qt=e=>e?(...t)=>e(...t):(...e)=>fetch(...e),Jt=e=>{if(typeof e!=`object`||!e)return!1;let t=Object.getPrototypeOf(e);return(t===null||t===Object.prototype||Object.getPrototypeOf(t)===null)&&!(Symbol.toStringTag in e)&&!(Symbol.iterator in e)},Yt=e=>{if(Array.isArray(e))return e.map(e=>Yt(e));if(typeof e==`function`||e!==Object(e))return e;let t={};return Object.entries(e).forEach(([e,n])=>{let r=e.replace(/([-_][a-z])/gi,e=>e.toUpperCase().replace(/[-_]/g,``));t[r]=Yt(n)}),t},Xt=e=>!e||typeof e!=`string`||e.length===0||e.length>100||e.trim()!==e||e.includes(`/`)||e.includes(`\\`)?!1:/^[\w!.\*'() &$@=;:+,?-]+$/.test(e),Zt=e=>e.split(`/`).map(encodeURIComponent).join(`/`),Qt=e=>{if(typeof e==`object`&&e){let t=e;if(typeof t.msg==`string`)return t.msg;if(typeof t.message==`string`)return t.message;if(typeof t.error_description==`string`)return t.error_description;if(typeof t.error==`string`)return t.error;if(typeof t.error==`object`&&t.error!==null){let e=t.error;if(typeof e.message==`string`)return e.message}}return JSON.stringify(e)},$t=async(e,t,n,r)=>{if(typeof e==`object`&&e&&`json`in e&&typeof e.json==`function`){let n=e,i=parseInt(String(n.status),10);Number.isFinite(i)||(i=500),n.json().then(e=>{let n=e?.statusCode||e?.code||i+``;t(new Ut(Qt(e),i,n,r,e?.code))}).catch(()=>{let e=i+``;t(new Ut(n.statusText||`HTTP ${i} error`,i,e,r))})}else t(new Wt(Qt(e),e,r))},en=(e,t,n,r)=>{let i={method:e,headers:t?.headers||{}};if(e===`GET`||e===`HEAD`||!r)return D(D({},i),n);if(Jt(r)){let e=t?.headers||{},n;for(let[t,r]of Object.entries(e))t.toLowerCase()===`content-type`&&(n=r);i.headers=Gt(e,`Content-Type`,n??`application/json`),i.body=JSON.stringify(r)}else i.body=r;return t?.duplex&&(i.duplex=t.duplex),D(D({},i),n)};async function tn(e,t,n,r,i,a,o){return new Promise((s,c)=>{e(n,en(t,r,i,a)).then(e=>{if(!e.ok)throw e;if(r?.noResolveJson)return e;if(o===`vectors`){let t=e.headers.get(`content-type`);if(e.headers.get(`content-length`)===`0`||e.status===204||!t||!t.includes(`application/json`))return{}}return e.json()}).then(e=>s(e)).catch(e=>$t(e,c,r,o))})}function nn(e=`storage`){return{get:async(t,n,r,i)=>tn(t,`GET`,n,r,i,void 0,e),post:async(t,n,r,i,a)=>tn(t,`POST`,n,i,a,r,e),put:async(t,n,r,i,a)=>tn(t,`PUT`,n,i,a,r,e),head:async(t,n,r,i)=>tn(t,`HEAD`,n,D(D({},r),{},{noResolveJson:!0}),i,void 0,e),remove:async(t,n,r,i,a)=>tn(t,`DELETE`,n,i,a,r,e)}}var{get:rn,post:O,put:an,head:on,remove:sn}=nn(`storage`),k=nn(`vectors`),cn=class{constructor(e,t={},n,r=`storage`){this.shouldThrowOnError=!1,this.url=e,this.headers=Kt(t),this.fetch=qt(n),this.namespace=r}throwOnError(){return this.shouldThrowOnError=!0,this}setHeader(e,t){return this.headers=Gt(this.headers,e,t),this}async handleOperation(e){var t=this;try{return{data:await e(),error:null}}catch(e){if(t.shouldThrowOnError)throw e;if(Ht(e))return{data:null,error:e};throw e}}},ln=Symbol.toStringTag,un=class{constructor(e,t){this.downloadFn=e,this.shouldThrowOnError=t,this[ln]=`StreamDownloadBuilder`,this.promise=null}then(e,t){return this.getPromise().then(e,t)}catch(e){return this.getPromise().catch(e)}finally(e){return this.getPromise().finally(e)}getPromise(){return this.promise||=this.execute(),this.promise}async execute(){var e=this;try{return{data:(await e.downloadFn()).body,error:null}}catch(t){if(e.shouldThrowOnError)throw t;if(Ht(t))return{data:null,error:t};throw t}}},dn=Symbol.toStringTag,fn=class{constructor(e,t){this.downloadFn=e,this.shouldThrowOnError=t,this[dn]=`BlobDownloadBuilder`,this.promise=null}asStream(){return new un(this.downloadFn,this.shouldThrowOnError)}then(e,t){return this.getPromise().then(e,t)}catch(e){return this.getPromise().catch(e)}finally(e){return this.getPromise().finally(e)}getPromise(){return this.promise||=this.execute(),this.promise}async execute(){var e=this;try{return{data:await(await e.downloadFn()).blob(),error:null}}catch(t){if(e.shouldThrowOnError)throw t;if(Ht(t))return{data:null,error:t};throw t}}},pn={limit:100,offset:0,sortBy:{column:`name`,order:`asc`}},mn={cacheControl:`3600`,contentType:`text/plain;charset=UTF-8`,upsert:!1},hn=class extends cn{constructor(e,t={},n,r){super(e,t,r,`storage`),this.bucketId=n}async uploadOrUpdate(e,t,n,r){var i=this;return i.handleOperation(async()=>{let a,o=D(D({},mn),r),s=D(D({},i.headers),e===`POST`&&{"x-upsert":String(o.upsert)}),c=o.metadata;if(typeof Blob<`u`&&n instanceof Blob||typeof FormData<`u`&&n instanceof FormData?a=i.prepareUploadFormData(n,o):(a=n,s[`cache-control`]=`max-age=${o.cacheControl}`,s[`content-type`]=o.contentType,o.contentEncoding&&(s[`content-encoding`]=o.contentEncoding),c&&(s[`x-metadata`]=i.toBase64(i.encodeMetadata(c))),(typeof ReadableStream<`u`&&a instanceof ReadableStream||a&&typeof a==`object`&&`pipe`in a&&typeof a.pipe==`function`)&&!o.duplex&&(o.duplex=`half`)),r?.headers)for(let[e,t]of Object.entries(r.headers))s=Gt(s,e,t);let l=i._removeEmptyFolders(t),u=i._getFinalPath(l),d=await(e==`PUT`?an:O)(i.fetch,`${i.url}/object/${u}`,a,D({headers:s},o?.duplex?{duplex:o.duplex}:{}));return{path:l,id:d.Id,fullPath:d.Key}})}async upload(e,t,n){return this.uploadOrUpdate(`POST`,e,t,n)}async uploadToSignedUrl(e,t,n,r){var i=this;let a=i._removeEmptyFolders(e),o=i._getFinalPath(a),s=new URL(i.url+`/object/upload/sign/${o}`);return s.searchParams.set(`token`,t),i.handleOperation(async()=>{let e,t=D(D({},mn),r),o=D(D({},i.headers),{"x-upsert":String(t.upsert)}),c=t.metadata;if(typeof Blob<`u`&&n instanceof Blob||typeof FormData<`u`&&n instanceof FormData?e=i.prepareUploadFormData(n,t):(e=n,o[`cache-control`]=`max-age=${t.cacheControl}`,o[`content-type`]=t.contentType,t.contentEncoding&&(o[`content-encoding`]=t.contentEncoding),c&&(o[`x-metadata`]=i.toBase64(i.encodeMetadata(c))),(typeof ReadableStream<`u`&&e instanceof ReadableStream||e&&typeof e==`object`&&`pipe`in e&&typeof e.pipe==`function`)&&!t.duplex&&(t.duplex=`half`)),r?.headers)for(let[e,t]of Object.entries(r.headers))o=Gt(o,e,t);return{path:a,fullPath:(await an(i.fetch,s.toString(),e,D({headers:o},t?.duplex?{duplex:t.duplex}:{}))).Key}})}async createSignedUploadUrl(e,t){var n=this;return n.handleOperation(async()=>{let r=n._getFinalPath(e),i=D({},n.headers);t?.upsert&&(i[`x-upsert`]=`true`);let a=await O(n.fetch,`${n.url}/object/upload/sign/${r}`,{},{headers:i}),o=new URL(n.url+a.url),s=o.searchParams.get(`token`);if(!s)throw new Vt(`No token returned by API`);return{signedUrl:o.toString(),path:e,token:s}})}async update(e,t,n){return this.uploadOrUpdate(`PUT`,e,t,n)}async move(e,t,n){var r=this;return r.handleOperation(async()=>await O(r.fetch,`${r.url}/object/move`,{bucketId:r.bucketId,sourceKey:e,destinationKey:t,destinationBucket:n?.destinationBucket,sourceVersionId:n?.sourceVersionId},{headers:r.headers}))}async copy(e,t,n){var r=this;return r.handleOperation(async()=>{let i=n;return{path:(await O(r.fetch,`${r.url}/object/copy`,{bucketId:r.bucketId,sourceKey:e,destinationKey:t,destinationBucket:n?.destinationBucket,sourceVersionId:n?.sourceVersionId,copyMetadata:typeof i?.copyMetadata==`boolean`?i.copyMetadata:void 0,metadata:i?.copyMetadata===!1?i.metadata:void 0},{headers:r.headers})).Key}})}async createSignedUrl(e,t,n){var r=this;return r.handleOperation(async()=>{let i=r._getFinalPath(e),a=typeof n?.transform==`object`&&n.transform!==null&&Object.keys(n.transform).length>0,o=await O(r.fetch,`${r.url}/object/sign/${i}`,D(D({expiresIn:t},a?{transform:n.transform}:{}),n?.versionId==null?{}:{versionId:n.versionId}),{headers:r.headers}),s=new URLSearchParams;n?.download&&s.set(`download`,n.download===!0?``:n.download),n?.cacheNonce!=null&&s.set(`cacheNonce`,String(n.cacheNonce));let c=s.toString();return{signedUrl:encodeURI(`${r.url}${o.signedURL}${c?`&${c}`:``}`)}})}async createSignedUrls(e,t,n){var r=this;return r.handleOperation(async()=>{let i=await O(r.fetch,`${r.url}/object/sign/${r.bucketId}`,{expiresIn:t,paths:e},{headers:r.headers}),a=new URLSearchParams;n?.download&&a.set(`download`,n.download===!0?``:n.download),n?.cacheNonce!=null&&a.set(`cacheNonce`,String(n.cacheNonce));let o=a.toString();return i.map(e=>D(D({},e),{},{signedUrl:e.signedURL?encodeURI(`${r.url}${e.signedURL}${o?`&${o}`:``}`):null}))})}download(e,t,n){let r=typeof t?.transform==`object`&&t.transform!==null&&Object.keys(t.transform).length>0?`render/image/authenticated`:`object`,i=new URLSearchParams;t?.transform&&this.applyTransformOptsToQuery(i,t.transform),t?.cacheNonce!=null&&i.set(`cacheNonce`,String(t.cacheNonce)),t?.versionId!=null&&i.set(`versionId`,String(t.versionId));let a=i.toString(),o=this._getFinalPath(e);return new fn(()=>rn(this.fetch,`${this.url}/${r}/${o}${a?`?${a}`:``}`,{headers:this.headers,noResolveJson:!0},n),this.shouldThrowOnError)}async info(e,t){var n=this;let r=n._getFinalPath(e),i=new URLSearchParams;t?.versionId!=null&&i.set(`versionId`,String(t.versionId));let a=i.toString();return n.handleOperation(async()=>Yt(await rn(n.fetch,`${n.url}/object/info/${r}${a?`?${a}`:``}`,{headers:n.headers})))}async exists(e){var t=this;let n=t._getFinalPath(e);try{return await on(t.fetch,`${t.url}/object/${n}`,{headers:t.headers}),{data:!0,error:null}}catch(e){if(t.shouldThrowOnError)throw e;if(Ht(e)){let t=e instanceof Ut?e.status:e instanceof Wt?e.originalError?.status:void 0;if(t!==void 0&&[400,404].includes(t))return{data:!1,error:e}}throw e}}getPublicUrl(e,t){let n=this._getFinalPath(e),r=new URLSearchParams;t?.download&&r.set(`download`,t.download===!0?``:t.download),t?.transform&&this.applyTransformOptsToQuery(r,t.transform),t?.cacheNonce!=null&&r.set(`cacheNonce`,String(t.cacheNonce)),t?.versionId!=null&&r.set(`versionId`,String(t.versionId));let i=r.toString(),a=typeof t?.transform==`object`&&t.transform!==null&&Object.keys(t.transform).length>0?`render/image`:`object`;return{data:{publicUrl:encodeURI(`${this.url}/${a}/public/${n}`)+(i?`?${i}`:``)}}}async remove(e){var t=this;return t.handleOperation(async()=>await sn(t.fetch,`${t.url}/object/${t.bucketId}`,{prefixes:e},{headers:t.headers}))}async purgeCache(e,t,n){var r=this;return r.handleOperation(async()=>{let i=Zt(r._getFinalPath(e)),a=new URLSearchParams;t?.transformations&&a.set(`transformations`,`true`);let o=a.toString();return await sn(r.fetch,`${r.url}/cdn/${i}${o?`?${o}`:``}`,{},{headers:r.headers},n)})}async list(e,t,n){var r=this;return r.handleOperation(async()=>{let i=t?.sortBy?D(D({},pn.sortBy),t.sortBy):pn.sortBy,a=D(D(D({},pn),t),{},{sortBy:i,prefix:e||``});return await O(r.fetch,`${r.url}/object/list/${r.bucketId}`,a,{headers:r.headers},n)})}async listV2(e,t){var n=this;return n.handleOperation(async()=>{let r=D({},e);return await O(n.fetch,`${n.url}/object/list-v2/${n.bucketId}`,r,{headers:n.headers},t)})}prepareUploadFormData(e,t){let n=new FormData,r=[];e instanceof FormData?e.forEach((e,t)=>{typeof e==`string`?n.append(t,e):r.push([t,e])}):r.push([``,e]),n.has(`cacheControl`)||n.append(`cacheControl`,t.cacheControl),t.metadata&&!n.has(`metadata`)&&n.append(`metadata`,this.encodeMetadata(t.metadata)),t.contentEncoding&&!n.has(`contentEncoding`)&&n.append(`contentEncoding`,t.contentEncoding);for(let[e,t]of r)n.append(e,t);return n}encodeMetadata(e){return JSON.stringify(e)}toBase64(e){return typeof Buffer<`u`?Buffer.from(e).toString(`base64`):btoa(e)}_getFinalPath(e){return`${this.bucketId}/${e.replace(/^\/+/,``)}`}_removeEmptyFolders(e){return e.replace(/^\/|\/$/g,``).replace(/\/+/g,`/`)}applyTransformOptsToQuery(e,t){return t.width&&e.set(`width`,t.width.toString()),t.height&&e.set(`height`,t.height.toString()),t.resize&&e.set(`resize`,t.resize),t.format&&e.set(`format`,t.format),t.quality&&e.set(`quality`,t.quality.toString()),e}},gn={"X-Client-Info":`storage-js/2.118.0`},_n=class extends cn{constructor(e,t={},n,r){let i=new URL(e);r?.useNewHostname&&/supabase\.(co|in|red)$/.test(i.hostname)&&!i.hostname.includes(`storage.supabase.`)&&(i.hostname=i.hostname.replace(`supabase.`,`storage.supabase.`));let a=i.href.replace(/\/$/,``),o=D(D({},gn),t);super(a,o,n,`storage`)}async listBuckets(e){var t=this;return t.handleOperation(async()=>{let n=t.listBucketOptionsToQueryString(e);return await rn(t.fetch,`${t.url}/bucket${n}`,{headers:t.headers})})}async getBucket(e){var t=this;return t.handleOperation(async()=>await rn(t.fetch,`${t.url}/bucket/${e}`,{headers:t.headers}))}async createBucket(e,t={public:!1}){var n=this;return n.handleOperation(async()=>await O(n.fetch,`${n.url}/bucket`,{id:e,name:e,type:t.type,public:t.public,file_size_limit:t.fileSizeLimit,allowed_mime_types:t.allowedMimeTypes,versioning_status:t.versioningStatus},{headers:n.headers}))}async updateBucket(e,t){var n=this;return n.handleOperation(async()=>await an(n.fetch,`${n.url}/bucket/${e}`,{id:e,name:e,public:t.public,file_size_limit:t.fileSizeLimit,allowed_mime_types:t.allowedMimeTypes,versioning_status:t.versioningStatus},{headers:n.headers}))}async emptyBucket(e){var t=this;return t.handleOperation(async()=>await O(t.fetch,`${t.url}/bucket/${e}/empty`,{},{headers:t.headers}))}async deleteBucket(e){var t=this;return t.handleOperation(async()=>await sn(t.fetch,`${t.url}/bucket/${e}`,{},{headers:t.headers}))}async getBucketLifecycle(e){var t=this;return t.handleOperation(async()=>await rn(t.fetch,t.bucketLifecycleUrl(e),{headers:t.headers}))}async updateBucketLifecycle(e,t){var n=this;return n.handleOperation(async()=>await an(n.fetch,n.bucketLifecycleUrl(e),t,{headers:n.headers}))}async deleteBucketLifecycle(e){var t=this;return t.handleOperation(async()=>await sn(t.fetch,t.bucketLifecycleUrl(e),{},{headers:t.headers}))}async purgeBucketCache(e,t,n){var r=this;return r.handleOperation(async()=>{let i=new URLSearchParams;t?.transformations&&i.set(`transformations`,`true`);let a=i.toString();return await sn(r.fetch,`${r.url}/cdn/${Zt(e)}${a?`?${a}`:``}`,{},{headers:r.headers},n)})}bucketLifecycleUrl(e){return`${this.url}/bucket/${Zt(e)}/lifecycle`}listBucketOptionsToQueryString(e){let t={};return e&&(`limit`in e&&(t.limit=String(e.limit)),`offset`in e&&(t.offset=String(e.offset)),e.search&&(t.search=e.search),e.sortColumn&&(t.sortColumn=e.sortColumn),e.sortOrder&&(t.sortOrder=e.sortOrder)),Object.keys(t).length>0?`?`+new URLSearchParams(t).toString():``}},vn=class extends cn{constructor(e,t={},n){let r=e.replace(/\/$/,``),i=D(D({},gn),t);super(r,i,n,`storage`)}async createBucket(e){var t=this;return t.handleOperation(async()=>await O(t.fetch,`${t.url}/bucket`,{name:e},{headers:t.headers}))}async listBuckets(e){var t=this;return t.handleOperation(async()=>{let n=new URLSearchParams;e?.limit!==void 0&&n.set(`limit`,e.limit.toString()),e?.offset!==void 0&&n.set(`offset`,e.offset.toString()),e?.sortColumn&&n.set(`sortColumn`,e.sortColumn),e?.sortOrder&&n.set(`sortOrder`,e.sortOrder),e?.search&&n.set(`search`,e.search);let r=n.toString(),i=r?`${t.url}/bucket?${r}`:`${t.url}/bucket`;return await rn(t.fetch,i,{headers:t.headers})})}async deleteBucket(e){var t=this;return t.handleOperation(async()=>await sn(t.fetch,`${t.url}/bucket/${e}`,{},{headers:t.headers}))}from(e){var t=this;if(!Xt(e))throw new Vt(`Invalid bucket name: File, folder, and bucket names must follow AWS object key naming guidelines and should avoid the use of any other characters.`);let n=new Ft({baseUrl:this.url,catalogName:e,auth:{type:`custom`,getHeaders:async()=>t.headers},fetch:this.fetch}),r=this.shouldThrowOnError;return new Proxy(n,{get(e,t){let n=e[t];return typeof n==`function`?async(...t)=>{try{return{data:await n.apply(e,t),error:null}}catch(e){if(r)throw e;return{data:null,error:e}}}:n}})}},yn=class extends cn{constructor(e,t={},n){let r=e.replace(/\/$/,``),i=D(D({},gn),{},{"Content-Type":`application/json`},t);super(r,i,n,`vectors`)}async createIndex(e){var t=this;return t.handleOperation(async()=>await k.post(t.fetch,`${t.url}/CreateIndex`,e,{headers:t.headers})||{})}async getIndex(e,t){var n=this;return n.handleOperation(async()=>await k.post(n.fetch,`${n.url}/GetIndex`,{vectorBucketName:e,indexName:t},{headers:n.headers}))}async listIndexes(e){var t=this;return t.handleOperation(async()=>await k.post(t.fetch,`${t.url}/ListIndexes`,e,{headers:t.headers}))}async deleteIndex(e,t){var n=this;return n.handleOperation(async()=>await k.post(n.fetch,`${n.url}/DeleteIndex`,{vectorBucketName:e,indexName:t},{headers:n.headers})||{})}},bn=class extends cn{constructor(e,t={},n){let r=e.replace(/\/$/,``),i=D(D({},gn),{},{"Content-Type":`application/json`},t);super(r,i,n,`vectors`)}async putVectors(e){var t=this;if(e.vectors.length<1||e.vectors.length>500)throw Error(`Vector batch size must be between 1 and 500 items`);return t.handleOperation(async()=>await k.post(t.fetch,`${t.url}/PutVectors`,e,{headers:t.headers})||{})}async getVectors(e){var t=this;return t.handleOperation(async()=>await k.post(t.fetch,`${t.url}/GetVectors`,e,{headers:t.headers}))}async listVectors(e){var t=this;if(e.segmentCount!==void 0){if(e.segmentCount<1||e.segmentCount>16)throw Error(`segmentCount must be between 1 and 16`);if(e.segmentIndex!==void 0&&(e.segmentIndex<0||e.segmentIndex>=e.segmentCount))throw Error(`segmentIndex must be between 0 and ${e.segmentCount-1}`)}return t.handleOperation(async()=>await k.post(t.fetch,`${t.url}/ListVectors`,e,{headers:t.headers}))}async queryVectors(e){var t=this;return t.handleOperation(async()=>await k.post(t.fetch,`${t.url}/QueryVectors`,e,{headers:t.headers}))}async deleteVectors(e){var t=this;if(e.keys.length<1||e.keys.length>500)throw Error(`Keys batch size must be between 1 and 500 items`);return t.handleOperation(async()=>await k.post(t.fetch,`${t.url}/DeleteVectors`,e,{headers:t.headers})||{})}},xn=class extends cn{constructor(e,t={},n){let r=e.replace(/\/$/,``),i=D(D({},gn),{},{"Content-Type":`application/json`},t);super(r,i,n,`vectors`)}async createBucket(e){var t=this;return t.handleOperation(async()=>await k.post(t.fetch,`${t.url}/CreateVectorBucket`,{vectorBucketName:e},{headers:t.headers})||{})}async getBucket(e){var t=this;return t.handleOperation(async()=>await k.post(t.fetch,`${t.url}/GetVectorBucket`,{vectorBucketName:e},{headers:t.headers}))}async listBuckets(e={}){var t=this;return t.handleOperation(async()=>await k.post(t.fetch,`${t.url}/ListVectorBuckets`,e,{headers:t.headers}))}async deleteBucket(e){var t=this;return t.handleOperation(async()=>await k.post(t.fetch,`${t.url}/DeleteVectorBucket`,{vectorBucketName:e},{headers:t.headers})||{})}},Sn=class extends xn{constructor(e,t={}){super(e,t.headers||{},t.fetch)}from(e){return new Cn(this.url,this.headers,e,this.fetch)}async createBucket(e){var t=()=>super.createBucket,n=this;return t().call(n,e)}async getBucket(e){var t=()=>super.getBucket,n=this;return t().call(n,e)}async listBuckets(e={}){var t=()=>super.listBuckets,n=this;return t().call(n,e)}async deleteBucket(e){var t=()=>super.deleteBucket,n=this;return t().call(n,e)}},Cn=class extends yn{constructor(e,t,n,r){super(e,t,r),this.vectorBucketName=n}async createIndex(e){var t=()=>super.createIndex,n=this;return t().call(n,D(D({},e),{},{vectorBucketName:n.vectorBucketName}))}async listIndexes(e={}){var t=()=>super.listIndexes,n=this;return t().call(n,D(D({},e),{},{vectorBucketName:n.vectorBucketName}))}async getIndex(e){var t=()=>super.getIndex,n=this;return t().call(n,n.vectorBucketName,e)}async deleteIndex(e){var t=()=>super.deleteIndex,n=this;return t().call(n,n.vectorBucketName,e)}index(e){return new wn(this.url,this.headers,this.vectorBucketName,e,this.fetch)}},wn=class extends bn{constructor(e,t,n,r,i){super(e,t,i),this.vectorBucketName=n,this.indexName=r}async putVectors(e){var t=()=>super.putVectors,n=this;return t().call(n,D(D({},e),{},{vectorBucketName:n.vectorBucketName,indexName:n.indexName}))}async getVectors(e){var t=()=>super.getVectors,n=this;return t().call(n,D(D({},e),{},{vectorBucketName:n.vectorBucketName,indexName:n.indexName}))}async listVectors(e={}){var t=()=>super.listVectors,n=this;return t().call(n,D(D({},e),{},{vectorBucketName:n.vectorBucketName,indexName:n.indexName}))}async queryVectors(e){var t=()=>super.queryVectors,n=this;return t().call(n,D(D({},e),{},{vectorBucketName:n.vectorBucketName,indexName:n.indexName}))}async deleteVectors(e){var t=()=>super.deleteVectors,n=this;return t().call(n,D(D({},e),{},{vectorBucketName:n.vectorBucketName,indexName:n.indexName}))}},Tn=class extends _n{constructor(e,t={},n,r){super(e,t,n,r)}from(e){return new hn(this.url,this.headers,e,this.fetch)}get vectors(){return new Sn(this.url+`/vector`,{headers:this.headers,fetch:this.fetch})}get analytics(){return new vn(this.url+`/iceberg`,this.headers,this.fetch)}},En=`2.118.0`,Dn=3e4,On=3*Dn,kn=2*Dn,An=`http://localhost:9999`,jn=`supabase.auth.token`,Mn={"X-Client-Info":`gotrue-js/${En}`},Nn=`X-Supabase-Api-Version`,Pn={"2024-01-01":{timestamp:Date.parse(`2024-01-01T00:00:00.0Z`),name:`2024-01-01`}},Fn=/^([a-z0-9_-]{4})*($|[a-z0-9_-]{3}$|[a-z0-9_-]{2}$)$/i,In=`sb_flow_id`,Ln=class extends Error{constructor(e,t,n){super(e),this.__isAuthError=!0,this.name=`AuthError`,this.status=t,this.code=n}toJSON(){return{name:this.name,message:this.message,status:this.status,code:this.code}}};function A(e){return typeof e==`object`&&!!e&&`__isAuthError`in e}var Rn=class extends Ln{constructor(e,t,n){super(e,t,n),this.name=`AuthApiError`,this.status=t,this.code=n}};function zn(e){return A(e)&&e.name===`AuthApiError`}var j=class extends Ln{constructor(e,t){super(e),this.name=`AuthUnknownError`,this.originalError=t}},M=class extends Ln{constructor(e,t,n,r){super(e,n,r),this.name=t,this.status=n}},N=class extends M{constructor(){super(`Auth session missing!`,`AuthSessionMissingError`,400,void 0)}};function Bn(e){return A(e)&&e.name===`AuthSessionMissingError`}var Vn=class extends M{constructor(){super(`Auth session or user missing`,`AuthInvalidTokenResponseError`,500,void 0)}},Hn=class extends M{constructor(e){super(e,`AuthInvalidCredentialsError`,400,void 0)}},Un=class extends M{constructor(e,t=null){super(e,`AuthImplicitGrantRedirectError`,500,void 0),this.details=null,this.details=t}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{details:this.details})}};function Wn(e){return A(e)&&e.name===`AuthImplicitGrantRedirectError`}var Gn=class extends M{constructor(e,t=null){super(e,`AuthPKCEGrantCodeExchangeError`,500,void 0),this.details=null,this.details=t}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{details:this.details})}},Kn=class extends M{constructor(){super(`PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device, or if the storage was cleared. For SSR frameworks (Next.js, SvelteKit, etc.), use @supabase/ssr on both the server and client to store the code verifier in cookies.`,`AuthPKCECodeVerifierMissingError`,400,`pkce_code_verifier_not_found`)}},qn=class extends M{constructor(e,t){super(e,`AuthRetryableFetchError`,t,void 0)}};function Jn(e){return A(e)&&e.name===`AuthRetryableFetchError`}var Yn=class extends M{constructor(e=`Refresh result discarded: session state changed mid-flight (e.g., concurrent signOut)`){super(e,`AuthRefreshDiscardedError`,409,void 0)}};function Xn(e){return A(e)&&e.name===`AuthRefreshDiscardedError`}var Zn=class extends M{constructor(e,t,n){super(e,`AuthWeakPasswordError`,t,`weak_password`),this.reasons=n}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{reasons:this.reasons})}},Qn=class extends M{constructor(e){super(e,`AuthInvalidJwtError`,400,`invalid_jwt`)}},$n=`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_`.split(``),er=` 	
\r=`.split(``),tr=(()=>{let e=Array(128);for(let t=0;t<e.length;t+=1)e[t]=-1;for(let t=0;t<er.length;t+=1)e[er[t].charCodeAt(0)]=-2;for(let t=0;t<$n.length;t+=1)e[$n[t].charCodeAt(0)]=t;return e})();function nr(e,t,n){if(e!==null)for(t.queue=t.queue<<8|e,t.queuedBits+=8;t.queuedBits>=6;)n($n[t.queue>>t.queuedBits-6&63]),t.queuedBits-=6;else if(t.queuedBits>0)for(t.queue<<=6-t.queuedBits,t.queuedBits=6;t.queuedBits>=6;)n($n[t.queue>>t.queuedBits-6&63]),t.queuedBits-=6}function rr(e,t,n){let r=tr[e];if(r>-1)for(t.queue=t.queue<<6|r,t.queuedBits+=6;t.queuedBits>=8;)n(t.queue>>t.queuedBits-8&255),t.queuedBits-=8;else if(r===-2)return;else throw Error(`Invalid Base64-URL character "${String.fromCharCode(e)}"`)}function ir(e){let t=[],n=e=>{t.push(String.fromCodePoint(e))},r={utf8seq:0,codepoint:0},i={queue:0,queuedBits:0},a=e=>{sr(e,r,n)};for(let t=0;t<e.length;t+=1)rr(e.charCodeAt(t),i,a);return t.join(``)}function ar(e,t){if(e<=127)t(e);else if(e<=2047)t(192|e>>6),t(128|e&63);else if(e<=65535)t(224|e>>12),t(128|e>>6&63),t(128|e&63);else if(e<=1114111)t(240|e>>18),t(128|e>>12&63),t(128|e>>6&63),t(128|e&63);else throw Error(`Unrecognized Unicode codepoint: ${e.toString(16)}`)}function or(e,t){for(let n=0;n<e.length;n+=1){let r=e.charCodeAt(n);if(r>55295&&r<=56319){let t=(r-55296)*1024&65535;r=(e.charCodeAt(n+1)-56320&65535|t)+65536,n+=1}ar(r,t)}}function sr(e,t,n){if(t.utf8seq===0){if(e<=127){n(e);return}for(let n=1;n<6;n+=1)if(!(e>>7-n&1)){t.utf8seq=n;break}if(t.utf8seq===2)t.codepoint=e&31;else if(t.utf8seq===3)t.codepoint=e&15;else if(t.utf8seq===4)t.codepoint=e&7;else throw Error(`Invalid UTF-8 sequence`);--t.utf8seq}else if(t.utf8seq>0){if(e<=127)throw Error(`Invalid UTF-8 sequence`);t.codepoint=t.codepoint<<6|e&63,--t.utf8seq,t.utf8seq===0&&n(t.codepoint)}}function cr(e){let t=[],n={queue:0,queuedBits:0},r=e=>{t.push(e)};for(let t=0;t<e.length;t+=1)rr(e.charCodeAt(t),n,r);return new Uint8Array(t)}function lr(e){let t=[];return or(e,e=>t.push(e)),new Uint8Array(t)}function ur(e){let t=[],n={queue:0,queuedBits:0},r=e=>{t.push(e)};return e.forEach(e=>nr(e,n,r)),nr(null,n,r),t.join(``)}function dr(e){return Math.round(Date.now()/1e3)+e}function fr(){return Symbol(`auth-callback`)}var P=()=>typeof window<`u`&&typeof document<`u`,pr={tested:!1,writable:!1},mr=()=>{if(!P())return!1;try{if(typeof globalThis.localStorage!=`object`)return!1}catch{return!1}if(pr.tested)return pr.writable;let e=`lswt-${Math.random()}${Math.random()}`;try{globalThis.localStorage.setItem(e,e),globalThis.localStorage.removeItem(e),pr.tested=!0,pr.writable=!0}catch{pr.tested=!0,pr.writable=!1}return pr.writable};function hr(e){let t={},n=new URL(e);if(n.hash&&n.hash[0]===`#`)try{new URLSearchParams(n.hash.substring(1)).forEach((e,n)=>{t[n]=e})}catch{}return n.searchParams.forEach((e,n)=>{t[n]=e}),t}var gr=e=>e?(...t)=>e(...t):(...e)=>fetch(...e),_r=e=>typeof e==`object`&&!!e&&`status`in e&&`ok`in e&&`json`in e&&typeof e.json==`function`,vr=async(e,t,n)=>{await e.setItem(t,JSON.stringify(n))},F=async(e,t)=>{let n=await e.getItem(t);if(!n)return null;try{return JSON.parse(n)}catch{return null}},I=async(e,t)=>{await e.removeItem(t)},yr=class e{constructor(){this.promise=new e.promiseConstructor((e,t)=>{this.resolve=e,this.reject=t})}};yr.promiseConstructor=Promise;function br(e){let t=e.split(`.`);if(t.length!==3)throw new Qn(`Invalid JWT structure`);for(let e=0;e<t.length;e++)if(!Fn.test(t[e]))throw new Qn(`JWT not in base64url format`);return{header:JSON.parse(ir(t[0])),payload:JSON.parse(ir(t[1])),signature:cr(t[2]),raw:{header:t[0],payload:t[1]}}}async function xr(e){return await new Promise(t=>{setTimeout(()=>t(null),e)})}function Sr(e,t){return new Promise((n,r)=>{(async()=>{for(let i=0;i<1/0;i++)try{let r=await e(i);if(!t(i,null,r)){n(r);return}}catch(e){if(!t(i,e)){r(e);return}}})()})}function Cr(e){return(`0`+e.toString(16)).substr(-2)}function wr(){let e=new Uint32Array(56);if(typeof crypto>`u`){let e=``;for(let t=0;t<56;t++)e+=`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~`.charAt(Math.floor(Math.random()*66));return e}return crypto.getRandomValues(e),Array.from(e,Cr).join(``)}async function Tr(e){let t=new TextEncoder().encode(e),n=await crypto.subtle.digest(`SHA-256`,t),r=new Uint8Array(n);return Array.from(r).map(e=>String.fromCharCode(e)).join(``)}async function Er(e){if(typeof crypto>`u`||crypto.subtle===void 0||typeof TextEncoder>`u`)return console.warn(`WebCrypto API is not supported. Code challenge method will default to use plain instead of sha256.`),e;let t=await Tr(e);return btoa(t).replace(/\+/g,`-`).replace(/\//g,`_`).replace(/=+$/,``)}var Dr=/^[a-zA-Z0-9_-]{8,64}$/;function Or(e){return typeof e==`string`&&Dr.test(e)?e:null}function kr(){if(typeof crypto<`u`&&typeof crypto.getRandomValues==`function`){let e=new Uint8Array(16);return crypto.getRandomValues(e),Array.from(e,Cr).join(``)}let e=``;for(let t=0;t<32;t++)e+=Math.floor(Math.random()*16).toString(16);return e}var Ar=(e,t)=>`${e}-flow-${t}-code-verifier`,jr=e=>`${e}-flows-code-verifier`;async function Mr(e,t){let n=await F(e,jr(t));return Array.isArray(n)?n.filter(e=>Or(e)!==null):[]}async function Nr(e,t,n,r,i){await vr(e,Ar(t,n),r);let a=(await Mr(e,t)).filter(e=>e!==n);for(a.push(n);a.length>5;){let n=a.shift();await I(e,Ar(t,n)),i?.(n)}await vr(e,jr(t),a),await vr(e,`${t}-code-verifier`,r)}async function Pr(e,t,n){if(n){let r=await F(e,Ar(t,n));return{verifier:typeof r==`string`?r:null,flowId:n}}let r=await F(e,`${t}-code-verifier`);return{verifier:typeof r==`string`?r:null,flowId:null}}async function L(e,t,n){let r=`${t}-code-verifier`;if(!n){await I(e,r);return}let i=Ar(t,n),a=await F(e,i);await I(e,i);let o=await Mr(e,t),s=o.filter(e=>e!==n);s.length!==o.length&&(s.length>0?await vr(e,jr(t),s):await I(e,jr(t))),a!=null&&a===await F(e,r)&&await I(e,r)}async function Fr(e,t){let n=await Mr(e,t);for(let r of n)await I(e,Ar(t,r));await I(e,jr(t)),await I(e,`${t}-code-verifier`)}function Ir(e,t){let n=e.indexOf(`#`),r=n===-1?e:e.slice(0,n),i=n===-1?``:e.slice(n),a=r.indexOf(`?`);if(a!==-1){let e=r.slice(0,a),t=r.slice(a+1).split(`&`).filter(e=>e!==``&&e!==`sb_flow_id`&&!e.startsWith(`sb_flow_id=`));r=t.length>0?`${e}?${t.join(`&`)}`:e}let o=r.includes(`?`)?`&`:`?`;return`${r}${o}${In}=${encodeURIComponent(t)}${i}`}async function Lr(e,t,n=!1,r){let i=wr(),a=i;n&&(a+=`/recovery`);let o=kr();await Nr(e,t,o,a,r);let s=await Er(i);return[s,i===s?`plain`:`s256`,o]}var Rr=/^2[0-9]{3}-(0[1-9]|1[0-2])-(0[1-9]|1[0-9]|2[0-9]|3[0-1])$/i;function zr(e){let t=e.headers.get(Nn);if(!t||!t.match(Rr))return null;try{return new Date(`${t}T00:00:00.0Z`)}catch{return null}}function Br(e){if(!e)throw Error(`Missing exp claim`);if(e<=Math.floor(Date.now()/1e3))throw Error(`JWT has expired`)}function Vr(e){switch(e){case`RS256`:return{name:`RSASSA-PKCS1-v1_5`,hash:{name:`SHA-256`}};case`ES256`:return{name:`ECDSA`,namedCurve:`P-256`,hash:{name:`SHA-256`}};default:throw Error(`Invalid alg claim`)}}var Hr=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;function Ur(e){if(!Hr.test(e))throw Error(`@supabase/auth-js: Expected parameter to be UUID but is not`)}function Wr(e){if(!e.recoveryCodes)throw Error("@supabase/auth-js: the MFA recovery codes API is experimental and disabled by default. Enable it by passing `auth: { experimental: { recoveryCodes: true } }` to createClient (or to the GoTrueClient constructor).")}function Gr(){return new Proxy({},{get:(e,t)=>{if(t===`__isUserNotAvailableProxy`)return!0;if(typeof t==`symbol`){let e=t.toString();if(e===`Symbol(Symbol.toPrimitive)`||e===`Symbol(Symbol.toStringTag)`||e===`Symbol(util.inspect.custom)`)return}throw Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Accessing the "${t}" property of the session object is not supported. Please use getUser() instead.`)},set:(e,t)=>{throw Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Setting the "${t}" property of the session object is not supported. Please use getUser() to fetch a user object you can manipulate.`)},deleteProperty:(e,t)=>{throw Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Deleting the "${t}" property of the session object is not supported. Please use getUser() to fetch a user object you can manipulate.`)}})}function Kr(e,t){return new Proxy(e,{get:(e,n,r)=>{if(n===`__isInsecureUserWarningProxy`)return!0;if(typeof n==`symbol`){let t=n.toString();if(t===`Symbol(Symbol.toPrimitive)`||t===`Symbol(Symbol.toStringTag)`||t===`Symbol(util.inspect.custom)`||t===`Symbol(nodejs.util.inspect.custom)`)return Reflect.get(e,n,r)}return!t.value&&typeof n==`string`&&(console.warn(`Using the user object as returned from supabase.auth.getSession() or from some supabase.auth.onAuthStateChange() events could be insecure! This value comes directly from the storage medium (usually cookies on the server) and may not be authentic. Use supabase.auth.getUser() instead which authenticates the data by contacting the Supabase Auth server.`),t.value=!0),Reflect.get(e,n,r)}})}function qr(e){return JSON.parse(JSON.stringify(e))}var Jr=e=>{if(typeof e==`object`&&e){let t=e;if(typeof t.msg==`string`)return t.msg;if(typeof t.message==`string`)return t.message;if(typeof t.error_description==`string`)return t.error_description;if(typeof t.error==`string`)return t.error}return JSON.stringify(e)},Yr=[500,501,502,503,504,520,521,522,523,524,525,526,527,528,529,530];async function Xr(e){if(!_r(e))throw new qn(Jr(e),0);let t;try{t=await e.json()}catch(t){throw Yr.includes(e.status)?new qn(e.statusText||`HTTP ${e.status}`,e.status):new j(Jr(t),t)}if(Yr.includes(e.status))throw new qn(Jr(t),e.status);let n,r=zr(e);if(r&&r.getTime()>=Pn[`2024-01-01`].timestamp&&typeof t==`object`&&t&&typeof t.code==`string`?n=t.code:typeof t==`object`&&t&&typeof t.error_code==`string`&&(n=t.error_code),!n){if(typeof t==`object`&&t&&typeof t.weak_password==`object`&&t.weak_password&&Array.isArray(t.weak_password.reasons)&&t.weak_password.reasons.length&&t.weak_password.reasons.reduce((e,t)=>e&&typeof t==`string`,!0))throw new Zn(Jr(t),e.status,t.weak_password.reasons)}else if(n===`weak_password`)throw new Zn(Jr(t),e.status,t.weak_password?.reasons||[]);else if(n===`session_not_found`)throw new N;throw new Rn(Jr(t),e.status||500,n)}var Zr=(e,t,n,r)=>{let i={method:e,headers:t?.headers||{}};return e===`GET`?i:(i.headers=Object.assign({"Content-Type":`application/json;charset=UTF-8`},t?.headers),i.body=JSON.stringify(r),Object.assign(Object.assign({},i),n))};async function R(e,t,n,r){let i=Object.assign({},r?.headers);i[`X-Supabase-Api-Version`]||(i[Nn]=Pn[`2024-01-01`].name),r?.jwt&&(i.Authorization=`Bearer ${r.jwt}`);let a=r?.query??{};r?.redirectTo&&(a.redirect_to=r.redirectTo);let o=await Qr(e,t,n+(Object.keys(a).length?`?`+new URLSearchParams(a).toString():``),{headers:i,noResolveJson:r?.noResolveJson},{},r?.body);return r?.xform?r?.xform(o):{data:Object.assign({},o),error:null}}async function Qr(e,t,n,r,i,a){let o=Zr(t,r,i,a),s;try{s=await e(n,Object.assign({},o))}catch(e){throw new qn(Jr(e),0)}if(s.ok||await Xr(s),r?.noResolveJson)return s;try{return await s.json()}catch(e){await Xr(e)}}function z(e){let t=null;ii(e)&&(t=Object.assign({},e),e.expires_at||(t.expires_at=dr(e.expires_in)));let n=e.user??(typeof e?.id==`string`?e:null);return{data:{session:t,user:n},error:null}}function $r(e){let t=z(e);return!t.error&&e.weak_password&&typeof e.weak_password==`object`&&Array.isArray(e.weak_password.reasons)&&e.weak_password.reasons.length&&e.weak_password.message&&typeof e.weak_password.message==`string`&&e.weak_password.reasons.reduce((e,t)=>e&&typeof t==`string`,!0)&&(t.data.weak_password=e.weak_password),t}function ei(e){return{data:{user:e.user??e},error:null}}function ti(e){return{data:e,error:null}}function ni(e){let{action_link:t,email_otp:r,hashed_token:i,redirect_to:a,verification_type:o}=e,s=n(e,[`action_link`,`email_otp`,`hashed_token`,`redirect_to`,`verification_type`]);return{data:{properties:{action_link:t,email_otp:r,hashed_token:i,redirect_to:a,verification_type:o},user:Object.assign({},s)},error:null}}function ri(e){return e}function ii(e){return!!e.access_token&&!!e.refresh_token&&!!e.expires_in}var ai=[`global`,`local`,`others`],oi=class{constructor({url:e=``,headers:t={},fetch:n,experimental:r}){this.url=e,this.headers=t,this.fetch=gr(n),this.experimental=r??{},this.mfa={listFactors:this._listFactors.bind(this),deleteFactor:this._deleteFactor.bind(this)},this.oauth={listClients:this._listOAuthClients.bind(this),createClient:this._createOAuthClient.bind(this),getClient:this._getOAuthClient.bind(this),updateClient:this._updateOAuthClient.bind(this),deleteClient:this._deleteOAuthClient.bind(this),regenerateClientSecret:this._regenerateOAuthClientSecret.bind(this)},this.customProviders={listProviders:this._listCustomProviders.bind(this),createProvider:this._createCustomProvider.bind(this),getProvider:this._getCustomProvider.bind(this),updateProvider:this._updateCustomProvider.bind(this),deleteProvider:this._deleteCustomProvider.bind(this)},this.passkey={listPasskeys:this._adminListPasskeys.bind(this),deletePasskey:this._adminDeletePasskey.bind(this)}}async signOut(e,t=ai[0]){if(ai.indexOf(t)<0)throw Error(`@supabase/auth-js: Parameter scope must be one of ${ai.join(`, `)}`);try{return await R(this.fetch,`POST`,`${this.url}/logout?scope=${t}`,{headers:this.headers,jwt:e,noResolveJson:!0}),{data:null,error:null}}catch(e){if(A(e))return{data:null,error:e};throw e}}async inviteUserByEmail(e,t={}){try{return await R(this.fetch,`POST`,`${this.url}/invite`,{body:{email:e,data:t.data},headers:this.headers,redirectTo:t.redirectTo,xform:ei})}catch(e){if(A(e))return{data:{user:null},error:e};throw e}}async generateLink(e){try{let{options:t}=e,r=n(e,[`options`]),i=Object.assign(Object.assign({},r),t);return`newEmail`in r&&(i.new_email=r?.newEmail,delete i.newEmail),await R(this.fetch,`POST`,`${this.url}/admin/generate_link`,{body:i,headers:this.headers,xform:ni,redirectTo:t?.redirectTo})}catch(e){if(A(e))return{data:{properties:null,user:null},error:e};throw e}}async createUser(e){try{return await R(this.fetch,`POST`,`${this.url}/admin/users`,{body:e,headers:this.headers,xform:ei})}catch(e){if(A(e))return{data:{user:null},error:e};throw e}}async listUsers(e){try{let t={nextPage:null,lastPage:0,total:0},n=await R(this.fetch,`GET`,`${this.url}/admin/users`,{headers:this.headers,noResolveJson:!0,query:{page:(e?.page)?.toString()??``,per_page:(e?.perPage)?.toString()??``},xform:ri});if(n.error)throw n.error;let r=await n.json(),i=n.headers.get(`x-total-count`)??0,a=n.headers.get(`link`)?.split(`,`)??[];return a.length>0&&(a.forEach(e=>{let n=parseInt(e.split(`;`)[0].split(`=`)[1].substring(0,1)),r=JSON.parse(e.split(`;`)[1].split(`=`)[1]);t[`${r}Page`]=n}),t.total=parseInt(i)),{data:Object.assign(Object.assign({},r),t),error:null}}catch(e){if(A(e))return{data:{users:[]},error:e};throw e}}async getUserById(e){Ur(e);try{return await R(this.fetch,`GET`,`${this.url}/admin/users/${e}`,{headers:this.headers,xform:ei})}catch(e){if(A(e))return{data:{user:null},error:e};throw e}}async updateUserById(e,t){Ur(e);try{return await R(this.fetch,`PUT`,`${this.url}/admin/users/${e}`,{body:t,headers:this.headers,xform:ei})}catch(e){if(A(e))return{data:{user:null},error:e};throw e}}async deleteUser(e,t=!1){Ur(e);try{return await R(this.fetch,`DELETE`,`${this.url}/admin/users/${e}`,{headers:this.headers,body:{should_soft_delete:t},xform:ei})}catch(e){if(A(e))return{data:{user:null},error:e};throw e}}async _listFactors(e){Ur(e.userId);try{let{data:t,error:n}=await R(this.fetch,`GET`,`${this.url}/admin/users/${e.userId}/factors`,{headers:this.headers,xform:e=>({data:{factors:e},error:null})});return{data:t,error:n}}catch(e){if(A(e))return{data:null,error:e};throw e}}async _deleteFactor(e){Ur(e.userId),Ur(e.id);try{return{data:await R(this.fetch,`DELETE`,`${this.url}/admin/users/${e.userId}/factors/${e.id}`,{headers:this.headers}),error:null}}catch(e){if(A(e))return{data:null,error:e};throw e}}async _listOAuthClients(e){try{let t={nextPage:null,lastPage:0,total:0},n=await R(this.fetch,`GET`,`${this.url}/admin/oauth/clients`,{headers:this.headers,noResolveJson:!0,query:{page:(e?.page)?.toString()??``,per_page:(e?.perPage)?.toString()??``},xform:ri});if(n.error)throw n.error;let r=await n.json(),i=n.headers.get(`x-total-count`)??0,a=n.headers.get(`link`)?.split(`,`)??[];return a.length>0&&(a.forEach(e=>{let n=parseInt(e.split(`;`)[0].split(`=`)[1].substring(0,1)),r=JSON.parse(e.split(`;`)[1].split(`=`)[1]);t[`${r}Page`]=n}),t.total=parseInt(i)),{data:Object.assign(Object.assign({},r),t),error:null}}catch(e){if(A(e))return{data:{clients:[]},error:e};throw e}}async _createOAuthClient(e){try{return await R(this.fetch,`POST`,`${this.url}/admin/oauth/clients`,{body:e,headers:this.headers,xform:e=>({data:e,error:null})})}catch(e){if(A(e))return{data:null,error:e};throw e}}async _getOAuthClient(e){try{return await R(this.fetch,`GET`,`${this.url}/admin/oauth/clients/${e}`,{headers:this.headers,xform:e=>({data:e,error:null})})}catch(e){if(A(e))return{data:null,error:e};throw e}}async _updateOAuthClient(e,t){try{return await R(this.fetch,`PUT`,`${this.url}/admin/oauth/clients/${e}`,{body:t,headers:this.headers,xform:e=>({data:e,error:null})})}catch(e){if(A(e))return{data:null,error:e};throw e}}async _deleteOAuthClient(e){try{return await R(this.fetch,`DELETE`,`${this.url}/admin/oauth/clients/${e}`,{headers:this.headers,noResolveJson:!0}),{data:null,error:null}}catch(e){if(A(e))return{data:null,error:e};throw e}}async _regenerateOAuthClientSecret(e){try{return await R(this.fetch,`POST`,`${this.url}/admin/oauth/clients/${e}/regenerate_secret`,{headers:this.headers,xform:e=>({data:e,error:null})})}catch(e){if(A(e))return{data:null,error:e};throw e}}async _listCustomProviders(e){try{let t={};return e?.type&&(t.type=e.type),await R(this.fetch,`GET`,`${this.url}/admin/custom-providers`,{headers:this.headers,query:t,xform:e=>({data:{providers:e?.providers??[]},error:null})})}catch(e){if(A(e))return{data:{providers:[]},error:e};throw e}}async _createCustomProvider(e){try{return await R(this.fetch,`POST`,`${this.url}/admin/custom-providers`,{body:e,headers:this.headers,xform:e=>({data:e,error:null})})}catch(e){if(A(e))return{data:null,error:e};throw e}}async _getCustomProvider(e){try{return await R(this.fetch,`GET`,`${this.url}/admin/custom-providers/${e}`,{headers:this.headers,xform:e=>({data:e,error:null})})}catch(e){if(A(e))return{data:null,error:e};throw e}}async _updateCustomProvider(e,t){try{return await R(this.fetch,`PUT`,`${this.url}/admin/custom-providers/${e}`,{body:t,headers:this.headers,xform:e=>({data:e,error:null})})}catch(e){if(A(e))return{data:null,error:e};throw e}}async _deleteCustomProvider(e){try{return await R(this.fetch,`DELETE`,`${this.url}/admin/custom-providers/${e}`,{headers:this.headers,noResolveJson:!0}),{data:null,error:null}}catch(e){if(A(e))return{data:null,error:e};throw e}}async _adminListPasskeys(e){Ur(e.userId);try{return await R(this.fetch,`GET`,`${this.url}/admin/users/${e.userId}/passkeys`,{headers:this.headers,xform:e=>({data:e,error:null})})}catch(e){if(A(e))return{data:null,error:e};throw e}}async _adminDeletePasskey(e){Ur(e.userId),Ur(e.passkeyId);try{return await R(this.fetch,`DELETE`,`${this.url}/admin/users/${e.userId}/passkeys/${e.passkeyId}`,{headers:this.headers,noResolveJson:!0}),{data:null,error:null}}catch(e){if(A(e))return{data:null,error:e};throw e}}};function si(e={}){return{getItem:t=>e[t]||null,setItem:(t,n)=>{e[t]=n},removeItem:t=>{delete e[t]}}}globalThis&&mr()&&globalThis.localStorage&&globalThis.localStorage.getItem(`supabase.gotrue-js.locks.debug`);var ci=class extends Error{constructor(e){super(e),this.isAcquireTimeout=!0}};function li(){if(typeof globalThis!=`object`)try{Object.defineProperty(Object.prototype,"__magic__",{get:function(){return this},configurable:!0}),__magic__.globalThis=__magic__,delete Object.prototype.__magic__}catch{typeof self<`u`&&(self.globalThis=self)}}function ui(e){if(!/^0x[a-fA-F0-9]{40}$/.test(e))throw Error(`@supabase/auth-js: Address "${e}" is invalid.`);return e.toLowerCase()}function di(e){return parseInt(e,16)}function fi(e){let t=new TextEncoder().encode(e);return`0x`+Array.from(t,e=>e.toString(16).padStart(2,`0`)).join(``)}function pi(e){let{chainId:t,domain:n,expirationTime:r,issuedAt:i=new Date,nonce:a,notBefore:o,requestId:s,resources:c,scheme:l,uri:u,version:d}=e;if(!Number.isInteger(t))throw Error(`@supabase/auth-js: Invalid SIWE message field "chainId". Chain ID must be a EIP-155 chain ID. Provided value: ${t}`);if(!n)throw Error(`@supabase/auth-js: Invalid SIWE message field "domain". Domain must be provided.`);if(a&&a.length<8)throw Error(`@supabase/auth-js: Invalid SIWE message field "nonce". Nonce must be at least 8 characters. Provided value: ${a}`);if(!u)throw Error(`@supabase/auth-js: Invalid SIWE message field "uri". URI must be provided.`);if(d!==`1`)throw Error(`@supabase/auth-js: Invalid SIWE message field "version". Version must be '1'. Provided value: ${d}`);if(e.statement?.includes(`
`))throw Error(`@supabase/auth-js: Invalid SIWE message field "statement". Statement must not include '\\n'. Provided value: ${e.statement}`);let f=ui(e.address),p=`${l?`${l}://${n}`:n} wants you to sign in with your Ethereum account:\n${f}\n\n${e.statement?`${e.statement}\n`:``}`,m=`URI: ${u}\nVersion: ${d}\nChain ID: ${t}${a?`\nNonce: ${a}`:``}\nIssued At: ${i.toISOString()}`;if(r&&(m+=`\nExpiration Time: ${r.toISOString()}`),o&&(m+=`\nNot Before: ${o.toISOString()}`),s&&(m+=`\nRequest ID: ${s}`),c){let e=`
Resources:`;for(let t of c){if(!t||typeof t!=`string`)throw Error(`@supabase/auth-js: Invalid SIWE message field "resources". Every resource must be a valid string. Provided value: ${t}`);e+=`\n- ${t}`}m+=e}return`${p}\n${m}`}var B=class extends Error{constructor({message:e,code:t,cause:n,name:r}){super(e,{cause:n}),this.__isWebAuthnError=!0,this.name=r??(n instanceof Error?n.name:void 0)??`Unknown Error`,this.code=t}toJSON(){return{name:this.name,message:this.message,code:this.code}}},mi=class extends B{constructor(e,t){super({code:`ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`,cause:t,message:e}),this.name=`WebAuthnUnknownError`,this.originalError=t}};function hi({error:e,options:t}){let{publicKey:n}=t;if(!n)throw Error(`options was missing required publicKey property`);if(e.name===`AbortError`){if(t.signal instanceof AbortSignal)return new B({message:`Registration ceremony was sent an abort signal`,code:`ERROR_CEREMONY_ABORTED`,cause:e})}else if(e.name===`ConstraintError`){if(n.authenticatorSelection?.requireResidentKey===!0)return new B({message:`Discoverable credentials were required but no available authenticator supported it`,code:`ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT`,cause:e});if(t.mediation===`conditional`&&n.authenticatorSelection?.userVerification===`required`)return new B({message:`User verification was required during automatic registration but it could not be performed`,code:`ERROR_AUTO_REGISTER_USER_VERIFICATION_FAILURE`,cause:e});if(n.authenticatorSelection?.userVerification===`required`)return new B({message:`User verification was required but no available authenticator supported it`,code:`ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT`,cause:e})}else if(e.name===`InvalidStateError`)return new B({message:`The authenticator was previously registered`,code:`ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED`,cause:e});else if(e.name===`NotAllowedError`)return new B({message:e.message,code:`ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`,cause:e});else if(e.name===`NotSupportedError`)return n.pubKeyCredParams.filter(e=>e.type===`public-key`).length===0?new B({message:`No entry in pubKeyCredParams was of type "public-key"`,code:`ERROR_MALFORMED_PUBKEYCREDPARAMS`,cause:e}):new B({message:`No available authenticator supported any of the specified pubKeyCredParams algorithms`,code:`ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG`,cause:e});else if(e.name===`SecurityError`){let t=window.location.hostname;if(!Si(t))return new B({message:`${window.location.hostname} is an invalid domain`,code:`ERROR_INVALID_DOMAIN`,cause:e});if(n.rp.id!==t)return new B({message:`The RP ID "${n.rp.id}" is invalid for this domain`,code:`ERROR_INVALID_RP_ID`,cause:e})}else if(e.name===`TypeError`){if(n.user.id.byteLength<1||n.user.id.byteLength>64)return new B({message:`User ID was not between 1 and 64 characters`,code:`ERROR_INVALID_USER_ID_LENGTH`,cause:e})}else if(e.name===`UnknownError`)return new B({message:`The authenticator was unable to process the specified options, or could not create a new credential`,code:`ERROR_AUTHENTICATOR_GENERAL_ERROR`,cause:e});return new B({message:`a Non-Webauthn related error has occurred`,code:`ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`,cause:e})}function gi({error:e,options:t}){let{publicKey:n}=t;if(!n)throw Error(`options was missing required publicKey property`);if(e.name===`AbortError`){if(t.signal instanceof AbortSignal)return new B({message:`Authentication ceremony was sent an abort signal`,code:`ERROR_CEREMONY_ABORTED`,cause:e})}else if(e.name===`NotAllowedError`)return new B({message:e.message,code:`ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`,cause:e});else if(e.name===`SecurityError`){let t=window.location.hostname;if(!Si(t))return new B({message:`${window.location.hostname} is an invalid domain`,code:`ERROR_INVALID_DOMAIN`,cause:e});if(n.rpId!==t)return new B({message:`The RP ID "${n.rpId}" is invalid for this domain`,code:`ERROR_INVALID_RP_ID`,cause:e})}else if(e.name===`UnknownError`)return new B({message:`The authenticator was unable to process the specified options, or could not create a new assertion signature`,code:`ERROR_AUTHENTICATOR_GENERAL_ERROR`,cause:e});return new B({message:`a Non-Webauthn related error has occurred`,code:`ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`,cause:e})}var _i=new class{createNewAbortSignal(){if(this.controller){let e=Error(`Cancelling existing WebAuthn API call for new one`);e.name=`AbortError`,this.controller.abort(e)}let e=new AbortController;return this.controller=e,e.signal}cancelCeremony(){if(this.controller){let e=Error(`Manually cancelling existing WebAuthn API call`);e.name=`AbortError`,this.controller.abort(e),this.controller=void 0}}};function vi(e){if(!e)throw Error(`Credential creation options are required`);if(typeof PublicKeyCredential<`u`&&`parseCreationOptionsFromJSON`in PublicKeyCredential&&typeof PublicKeyCredential.parseCreationOptionsFromJSON==`function`)return PublicKeyCredential.parseCreationOptionsFromJSON(e);let{challenge:t,user:r,excludeCredentials:i}=e,a=n(e,[`challenge`,`user`,`excludeCredentials`]),o=cr(t).buffer,s=Object.assign(Object.assign({},r),{id:cr(r.id).buffer}),c=Object.assign(Object.assign({},a),{challenge:o,user:s});if(i&&i.length>0){c.excludeCredentials=Array(i.length);for(let e=0;e<i.length;e++){let t=i[e];c.excludeCredentials[e]=Object.assign(Object.assign({},t),{id:cr(t.id).buffer,type:t.type||`public-key`,transports:t.transports})}}return c}function yi(e){if(!e)throw Error(`Credential request options are required`);if(typeof PublicKeyCredential<`u`&&`parseRequestOptionsFromJSON`in PublicKeyCredential&&typeof PublicKeyCredential.parseRequestOptionsFromJSON==`function`)return PublicKeyCredential.parseRequestOptionsFromJSON(e);let{challenge:t,allowCredentials:r}=e,i=n(e,[`challenge`,`allowCredentials`]),a=cr(t).buffer,o=Object.assign(Object.assign({},i),{challenge:a});if(r&&r.length>0){o.allowCredentials=Array(r.length);for(let e=0;e<r.length;e++){let t=r[e];o.allowCredentials[e]=Object.assign(Object.assign({},t),{id:cr(t.id).buffer,type:t.type||`public-key`,transports:t.transports})}}return o}function bi(e){if(`toJSON`in e&&typeof e.toJSON==`function`)return e.toJSON();let t=e;return{id:e.id,rawId:e.id,response:{attestationObject:ur(new Uint8Array(e.response.attestationObject)),clientDataJSON:ur(new Uint8Array(e.response.clientDataJSON))},type:`public-key`,clientExtensionResults:e.getClientExtensionResults(),authenticatorAttachment:t.authenticatorAttachment??void 0}}function xi(e){if(`toJSON`in e&&typeof e.toJSON==`function`)return e.toJSON();let t=e,n=e.getClientExtensionResults(),r=e.response;return{id:e.id,rawId:e.id,response:{authenticatorData:ur(new Uint8Array(r.authenticatorData)),clientDataJSON:ur(new Uint8Array(r.clientDataJSON)),signature:ur(new Uint8Array(r.signature)),userHandle:r.userHandle?ur(new Uint8Array(r.userHandle)):void 0},type:`public-key`,clientExtensionResults:n,authenticatorAttachment:t.authenticatorAttachment??void 0}}function Si(e){return e===`localhost`||/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(e)}function Ci(){return!!(P()&&`PublicKeyCredential`in window&&window.PublicKeyCredential&&`credentials`in navigator&&typeof(navigator==null?void 0:navigator.credentials)?.create==`function`&&typeof(navigator==null?void 0:navigator.credentials)?.get==`function`)}async function wi(e){try{let t=await navigator.credentials.create(e);return t?t instanceof PublicKeyCredential?{data:t,error:null}:{data:null,error:new mi(`Browser returned unexpected credential type`,t)}:{data:null,error:new mi(`Empty credential response`,t)}}catch(t){return{data:null,error:hi({error:t,options:e})}}}async function Ti(e){try{let t=await navigator.credentials.get(e);return t?t instanceof PublicKeyCredential?{data:t,error:null}:{data:null,error:new mi(`Browser returned unexpected credential type`,t)}:{data:null,error:new mi(`Empty credential response`,t)}}catch(t){return{data:null,error:gi({error:t,options:e})}}}var Ei={hints:[`security-key`],authenticatorSelection:{authenticatorAttachment:`cross-platform`,requireResidentKey:!1,userVerification:`preferred`,residentKey:`discouraged`},attestation:`direct`},Di={userVerification:`preferred`,hints:[`security-key`],attestation:`direct`};function Oi(...e){let t=e=>typeof e==`object`&&!!e&&!Array.isArray(e),n=e=>e instanceof ArrayBuffer||ArrayBuffer.isView(e),r={};for(let i of e)if(i)for(let e in i){let a=i[e];if(a!==void 0){if(Array.isArray(a))r[e]=a;else if(n(a))r[e]=a;else if(t(a)){let n=r[e];r[e]=t(n)?Oi(n,a):Oi(a)}else r[e]=a}}return r}function ki(e,t){return Oi(Ei,e,t||{})}function Ai(e,t){return Oi(Di,e,t||{})}var ji=class{constructor(e){this.client=e,this.enroll=this._enroll.bind(this),this.challenge=this._challenge.bind(this),this.verify=this._verify.bind(this),this.authenticate=this._authenticate.bind(this),this.register=this._register.bind(this)}async _enroll(e){return this.client.mfa.enroll(Object.assign(Object.assign({},e),{factorType:`webauthn`}))}async _challenge({factorId:e,webauthn:t,friendlyName:n,signal:r},i){try{let{data:a,error:o}=await this.client.mfa.challenge({factorId:e,webauthn:t});if(!a)return{data:null,error:o};let s=r??_i.createNewAbortSignal();if(a.webauthn.type===`create`){let{user:e}=a.webauthn.credential_options.publicKey;if(!e.name){let t=n;if(t)e.name=`${e.id}:${t}`;else{let t=(await this.client.getUser()).data.user,n=t?.user_metadata?.name||t?.email||t?.id||`User`;e.name=`${e.id}:${n}`}}e.displayName||=e.name}switch(a.webauthn.type){case`create`:{let{data:t,error:n}=await wi({publicKey:ki(a.webauthn.credential_options.publicKey,i?.create),signal:s});return t?{data:{factorId:e,challengeId:a.id,webauthn:{type:a.webauthn.type,credential_response:t}},error:null}:{data:null,error:n}}case`request`:{let t=Ai(a.webauthn.credential_options.publicKey,i?.request),{data:n,error:r}=await Ti(Object.assign(Object.assign({},a.webauthn.credential_options),{publicKey:t,signal:s}));return n?{data:{factorId:e,challengeId:a.id,webauthn:{type:a.webauthn.type,credential_response:n}},error:null}:{data:null,error:r}}}}catch(e){return A(e)?{data:null,error:e}:{data:null,error:new j(`Unexpected error in challenge`,e)}}}async _verify({challengeId:e,factorId:t,webauthn:n}){return this.client.mfa.verify({factorId:t,challengeId:e,webauthn:n})}async _authenticate({factorId:e,webauthn:{rpId:t=typeof window<`u`?window.location.hostname:void 0,rpOrigins:n=typeof window<`u`?[window.location.origin]:void 0,signal:r}={}},i){if(!t)return{data:null,error:new Ln(`rpId is required for WebAuthn authentication`)};try{if(!Ci())return{data:null,error:new j(`Browser does not support WebAuthn`,null)};let{data:a,error:o}=await this.challenge({factorId:e,webauthn:{rpId:t,rpOrigins:n},signal:r},{request:i});if(!a)return{data:null,error:o};let{webauthn:s}=a;return this._verify({factorId:e,challengeId:a.challengeId,webauthn:{type:s.type,rpId:t,rpOrigins:n,credential_response:s.credential_response}})}catch(e){return A(e)?{data:null,error:e}:{data:null,error:new j(`Unexpected error in authenticate`,e)}}}async _register({friendlyName:e,webauthn:{rpId:t=typeof window<`u`?window.location.hostname:void 0,rpOrigins:n=typeof window<`u`?[window.location.origin]:void 0,signal:r}={}},i){if(!t)return{data:null,error:new Ln(`rpId is required for WebAuthn registration`)};try{if(!Ci())return{data:null,error:new j(`Browser does not support WebAuthn`,null)};let{data:a,error:o}=await this._enroll({friendlyName:e});if(!a)return await this.client.mfa.listFactors().then(t=>t.data?.all.find(t=>t.factor_type===`webauthn`&&t.friendly_name===e&&t.status===`unverified`)).then(e=>e?this.client.mfa.unenroll({factorId:e?.id}):void 0),{data:null,error:o};let{data:s,error:c}=await this._challenge({factorId:a.id,friendlyName:a.friendly_name,webauthn:{rpId:t,rpOrigins:n},signal:r},{create:i});return s?this._verify({factorId:a.id,challengeId:s.challengeId,webauthn:{rpId:t,rpOrigins:n,type:s.webauthn.type,credential_response:s.webauthn.credential_response}}):{data:null,error:c}}catch(e){return A(e)?{data:null,error:e}:{data:null,error:new j(`Unexpected error in register`,e)}}}};li();var Mi={url:An,storageKey:jn,autoRefreshToken:!0,persistSession:!0,detectSessionInUrl:!0,headers:Mn,flowType:`implicit`,debug:!1,hasCustomAuthorizationHeader:!1,throwOnError:!1,lockAcquireTimeout:5e3,skipAutoInitialize:!1,experimental:{}},Ni={},Pi=!1,Fi=class e{get jwks(){return Ni[this.storageKey]?.jwks??{keys:[]}}set jwks(e){Ni[this.storageKey]=Object.assign(Object.assign({},Ni[this.storageKey]),{jwks:e})}get jwks_cached_at(){return Ni[this.storageKey]?.cachedAt??-(2**53-1)}set jwks_cached_at(e){Ni[this.storageKey]=Object.assign(Object.assign({},Ni[this.storageKey]),{cachedAt:e})}constructor(t){var n;this.userStorage=null,this.memoryStorage=null,this.stateChangeEmitters=new Map,this.autoRefreshTicker=null,this.autoRefreshTickTimeout=null,this.visibilityChangedCallback=null,this.refreshingDeferred=null,this.lastRefreshFailure=null,this._sessionRemovalEpoch=0,this.initializePromise=null,this._pendingInitNotifications=null,this.detectSessionInUrl=!0,this.hasCustomAuthorizationHeader=!1,this.suppressGetSessionWarning=!1,this.lock=null,this.lockAcquired=!1,this.pendingInLock=[],this.broadcastChannel=null,this.logger=console.log;let r=Object.assign(Object.assign({},Mi),t);if(this.storageKey=r.storageKey,this.instanceID=e.nextInstanceID[this.storageKey]??0,e.nextInstanceID[this.storageKey]=this.instanceID+1,this.logDebugMessages=!!r.debug,typeof r.debug==`function`&&(this.logger=r.debug),this.instanceID>0&&P()){let e=`${this._logPrefix()} Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.`;console.warn(e),this.logDebugMessages&&console.trace(e)}if(this.persistSession=r.persistSession,this.autoRefreshToken=r.autoRefreshToken,this.experimental=r.experimental??{},this.admin=new oi({url:r.url,headers:r.headers,fetch:r.fetch,experimental:this.experimental}),this.url=r.url,this.headers=r.headers,this.fetch=gr(r.fetch),this.detectSessionInUrl=r.detectSessionInUrl,this.flowType=r.flowType,this.hasCustomAuthorizationHeader=r.hasCustomAuthorizationHeader,this.throwOnError=r.throwOnError,this.lockAcquireTimeout=r.lockAcquireTimeout,r.lock!=null&&(this.lock=r.lock,Pi||(Pi=!0,console.warn(`${this._logPrefix()} The "lock" option is deprecated and will be removed in v3. The client now coordinates session refreshes without a lock, so most apps can drop the option. See https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/migrations/lockless-coordination.md`))),this.jwks||(this.jwks={keys:[]},this.jwks_cached_at=-(2**53-1)),this.mfa={verify:this._verify.bind(this),enroll:this._enroll.bind(this),unenroll:this._unenroll.bind(this),challenge:this._challenge.bind(this),listFactors:this._listFactors.bind(this),challengeAndVerify:this._challengeAndVerify.bind(this),getAuthenticatorAssuranceLevel:this._getAuthenticatorAssuranceLevel.bind(this),webauthn:new ji(this),recoveryCodes:{getStatus:this._getRecoveryCodesStatus.bind(this),generate:this._generateRecoveryCodes.bind(this),verify:this._verifyRecoveryCode.bind(this),regenerate:this._regenerateRecoveryCodes.bind(this),unenroll:this._unenrollRecoveryCodes.bind(this)}},this.oauth={getAuthorizationDetails:this._getAuthorizationDetails.bind(this),approveAuthorization:this._approveAuthorization.bind(this),denyAuthorization:this._denyAuthorization.bind(this),listGrants:this._listOAuthGrants.bind(this),revokeGrant:this._revokeOAuthGrant.bind(this)},this.passkey={startRegistration:this._startPasskeyRegistration.bind(this),verifyRegistration:this._verifyPasskeyRegistration.bind(this),startAuthentication:this._startPasskeyAuthentication.bind(this),verifyAuthentication:this._verifyPasskeyAuthentication.bind(this),list:this._listPasskeys.bind(this),update:this._updatePasskey.bind(this),delete:this._deletePasskey.bind(this)},this.persistSession?(r.storage?this.storage=r.storage:mr()?this.storage=globalThis.localStorage:(this.memoryStorage={},this.storage=si(this.memoryStorage)),r.userStorage&&(this.userStorage=r.userStorage)):(this.memoryStorage={},this.storage=si(this.memoryStorage)),P()&&globalThis.BroadcastChannel&&this.persistSession&&this.storageKey){try{this.broadcastChannel=new globalThis.BroadcastChannel(this.storageKey)}catch(e){console.error(`Failed to create a new BroadcastChannel, multi-tab state changes will not be available`,e)}(n=this.broadcastChannel)==null||n.addEventListener(`message`,async e=>{this._debug(`received broadcast notification from other tab or client`,e),(e.data.event===`TOKEN_REFRESHED`||e.data.event===`SIGNED_IN`)&&(this.lastRefreshFailure=null);try{await this._notifyAllSubscribers(e.data.event,e.data.session,!1)}catch(e){this._debug(`#broadcastChannel`,`error`,e)}})}r.skipAutoInitialize||this.initialize().catch(e=>{this._debug(`#initialize()`,`error`,e)})}isThrowOnErrorEnabled(){return this.throwOnError}_returnResult(e){if(this.throwOnError&&e&&e.error)throw e.error;return e}_logPrefix(){return`GoTrueClient@${this.storageKey}:${this.instanceID} (${En}) ${new Date().toISOString()}`}_debug(...e){return this.logDebugMessages&&this.logger(this._logPrefix(),...e),this}async initialize(){if(this.initializePromise)return await this.initializePromise;this._pendingInitNotifications=[],this.initializePromise=(async()=>this.lock==null?await this._initialize():await this._acquireLock(this.lockAcquireTimeout,async()=>await this._initialize()))();let e=await this.initializePromise,t=this._pendingInitNotifications??[];this._pendingInitNotifications=null;for(let e of t)await this._notifyAllSubscribers(e.event,e.session,e.broadcast);return e}async _initialize(){try{let e={},t=`none`;if(P()&&(e=hr(window.location.href),this._isImplicitGrantCallback(e)?t=`implicit`:await this._isPKCECallback(e)&&(t=`pkce`)),P()&&this.detectSessionInUrl&&t!==`none`){let{data:n,error:r}=await this._getSessionFromURL(e,t);if(r){if(this._debug(`#_initialize()`,`error detecting session from URL`,r),Wn(r)){let e=r.details?.code;if(e===`identity_already_exists`||e===`identity_not_found`||e===`single_identity_not_deletable`)return{error:r}}return{error:r}}let{session:i,redirectType:a}=n;return this._debug(`#_initialize()`,`detected session in URL`,i,`redirect type`,a),await this._saveSession(i),setTimeout(async()=>{a===`recovery`?await this._notifyAllSubscribers(`PASSWORD_RECOVERY`,i):await this._notifyAllSubscribers(`SIGNED_IN`,i)},0),{error:null}}return await this._recoverAndRefresh(),{error:null}}catch(e){return A(e)?this._returnResult({error:e}):this._returnResult({error:new j(`Unexpected error during initialization`,e)})}finally{await this._handleVisibilityChange(),this._debug(`#_initialize()`,`end`)}}async signInAnonymously(e){try{let{data:t,error:n}=await R(this.fetch,`POST`,`${this.url}/signup`,{headers:this.headers,body:{data:e?.options?.data??{},gotrue_meta_security:{captcha_token:e?.options?.captchaToken}},xform:z});if(n||!t)return this._returnResult({data:{user:null,session:null},error:n});let r=t.session,i=t.user;return t.session&&(await this._saveSession(t.session),await this._notifyAllSubscribers(`SIGNED_IN`,r)),this._returnResult({data:{user:i,session:r},error:null})}catch(e){if(A(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async signUp(e){let t=null;try{let n;if(`email`in e){let{email:r,password:i,options:a}=e,o=null,s=null;this.flowType===`pkce`&&([o,s,t]=await this._getCodeChallengeAndMethod()),n=await R(this.fetch,`POST`,`${this.url}/signup`,{headers:this.headers,redirectTo:this._maybeAppendFlowIdToRedirect(a?.emailRedirectTo,t),body:{email:r,password:i,data:a?.data??{},gotrue_meta_security:{captcha_token:a?.captchaToken},code_challenge:o,code_challenge_method:s},xform:z})}else if(`phone`in e){let{phone:t,password:r,options:i}=e;n=await R(this.fetch,`POST`,`${this.url}/signup`,{headers:this.headers,body:{phone:t,password:r,data:i?.data??{},channel:i?.channel??`sms`,gotrue_meta_security:{captcha_token:i?.captchaToken}},xform:z})}else throw new Hn(`You must provide either an email or phone number and a password`);let{data:r,error:i}=n;if(i||!r)return await L(this.storage,this.storageKey,t),this._returnResult({data:{user:null,session:null},error:i});let a=r.session,o=r.user;return r.session&&(await this._saveSession(r.session),await this._notifyAllSubscribers(`SIGNED_IN`,a)),this._returnResult({data:{user:o,session:a},error:null})}catch(e){if(await L(this.storage,this.storageKey,t),A(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async signInWithPassword(e){try{let t;if(`email`in e){let{email:n,password:r,options:i}=e;t=await R(this.fetch,`POST`,`${this.url}/token?grant_type=password`,{headers:this.headers,body:{email:n,password:r,gotrue_meta_security:{captcha_token:i?.captchaToken}},xform:$r})}else if(`phone`in e){let{phone:n,password:r,options:i}=e;t=await R(this.fetch,`POST`,`${this.url}/token?grant_type=password`,{headers:this.headers,body:{phone:n,password:r,gotrue_meta_security:{captcha_token:i?.captchaToken}},xform:$r})}else throw new Hn(`You must provide either an email or phone number and a password`);let{data:n,error:r}=t;if(r)return this._returnResult({data:{user:null,session:null},error:r});if(!n||!n.session||!n.user){let e=new Vn;return this._returnResult({data:{user:null,session:null},error:e})}return n.session&&(await this._saveSession(n.session),await this._notifyAllSubscribers(`SIGNED_IN`,n.session)),this._returnResult({data:Object.assign({user:n.user,session:n.session},n.weak_password?{weakPassword:n.weak_password}:null),error:r})}catch(e){if(A(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async signInWithOAuth(e){return await this._handleProviderSignIn(e.provider,{redirectTo:e.options?.redirectTo,scopes:e.options?.scopes,queryParams:e.options?.queryParams,skipBrowserRedirect:e.options?.skipBrowserRedirect})}async exchangeCodeForSession(e,t){return await this.initializePromise,this.lock==null?this._exchangeCodeForSession(e,t):this._acquireLock(this.lockAcquireTimeout,async()=>this._exchangeCodeForSession(e,t))}async signInWithWeb3(e){let{chain:t}=e;switch(t){case`ethereum`:return await this.signInWithEthereum(e);case`solana`:return await this.signInWithSolana(e);default:throw Error(`@supabase/auth-js: Unsupported chain "${t}"`)}}async signInWithEthereum(e){let t,n;if(`message`in e)t=e.message,n=e.signature;else{let{chain:r,wallet:i,statement:a,options:o}=e,s;if(!P()){if(typeof i!=`object`||!o?.url)throw Error(`@supabase/auth-js: Both wallet and url must be specified in non-browser environments.`);s=i}else if(typeof i==`object`)s=i;else{let e=window;if(`ethereum`in e&&typeof e.ethereum==`object`&&`request`in e.ethereum&&typeof e.ethereum.request==`function`)s=e.ethereum;else throw Error(`@supabase/auth-js: No compatible Ethereum wallet interface on the window object (window.ethereum) detected. Make sure the user already has a wallet installed and connected for this app. Prefer passing the wallet interface object directly to signInWithWeb3({ chain: 'ethereum', wallet: resolvedUserWallet }) instead.`)}let c=new URL(o?.url??window.location.href),l=await s.request({method:`eth_requestAccounts`}).then(e=>e).catch(()=>{throw Error(`@supabase/auth-js: Wallet method eth_requestAccounts is missing or invalid`)});if(!l||l.length===0)throw Error(`@supabase/auth-js: No accounts available. Please ensure the wallet is connected.`);let u=ui(l[0]),d=o?.signInWithEthereum?.chainId;d||=di(await s.request({method:`eth_chainId`})),t=pi({domain:c.host,address:u,statement:a,uri:c.href,version:`1`,chainId:d,nonce:o?.signInWithEthereum?.nonce,issuedAt:o?.signInWithEthereum?.issuedAt??new Date,expirationTime:o?.signInWithEthereum?.expirationTime,notBefore:o?.signInWithEthereum?.notBefore,requestId:o?.signInWithEthereum?.requestId,resources:o?.signInWithEthereum?.resources}),n=await s.request({method:`personal_sign`,params:[fi(t),u]})}try{let{data:r,error:i}=await R(this.fetch,`POST`,`${this.url}/token?grant_type=web3`,{headers:this.headers,body:Object.assign({chain:`ethereum`,message:t,signature:n},e.options?.captchaToken?{gotrue_meta_security:{captcha_token:e.options?.captchaToken}}:null),xform:z});if(i)throw i;if(!r||!r.session||!r.user){let e=new Vn;return this._returnResult({data:{user:null,session:null},error:e})}return r.session&&(await this._saveSession(r.session),await this._notifyAllSubscribers(`SIGNED_IN`,r.session)),this._returnResult({data:Object.assign({},r),error:i})}catch(e){if(A(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async signInWithSolana(e){let t,n;if(`message`in e)t=e.message,n=e.signature;else{let{chain:r,wallet:i,statement:a,options:o}=e,s;if(!P()){if(typeof i!=`object`||!o?.url)throw Error(`@supabase/auth-js: Both wallet and url must be specified in non-browser environments.`);s=i}else if(typeof i==`object`)s=i;else{let e=window;if(`solana`in e&&typeof e.solana==`object`&&(`signIn`in e.solana&&typeof e.solana.signIn==`function`||`signMessage`in e.solana&&typeof e.solana.signMessage==`function`))s=e.solana;else throw Error(`@supabase/auth-js: No compatible Solana wallet interface on the window object (window.solana) detected. Make sure the user already has a wallet installed and connected for this app. Prefer passing the wallet interface object directly to signInWithWeb3({ chain: 'solana', wallet: resolvedUserWallet }) instead.`)}let c=new URL(o?.url??window.location.href);if(`signIn`in s&&s.signIn){let e=await s.signIn(Object.assign(Object.assign(Object.assign({issuedAt:new Date().toISOString()},o?.signInWithSolana),{version:`1`,domain:c.host,uri:c.href}),a?{statement:a}:null)),r;if(Array.isArray(e)&&e[0]&&typeof e[0]==`object`)r=e[0];else if(e&&typeof e==`object`&&`signedMessage`in e&&`signature`in e)r=e;else throw Error(`@supabase/auth-js: Wallet method signIn() returned unrecognized value`);if(`signedMessage`in r&&`signature`in r&&(typeof r.signedMessage==`string`||r.signedMessage instanceof Uint8Array)&&r.signature instanceof Uint8Array)t=typeof r.signedMessage==`string`?r.signedMessage:new TextDecoder().decode(r.signedMessage),n=r.signature;else throw Error(`@supabase/auth-js: Wallet method signIn() API returned object without signedMessage and signature fields`)}else{if(!(`signMessage`in s)||typeof s.signMessage!=`function`||!(`publicKey`in s)||typeof s!=`object`||!s.publicKey||!(`toBase58`in s.publicKey)||typeof s.publicKey.toBase58!=`function`)throw Error(`@supabase/auth-js: Wallet does not have a compatible signMessage() and publicKey.toBase58() API`);t=[`${c.host} wants you to sign in with your Solana account:`,s.publicKey.toBase58(),...a?[``,a,``]:[``],`Version: 1`,`URI: ${c.href}`,`Issued At: ${o?.signInWithSolana?.issuedAt??new Date().toISOString()}`,...o?.signInWithSolana?.notBefore?[`Not Before: ${o.signInWithSolana.notBefore}`]:[],...o?.signInWithSolana?.expirationTime?[`Expiration Time: ${o.signInWithSolana.expirationTime}`]:[],...o?.signInWithSolana?.chainId?[`Chain ID: ${o.signInWithSolana.chainId}`]:[],...o?.signInWithSolana?.nonce?[`Nonce: ${o.signInWithSolana.nonce}`]:[],...o?.signInWithSolana?.requestId?[`Request ID: ${o.signInWithSolana.requestId}`]:[],...o?.signInWithSolana?.resources?.length?[`Resources`,...o.signInWithSolana.resources.map(e=>`- ${e}`)]:[]].join(`
`);let e=await s.signMessage(new TextEncoder().encode(t),`utf8`);if(!e||!(e instanceof Uint8Array))throw Error(`@supabase/auth-js: Wallet signMessage() API returned an recognized value`);n=e}}try{let{data:r,error:i}=await R(this.fetch,`POST`,`${this.url}/token?grant_type=web3`,{headers:this.headers,body:Object.assign({chain:`solana`,message:t,signature:ur(n)},e.options?.captchaToken?{gotrue_meta_security:{captcha_token:e.options?.captchaToken}}:null),xform:z});if(i)throw i;if(!r||!r.session||!r.user){let e=new Vn;return this._returnResult({data:{user:null,session:null},error:e})}return r.session&&(await this._saveSession(r.session),await this._notifyAllSubscribers(`SIGNED_IN`,r.session)),this._returnResult({data:Object.assign({},r),error:i})}catch(e){if(A(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async _exchangeCodeForSession(e,t){let n=t?.flowId!=null,r=n?Or(t?.flowId):P()?Or(hr(window.location.href)[In]):null;n&&!r&&this._debug(`#_exchangeCodeForSession()`,`provided flowId is not a valid flow id`,t?.flowId);let{verifier:i,flowId:a}=n&&!r?{verifier:null,flowId:null}:await Pr(this.storage,this.storageKey,r),[o,s]=(i??``).split(`/`);try{if(!o&&this.flowType===`pkce`)throw new Kn;let{data:t,error:n}=await R(this.fetch,`POST`,`${this.url}/token?grant_type=pkce`,{headers:this.headers,body:{auth_code:e,code_verifier:o},xform:z});if(await L(this.storage,this.storageKey,a),n)throw n;if(!t||!t.session||!t.user){let e=new Vn;return this._returnResult({data:{user:null,session:null,redirectType:null},error:e})}return t.session&&(await this._saveSession(t.session),await this._notifyAllSubscribers(s===`recovery`?`PASSWORD_RECOVERY`:`SIGNED_IN`,t.session)),this._returnResult({data:Object.assign(Object.assign({},t),{redirectType:s??null}),error:n})}catch(e){if(await L(this.storage,this.storageKey,a),A(e))return this._returnResult({data:{user:null,session:null,redirectType:null},error:e});throw e}}async signInWithIdToken(e){try{let{options:t,provider:n,token:r,access_token:i,nonce:a}=e,{data:o,error:s}=await R(this.fetch,`POST`,`${this.url}/token?grant_type=id_token`,{headers:this.headers,body:{provider:n,id_token:r,access_token:i,nonce:a,gotrue_meta_security:{captcha_token:t?.captchaToken}},xform:z});if(s)return this._returnResult({data:{user:null,session:null},error:s});if(!o||!o.session||!o.user){let e=new Vn;return this._returnResult({data:{user:null,session:null},error:e})}return o.session&&(await this._saveSession(o.session),await this._notifyAllSubscribers(`SIGNED_IN`,o.session)),this._returnResult({data:o,error:s})}catch(e){if(A(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async signInWithOtp(e){let t=null;try{if(`email`in e){let{email:n,options:r}=e,i=null,a=null;this.flowType===`pkce`&&([i,a,t]=await this._getCodeChallengeAndMethod());let{error:o}=await R(this.fetch,`POST`,`${this.url}/otp`,{headers:this.headers,body:{email:n,data:r?.data??{},create_user:r?.shouldCreateUser??!0,gotrue_meta_security:{captcha_token:r?.captchaToken},code_challenge:i,code_challenge_method:a},redirectTo:this._maybeAppendFlowIdToRedirect(r?.emailRedirectTo,t)});return this._returnResult({data:{user:null,session:null},error:o})}if(`phone`in e){let{phone:t,options:n}=e,{data:r,error:i}=await R(this.fetch,`POST`,`${this.url}/otp`,{headers:this.headers,body:{phone:t,data:n?.data??{},create_user:n?.shouldCreateUser??!0,gotrue_meta_security:{captcha_token:n?.captchaToken},channel:n?.channel??`sms`}});return this._returnResult({data:{user:null,session:null,messageId:r?.message_id},error:i})}throw new Hn(`You must provide either an email or phone number.`)}catch(e){if(await L(this.storage,this.storageKey,t),A(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async verifyOtp(e){try{let t,n;`options`in e&&(t=e.options?.redirectTo,n=e.options?.captchaToken);let{data:r,error:i}=await R(this.fetch,`POST`,`${this.url}/verify`,{headers:this.headers,body:Object.assign(Object.assign({},e),{gotrue_meta_security:{captcha_token:n}}),redirectTo:t,xform:z});if(i)throw i;if(!r)throw Error(`An error occurred on token verification.`);let a=r.session,o=r.user;return a?.access_token&&(await this._saveSession(a),await this._notifyAllSubscribers(e.type==`recovery`?`PASSWORD_RECOVERY`:`SIGNED_IN`,a)),this._returnResult({data:{user:o,session:a},error:null})}catch(e){if(A(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async signInWithSSO(e){let t=null;try{let n=null,r=null;this.flowType===`pkce`&&([n,r,t]=await this._getCodeChallengeAndMethod());let i=await R(this.fetch,`POST`,`${this.url}/sso`,{body:Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({},`providerId`in e?{provider_id:e.providerId}:null),`domain`in e?{domain:e.domain}:null),{redirect_to:this._maybeAppendFlowIdToRedirect(e.options?.redirectTo,t)}),e?.options?.captchaToken?{gotrue_meta_security:{captcha_token:e.options.captchaToken}}:null),{skip_http_redirect:!0,code_challenge:n,code_challenge_method:r}),headers:this.headers,xform:ti});return i.data?.url&&P()&&!e.options?.skipBrowserRedirect&&window.location.assign(i.data.url),this._returnResult(i)}catch(e){if(await L(this.storage,this.storageKey,t),A(e))return this._returnResult({data:null,error:e});throw e}}async reauthenticate(){return await this.initializePromise,this.lock==null?await this._reauthenticate():await this._acquireLock(this.lockAcquireTimeout,async()=>await this._reauthenticate())}async _reauthenticate(){try{return await this._useSession(async e=>{let{data:{session:t},error:n}=e;if(n)throw n;if(!t)throw new N;let{error:r}=await R(this.fetch,`GET`,`${this.url}/reauthenticate`,{headers:this.headers,jwt:t.access_token});return this._returnResult({data:{user:null,session:null},error:r})})}catch(e){if(A(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async resend(e){let t=null;try{let n=`${this.url}/resend`;if(`email`in e){let{email:r,type:i,options:a}=e,o=null,s=null;this.flowType===`pkce`&&([o,s,t]=await this._getCodeChallengeAndMethod());let{error:c}=await R(this.fetch,`POST`,n,{headers:this.headers,body:{email:r,type:i,gotrue_meta_security:{captcha_token:a?.captchaToken},code_challenge:o,code_challenge_method:s},redirectTo:this._maybeAppendFlowIdToRedirect(a?.emailRedirectTo,t)});return c&&await L(this.storage,this.storageKey,t),this._returnResult({data:{user:null,session:null},error:c})}if(`phone`in e){let{phone:t,type:r,options:i}=e,{data:a,error:o}=await R(this.fetch,`POST`,n,{headers:this.headers,body:{phone:t,type:r,gotrue_meta_security:{captcha_token:i?.captchaToken}}});return this._returnResult({data:{user:null,session:null,messageId:a?.message_id},error:o})}throw new Hn(`You must provide either an email or phone number and a type`)}catch(e){if(await L(this.storage,this.storageKey,t),A(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async getSession(){return await this.initializePromise,this.lock==null?await this._useSession(async e=>e):await this._acquireLock(this.lockAcquireTimeout,async()=>this._useSession(async e=>e))}async _acquireLock(e,t){this._debug(`#_acquireLock`,`begin`,e);try{if(this.lockAcquired){let e=this.pendingInLock.length?this.pendingInLock[this.pendingInLock.length-1]:Promise.resolve(),n=(async()=>(await e,await t()))();return this.pendingInLock.push((async()=>{try{await n}catch{}})()),n}return await this.lock(`lock:${this.storageKey}`,e,async()=>{this._debug(`#_acquireLock`,`lock acquired for storage key`,this.storageKey);try{this.lockAcquired=!0;let e=t();for(this.pendingInLock.push((async()=>{try{await e}catch{}})()),await e;this.pendingInLock.length;){let e=[...this.pendingInLock];await Promise.all(e),this.pendingInLock.splice(0,e.length)}return await e}finally{this._debug(`#_acquireLock`,`lock released for storage key`,this.storageKey),this.lockAcquired=!1}})}finally{this._debug(`#_acquireLock`,`end`)}}async _useSession(e){this._debug(`#_useSession`,`begin`);try{return await e(await this.__loadSession())}finally{this._debug(`#_useSession`,`end`)}}async __loadSession(){this._debug(`#__loadSession()`,`begin`),this.lock!=null&&!this.lockAcquired&&this._debug(`#__loadSession()`,`used outside of an acquired lock!`,Error().stack);try{let e=null,t=await F(this.storage,this.storageKey);if(this._debug(`#getSession()`,`session from storage`,t),t!==null&&(this._isValidSession(t)?e=t:(this._debug(`#getSession()`,`session from storage is not valid`),await this._removeSession())),!e)return{data:{session:null},error:null};let n=e.expires_at?e.expires_at*1e3-Date.now()<On:!1;if(this._debug(`#__loadSession()`,`session has${n?``:` not`} expired`,`expires_at`,e.expires_at),!n)return{data:{session:await this._hydrateSessionUser(e)},error:null};let{data:r,error:i}=await this._callRefreshToken(e.refresh_token);if(i){let e=await F(this.storage,this.storageKey);return e&&this._isValidSession(e)&&e.expires_at&&e.expires_at*1e3>Date.now()?this._returnResult({data:{session:await this._hydrateSessionUser(e)},error:null}):this._returnResult({data:{session:null},error:i})}return this._returnResult({data:{session:r},error:null})}finally{this._debug(`#__loadSession()`,`end`)}}async _hydrateSessionUser(e){if(this.userStorage){let t=await F(this.userStorage,this.storageKey+`-user`);e.user=t?.user?t.user:Gr()}if(this.storage.isServer&&e.user&&!e.user.__isUserNotAvailableProxy){let t={value:this.suppressGetSessionWarning};e.user=Kr(e.user,t),t.value&&(this.suppressGetSessionWarning=!0)}return e}async getUser(e){if(e)return await this._getUser(e);await this.initializePromise;let t;return t=this.lock==null?await this._getUser():await this._acquireLock(this.lockAcquireTimeout,async()=>await this._getUser()),t.data.user&&(this.suppressGetSessionWarning=!0),t}async _getUser(e){try{return e?await R(this.fetch,`GET`,`${this.url}/user`,{headers:this.headers,jwt:e,xform:ei}):await this._useSession(async e=>{let{data:t,error:n}=e;if(n)throw n;return!t.session?.access_token&&!this.hasCustomAuthorizationHeader?{data:{user:null},error:new N}:await R(this.fetch,`GET`,`${this.url}/user`,{headers:this.headers,jwt:t.session?.access_token??void 0,xform:ei})})}catch(e){if(A(e))return Bn(e)&&await this._removeSession(),this._returnResult({data:{user:null},error:e});throw e}}async updateUser(e,t={}){return await this.initializePromise,this.lock==null?await this._updateUser(e,t):await this._acquireLock(this.lockAcquireTimeout,async()=>await this._updateUser(e,t))}async _updateUser(e,t={}){let n=null;try{return await this._useSession(async r=>{let{data:i,error:a}=r;if(a)throw a;if(!i.session)throw new N;let o=i.session,s=null,c=null;this.flowType===`pkce`&&e.email!=null&&([s,c,n]=await this._getCodeChallengeAndMethod());let{data:l,error:u}=await R(this.fetch,`PUT`,`${this.url}/user`,{headers:this.headers,redirectTo:this._maybeAppendFlowIdToRedirect(t?.emailRedirectTo,n),body:Object.assign(Object.assign({},e),{code_challenge:s,code_challenge_method:c}),jwt:o.access_token,xform:ei});if(u)throw u;return o.user=l.user,await this._saveSession(o),await this._notifyAllSubscribers(`USER_UPDATED`,o),this._returnResult({data:{user:o.user},error:null})})}catch(e){if(await L(this.storage,this.storageKey,n),A(e))return this._returnResult({data:{user:null},error:e});throw e}}async setSession(e){return await this.initializePromise,this.lock==null?await this._setSession(e):await this._acquireLock(this.lockAcquireTimeout,async()=>await this._setSession(e))}async _setSession(e){try{if(!e.access_token||!e.refresh_token)throw new N;let t=Date.now()/1e3,n=t,r=!0,i=null,{payload:a}=br(e.access_token);if(a.exp&&(n=a.exp,r=n<=t),r){let{data:t,error:n}=await this._callRefreshToken(e.refresh_token);if(n)return this._returnResult({data:{user:null,session:null},error:n});if(!t)return{data:{user:null,session:null},error:null};i=t}else{let{data:r,error:a}=await this._getUser(e.access_token);if(a)return this._returnResult({data:{user:null,session:null},error:a});i={access_token:e.access_token,refresh_token:e.refresh_token,user:r.user,token_type:`bearer`,expires_in:n-t,expires_at:n},await this._saveSession(i),await this._notifyAllSubscribers(`SIGNED_IN`,i)}return this._returnResult({data:{user:i.user,session:i},error:null})}catch(e){if(A(e))return this._returnResult({data:{session:null,user:null},error:e});throw e}}async refreshSession(e){return await this.initializePromise,this.lock==null?await this._refreshSession(e):await this._acquireLock(this.lockAcquireTimeout,async()=>await this._refreshSession(e))}async _refreshSession(e){try{return await this._useSession(async t=>{if(!e){let{data:n,error:r}=t;if(r)throw r;e=n.session??void 0}if(!e?.refresh_token)throw new N;let{data:n,error:r}=await this._callRefreshToken(e.refresh_token);return r?this._returnResult({data:{user:null,session:null},error:r}):n?this._returnResult({data:{user:n.user,session:n},error:null}):this._returnResult({data:{user:null,session:null},error:null})})}catch(e){if(A(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async _getSessionFromURL(e,t){try{if(!P())throw new Un(`No browser detected.`);if(e.error||e.error_description||e.error_code)throw new Un(e.error_description||`Error in URL with unspecified error_description`,{error:e.error||`unspecified_error`,code:e.error_code||`unspecified_code`});switch(t){case`implicit`:if(this.flowType===`pkce`)throw new Gn(`Not a valid PKCE flow url.`);break;case`pkce`:if(this.flowType===`implicit`)throw new Un(`Not a valid implicit grant flow url.`)}if(t===`pkce`){if(this._debug(`#_initialize()`,`begin`,`is PKCE flow`,!0),!e.code)throw new Gn(`No code detected.`);let{data:t,error:n}=await this._exchangeCodeForSession(e.code,{flowId:e[In]});if(n)throw n;let r=new URL(window.location.href);return r.searchParams.delete(`code`),r.searchParams.delete(In),window.history.replaceState(window.history.state,``,r.toString()),{data:{session:t.session,redirectType:t.redirectType??null},error:null}}let{provider_token:n,provider_refresh_token:r,access_token:i,refresh_token:a,expires_in:o,expires_at:s,token_type:c}=e;if(!i||!o||!a||!c)throw new Un(`No session defined in URL`);let l=Math.round(Date.now()/1e3),u=parseInt(o),d=l+u;s&&(d=parseInt(s));let f=d-l;f*1e3<=3e4&&console.warn(`@supabase/gotrue-js: Session as retrieved from URL expires in ${f}s, should have been closer to ${u}s`);let p=d-u;l-p>=120?console.warn(`@supabase/gotrue-js: Session as retrieved from URL was issued over 120s ago, URL could be stale`,p,d,l):l-p<0&&console.warn(`@supabase/gotrue-js: Session as retrieved from URL was issued in the future? Check the device clock for skew`,p,d,l);let{data:m,error:h}=await this._getUser(i);if(h)throw h;let g={provider_token:n,provider_refresh_token:r,access_token:i,expires_in:u,expires_at:d,refresh_token:a,token_type:c,user:m.user};return window.location.hash=``,this._debug(`#_getSessionFromURL()`,`clearing window.location.hash`),this._returnResult({data:{session:g,redirectType:e.type},error:null})}catch(e){if(A(e))return this._returnResult({data:{session:null,redirectType:null},error:e});throw e}}_isImplicitGrantCallback(e){return typeof this.detectSessionInUrl==`function`?this.detectSessionInUrl(new URL(window.location.href),e):!!(e.access_token||e.error||e.error_description||e.error_code)}async _isPKCECallback(e){if(!e.code)return!1;let t=Or(e[In]);return t&&await F(this.storage,Ar(this.storageKey,t))?!0:!!await F(this.storage,`${this.storageKey}-code-verifier`)}async signOut(e={scope:`global`}){return await this.initializePromise,this.lock==null?await this._signOut(e):await this._acquireLock(this.lockAcquireTimeout,async()=>await this._signOut(e))}async _signOut({scope:e}={scope:`global`}){return await this._useSession(async t=>{let n=async()=>{await this._removeSession()},{data:r,error:i}=t;if(i&&!Bn(i))return this._returnResult({error:i});let a=r.session?.access_token;if(a){let{error:t}=await this.admin.signOut(a,e);if(t&&!(zn(t)&&(t.status===404||t.status===401||t.status===403)||Bn(t)))return e!==`others`&&await n(),this._returnResult({error:t})}return e!==`others`&&await n(),this._returnResult({error:null})})}onAuthStateChange(e){let t=fr(),n={id:t,callback:e,unsubscribe:()=>{this._debug(`#unsubscribe()`,`state change callback with id removed`,t),this.stateChangeEmitters.delete(t)}};return this._debug(`#onAuthStateChange()`,`registered callback with id`,t),this.stateChangeEmitters.set(t,n),(async()=>{await this.initializePromise,this.lock==null?await this._emitInitialSession(t):await this._acquireLock(this.lockAcquireTimeout,async()=>{this._emitInitialSession(t)})})(),{data:{subscription:n}}}async _emitInitialSession(e){return await this._useSession(async t=>{try{let{data:{session:n},error:r}=t;if(r)throw r;await this.stateChangeEmitters.get(e)?.callback(`INITIAL_SESSION`,n),this._debug(`INITIAL_SESSION`,`callback id`,e,`session`,n)}catch(t){if(await this.stateChangeEmitters.get(e)?.callback(`INITIAL_SESSION`,null),this._debug(`INITIAL_SESSION`,`callback id`,e,`error`,t),Xn(t))return;Bn(t)||Jn(t)||zn(t)&&(t.code===`refresh_token_not_found`||t.code===`refresh_token_already_used`||t.code===`session_expired`)?console.warn(t):console.error(t)}})}async resetPasswordForEmail(e,t={}){let n=null,r=null,i=null;this.flowType===`pkce`&&([n,r,i]=await this._getCodeChallengeAndMethod(!0));try{return await R(this.fetch,`POST`,`${this.url}/recover`,{body:{email:e,code_challenge:n,code_challenge_method:r,gotrue_meta_security:{captcha_token:t.captchaToken}},headers:this.headers,redirectTo:this._maybeAppendFlowIdToRedirect(t.redirectTo,i)})}catch(e){if(await L(this.storage,this.storageKey,i),A(e))return this._returnResult({data:null,error:e});throw e}}async getUserIdentities(){try{let{data:e,error:t}=await this.getUser();if(t)throw t;return this._returnResult({data:{identities:e.user.identities??[]},error:null})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async linkIdentity(e){return`token`in e?this.linkIdentityIdToken(e):this.linkIdentityOAuth(e)}async linkIdentityOAuth(e){let t=null;try{let{data:n,error:r}=await this._useSession(async n=>{let{data:r,error:i}=n;if(i)throw i;let{url:a,flowId:o}=await this._getUrlForProvider(`${this.url}/user/identities/authorize`,e.provider,{redirectTo:e.options?.redirectTo,scopes:e.options?.scopes,queryParams:e.options?.queryParams,skipBrowserRedirect:!0});return t=o,await R(this.fetch,`GET`,a,{headers:this.headers,jwt:r.session?.access_token??void 0})});if(r)throw r;return P()&&!e.options?.skipBrowserRedirect&&window.location.assign(n?.url),this._returnResult({data:{provider:e.provider,url:n?.url,flowId:t},error:null})}catch(n){if(A(n))return this._returnResult({data:{provider:e.provider,url:null,flowId:t},error:n});throw n}}async linkIdentityIdToken(e){return await this._useSession(async t=>{try{let{error:n,data:{session:r}}=t;if(n)throw n;let{options:i,provider:a,token:o,access_token:s,nonce:c}=e,{data:l,error:u}=await R(this.fetch,`POST`,`${this.url}/token?grant_type=id_token`,{headers:this.headers,jwt:r?.access_token??void 0,body:{provider:a,id_token:o,access_token:s,nonce:c,link_identity:!0,gotrue_meta_security:{captcha_token:i?.captchaToken}},xform:z});return u?this._returnResult({data:{user:null,session:null},error:u}):!l||!l.session||!l.user?this._returnResult({data:{user:null,session:null},error:new Vn}):(l.session&&(await this._saveSession(l.session),await this._notifyAllSubscribers(`USER_UPDATED`,l.session)),this._returnResult({data:l,error:u}))}catch(e){if(await L(this.storage,this.storageKey,null),A(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}})}async unlinkIdentity(e){try{return await this._useSession(async t=>{let{data:n,error:r}=t;if(r)throw r;return await R(this.fetch,`DELETE`,`${this.url}/user/identities/${e.identity_id}`,{headers:this.headers,jwt:n.session?.access_token??void 0})})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async _refreshAccessToken(e){let t=`#_refreshAccessToken()`;this._debug(t,`begin`);try{let n=Date.now();return await Sr(async n=>(n>0&&await xr(200*2**(n-1)),this._debug(t,`refreshing attempt`,n),await R(this.fetch,`POST`,`${this.url}/token?grant_type=refresh_token`,{body:{refresh_token:e},headers:this.headers,xform:z})),(e,t)=>{let r=200*2**e;return t&&Jn(t)&&Date.now()+r-n<3e4})}catch(e){if(this._debug(t,`error`,e),A(e))return this._returnResult({data:{session:null,user:null},error:e});throw e}finally{this._debug(t,`end`)}}_isValidSession(e){return typeof e==`object`&&!!e&&`access_token`in e&&`refresh_token`in e&&`expires_at`in e}async _handleProviderSignIn(e,t){let{url:n,flowId:r}=await this._getUrlForProvider(`${this.url}/authorize`,e,{redirectTo:t.redirectTo,scopes:t.scopes,queryParams:t.queryParams});return this._debug(`#_handleProviderSignIn()`,`provider`,e,`options`,t,`url`,n),P()&&!t.skipBrowserRedirect&&window.location.assign(n),{data:{provider:e,url:n,flowId:r},error:null}}async _recoverAndRefresh(){let e=`#_recoverAndRefresh()`;this._debug(e,`begin`);try{let t=await F(this.storage,this.storageKey);if(t&&this.userStorage){let e=await F(this.userStorage,this.storageKey+`-user`);!this.storage.isServer&&Object.is(this.storage,this.userStorage)&&!e&&(e={user:t.user},await vr(this.userStorage,this.storageKey+`-user`,e)),t.user=e?.user??Gr()}else if(t&&!t.user&&!t.user){let e=await F(this.storage,this.storageKey+`-user`);e&&e?.user?(t.user=e.user,await I(this.storage,this.storageKey+`-user`),await vr(this.storage,this.storageKey,t)):t.user=Gr()}if(this._debug(e,`session from storage`,t),!this._isValidSession(t)){this._debug(e,`session is not valid`),t!==null&&await this._removeSession();return}let n=(t.expires_at??1/0)*1e3-Date.now()<On;if(this._debug(e,`session has${n?``:` not`} expired with margin of ${On}s`),n){if(this.autoRefreshToken&&t.refresh_token){let{error:n}=await this._callRefreshToken(t.refresh_token);n&&(Xn(n)?this._debug(e,`refresh discarded by commit guard`,n):this._debug(e,`refresh failed`,n))}}else if(t.user&&t.user.__isUserNotAvailableProxy===!0)try{let{data:n,error:r}=await this._getUser(t.access_token);!r&&n?.user?(t.user=n.user,await this._saveSession(t),await this._notifyAllSubscribers(`SIGNED_IN`,t)):this._debug(e,`could not get user data, skipping SIGNED_IN notification`)}catch(t){console.error(`Error getting user data:`,t),this._debug(e,`error getting user data, skipping SIGNED_IN notification`,t)}else await this._notifyAllSubscribers(`SIGNED_IN`,t)}catch(t){this._debug(e,`error`,t),Jn(t)?console.warn(t):console.error(t);return}finally{this._debug(e,`end`)}}async _callRefreshToken(e){var t,n;if(!e)throw new N;if(this.refreshingDeferred)return this.refreshingDeferred.promise;if(this.lastRefreshFailure&&this.lastRefreshFailure.refreshToken===e&&Date.now()<this.lastRefreshFailure.expiresAt)return this._debug(`#_callRefreshToken()`,`returning cached failure (cooldown active)`),this.lastRefreshFailure.result;let r=`#_callRefreshToken()`;this._debug(r,`begin`);try{this.refreshingDeferred=new yr,this.refreshingDeferred.promise.then(void 0,()=>{});let t=await F(this.storage,this.storageKey),{data:n,error:i}=await this._refreshAccessToken(e);if(i)throw i;if(!n.session)throw new N;let a=await F(this.storage,this.storageKey);if(t!==null&&(a===null||a.refresh_token!==t.refresh_token)){this._debug(r,`commit guard: storage changed since refresh started, discarding rotated tokens`,{startedWith:`present`,nowHolds:a?`replaced`:`cleared`});let e={data:null,error:new Yn};return this.refreshingDeferred.resolve(e),e}let o=this._sessionRemovalEpoch;if(await this._saveSession(n.session),this._sessionRemovalEpoch!==o){this._debug(r,`commit guard (post-save): _removeSession ran during _saveSession, undoing write`),await I(this.storage,this.storageKey),this.userStorage&&await I(this.userStorage,this.storageKey+`-user`);let e={data:null,error:new Yn};return this.refreshingDeferred.resolve(e),e}await this._notifyAllSubscribers(`TOKEN_REFRESHED`,n.session);let s={data:n.session,error:null};return this.lastRefreshFailure=null,this.refreshingDeferred.resolve(s),s}catch(i){if(this._debug(r,`error`,i),A(i)){let n={data:null,error:i};if(!Jn(i)){let e=await F(this.storage,this.storageKey);e?.expires_at&&e.expires_at*1e3>Date.now()?this._debug(r,`proactive refresh failed, access token still valid — preserving session`):await this._removeSession()}return this.lastRefreshFailure={refreshToken:e,result:n,expiresAt:Date.now()+kn},(t=this.refreshingDeferred)==null||t.resolve(n),n}throw(n=this.refreshingDeferred)==null||n.reject(i),i}finally{this.refreshingDeferred=null,this._debug(r,`end`)}}async _notifyAllSubscribers(e,t,n=!0){if(this._pendingInitNotifications!==null&&n){this._pendingInitNotifications.push({event:e,session:t,broadcast:n});return}let r=`#_notifyAllSubscribers(${e})`;this._debug(r,`begin`,t,`broadcast = ${n}`);try{this.broadcastChannel&&n&&this.broadcastChannel.postMessage({event:e,session:t});let r=[],i=Array.from(this.stateChangeEmitters.values()).map(async n=>{try{await n.callback(e,t)}catch(e){r.push(e)}});if(await Promise.all(i),r.length>0){for(let e=0;e<r.length;e+=1)console.error(r[e]);throw r[0]}}finally{this._debug(r,`end`)}}async _saveSession(e){this._debug(`#_saveSession()`,e),this.suppressGetSessionWarning=!0;let t=Object.assign({},e),n=t.user&&t.user.__isUserNotAvailableProxy===!0;if(this.userStorage){!n&&t.user&&await vr(this.userStorage,this.storageKey+`-user`,{user:t.user});let e=Object.assign({},t);delete e.user;let r=qr(e);await vr(this.storage,this.storageKey,r)}else{let e=qr(t);await vr(this.storage,this.storageKey,e)}}async _removeSession(){this._sessionRemovalEpoch+=1,this._debug(`#_removeSession()`),this.lastRefreshFailure=null,this.suppressGetSessionWarning=!1,await I(this.storage,this.storageKey),await Fr(this.storage,this.storageKey),await I(this.storage,this.storageKey+`-user`),this.userStorage&&await I(this.userStorage,this.storageKey+`-user`),await this._notifyAllSubscribers(`SIGNED_OUT`,null)}_removeVisibilityChangedCallback(){this._debug(`#_removeVisibilityChangedCallback()`);let e=this.visibilityChangedCallback;this.visibilityChangedCallback=null;try{e&&P()&&window!=null&&window.removeEventListener&&window.removeEventListener(`visibilitychange`,e)}catch(e){console.error(`removing visibilitychange callback failed`,e)}}async _startAutoRefresh(){await this._stopAutoRefresh(),this._debug(`#_startAutoRefresh()`);let e=setInterval(()=>this._autoRefreshTokenTick(),Dn);this.autoRefreshTicker=e,e&&typeof e==`object`&&typeof e.unref==`function`?e.unref():typeof Deno<`u`&&typeof Deno.unrefTimer==`function`&&Deno.unrefTimer(e);let t=setTimeout(async()=>{await this.initializePromise,await this._autoRefreshTokenTick()},0);this.autoRefreshTickTimeout=t,t&&typeof t==`object`&&typeof t.unref==`function`?t.unref():typeof Deno<`u`&&typeof Deno.unrefTimer==`function`&&Deno.unrefTimer(t)}async _stopAutoRefresh(){this._debug(`#_stopAutoRefresh()`);let e=this.autoRefreshTicker;this.autoRefreshTicker=null,e&&clearInterval(e);let t=this.autoRefreshTickTimeout;this.autoRefreshTickTimeout=null,t&&clearTimeout(t)}async startAutoRefresh(){this._removeVisibilityChangedCallback(),await this._startAutoRefresh()}async stopAutoRefresh(){this._removeVisibilityChangedCallback(),await this._stopAutoRefresh()}async dispose(){var e;this._removeVisibilityChangedCallback(),await this._stopAutoRefresh(),(e=this.broadcastChannel)==null||e.close(),this.broadcastChannel=null,this.stateChangeEmitters.clear()}async _autoRefreshTokenTick(){if(this._debug(`#_autoRefreshTokenTick()`,`begin`),this.lock!=null)try{await this._acquireLock(0,async()=>{try{let e=Date.now();try{return await this._useSession(async t=>{let{data:{session:n}}=t;if(!n||!n.refresh_token||!n.expires_at){this._debug(`#_autoRefreshTokenTick()`,`no session`);return}let r=Math.floor((n.expires_at*1e3-e)/Dn);this._debug(`#_autoRefreshTokenTick()`,`access token expires in ${r} ticks, a tick lasts ${Dn}ms, refresh threshold is 3 ticks`),r<=3&&await this._callRefreshToken(n.refresh_token)})}catch(e){console.error(`Auto refresh tick failed with error. This is likely a transient error.`,e)}}finally{this._debug(`#_autoRefreshTokenTick()`,`end`)}})}catch(e){if(e instanceof ci)this._debug(`auto refresh token tick lock not available`);else throw e}else if(this.refreshingDeferred!==null)this._debug(`#_autoRefreshTokenTick()`,`refresh already in flight, skipping`);else try{let e=Date.now();try{await this._useSession(async t=>{let{data:{session:n}}=t;if(!n||!n.refresh_token||!n.expires_at){this._debug(`#_autoRefreshTokenTick()`,`no session`);return}let r=Math.floor((n.expires_at*1e3-e)/Dn);this._debug(`#_autoRefreshTokenTick()`,`access token expires in ${r} ticks, a tick lasts ${Dn}ms, refresh threshold is 3 ticks`),r<=3&&await this._callRefreshToken(n.refresh_token)})}catch(e){console.error(`Auto refresh tick failed with error. This is likely a transient error.`,e)}}finally{this._debug(`#_autoRefreshTokenTick()`,`end`)}}async _handleVisibilityChange(){if(this._debug(`#_handleVisibilityChange()`),!P()||!(window!=null&&window.addEventListener))return this.autoRefreshToken&&this.startAutoRefresh(),!1;try{this.visibilityChangedCallback=async()=>{try{await this._onVisibilityChanged(!1)}catch(e){this._debug(`#visibilityChangedCallback`,`error`,e)}},window==null||window.addEventListener(`visibilitychange`,this.visibilityChangedCallback),await this._onVisibilityChanged(!0)}catch(e){console.error(`_handleVisibilityChange`,e)}}async _onVisibilityChanged(e){let t=`#_onVisibilityChanged(${e})`;if(this._debug(t,`visibilityState`,document.visibilityState),document.visibilityState===`visible`){if(this.autoRefreshToken&&this._startAutoRefresh(),!e){if(await this.initializePromise,this.lock!=null)await this._acquireLock(this.lockAcquireTimeout,async()=>{document.visibilityState===`visible`?await this._recoverAndRefresh():this._debug(t,`acquired the lock to recover the session, but the browser visibilityState is no longer visible, aborting`)});else{if(document.visibilityState!==`visible`){this._debug(t,`visibilityState is no longer visible, skipping recovery`);return}await this._recoverAndRefresh()}}}else document.visibilityState===`hidden`&&this.autoRefreshToken&&this._stopAutoRefresh()}async _getUrlForProvider(e,t,n){let r=n?.redirectTo,i=null,a=null,o=null;this.flowType===`pkce`&&([i,a,o]=await this._getCodeChallengeAndMethod(),r=this._maybeAppendFlowIdToRedirect(r,o));let s=[`provider=${encodeURIComponent(t)}`];if(r&&s.push(`redirect_to=${encodeURIComponent(r)}`),n?.scopes&&s.push(`scopes=${encodeURIComponent(n.scopes)}`),i!=null&&a!=null){let e=new URLSearchParams({code_challenge:`${encodeURIComponent(i)}`,code_challenge_method:`${encodeURIComponent(a)}`});s.push(e.toString())}if(n?.queryParams){let e=new URLSearchParams(n.queryParams);s.push(e.toString())}return n?.skipBrowserRedirect&&s.push(`skip_http_redirect=${n.skipBrowserRedirect}`),{url:`${e}?${s.join(`&`)}`,flowId:o}}_maybeAppendFlowIdToRedirect(e,t){return!e||!t||!this.experimental.appendPkceFlowIdToRedirects?e??void 0:Ir(e,t)}async _getCodeChallengeAndMethod(e=!1){return Lr(this.storage,this.storageKey,e,e=>this._debug(`#_getCodeChallengeAndMethod()`,`evicted oldest pending PKCE verifier slot`,e))}async _unenroll(e){try{return await this._useSession(async t=>{let{data:n,error:r}=t;return r?this._returnResult({data:null,error:r}):await R(this.fetch,`DELETE`,`${this.url}/factors/${e.factorId}`,{headers:this.headers,jwt:n?.session?.access_token})})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async _enroll(e){try{return await this._useSession(async t=>{let{data:n,error:r}=t;if(r)return this._returnResult({data:null,error:r});let i=Object.assign({friendly_name:e.friendlyName,factor_type:e.factorType},e.factorType===`phone`?{phone:e.phone}:e.factorType===`totp`?{issuer:e.issuer}:{}),{data:a,error:o}=await R(this.fetch,`POST`,`${this.url}/factors`,{body:i,headers:this.headers,jwt:n?.session?.access_token});return o?this._returnResult({data:null,error:o}):(e.factorType===`totp`&&a.type===`totp`&&a?.totp?.qr_code&&(a.totp.qr_code=`data:image/svg+xml;utf-8,${a.totp.qr_code}`),this._returnResult({data:a,error:null}))})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async _verify(e){let t=async()=>{try{return await this._useSession(async t=>{let{data:n,error:r}=t;if(r)return this._returnResult({data:null,error:r});let i=Object.assign({challenge_id:e.challengeId},`webauthn`in e?{webauthn:Object.assign(Object.assign({},e.webauthn),{credential_response:e.webauthn.type===`create`?bi(e.webauthn.credential_response):xi(e.webauthn.credential_response)})}:{code:e.code}),{data:a,error:o}=await R(this.fetch,`POST`,`${this.url}/factors/${e.factorId}/verify`,{body:i,headers:this.headers,jwt:n?.session?.access_token});return o?this._returnResult({data:null,error:o}):(await this._saveSession(Object.assign({expires_at:Math.round(Date.now()/1e3)+a.expires_in},a)),await this._notifyAllSubscribers(`MFA_CHALLENGE_VERIFIED`,a),this._returnResult({data:a,error:o}))})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}};return this.lock==null?t():this._acquireLock(this.lockAcquireTimeout,t)}async _challenge(e){let t=async()=>{try{return await this._useSession(async t=>{let{data:n,error:r}=t;if(r)return this._returnResult({data:null,error:r});let i=await R(this.fetch,`POST`,`${this.url}/factors/${e.factorId}/challenge`,{body:e,headers:this.headers,jwt:n?.session?.access_token});if(i.error)return i;let{data:a}=i;if(a.type!==`webauthn`)return{data:a,error:null};switch(a.webauthn.type){case`create`:return{data:Object.assign(Object.assign({},a),{webauthn:Object.assign(Object.assign({},a.webauthn),{credential_options:Object.assign(Object.assign({},a.webauthn.credential_options),{publicKey:vi(a.webauthn.credential_options.publicKey)})})}),error:null};case`request`:return{data:Object.assign(Object.assign({},a),{webauthn:Object.assign(Object.assign({},a.webauthn),{credential_options:Object.assign(Object.assign({},a.webauthn.credential_options),{publicKey:yi(a.webauthn.credential_options.publicKey)})})}),error:null}}})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}};return this.lock==null?t():this._acquireLock(this.lockAcquireTimeout,t)}async _challengeAndVerify(e){let{data:t,error:n}=await this._challenge({factorId:e.factorId});return n?this._returnResult({data:null,error:n}):await this._verify({factorId:e.factorId,challengeId:t.id,code:e.code})}async _listFactors(){let{data:{user:e},error:t}=await this.getUser();if(t)return{data:null,error:t};let n={all:[],phone:[],totp:[],webauthn:[],recovery_code:[]};for(let t of e?.factors??[])n.all.push(t),t.status===`verified`&&t.factor_type in n&&Array.isArray(n[t.factor_type])&&n[t.factor_type].push(t);return{data:n,error:null}}async _getAuthenticatorAssuranceLevel(e){if(e)try{let{payload:t}=br(e),n=null;t.aal&&(n=t.aal);let r=n,{data:{user:i},error:a}=await this.getUser(e);if(a)return this._returnResult({data:null,error:a});((i?.factors)?.filter(e=>e.status===`verified`)??[]).length>0&&(r=`aal2`);let o=t.amr||[];return{data:{currentLevel:n,nextLevel:r,currentAuthenticationMethods:o},error:null}}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}let{data:{session:t},error:n}=await this.getSession();if(n)return this._returnResult({data:null,error:n});if(!t)return{data:{currentLevel:null,nextLevel:null,currentAuthenticationMethods:[]},error:null};let{payload:r}=br(t.access_token),i=null;r.aal&&(i=r.aal);let a=i;(t.user.factors?.filter(e=>e.status===`verified`)??[]).length>0&&(a=`aal2`);let o=r.amr||[];return{data:{currentLevel:i,nextLevel:a,currentAuthenticationMethods:o},error:null}}async _getRecoveryCodesStatus(){Wr(this.experimental);try{return await this._useSession(async e=>{let{data:t,error:n}=e;if(n)return this._returnResult({data:null,error:n});let{data:r,error:i}=await R(this.fetch,`GET`,`${this.url}/factors/recovery-codes`,{headers:this.headers,jwt:t?.session?.access_token});return i?this._returnResult({data:null,error:i}):this._returnResult({data:r,error:null})})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async _generateRecoveryCodes(e){Wr(this.experimental);try{return await this._useSession(async t=>{let{data:n,error:r}=t;if(r)return this._returnResult({data:null,error:r});let{data:i,error:a}=await R(this.fetch,`POST`,`${this.url}/factors/recovery-codes`,{body:e?.friendlyName?{friendly_name:e.friendlyName}:void 0,headers:this.headers,jwt:n?.session?.access_token});return a?this._returnResult({data:null,error:a}):this._returnResult({data:i,error:null})})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async _verifyRecoveryCode(e){Wr(this.experimental);let t=async()=>{try{return await this._useSession(async t=>{let{data:n,error:r}=t;if(r)return this._returnResult({data:null,error:r});let{data:i,error:a}=await R(this.fetch,`POST`,`${this.url}/factors/recovery-codes/verify`,{body:{code:e.code},headers:this.headers,jwt:n?.session?.access_token});if(a)return this._returnResult({data:null,error:a});let o=Object.assign({expires_at:dr(i.expires_in)},i);return await this._saveSession(o),await this._notifyAllSubscribers(`MFA_CHALLENGE_VERIFIED`,o),this._returnResult({data:i,error:null})})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}};return this.lock==null?t():this._acquireLock(this.lockAcquireTimeout,t)}async _regenerateRecoveryCodes(){Wr(this.experimental);try{return await this._useSession(async e=>{let{data:t,error:n}=e;if(n)return this._returnResult({data:null,error:n});let{data:r,error:i}=await R(this.fetch,`POST`,`${this.url}/factors/recovery-codes/regenerate`,{headers:this.headers,jwt:t?.session?.access_token});return i?this._returnResult({data:null,error:i}):this._returnResult({data:r,error:null})})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async _unenrollRecoveryCodes(){Wr(this.experimental);try{return await this._useSession(async e=>{let{data:t,error:n}=e;if(n)return this._returnResult({data:null,error:n});let{data:r,error:i}=await R(this.fetch,`DELETE`,`${this.url}/factors/recovery-codes`,{headers:this.headers,jwt:t?.session?.access_token});return i?this._returnResult({data:null,error:i}):this._returnResult({data:r,error:null})})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async _getAuthorizationDetails(e){try{return await this._useSession(async t=>{let{data:{session:n},error:r}=t;return r?this._returnResult({data:null,error:r}):n?await R(this.fetch,`GET`,`${this.url}/oauth/authorizations/${e}`,{headers:this.headers,jwt:n.access_token,xform:e=>({data:e,error:null})}):this._returnResult({data:null,error:new N})})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async _approveAuthorization(e,t){try{return await this._useSession(async n=>{let{data:{session:r},error:i}=n;if(i)return this._returnResult({data:null,error:i});if(!r)return this._returnResult({data:null,error:new N});let a=await R(this.fetch,`POST`,`${this.url}/oauth/authorizations/${e}/consent`,{headers:this.headers,jwt:r.access_token,body:{action:`approve`},xform:e=>({data:e,error:null})});return a.data&&a.data.redirect_url&&P()&&!t?.skipBrowserRedirect&&window.location.assign(a.data.redirect_url),a})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async _denyAuthorization(e,t){try{return await this._useSession(async n=>{let{data:{session:r},error:i}=n;if(i)return this._returnResult({data:null,error:i});if(!r)return this._returnResult({data:null,error:new N});let a=await R(this.fetch,`POST`,`${this.url}/oauth/authorizations/${e}/consent`,{headers:this.headers,jwt:r.access_token,body:{action:`deny`},xform:e=>({data:e,error:null})});return a.data&&a.data.redirect_url&&P()&&!t?.skipBrowserRedirect&&window.location.assign(a.data.redirect_url),a})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async _listOAuthGrants(){try{return await this._useSession(async e=>{let{data:{session:t},error:n}=e;return n?this._returnResult({data:null,error:n}):t?await R(this.fetch,`GET`,`${this.url}/user/oauth/grants`,{headers:this.headers,jwt:t.access_token,xform:e=>({data:e,error:null})}):this._returnResult({data:null,error:new N})})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async _revokeOAuthGrant(e){try{return await this._useSession(async t=>{let{data:{session:n},error:r}=t;return r?this._returnResult({data:null,error:r}):n?(await R(this.fetch,`DELETE`,`${this.url}/user/oauth/grants`,{headers:this.headers,jwt:n.access_token,query:{client_id:e.clientId},noResolveJson:!0}),{data:{},error:null}):this._returnResult({data:null,error:new N})})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async fetchJwk(e,t={keys:[]}){let n=t.keys.find(t=>t.kid===e);if(n)return n;let r=Date.now();if(n=this.jwks.keys.find(t=>t.kid===e),n&&this.jwks_cached_at+6e5>r)return n;let{data:i,error:a}=await R(this.fetch,`GET`,`${this.url}/.well-known/jwks.json`,{headers:this.headers});if(a)throw a;return!i.keys||i.keys.length===0||(this.jwks=i,this.jwks_cached_at=r,n=i.keys.find(t=>t.kid===e),!n)?null:n}async getClaims(e,t={}){try{let n=e;if(!n){let{data:e,error:t}=await this.getSession();if(t||!e.session)return this._returnResult({data:null,error:t});n=e.session.access_token}let{header:r,payload:i,signature:a,raw:{header:o,payload:s}}=br(n);if(!t?.allowExpired)try{Br(i.exp)}catch(e){throw new Qn(e instanceof Error?e.message:`JWT validation failed`)}let c=!r.alg||r.alg.startsWith(`HS`)||!r.kid||!(`crypto`in globalThis&&`subtle`in globalThis.crypto)?null:await this.fetchJwk(r.kid,t?.keys?{keys:t.keys}:t?.jwks);if(!c){let{error:e}=await this.getUser(n);if(e)throw e;return{data:{claims:i,header:r,signature:a},error:null}}let l=Vr(r.alg),u=await crypto.subtle.importKey(`jwk`,c,l,!0,[`verify`]);if(!await crypto.subtle.verify(l,u,a,lr(`${o}.${s}`)))throw new Qn(`Invalid JWT signature`);return{data:{claims:i,header:r,signature:a},error:null}}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async signInWithPasskey(e){try{if(!Ci())return this._returnResult({data:null,error:new j(`Browser does not support WebAuthn`,null)});let{data:t,error:n}=await this._startPasskeyAuthentication({options:{captchaToken:e?.options?.captchaToken}});if(n||!t)return this._returnResult({data:null,error:n});let{data:r,error:i}=await Ti({publicKey:yi(t.options),signal:e?.options?.signal??_i.createNewAbortSignal(),mediation:e?.options?.mediation});if(i||!r)return this._returnResult({data:null,error:i??new j(`WebAuthn ceremony failed`,null)});let a=xi(r);return this._verifyPasskeyAuthentication({challengeId:t.challenge_id,credential:a})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async registerPasskey(e){try{if(!Ci())return this._returnResult({data:null,error:new j(`Browser does not support WebAuthn`,null)});let{data:t,error:n}=await this._startPasskeyRegistration();if(n||!t)return this._returnResult({data:null,error:n});let{data:r,error:i}=await wi({publicKey:vi(t.options),signal:e?.options?.signal??_i.createNewAbortSignal()});if(i||!r)return this._returnResult({data:null,error:i??new j(`WebAuthn ceremony failed`,null)});let a=bi(r);return this._verifyPasskeyRegistration({challengeId:t.challenge_id,credential:a})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async _startPasskeyRegistration(){try{return await this._useSession(async e=>{let{data:{session:t},error:n}=e;if(n)return this._returnResult({data:null,error:n});if(!t)return this._returnResult({data:null,error:new N});let{data:r,error:i}=await R(this.fetch,`POST`,`${this.url}/passkeys/registration/options`,{headers:this.headers,jwt:t.access_token,body:{}});return i?this._returnResult({data:null,error:i}):this._returnResult({data:r,error:null})})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async _verifyPasskeyRegistration(e){try{return await this._useSession(async t=>{let{data:{session:n},error:r}=t;if(r)return this._returnResult({data:null,error:r});if(!n)return this._returnResult({data:null,error:new N});let{data:i,error:a}=await R(this.fetch,`POST`,`${this.url}/passkeys/registration/verify`,{headers:this.headers,jwt:n.access_token,body:{challenge_id:e.challengeId,credential:e.credential}});return a?this._returnResult({data:null,error:a}):this._returnResult({data:i,error:null})})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async _startPasskeyAuthentication(e){try{let{data:t,error:n}=await R(this.fetch,`POST`,`${this.url}/passkeys/authentication/options`,{headers:this.headers,body:{gotrue_meta_security:{captcha_token:e?.options?.captchaToken}}});return n?this._returnResult({data:null,error:n}):this._returnResult({data:t,error:null})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async _verifyPasskeyAuthentication(e){try{let{data:t,error:n}=await R(this.fetch,`POST`,`${this.url}/passkeys/authentication/verify`,{headers:this.headers,body:{challenge_id:e.challengeId,credential:e.credential},xform:z});return n?this._returnResult({data:null,error:n}):(t.session&&(await this._saveSession(t.session),await this._notifyAllSubscribers(`SIGNED_IN`,t.session)),this._returnResult({data:t,error:null}))}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async _listPasskeys(){try{return await this._useSession(async e=>{let{data:{session:t},error:n}=e;if(n)return this._returnResult({data:null,error:n});if(!t)return this._returnResult({data:null,error:new N});let{data:r,error:i}=await R(this.fetch,`GET`,`${this.url}/passkeys`,{headers:this.headers,jwt:t.access_token,xform:e=>({data:e,error:null})});return i?this._returnResult({data:null,error:i}):this._returnResult({data:r,error:null})})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async _updatePasskey(e){try{return await this._useSession(async t=>{let{data:{session:n},error:r}=t;if(r)return this._returnResult({data:null,error:r});if(!n)return this._returnResult({data:null,error:new N});let{data:i,error:a}=await R(this.fetch,`PATCH`,`${this.url}/passkeys/${e.passkeyId}`,{headers:this.headers,jwt:n.access_token,body:{friendly_name:e.friendlyName}});return a?this._returnResult({data:null,error:a}):this._returnResult({data:i,error:null})})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}async _deletePasskey(e){try{return await this._useSession(async t=>{let{data:{session:n},error:r}=t;if(r)return this._returnResult({data:null,error:r});if(!n)return this._returnResult({data:null,error:new N});let{error:i}=await R(this.fetch,`DELETE`,`${this.url}/passkeys/${e.passkeyId}`,{headers:this.headers,jwt:n.access_token,noResolveJson:!0});return i?this._returnResult({data:null,error:i}):this._returnResult({data:null,error:null})})}catch(e){if(A(e))return this._returnResult({data:null,error:e});throw e}}};Fi.nextInstanceID={};var Ii=Fi,Li=`2.118.0`,Ri=``,zi;if(typeof Deno<`u`)Ri=`deno`,zi=Deno.version?.deno;else if(typeof document<`u`)Ri=`web`;else if(typeof navigator<`u`&&navigator.product===`ReactNative`)Ri=`react-native`;else{var Bi;Ri=`node`;let e=globalThis.process;zi=e==null||(Bi=e.version)==null?void 0:Bi.replace(/^v/,``)}var Vi=[`runtime=${Ri}`];zi&&Vi.push(`runtime-version=${zi}`);var Hi={headers:{"X-Client-Info":`supabase-js/${Li}; ${Vi.join(`; `)}`}},Ui={schema:`public`},Wi={autoRefreshToken:!0,persistSession:!0,detectSessionInUrl:!0,flowType:`implicit`},Gi={},Ki={enabled:!1,respectSamplingDecision:!0};function qi(e){if(!e||typeof e!=`string`)return null;let t=e.split(`-`);if(t.length!==4)return null;let[n,r,i,a]=t;if(n.length!==2||r.length!==32||i.length!==16||a.length!==2)return null;let o=/^[0-9a-f]+$/i;return!o.test(n)||!o.test(r)||!o.test(i)||!o.test(a)||r===`00000000000000000000000000000000`||i===`0000000000000000`?null:{version:n,traceId:r,parentId:i,traceFlags:a,isSampled:(parseInt(a,16)&1)==1}}function Ji(e,t){if(!e||!t||t.length===0)return!1;let n;if(e instanceof URL)n=e;else try{n=new URL(e)}catch{return!1}for(let e of t)try{if(typeof e==`string`){if(Yi(n.hostname,e))return!0}else if(e instanceof RegExp){if(e.test(n.hostname))return!0}else if(typeof e==`function`&&e(n))return!0}catch{continue}return!1}function Yi(e,t){if(t===e)return!0;if(t.startsWith(`*.`)){let n=t.slice(2);if(e.endsWith(n)&&(e===n||e.endsWith(`.`+n)))return!0}return!1}function Xi(e){let t=[];try{let n=new URL(e);t.push(n.hostname)}catch{}return t.push(`*.supabase.co`,`*.supabase.in`),t.push(`localhost`,`127.0.0.1`,`[::1]`),t}function Zi(e){"@babel/helpers - typeof";return Zi=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},Zi(e)}function Qi(e,t){if(Zi(e)!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t||`default`);if(Zi(r)!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}function $i(e){var t=Qi(e,`string`);return Zi(t)==`symbol`?t:t+``}function ea(e,t,n){return(t=$i(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function ta(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),n.push.apply(n,r)}return n}function V(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]==null?{}:arguments[t];t%2?ta(Object(n),!0).forEach(function(t){ea(e,t,n[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):ta(Object(n)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))})}return e}var na=e=>e?(...t)=>e(...t):(...e)=>fetch(...e),ra=()=>Headers,ia=e=>e.startsWith(`sb_publishable_`)||e.startsWith(`sb_secret_`),aa=`sb_temp_`,oa=new Set,sa=e=>{if(!e.startsWith(`sb_`)||ia(e)||e.startsWith(aa))return;let t=e.match(/^sb_[a-zA-Z0-9]+_/)?.[0]??`unknown`;oa.has(t)||(oa.add(t),console.warn(`@supabase/supabase-js: Unrecognized Supabase API key format. The client will proceed and send this key as-is; if you see authentication errors you may need to upgrade @supabase/supabase-js to a version that recognizes this key type.`))},ca=(e,t,n,r,i,a)=>{let o=na(r),s=ra(),c=i?.enabled===!0,l=i?.respectSamplingDecision!==!1,u=c?Xi(t):null,d=!(a?.omitApiKeyAsBearer&&ia(e));return async(t,r)=>{let i=await n(),a=new s(r?.headers);if(a.has(`apikey`)||a.set(`apikey`,e),!a.has(`Authorization`)){let t=i??(d?e:null);t&&a.set(`Authorization`,`Bearer ${t}`)}if(u){let e=da(t,u,l);e&&(e.traceparent&&!a.has(`traceparent`)&&a.set(`traceparent`,e.traceparent),e.tracestate&&!a.has(`tracestate`)&&a.set(`tracestate`,e.tracestate),e.baggage&&!a.has(`baggage`)&&a.set(`baggage`,e.baggage))}return o(t,V(V({},r),{},{headers:a}))}},la=!1,ua=!1;function da(e,n,r){let i=t();if(!i)return la||(la=!0,console.warn("@supabase/supabase-js: tracePropagation is enabled but the tracing runtime is not loaded, so trace headers will not be attached. Add `import '@supabase/supabase-js/tracing'` at your application entry point (requires the OpenTelemetry API package to be installed). The CDN/UMD build does not support trace propagation.")),null;if(!Ji(typeof e==`string`||e instanceof URL?e:e.url,n))return null;let a=i();if(!a||!a.traceparent){var o;if(a!=null&&(o=a.carrierKeys)!=null&&o.length&&!ua){ua=!0;let e=a.carrierKeys.includes(`sentry-trace`)?" Sentry detected: set `propagateTraceparent: true` in Sentry.init() to emit it.":` Configure your tracing SDK to emit W3C trace context on outgoing requests.`;console.warn(`@supabase/supabase-js: tracePropagation is enabled and a tracing SDK is active, but its propagator wrote [${a.carrierKeys.join(`, `)}] and no W3C traceparent header, so trace headers will not be attached.`+e)}return null}if(r){let e=qi(a.traceparent);if(e&&!e.isSampled)return{traceparent:a.traceparent}}return a}function fa(e){return typeof e==`boolean`?{enabled:e}:e}function pa(e){return e.endsWith(`/`)?e:e+`/`}var ma=!1;function ha(e){ma||typeof e==`object`&&e&&`schema`in e&&e.schema!==void 0&&(ma=!0,console.warn(`@supabase/supabase-js: The "schema" option must be nested under "db", e.g. createClient(url, key, { db: { schema: 'myschema' } }). A top-level "schema" is ignored and queries go to the default schema.`))}function ga(e,t){let{db:n,auth:r,realtime:i,global:a}=e,{db:o,auth:s,realtime:c,global:l}=t,u=fa(e.tracePropagation),d=fa(t.tracePropagation),f={db:V(V({},o),n),auth:V(V({},s),r),realtime:V(V({},c),i),storage:{},global:V(V(V({},l),a),{},{headers:V(V({},l?.headers??{}),a?.headers??{})}),tracePropagation:{enabled:u?.enabled??d?.enabled??!1,respectSamplingDecision:u?.respectSamplingDecision??d?.respectSamplingDecision??!0},accessToken:async()=>``};return e.accessToken?f.accessToken=e.accessToken:delete f.accessToken,f}function _a(e){let t=e?.trim();if(!t)throw Error(`supabaseUrl is required.`);if(!t.match(/^https?:\/\//i))throw Error(`Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.`);try{return new URL(pa(t))}catch{throw Error(`Invalid supabaseUrl: Provided URL is malformed.`)}}var va=class extends Ii{constructor(e){super(e)}},ya=class{constructor(e,t,n){this.supabaseUrl=e,this.supabaseKey=t;let r=_a(e);if(!t)throw Error(`supabaseKey is required.`);sa(t),ha(n),this.realtimeUrl=new URL(`realtime/v1`,r),this.realtimeUrl.protocol=this.realtimeUrl.protocol.replace(`http`,`ws`),this.authUrl=new URL(`auth/v1`,r),this.storageUrl=new URL(`storage/v1`,r),this.functionsUrl=new URL(`functions/v1`,r);let i=`sb-${r.hostname.split(`.`)[0]}-auth-token`,a={db:Ui,realtime:Gi,auth:V(V({},Wi),{},{storageKey:i}),global:Hi,tracePropagation:Ki},o=ga(n??{},a);this.settings=o,this.storageKey=o.auth.storageKey??``,this.headers=o.global.headers??{},o.accessToken?(this.accessToken=o.accessToken,this.auth=new Proxy({},{get:(e,t)=>{throw Error(`@supabase/supabase-js: Supabase Client is configured with the accessToken option, accessing supabase.auth.${String(t)} is not possible`)}})):this.auth=this._initSupabaseAuthClient(o.auth??{},this.headers,o.global.fetch),this.fetch=ca(t,e,this._getSessionToken.bind(this),o.global.fetch,o.tracePropagation),this.functionsFetch=ca(t,e,this._getSessionToken.bind(this),o.global.fetch,o.tracePropagation,{omitApiKeyAsBearer:!0}),this.realtime=this._initRealtimeClient(V({headers:this.headers,accessToken:this._getAccessToken.bind(this),fetch:this.fetch},o.realtime)),this.accessToken&&Promise.resolve(this.accessToken()).then(e=>this.realtime.setAuth(e)).catch(e=>console.warn(`Failed to set initial Realtime auth token:`,e)),this.rest=new se(new URL(`rest/v1`,r).href,{headers:this.headers,schema:o.db.schema,fetch:this.fetch,timeout:o.db.timeout,urlLengthLimit:o.db.urlLengthLimit,retry:o.db.retry}),this.storage=new Tn(this.storageUrl.href,this.headers,this.fetch,n?.storage),o.accessToken||this._listenForAuthEvents()}get functions(){return new u(this.functionsUrl.href,{headers:this.headers,customFetch:this.functionsFetch})}from(e){return this.rest.from(e)}schema(e){return this.rest.schema(e)}getOpenApiSpec(){return this.rest.getOpenApiSpec()}rpc(e,t={},n={head:!1,get:!1,count:void 0}){return this.rest.rpc(e,t,n)}channel(e,t={config:{}}){return this.realtime.channel(e,t)}getChannels(){return this.realtime.getChannels()}removeChannel(e){return this.realtime.removeChannel(e)}removeAllChannels(){return this.realtime.removeAllChannels()}async _getSessionToken(){var e=this;if(e.accessToken)return await e.accessToken();let{data:t}=await e.auth.getSession();return t.session?.access_token??null}async _getAccessToken(){var e=this;return await e._getSessionToken()??e.supabaseKey}_initSupabaseAuthClient({autoRefreshToken:e,persistSession:t,detectSessionInUrl:n,storage:r,userStorage:i,storageKey:a,flowType:o,lock:s,debug:c,throwOnError:l,experimental:u,lockAcquireTimeout:d,skipAutoInitialize:f},p,m){let h={Authorization:`Bearer ${this.supabaseKey}`,apikey:`${this.supabaseKey}`};return new va({url:this.authUrl.href,headers:V(V({},h),p),storageKey:a,autoRefreshToken:e,persistSession:t,detectSessionInUrl:n,storage:r,userStorage:i,flowType:o,lock:s,debug:c,throwOnError:l,experimental:u,fetch:m,lockAcquireTimeout:d,skipAutoInitialize:f,hasCustomAuthorizationHeader:Object.keys(this.headers).some(e=>e.toLowerCase()===`authorization`)})}_initRealtimeClient(e){return new Et(this.realtimeUrl.href,V(V({},e),{},{params:V(V({},{apikey:this.supabaseKey}),e?.params)}))}_listenForAuthEvents(){return this.auth.onAuthStateChange((e,t)=>{this._handleTokenChanged(e,`CLIENT`,t?.access_token)})}_handleTokenChanged(e,t,n){(e===`TOKEN_REFRESHED`||e===`SIGNED_IN`||e===`INITIAL_SESSION`)&&this.changedAccessToken!==n?(this.changedAccessToken=n,this.realtime.setAuth(n)):e===`SIGNED_OUT`&&(this.realtime.setAuth(),t==`STORAGE`&&this.auth.signOut(),this.changedAccessToken=void 0)}},ba=(e,t,n)=>new ya(e,t,n);function xa(){if(typeof window<`u`||globalThis.Deno!==void 0)return!1;let e=globalThis.process;if(!e)return!1;let t=e.version;if(t==null)return!1;let n=t.match(/^v(\d+)\./);return n?parseInt(n[1],10)<=20:!1}xa()&&console.warn(`⚠️  Node.js 20 and below are deprecated and will no longer be supported in future versions of @supabase/supabase-js. Please upgrade to Node.js 22 or later. For more information, visit: https://github.com/orgs/supabase/discussions/45715`);var H=ba(`https://tayveudoxrdkqnmcjrtu.supabase.co`,`sb_publishable_H1edhTEr7wt_xJEZsqa7lw_hHEllI1i`);async function Sa(e){let{data:t,error:n}=await H.rpc(`queue_email`,{p_kind:e.kind,p_to_email:e.toEmail,p_subject:e.subject,p_body:e.body,p_to_profile_id:e.toProfileId??null});return n?{ok:!1,error:n.message}:(document.dispatchEvent(new CustomEvent(`outbox:changed`)),{ok:!0,id:String(t)})}var Ca=[];function U(e){return e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e])}function wa(e,t=new Date){let n=/^(\d{4})-(\d{2})-(\d{2})$/.exec(e);if(!n)return null;let r=Number(n[1]),i=Number(n[2]),a=Number(n[3]),o=t.getFullYear()-r,s=t.getMonth()+1;return(s<i||s===i&&t.getDate()<a)&&--o,o}function Ta(e,t){if(!e)return`Birth dates are kept for administrators only. They are used to tell youth from adult and to find umpires under 13.`;let n=wa(e);if(n===null)return`Enter a valid birth date.`;if(n<0)return`That birth date is in the future.`;let r=`Age ${n}.`;return n<13&&(r+=` Under 13: a parent account and consent will be required before this umpire can be active.`),n>=18&&t===`youth`&&(r+=` This umpire is 18 or older but is classified Youth. Change the classification to Adult when appropriate.`),n<18&&t===`adult`&&(r+=` This umpire is under 18 but is classified Adult.`),r}function Ea(e){return e.trim().toLowerCase()}function Da(e){return e.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)}function Oa(e,t){let n=e=>e.trim().replace(/\s+/g,` `).toLowerCase();return n(e)===n(t)}function ka(e){return e.profile_id!==null&&e.account_name!==null&&e.account_name.trim()!==``&&!Oa(e.account_name,e.display_name)}function Aa(e){return new Date(e.expires_at).getTime()<Date.now()}function ja(e){if(e.profile_id)switch(e.account_status){case`pending`:return`Pending review`;case`rejected`:return`Rejected`;case`suspended`:return`Suspended`;default:return`Linked`}return e.invitation?Aa(e.invitation)?`Invitation expired`:`Invited (expires ${e.invitation.expires_at.slice(0,10)})`:`Not linked`}async function Ma(e,t){let{data:n}=await H.from(`umpire_invitations`).select(`expires_at`).eq(`umpire_id`,e).eq(`status`,`pending`).maybeSingle();return Sa({kind:`invitation`,toEmail:t,subject:`You are invited to the RWCLL umpire list`,body:Na(t,n?.expires_at??new Date(Date.now()+2592e6).toISOString())})}function Na(e,t){return[`You have been added to the RWCLL umpire list.`,``,`To get started, go to ${window.location.origin} and choose "Create account". Register using exactly this email address: ${e}`,``,`Choose the umpire type that matches you, confirm your email when asked, and sign in. You will be approved automatically.`,``,`This invitation expires on ${t.slice(0,10)}.`].join(`
`)}function Pa(e){switch(e){case`active`:return`Active`;case`inactive`:return`Inactive`;case`suspended`:return`Suspended`}}function Fa(e=``){let t=document.querySelector(`#umpire-results`);if(!t)return;let n=e.trim().toLowerCase(),r=Ca.filter(e=>[e.display_name,e.umpire_number??``,e.classification,e.email??``,e.phone??``,e.eligibility_status,ja(e),e.account_name??``].some(e=>e.toLowerCase().includes(n)));t.innerHTML=r.length===0?`
      <p class="directory-empty">
        ${Ca.length===0?`No umpire records have been created yet.`:`No umpires match your search.`}
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
              <td>${U(e.display_name)}</td>
              <td>${U(e.umpire_number||`—`)}</td>
              <td>${U(e.classification===`youth`?`Youth`:`Adult`)}</td>
              <td class="email-cell">${U(e.email||`—`)}</td>
              <td>${U(e.phone||`—`)}</td>
              <td>
                <span class="eligibility-badge eligibility-${e.eligibility_status}">
                  ${Pa(e.eligibility_status)}
                </span>
              </td>
              <td>
                ${U(ja(e))}
                ${ka(e)?`<br><span class="season-dates">Account name: ${U(e.account_name??``)}</span>`:``}
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
  `}async function W(){let e=document.querySelector(`#umpire-results`),t=document.querySelector(`#umpire-directory-message`);if(!e)return;e.textContent=`Loading umpire records…`;let{data:n,error:r}=await H.from(`umpires`).select(`
      id,
      profile_id,
      umpire_number,
      display_name,
      classification,
      phone,
      eligibility_status
    `).order(`display_name`);if(r){e.textContent=`Unable to load the umpire directory.`,t&&(t.textContent=r.message,t.className=`message error`);return}let[i,a,o]=await Promise.all([H.from(`umpire_private_details`).select(`umpire_id, email`),H.from(`profiles`).select(`id, email, account_status, display_name`),H.from(`umpire_invitations`).select(`id, umpire_id, email, expires_at`).eq(`status`,`pending`)]);i.error&&console.error(`Umpire emails not loaded:`,i.error.message),a.error&&console.error(`Account emails not loaded:`,a.error.message),o.error&&console.error(`Invitations not loaded:`,o.error.message);let s=new Map;for(let e of i.data??[])e.email&&s.set(e.umpire_id,e.email);let c=new Map,l=new Map,u=new Map;for(let e of a.data??[])e.email&&c.set(e.id,e.email),l.set(e.id,e.account_status),e.display_name&&u.set(e.id,e.display_name);let d=new Map;for(let e of o.data??[])d.set(e.umpire_id,{id:e.id,email:e.email,expires_at:e.expires_at});Ca=(n??[]).map(e=>{let t=e.profile_id?c.get(e.profile_id)??null:null,n=s.get(e.id)??null;return{...e,email:t??n,email_from_account:t!==null,account_status:e.profile_id?l.get(e.profile_id)??null:null,account_name:e.profile_id?u.get(e.profile_id)??null:null,invitation:d.get(e.id)??null}}),Fa(document.querySelector(`#umpire-search`)?.value??``),t&&(t.textContent=`${Ca.length} umpire record(s) loaded.`,t.className=`message success`)}async function Ia(e){let t=document.querySelector(`#create-umpire-message`),n=document.querySelector(`#save-umpire-button`),r=new FormData(e),i=String(r.get(`display_name`)??``).trim(),a=String(r.get(`umpire_number`)??``).trim(),o=String(r.get(`classification`)??``),s=String(r.get(`phone`)??``).trim(),c=Ea(String(r.get(`email`)??``)),l=e.querySelector(`[name="invite"]`)?.checked??!1,u=String(r.get(`eligibility_status`)??``);if(!i)t&&(t.textContent=`Please enter the umpire's full name.`,t.className=`message error`);else if(![`youth`,`adult`].includes(o))t&&(t.textContent=`Please select a valid classification.`,t.className=`message error`);else if(![`active`,`inactive`,`suspended`].includes(u))t&&(t.textContent=`Please select a valid eligibility status.`,t.className=`message error`);else if(c&&!Da(c))t&&(t.textContent=`Please enter a valid email address.`,t.className=`message error`);else{n&&(n.disabled=!0,n.textContent=`Creating…`),t&&(t.textContent=``,t.className=`message`);try{let{data:n,error:r}=await H.from(`umpires`).insert({display_name:i,umpire_number:a||null,classification:o,phone:s||null,eligibility_status:u,profile_id:null}).select(`id`).single();if(r)throw r;let d=!1,f=!1;if(c&&n&&l){let{error:r}=await H.rpc(`invite_umpire`,{p_umpire_id:n.id,p_email:c});if(r){t&&(t.textContent=`The umpire was created, but the invitation could not be recorded: `+r.message,t.className=`message error`),e.reset(),await W();return}d=!0,f=(await Ma(n.id,c)).ok}else if(c&&n){let{error:r}=await H.from(`umpire_private_details`).upsert({umpire_id:n.id,email:c,updated_at:new Date().toISOString()},{onConflict:`umpire_id`});if(r){t&&(t.textContent=`The umpire was created, but the email could not be saved: `+r.message,t.className=`message error`),e.reset(),await W();return}}t&&(t.textContent=d?f?`Umpire created, invitation recorded, and the message was added to the Outbox.`:`Umpire created and invitation recorded. Open Edit on the new record to copy the message to send them.`:`Umpire created successfully.`,t.className=`message success`),e.reset(),await W()}catch(e){if(t){let n=e instanceof Error?e.message:`An unexpected error occurred.`;t.textContent=n.includes(`umpires_umpire_number_key`)?`That umpire number is already in use. Please choose another.`:`Unable to create umpire: ${n}`,t.className=`message error`}}finally{n&&(n.disabled=!1,n.textContent=`Create umpire`)}}}function G(e){let t=document.querySelector(`#umpire-editor`);t&&(t.innerHTML=e,t.scrollIntoView({behavior:`smooth`,block:`start`}),t.querySelector(`[data-cancel-editor]`)?.addEventListener(`click`,()=>{t.replaceChildren()}))}async function La(e,t){let n=document.querySelector(`#invitation-panel`);if(!n)return;let{data:r,error:i}=await H.from(`umpire_invitations`).select(`id, email, expires_at`).eq(`umpire_id`,e).eq(`status`,`pending`).maybeSingle();if(i){n.innerHTML=`<p class="message error">Could not load the invitation: ${U(i.message)}</p>`;return}let a=r??null,o=a?Aa(a):!1;n.className=`invitation-panel`,n.innerHTML=a?`
      <h4>Invitation</h4>
      <p class="season-dates">
        ${o?`The invitation to <strong>${U(a.email)}</strong> expired on ${U(a.expires_at.slice(0,10))}.`:`Invited: <strong>${U(a.email)}</strong>. The invitation expires on ${U(a.expires_at.slice(0,10))}.`}
      </p>
      <div class="account-actions">
        <button type="button" class="secondary-button"
          data-invite-action="renew">Renew (30 more days)</button>
        <button type="button" class="secondary-button"
          data-invite-action="revoke">Revoke</button>
      </div>
      ${o?``:`
          <label for="invitation-message">Message to send them</label>
          <textarea id="invitation-message" readonly rows="8">${U(Na(a.email,a.expires_at))}</textarea>
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
    `;let s=(e,t)=>{let n=document.querySelector(`#invitation-feedback`);n&&(n.textContent=e,n.className=`message ${t}`)};t&&s(t.text,t.kind),n.onclick=t=>{let n=t.target;if(!(n instanceof Element))return;let r=n.closest(`[data-invite-action]`);if(!r)return;let i=r.dataset.inviteAction??``;(async()=>{if(i===`copy`){let e=document.querySelector(`#invitation-message`);if(!e)return;try{await navigator.clipboard.writeText(e.value),s(`Message copied.`,`success`)}catch{e.select(),s(`Press Ctrl+C to copy the selected message.`,`success`)}}else if(i===`invite`){let t=Ea(document.querySelector(`#edit-email`)?.value??``);if(!t||!Da(t)){s(`Enter a valid email address in the Email box above first.`,`error`);return}r.disabled=!0;let{error:n}=await H.rpc(`invite_umpire`,{p_umpire_id:e,p_email:t});if(n){s(n.message,`error`),r.disabled=!1;return}let i=await Ma(e,t);await W(),await La(e,{text:i.ok?`Invitation created and added to the Outbox. You can also copy the message below and send it yourself.`:`Invitation created, but it could not be added to the Outbox (${i.error}). Copy the message below and send it yourself.`,kind:`success`})}else if(a){if(i===`renew`){r.disabled=!0;let{data:t,error:n}=await H.rpc(`renew_umpire_invitation`,{p_invitation_id:a.id});if(n){s(n.message,`error`),r.disabled=!1;return}await W(),await La(e,{text:`Invitation renewed until ${String(t).slice(0,10)}.`,kind:`success`})}else if(i===`revoke`){if(!window.confirm(`Revoke the invitation to ${a.email}? They will no longer be approved automatically.`))return;r.disabled=!0;let{error:t}=await H.rpc(`revoke_umpire_invitation`,{p_invitation_id:a.id});if(t){s(t.message,`error`),r.disabled=!1;return}await W(),await La(e,{text:`Invitation revoked.`,kind:`success`})}}})()}}async function Ra(e){let t=Ca.find(t=>t.id===e);if(!t){G(`<p>Umpire record not found.</p>`);return}let{data:n,error:r}=await H.from(`umpire_private_details`).select(`emergency_contact_name, emergency_contact_phone, admin_notes, email, birth_date, external_id_primary, external_id_secondary`).eq(`umpire_id`,e).maybeSingle();if(r){G(`<p class="error-message">Could not load private details: ${U(r.message)}</p>`);return}G(`
    <form id="edit-umpire-form" class="create-umpire-form">
      <h3>Edit Umpire</h3>

      <label for="edit-display-name">Display Name</label>
      <input id="edit-display-name" name="display_name" required
        value="${U(t.display_name)}">

      <label for="edit-umpire-number">Umpire Number</label>
      <input id="edit-umpire-number" name="umpire_number"
        value="${U(t.umpire_number??``)}">

      <label for="edit-classification">Classification</label>
      <select id="edit-classification" name="classification" required>
        <option value="youth" ${t.classification===`youth`?`selected`:``}>Youth</option>
        <option value="adult" ${t.classification===`adult`?`selected`:``}>Adult</option>
      </select>

      <label for="edit-phone">Phone</label>
      <input id="edit-phone" name="phone"
        value="${U(t.phone??``)}">

      <label for="edit-eligibility">Eligibility</label>
      <select id="edit-eligibility" name="eligibility_status" required>
        <option value="active" ${t.eligibility_status===`active`?`selected`:``}>Active</option>
        <option value="inactive" ${t.eligibility_status===`inactive`?`selected`:``}>Inactive</option>
        <option value="suspended" ${t.eligibility_status===`suspended`?`selected`:``}>Suspended</option>
      </select>

      <hr class="directory-divider">
      <h3>Private Details — Administrators Only</h3>

      ${t.email_from_account?`<p class="season-dates">Email: ${U(t.email??``)}
            (from the linked account; it changes when the account's email changes)</p>`:`<label for="edit-email">Email</label>
      <input id="edit-email" name="email" type="email"
        maxlength="254" autocomplete="off"
        value="${U(n?.email??``)}">`}

      ${ka(t)?`<p class="season-dates">
            The person's own account uses the name
            <strong>${U(t.account_name??``)}</strong>.
            The roster name above is what you typed. They are the same
            person; this is only a difference in spelling or style.
          </p>
          <button type="button" class="secondary-button"
            id="use-account-name">Use the account's name</button>`:``}

      ${t.profile_id?``:`<div id="invitation-panel"></div>`}

      <label for="edit-birth-date">Birth date</label>
      <input id="edit-birth-date" name="birth_date" type="date"
        value="${U(n?.birth_date??``)}">
      <p id="edit-age-hint" class="season-dates"></p>

      <label for="edit-emergency-contact-name">Emergency Contact Name</label>
      <input id="edit-emergency-contact-name"
        name="emergency_contact_name"
        value="${U(n?.emergency_contact_name??``)}">

      <label for="edit-emergency-contact-phone">Emergency Contact Phone</label>
      <input id="edit-emergency-contact-phone"
        name="emergency_contact_phone"
        value="${U(n?.emergency_contact_phone??``)}">

      <label for="edit-external-id-primary">Outside ID 1 (main league database)</label>
      <input id="edit-external-id-primary" name="external_id_primary"
        maxlength="100" autocomplete="off"
        value="${U(n?.external_id_primary??``)}">

      <label for="edit-external-id-secondary">Outside ID 2 (backup system)</label>
      <input id="edit-external-id-secondary" name="external_id_secondary"
        maxlength="100" autocomplete="off"
        value="${U(n?.external_id_secondary??``)}">

      <label for="edit-admin-notes">Administrative Notes</label>
      <textarea id="edit-admin-notes" name="admin_notes"
        rows="4">${U(n?.admin_notes??``)}</textarea>

      <p id="edit-umpire-message" class="message"
        role="status" aria-live="polite"></p>

      <div class="account-actions">
        <button type="submit">Save Changes</button>
        <button type="button" class="secondary-button" data-cancel-editor>Cancel</button>
      </div>
    </form>
  `);let i=()=>{let e=document.querySelector(`#edit-age-hint`),t=document.querySelector(`#edit-birth-date`),n=document.querySelector(`#edit-classification`);e&&t&&n&&(e.textContent=Ta(t.value,n.value))};document.querySelector(`#edit-birth-date`)?.addEventListener(`input`,i),document.querySelector(`#edit-classification`)?.addEventListener(`change`,i),i(),document.querySelector(`#use-account-name`)?.addEventListener(`click`,()=>{let e=document.querySelector(`#edit-display-name`);e&&t.account_name&&(e.value=t.account_name)}),t.profile_id||La(e);let a=document.querySelector(`#edit-umpire-form`);a?.addEventListener(`submit`,async t=>{t.preventDefault(),await za(e,new FormData(a))})}async function za(e,t){let n=String(t.get(`display_name`)??``).trim(),r=String(t.get(`umpire_number`)??``).trim(),i=String(t.get(`classification`)??``),a=String(t.get(`phone`)??``).trim(),o=String(t.get(`eligibility_status`)??``),s=String(t.get(`emergency_contact_name`)??``).trim(),c=String(t.get(`emergency_contact_phone`)??``).trim(),l=String(t.get(`admin_notes`)??``).trim(),u=String(t.get(`birth_date`)??``).trim(),d=String(t.get(`external_id_primary`)??``).trim(),f=String(t.get(`external_id_secondary`)??``).trim(),p=t.has(`email`),m=Ea(String(t.get(`email`)??``));if(!n){G(`<p>Please enter a display name.</p>`);return}if(![`youth`,`adult`].includes(i)){G(`<p>Please choose a valid classification.</p>`);return}if(![`active`,`inactive`,`suspended`].includes(o)){G(`<p>Please choose a valid eligibility status.</p>`);return}if(p&&m&&!Da(m)){let e=document.querySelector(`#edit-umpire-message`);e&&(e.textContent=`Please enter a valid email address.`,e.className=`message error`);return}if(u){let e=wa(u);if(e===null||e<0||e>120){let e=document.querySelector(`#edit-umpire-message`);e&&(e.textContent=`Enter a valid birth date that is not in the future.`,e.className=`message error`);return}}let h=document.querySelector(`#edit-umpire-form button[type="submit"]`);h&&(h.disabled=!0,h.textContent=`Saving...`);let{error:g}=await H.from(`umpires`).update({display_name:n,umpire_number:r||null,classification:i,phone:a||null,eligibility_status:o}).eq(`id`,e);if(g){G(`<p class="error-message">Could not save umpire: ${U(g.message)}</p>`);return}let{error:_}=await H.from(`umpire_private_details`).upsert({umpire_id:e,emergency_contact_name:s||null,emergency_contact_phone:c||null,admin_notes:l||null,birth_date:u||null,external_id_primary:d||null,external_id_secondary:f||null,...p?{email:m||null}:{},updated_at:new Date().toISOString()},{onConflict:`umpire_id`});_?G(`<p class="error-message">The main umpire details were saved, but the private details could not be saved: ${U(_.message.includes(`external_id_primary_unique`)?`Outside ID 1 is already used by another umpire record.`:_.message.includes(`external_id_secondary_unique`)?`Outside ID 2 is already used by another umpire record.`:_.message)}</p>`):(G(`<p>Umpire details saved successfully.</p>`),await W())}async function Ba(e){let t=Ca.find(t=>t.id===e);if(!t)return;let n=document.querySelector(`#umpire-editor`);if(!n)return;n.textContent=`Loading available accounts…`;let{data:r,error:i}=await H.from(`profiles`).select(`id, display_name, email, account_status`).eq(`account_status`,`approved`).order(`display_name`);if(i){n.textContent=`Unable to load accounts: ${i.message}`;return}let a=new Set(Ca.filter(t=>t.id!==e&&t.profile_id).map(e=>e.profile_id)),o=(r??[]).filter(e=>e.id===t.profile_id||!a.has(e.id));G(`
    <form id="link-umpire-form" class="create-umpire-form">
      <h3>Link account: ${U(t.display_name)}</h3>
      <p>Select an approved user account to associate with this umpire.
        Linking does not change the user's roles or approval status.</p>

      <label for="umpire-profile">Approved account</label>
      <select id="umpire-profile" name="profile_id">
        <option value="">No account linked</option>
        ${o.map(e=>`
          <option value="${U(e.id)}"
            ${e.id===t.profile_id?`selected`:``}>
            ${U(e.display_name||`Unnamed user`)}
            — ${U(e.email||`No email`)}
          </option>
        `).join(``)}
      </select>

      <p id="link-umpire-message" class="message" role="status"></p>

      <div class="account-actions">
        <button class="primary-button" type="submit">Save link</button>
        <button class="secondary-button" type="button" data-cancel-editor>Cancel</button>
      </div>
    </form>
  `);let s=document.querySelector(`#link-umpire-form`);s?.addEventListener(`submit`,t=>{t.preventDefault(),Va(e,s)})}async function Va(e,t){let n=document.querySelector(`#link-umpire-message`),r=t.querySelector(`button[type="submit"]`),i=String(new FormData(t).get(`profile_id`)??``);r&&(r.disabled=!0,r.textContent=`Saving…`);let{error:a}=await H.from(`umpires`).update({profile_id:i||null}).eq(`id`,e);a?(n&&(n.textContent=`Unable to save account link: ${a.message}`,n.className=`message error`),r&&(r.disabled=!1,r.textContent=`Save link`)):(G(`
    <p class="message success">Account link updated successfully.</p>
  `),await W())}function Ha(e){e.innerHTML=`
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
  `;let t=e.querySelector(`#create-umpire-form`),n=e.querySelector(`#toggle-create-umpire`);n?.addEventListener(`click`,()=>{t&&n&&(t.hidden=!t.hidden,n.setAttribute(`aria-expanded`,String(!t.hidden)),n.textContent=t.hidden?`+ Create Umpire`:`− Close Form`,t.hidden||e.querySelector(`#new-umpire-name`)?.focus())}),e.querySelector(`#cancel-create-umpire`)?.addEventListener(`click`,()=>{t?.reset(),t&&(t.hidden=!0),n?.setAttribute(`aria-expanded`,`false`),n&&(n.textContent=`+ Create Umpire`)}),t?.addEventListener(`submit`,e=>{e.preventDefault(),Ia(t)}),e.querySelector(`#umpire-search`)?.addEventListener(`input`,e=>{let t=e.target;t instanceof HTMLInputElement&&Fa(t.value)}),e.querySelector(`#refresh-umpires`)?.addEventListener(`click`,()=>{W()}),e.querySelector(`#umpire-results`)?.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof HTMLButtonElement))return;let n=t.dataset.editUmpire,r=t.dataset.linkUmpire;n&&Ra(n),r&&Ba(r)}),W()}var Ua=[`JAN`,`FEB`,`MAR`,`APR`,`MAY`,`JUN`,`JUL`,`AUG`,`SEP`,`OCT`,`NOV`,`DEC`],K={editingSeasonId:null,editingLeagueId:null,editingDivisionId:null,editingLocationId:null,editingTeamId:null,teamSeasonFilter:``,teamDivisionFilter:``,ageCharts:[],loadedSeasons:[],loadedLeagues:[],loadedDivisions:[],loadedTeams:[]},Wa=null;function Ga(e){Wa=e}async function q(e){if(!Wa)throw Error(`League Setup has not been initialised.`);await Wa(e)}function Ka(e,t){let n=e.querySelector(t.buttonId);n&&n.addEventListener(`click`,async()=>{let r=t.getId();if(!r)return;let i=e.querySelector(`#league-setup-message`),a=n.closest(`form`)?.querySelector(`[name="name"]`)?.defaultValue??``;if(!window.confirm(`Delete the ${t.noun} "${a}"? This cannot be undone.`))return;let o=n.textContent??`Delete`;n.disabled=!0,n.textContent=`Deleting…`;let{data:s,error:c}=await H.from(t.table).delete().eq(`id`,r).select(`id`);if(c||!s||s.length===0){i&&(i.textContent=c?.code===`23503`?t.inUseMessage:c?`Could not delete ${t.noun}: ${c.message}`:`The ${t.noun} was not deleted. You may not have permission, or it was already removed.`,i.className=`message error`),n.disabled=!1,n.textContent=o;return}t.onDeleted(),await q(e);let l=e.querySelector(`#league-setup-message`);l&&(l.textContent=`${t.noun.charAt(0).toUpperCase()}${t.noun.slice(1)} deleted.`,l.className=`message success`)})}function J(e){return e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e])}function qa(e,t=new Date){let n=/^(\d{4})-(\d{2})-(\d{2})$/.exec(e);if(!n)return null;let r=Number(n[1]),i=Number(n[2]),a=Number(n[3]),o=t.getFullYear()-r,s=t.getMonth()+1;return(s<i||s===i&&t.getDate()<a)&&--o,o}function Ja(e,t){let n=e.trim(),r=t.trim();if(!/^\d+$/.test(n)||!/^\d+$/.test(r))return{error:`Enter whole numbers for both the youngest and oldest age.`};let i=Number(n),a=Number(r);return i<4||i>18||a<4||a>18?{error:`Ages must be between 4 and 18.`}:i>a?{error:`The youngest age cannot be higher than the oldest age.`}:{youngest:i,oldest:a}}function Ya(e,t){let n=t.length>1;return`
    <section class="setup-panel">
      <h3>Divisions</h3>
      <button id="add-division-button" type="button"
        class="primary-button">
        Add division
      </button>
      ${e.length?`<ul class="setup-list">${e.map(e=>{let r=t.find(t=>t.id===e.league_id),i=e.youngest_ll_age!==null&&e.oldest_ll_age!==null?e.youngest_ll_age===e.oldest_ll_age?`LL age ${e.youngest_ll_age}`:`LL ages ${e.youngest_ll_age}\u2013${e.oldest_ll_age}`:`No age range set`;return`
        <li class="season-item">
          <div>
            <strong>${J(e.name)}</strong>
            ${e.age_group?`<span class="setup-status">${J(e.age_group)}</span>`:``}
            <p class="season-dates">${J(i)}</p>
            ${n&&r?`<p class="season-dates">${J(r.name)}</p>`:``}
            ${e.description?`<p class="season-dates">${J(e.description)}</p>`:``}
            <span class="setup-status">
              ${e.is_active?`Active`:`Inactive`}
            </span>
          </div>
          <button type="button"
            class="secondary-button season-edit-button"
            data-edit-division="${J(e.id)}">
            Edit
          </button>
        </li>
      `}).join(``)}</ul>`:`<p class="directory-empty">No divisions have been added yet.</p>`}
    </section>
  `}function Xa(e,t){let n=e?.name??``,r=e?.description??``,i=e?.youngest_ll_age??``,a=e?.oldest_ll_age??``,o=e?.is_active??!0,s=t.filter(e=>e.is_active),c=s.length===1?s[0].id:``,l=e?`
      <p class="season-dates">
        League: ${J(t.find(t=>t.id===e.league_id)?.name??`Unknown league`)}
      </p>
    `:`
      <label for="division-league">League</label>
      <select id="division-league" name="league_id" required>
        ${s.length===1?``:`<option value="">Choose a league</option>`}
        ${s.map(e=>`
          <option value="${J(e.id)}"
            ${e.id===c?`selected`:``}>
            ${J(e.name)}
          </option>
        `).join(``)}
      </select>
    `;return`
    <form id="division-form" class="create-umpire-form">
      <h3>${e?`Edit division`:`Add division`}</h3>

      ${l}

      <label for="division-name">Division name</label>
      <input id="division-name" name="name" required maxlength="100"
        value="${J(n)}"
        placeholder="e.g. Minors" />

      <label for="division-youngest">
        Youngest Little League age (4\u201318)
      </label>
      <input id="division-youngest" name="youngest_ll_age" required
        type="number" inputmode="numeric" step="1"
        min="4" max="18"
        value="${J(String(i))}" />

      <label for="division-oldest">
        Oldest Little League age (4\u201318)
      </label>
      <input id="division-oldest" name="oldest_ll_age" required
        type="number" inputmode="numeric" step="1"
        min="4" max="18"
        value="${J(String(a))}" />

      <label for="division-description">Description (optional)</label>
      <textarea id="division-description" name="description"
        rows="3" maxlength="500">${J(r)}</textarea>

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
  `}function Za(e){let t=e.querySelector(`#division-form`);t&&(e.querySelector(`#cancel-division-button`)?.addEventListener(`click`,()=>{K.editingDivisionId=null,q(e)}),Ka(e,{buttonId:`#delete-division-button`,table:`divisions`,noun:`division`,getId:()=>K.editingDivisionId,inUseMessage:`This division can't be deleted because teams use it. Move or remove those teams first, or mark the division inactive instead.`,onDeleted:()=>{K.editingDivisionId=null}}),t.addEventListener(`submit`,async n=>{n.preventDefault();let r=e.querySelector(`#league-setup-message`),i=e=>{r&&(r.textContent=e,r.className=`message error`)},a=new FormData(t),o=String(a.get(`name`)??``).trim(),s=String(a.get(`description`)??``).trim(),c=t.querySelector(`[name="is_active"]`)?.checked??!1,l=null;if(!K.editingDivisionId&&(l=String(a.get(`league_id`)??``)||null,!l||!K.loadedLeagues.some(e=>e.id===l))){i(`Choose a league.`);return}if(!o){i(`Enter a division name.`);return}let u=Ja(String(a.get(`youngest_ll_age`)??``),String(a.get(`oldest_ll_age`)??``));if(`error`in u){i(u.error);return}let d=t.querySelector(`button[type="submit"]`);d&&(d.disabled=!0,d.textContent=`Saving…`);let f={name:o,youngest_ll_age:u.youngest,oldest_ll_age:u.oldest,description:s||null,is_active:c},p=K.editingDivisionId?await H.from(`divisions`).update(f).eq(`id`,K.editingDivisionId):await H.from(`divisions`).insert({...f,league_id:l});if(p.error){p.error.code===`23505`?i(`A division with that name already exists in this league. Choose a different name.`):p.error.code===`23514`?i(`The age range was not accepted. Use whole ages from 4 to 18, with the youngest no higher than the oldest.`):i(`Could not save division: ${p.error.message}`),d&&(d.disabled=!1,d.textContent=`Save division`);return}K.editingDivisionId=null,await q(e);let m=e.querySelector(`#league-setup-message`);m&&(m.textContent=`Division saved successfully.`,m.className=`message success`)}))}function Qa(e){return`
    <section class="setup-panel">
      <h3>Leagues</h3>
      <button id="add-league-button" type="button"
        class="primary-button">
        Add league
      </button>
      ${e.length?`<ul class="setup-list">${e.map(e=>`
        <li class="season-item">
          <div>
            <strong>${J(e.name)}</strong>
            <span class="setup-status">
              ${e.is_active?`Active`:`Inactive`}
            </span>
          </div>
          <button type="button"
            class="secondary-button season-edit-button"
            data-edit-league="${J(e.id)}">
            Edit
          </button>
        </li>
      `).join(``)}</ul>`:`<p class="directory-empty">
        No leagues yet. Add a league before you create divisions.
      </p>`}
    </section>
  `}function $a(e){let t=e?.name??``,n=e?.is_active??!0;return`
    <form id="league-form" class="create-umpire-form">
      <h3>${e?`Edit league`:`Add league`}</h3>

      <label for="league-name">League name</label>
      <input id="league-name" name="name" required maxlength="100"
        value="${J(t)}"
        placeholder="Your league's name" />

      <label class="season-checkbox-label">
        <input name="is_active" type="checkbox"
          ${n?`checked`:``} />
        Active league
      </label>
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
  `}function eo(e){let t=e.querySelector(`#league-form`);t&&(Ka(e,{buttonId:`#delete-league-button`,table:`leagues`,noun:`league`,getId:()=>K.editingLeagueId,inUseMessage:`This league can't be deleted because divisions or teams use it. Remove those first, or mark the league inactive instead.`,onDeleted:()=>{K.editingLeagueId=null}}),e.querySelector(`#cancel-league-button`)?.addEventListener(`click`,()=>{K.editingLeagueId=null,q(e)}),t.addEventListener(`submit`,async n=>{n.preventDefault();let r=e.querySelector(`#league-setup-message`),i=new FormData(t),a=String(i.get(`name`)??``).trim(),o=t.querySelector(`[name="is_active"]`)?.checked??!1;if(!a){r&&(r.textContent=`Enter a league name.`,r.className=`message error`);return}let s=t.querySelector(`button[type="submit"]`);s&&(s.disabled=!0,s.textContent=`Saving…`);let c={name:a,is_active:o},l=K.editingLeagueId?await H.from(`leagues`).update(c).eq(`id`,K.editingLeagueId):await H.from(`leagues`).insert(c);if(l.error){r&&(r.textContent=l.error.code===`23505`?`A league with that name already exists. Choose a different name.`:`Could not save league: ${l.error.message}`,r.className=`message error`),s&&(s.disabled=!1,s.textContent=`Save league`);return}K.editingLeagueId=null,await q(e);let u=e.querySelector(`#league-setup-message`);u&&(u.textContent=`League saved successfully.`,u.className=`message success`)}))}function to(e){return`
    <section class="setup-panel">
      <h3>Game Locations</h3>
      <button id="add-location-button" type="button"
        class="primary-button">
        Add location
      </button>
      ${e.length?`<ul class="setup-list">${e.map(e=>`
        <li class="season-item">
          <div>
            <strong>${J(e.name)}</strong>
            ${e.address?`<p class="season-dates">${J(e.address)}</p>`:``}
            ${e.notes?`<p class="season-dates">${J(e.notes)}</p>`:``}
            <span class="setup-status">
              ${e.is_active?`Active`:`Inactive`}
            </span>
          </div>
          <button type="button"
            class="secondary-button season-edit-button"
            data-edit-location="${J(e.id)}">
            Edit
          </button>
        </li>
      `).join(``)}</ul>`:`<p class="directory-empty">
        No game locations yet. Add the fields where games are played.
      </p>`}
    </section>
  `}function no(e){let t=e?.name??``,n=e?.address??``,r=e?.notes??``,i=e?.is_active??!0;return`
    <form id="location-form" class="create-umpire-form">
      <h3>${e?`Edit location`:`Add location`}</h3>

      <label for="location-name">Location name</label>
      <input id="location-name" name="name" required maxlength="100"
        value="${J(t)}"
        placeholder="e.g. Field 1" />

      <label for="location-address">Address (optional)</label>
      <input id="location-address" name="address" maxlength="200"
        value="${J(n)}" />

      <label for="location-notes">Notes (optional)</label>
      <textarea id="location-notes" name="notes"
        rows="3" maxlength="500">${J(r)}</textarea>

      <label class="season-checkbox-label">
        <input name="is_active" type="checkbox"
          ${i?`checked`:``} />
        Active location
      </label>
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
  `}function ro(e){let t=e.querySelector(`#location-form`);t&&(Ka(e,{buttonId:`#delete-location-button`,table:`locations`,noun:`location`,getId:()=>K.editingLocationId,inUseMessage:`This location can't be deleted because games use it. Move or remove those games first, or mark the location inactive instead.`,onDeleted:()=>{K.editingLocationId=null}}),e.querySelector(`#cancel-location-button`)?.addEventListener(`click`,()=>{K.editingLocationId=null,q(e)}),t.addEventListener(`submit`,async n=>{n.preventDefault();let r=e.querySelector(`#league-setup-message`),i=new FormData(t),a=String(i.get(`name`)??``).trim(),o=String(i.get(`address`)??``).trim(),s=String(i.get(`notes`)??``).trim(),c=t.querySelector(`[name="is_active"]`)?.checked??!1;if(!a){r&&(r.textContent=`Enter a location name.`,r.className=`message error`);return}let l=t.querySelector(`button[type="submit"]`);l&&(l.disabled=!0,l.textContent=`Saving…`);let u={name:a,address:o||null,notes:s||null,is_active:c},d=K.editingLocationId?await H.from(`locations`).update(u).eq(`id`,K.editingLocationId):await H.from(`locations`).insert(u);if(d.error){r&&(r.textContent=d.error.code===`23505`?`A location with that name already exists. Choose a different name.`:`Could not save location: ${d.error.message}`,r.className=`message error`),l&&(l.disabled=!1,l.textContent=`Save location`);return}K.editingLocationId=null,await q(e);let f=e.querySelector(`#league-setup-message`);f&&(f.textContent=`Location saved successfully.`,f.className=`message success`)}))}var io={externalId:`Game ID`,event:`Event type (and division)`,group:`Group (used if there is no event type)`,home:`Home team`,away:`Away team`,date:`Date`,start:`Start time`,end:`End time`,field:`Field`,location:`Location`,status:`Status`},ao=[`externalId`,`home`,`away`,`date`,`start`,`end`],oo=[[`externalId`,[`matchid`,`gameid`,`eventid`,`matchnumber`,`gamenumber`,`id`]],[`date`,[`date`,`gamedate`,`matchdate`]],[`start`,[`starttime`,`start`,`begintime`]],[`end`,[`endtime`,`end`,`finishtime`]],[`home`,[`hometeam`,`home`]],[`away`,[`awayteam`,`away`,`visitingteam`,`visitor`]],[`event`,[`eventname`,`event`,`eventtype`,`type`]],[`group`,[`groupname`,`group`,`divisionname`,`division`]],[`field`,[`field`,`diamond`]],[`location`,[`location`,`venue`,`facility`,`park`,`site`,`complex`]],[`status`,[`scheduledstatus`,`matchstatus`,`status`]]];function so(e){return e.toLowerCase().replace(/[^a-z0-9]/g,``)}function co(e){let t={externalId:null,event:null,group:null,home:null,away:null,date:null,start:null,end:null,field:null,location:null,status:null},n=e.map(so),r=new Set;for(let[e,i]of oo)for(let a of i){let i=n.findIndex((e,t)=>e===a&&!r.has(t));if(i!==-1){t[e]=i,r.add(i);break}}return t}function lo(e){let t=ao.filter(t=>e[t]===null);return e.field===null&&e.location===null&&t.push(`location`),t}function uo(e,t){let n=(e,n)=>{let r=t[n];return r===null?``:(e[r]??``).trim()};return e.slice(1).map((e,t)=>({line:t+2,externalId:n(e,`externalId`),event:n(e,`event`),group:n(e,`group`),home:n(e,`home`),away:n(e,`away`),date:n(e,`date`),start:n(e,`start`),end:n(e,`end`),field:n(e,`field`),location:n(e,`location`),status:n(e,`status`)}))}function fo(e){return e.away.trim().toLowerCase()===`practice`}function po(e){return e.event||e.group}function mo(e){let t=e.trim(),n=/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})$/.exec(t);return n?ho(n[3].length===2?2e3+Number(n[3]):Number(n[3]),Number(n[1]),Number(n[2])):(n=/^(\d{4})-(\d{2})-(\d{2})$/.exec(t),n?ho(Number(n[1]),Number(n[2]),Number(n[3])):null)}function ho(e,t,n){let r=new Date(e,t-1,n);return r.getFullYear()===e&&r.getMonth()===t-1&&r.getDate()===n?{y:e,m:t,d:n}:null}function go(e){let t=e.trim(),n=/^(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]?\.?$/.exec(t);if(n){let e=Number(n[1]),t=n[2]===void 0?0:Number(n[2]);if(e<1||e>12||t>59)return null;let r=n[3].toLowerCase()===`p`;return{h:e%12+(r?12:0),m:t}}if(n=/^(\d{1,2}):(\d{2})$/.exec(t),n){let e=Number(n[1]),t=Number(n[2]);return e<=23&&t<=59?{h:e,m:t}:null}return null}function _o(e,t){let n=new Date(e.y,e.m-1,e.d,t.h,t.m);return n.getFullYear()===e.y&&n.getMonth()===e.m-1&&n.getDate()===e.d&&n.getHours()===t.h&&n.getMinutes()===t.m?n.toISOString():null}function Y(e){return e.toLowerCase().replace(/[^a-z0-9]/g,``)}function vo(e){return e.replace(/^\s*games?\s*[-:]\s*/i,``).replace(/\s*[-:]\s*group\s*$/i,``).trim()}function yo(e){return e.replace(/\([^)]*\)/g,` `).replace(/\s+/g,` `).trim()}function bo(e,t){let n=vo(e),r=Y(yo(n)),i=[...new Set([Y(n),r])].filter(Boolean);if(i.length===0)return null;let a=t.map(e=>({id:e.id,full:Y(e.name),core:Y(yo(e.name))})),o=a.filter(e=>i.some(t=>e.full===t||e.core===t));if(o.length===1)return o[0].id;if(o.length>1)return null;if(r.length>=3){let e=a.filter(e=>e.core.startsWith(r)||e.full.startsWith(r));if(e.length===1)return e[0].id}return null}function xo(e){return/^[A-Za-z]+\s+\d+\s*-\s*\S/.test(e.trim())}function So(e){return e.replace(/\s+/g,` `).trim()}function Co(e,t){let n=e.map(e=>Y(e));for(let e of t){let t=n.indexOf(e);if(t!==-1)return t}return null}function wo(e){let t=mo(e.trim().split(/\s+/)[0]??``);return t?`${t.y}-${String(t.m).padStart(2,`0`)}-${String(t.d).padStart(2,`0`)}`:null}function To(e){let t=e[0]??[],n=Co(t,[`programname`,`program`,`seasonname`,`season`]),r=Co(t,[`divisionname`,`division`,`groupname`,`group`]),i=Co(t,[`teamname`,`team`]),a=Co(t,[`teamcode`,`code`]),o=[];if(r===null&&o.push(`Division Name`),i===null&&o.push(`Team Name`),o.length)return{rows:[],missing:o};let s=(e,t)=>t===null?``:e[t]??``;return{missing:o,rows:e.slice(1).map((e,t)=>({line:t+2,program:So(s(e,n)),division:So(s(e,r)),team:So(s(e,i)),code:So(s(e,a))}))}}function Eo(e){let t=e[0]??[],n=Co(t,[`programname`,`program`,`seasonname`,`season`]),r=Co(t,[`divisionname`,`division`,`groupname`,`group`]),i=Co(t,[`numberofteams`,`teamcount`,`teams`]),a=Co(t,[`divisionstartdate`,`startdate`,`start`]),o=Co(t,[`divisionenddate`,`enddate`,`end`]);if(r===null)return{rows:[],missing:[`Division Name`]};let s=(e,t)=>t===null?``:e[t]??``;return{missing:[],rows:e.slice(1).map((e,t)=>{let c=Number.parseInt(s(e,i),10);return{line:t+2,program:So(s(e,n)),division:So(s(e,r)),expectedTeams:Number.isFinite(c)?c:null,startsOn:wo(s(e,a)),endsOn:wo(s(e,o))}})}}function Do(e,t){return t===``||e.program===``||Y(e.program)===Y(t)}function Oo(e){let t=new Map;for(let n of[...e.teams,...e.divisions])n.program&&!t.has(Y(n.program))&&t.set(Y(n.program),n.program);return[...t.values()]}function ko(e,t){let n=new Map,r=e=>{let t=Y(e);if(!t)return null;let r=n.get(t);return r||(r={key:t,name:e,teams:0,expected:null,startsOn:null,endsOn:null},n.set(t,r)),r};for(let n of e.divisions.filter(e=>Do(e,t))){let e=r(n.division);e&&(e.expected=n.expectedTeams,e.startsOn=n.startsOn,e.endsOn=n.endsOn)}for(let n of e.teams.filter(e=>Do(e,t))){let e=r(n.division);e&&n.team&&(e.teams+=1)}return[...n.values()]}function Ao(e){let t=e.map(e=>e.startsOn).filter(e=>!!e).sort()[0]??``;if(!t)return{startsOn:``,endsOn:``,ignored:[]};let n=new Date(`${t}T00:00:00Z`);n.setUTCDate(n.getUTCDate()+366);let r=n.toISOString().slice(0,10),i=[],a=[];for(let t of e)t.endsOn&&(t.endsOn>r?i.push(`The end date ${t.endsOn} for ${t.name} was ignored: it is more than a year after the start, so it is probably a typing slip.`):a.push(t.endsOn));return a.sort(),{startsOn:t,endsOn:a[a.length-1]??``,ignored:i}}function jo(e,t,n,r){let i=r??Oo(e)[0]??``,a=ko(e,i),o=t.divisions.filter(e=>e.league_id===n),s={};for(let e of a){let t=bo(e.name,o);s[e.key]={include:!/external/i.test(e.name),target:t?{kind:`existing`,id:t}:{kind:`new`,name:yo(e.name)||e.name}}}let c=t.seasons.find(e=>Y(e.name)===Y(i)),l=Ao(a.filter(e=>s[e.key]?.include));return{leagueId:n,program:i,season:c?{kind:`existing`,id:c.id}:{kind:`new`,name:i,startsOn:l.startsOn,endsOn:l.endsOn},divisions:s,skipTeams:{}}}var Mo=100,No=/^\d{4}-\d{2}-\d{2}$/;function Po(e){let{files:t,settings:n,context:r,newId:i}=e,a=[],o=[],s=r.divisions.filter(e=>e.league_id===n.leagueId);r.leagues.some(e=>e.id===n.leagueId)||a.push(`Choose the league these divisions and teams belong to.`);let c,l=null;if(n.season.kind===`existing`){let e=n.season.id,t=r.seasons.find(t=>t.id===e);t||a.push(`The season you chose could not be found.`),l=t?.id??null,c={kind:`existing`,id:l,name:t?.name??``,startsOn:``,endsOn:``}}else{let e=So(n.season.name),{startsOn:t,endsOn:i}=n.season;e?e.length>Mo?a.push(`The season name is too long (the limit is ${Mo} letters).`):r.seasons.some(t=>Y(t.name)===Y(e))&&a.push(`A season called "${e}" already exists. Choose it from the list to add teams to it, or give this one a different name.`):a.push(`The season needs a name.`),t&&!No.test(t)&&a.push(`The season start date is not a date.`),i&&!No.test(i)&&a.push(`The season end date is not a date.`),No.test(t)&&No.test(i)&&i<t&&a.push(`The season ends before it starts.`),c={kind:`new`,id:null,name:e,startsOn:t,endsOn:i}}let u=ko(t,n.program),d=[],f=new Map,p=[],m=new Map;for(let e of u){let t=n.divisions[e.key],r=!t||t.include,o=t?.target??{kind:`new`,name:yo(e.name)||e.name};if(!r){p.push({key:e.key,fileName:e.name,teams:e.teams,expected:e.expected,include:!1,status:`skipped`,targetName:``});continue}if(o.kind===`existing`){let t=s.find(e=>e.id===o.id);t?f.set(e.key,{id:t.id,name:t.name}):a.push(`The division you chose for "${e.name}" is not in this league.`),p.push({key:e.key,fileName:e.name,teams:e.teams,expected:e.expected,include:!0,status:`existing`,targetName:t?.name??``});continue}let c=So(o.name);if(!c)a.push(`The new division for "${e.name}" needs a name.`);else if(c.length>Mo)a.push(`The division name "${c}" is too long (the limit is ${Mo} letters).`);else if(s.some(e=>Y(e.name)===Y(c)))a.push(`A division called "${c}" already exists in this league. Choose it from the list instead of creating it again.`);else if(m.has(Y(c)))a.push(`Two divisions in the file would both be created as "${c}". Give one of them a different name, or choose an existing division.`);else{m.set(Y(c),e.name);let t=i();d.push({id:t,name:c}),f.set(e.key,{id:t,name:c})}p.push({key:e.key,fileName:e.name,teams:e.teams,expected:e.expected,include:!0,status:`new`,targetName:c})}let h=t.teams.filter(e=>Do(e,n.program)),g=l?r.teams.filter(e=>e.season_id===l&&e.league_id===n.leagueId):[],_=new Map(g.map(e=>[Y(e.name),e])),v=[],y=[],b=new Map,x=new Set,S=0,ee=0;for(let e of h){let t=f.get(Y(e.division));if(!e.team||!t||n.skipTeams[String(e.line)])continue;let r=Y(e.team);b.set(r,[...b.get(r)??[],e.line])}for(let e of h){let t=Y(e.team),r=f.get(Y(e.division)),s={line:e.line,name:e.team,fileDivision:e.division};if(!e.team){o.push(`Line ${e.line}: a row with no team name was skipped.`);continue}if(x.add(t),!r||n.skipTeams[String(e.line)]){ee+=1,v.push({...s,divisionName:r?.name??``,status:`skipped`,note:r?`left out`:`its division is not being imported`});continue}(b.get(t)?.length??0)>1&&a.push(`The team "${e.team}" appears more than once (lines ${b.get(t).join(`, `)}). Untick all but one.`),e.team.length>Mo&&a.push(`The team name "${e.team}" is too long (the limit is ${Mo} letters).`);let c=/-\s*$/.test(e.team)?`no coach name yet`:``,l=_.get(t);l?(S+=1,l.division_id&&l.division_id!==r.id&&o.push(`"${l.name}" is already in this season in a different division than the file puts it in. It was left as it is.`),v.push({...s,divisionName:r.name,status:`exists`,note:`already in this season`})):(b.get(t)&&b.get(t)[0]!==e.line||y.push({id:i(),name:e.team,divisionId:r.id}),v.push({...s,divisionName:r.name,status:`new`,note:c}))}let C=h.length>0;for(let e of p)C&&e.include&&e.expected!==null&&e.expected!==e.teams&&o.push(`${e.fileName}: the division file expects ${e.expected} teams but the team file has ${e.teams}.`);let te=v.filter(e=>e.status===`new`&&e.note===`no coach name yet`);te.length&&o.push(`${te.length} ${te.length===1?`team has`:`teams have`} no coach name yet (${te.map(e=>e.name).join(`, `)}). They will be created with the name as it is; untick them to leave them out.`);let ne=g.filter(e=>!x.has(Y(e.name))).map(e=>e.name);ne.length&&o.push(`${ne.length} ${ne.length===1?`team`:`teams`} already in this season ${ne.length===1?`is`:`are`} not in the file. They have not been touched.`);let re=Ao(u.filter(e=>n.divisions[e.key]?.include!==!1));return n.season.kind===`new`&&o.push(...re.ignored),{season:c,divisions:p,teams:v,newDivisions:d,newTeams:y,existingTeams:S,skippedTeams:ee,notInFile:ne,problems:a,warnings:o}}function Fo(e){let t=e.charCodeAt(0)===65279?e.slice(1):e,n=[],r=[],i=``,a=!1,o=!1,s=()=>{r.push(i),i=``,o=!1},c=()=>{s(),(r.some(e=>e.trim()!==``)||r.length>1)&&n.push(r),r=[]};for(let e=0;e<t.length;e+=1){let n=t[e];a?n===`"`?t[e+1]===`"`?(i+=`"`,e+=1):a=!1:i+=n:n===`"`&&i===``&&!o?(a=!0,o=!0):n===`,`?s():n===`\r`?(t[e+1]===`
`&&(e+=1),c()):n===`
`?c():i+=n}if(a)throw Error(`The file ends inside a quoted value. Check that every opening quote has a closing quote.`);return(i!==``||r.length>0)&&c(),n.filter(e=>e.some(e=>e.trim()!==``))}var Io=`__new__`,Lo=2097152;function Ro(){if(typeof crypto.randomUUID==`function`)return crypto.randomUUID();let e=crypto.getRandomValues(new Uint8Array(16));e[6]=e[6]&15|64,e[8]=e[8]&63|128;let t=[...e].map(e=>e.toString(16).padStart(2,`0`)).join(``);return`${t.slice(0,8)}-${t.slice(8,12)}-${t.slice(12,16)}-${t.slice(16,20)}-${t.slice(20)}`}function zo(e){let t=``;return/season .* could not be created/i.test(e)&&/duplicate|already exists/i.test(e)?t=` A season with that name already exists: choose it from the Season list to add teams to it.`:/division .* could not be added/i.test(e)&&/duplicate/i.test(e)?t=` A division with that name already exists in this league: choose it from the list instead of creating it again.`:/team .* could not be added/i.test(e)&&/duplicate/i.test(e)?t=` A team with that name is already in this season.`:/row-level security|permission denied/i.test(e)&&(t=` You may not have permission to do this.`),`Nothing was created. ${e}${t}`}function Bo(e,t){let n=t.leagues.filter(e=>e.is_active),r={leagues:t.leagues.map(e=>({id:e.id,name:e.name})),seasons:t.seasons.map(e=>({id:e.id,name:e.name})),divisions:t.divisions.map(e=>({id:e.id,name:e.name,league_id:e.league_id})),teams:t.teams.map(e=>({id:e.id,name:e.name,season_id:e.season_id,league_id:e.league_id,division_id:e.division_id}))},i={teams:[],divisions:[]},a=``,o=``,s=null,c=null,l=!1,u=!1;e.innerHTML=`
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
  `;let d=e.querySelector(`#season-importer`),f=d.querySelector(`#si-body`),p=d.querySelector(`#si-message`),m=(e,t=`error`)=>{p.textContent=e,p.className=e?`message ${t}`:`message`},h=()=>{s&&(c=Po({files:i,settings:s,context:r,newId:Ro}))},g=(e,t)=>{s=jo(i,r,e,t),l=!1,h(),_()},_=()=>{if(!s){f.innerHTML=``;return}let e=Oo(i),c=s,l=r.divisions.filter(e=>e.league_id===c.leagueId).sort((e,t)=>e.name.localeCompare(t.name)),u=ko(i,c.program),d=c.season.kind===`new`?c.season:null;f.innerHTML=`
      <p class="directory-description">
        ${[a?`Team file: <strong>${J(a)}</strong> (${i.teams.length} teams)`:``,o?`Division file: <strong>${J(o)}</strong> (${i.divisions.length} divisions)`:``].filter(Boolean).join(` &middot; `)}
      </p>

      <label for="si-league">League</label>
      <select id="si-league">
        ${n.map(e=>`
          <option value="${J(e.id)}" ${e.id===c.leagueId?`selected`:``}>${J(e.name)}</option>
        `).join(``)}
      </select>

      ${e.length>1?`
        <label for="si-program">Program in the file (one season at a time)</label>
        <select id="si-program">
          ${e.map(e=>`
            <option value="${J(e)}" ${e===c.program?`selected`:``}>${J(e)}</option>
          `).join(``)}
        </select>
      `:``}

      <label for="si-season">Season</label>
      <select id="si-season">
        <option value="${Io}" ${d?`selected`:``}>Create a new season</option>
        ${t.seasons.map(e=>`
          <option value="${J(e.id)}" ${c.season.kind===`existing`&&c.season.id===e.id?`selected`:``}>Add to: ${J(e.name)}</option>
        `).join(``)}
      </select>

      <div id="si-season-new" ${d?``:`hidden`}>
        <label for="si-season-name">New season name</label>
        <input id="si-season-name" type="text" maxlength="100" value="${J(d?.name??``)}" />
        <div class="game-filters">
          <div>
            <label for="si-season-start">Starts</label>
            <input id="si-season-start" type="date" value="${J(d?.startsOn??``)}" />
          </div>
          <div>
            <label for="si-season-end">Ends</label>
            <input id="si-season-end" type="date" value="${J(d?.endsOn??``)}" />
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
                    <label class="season-checkbox-label"><input type="checkbox" data-div-include="${J(e.key)}" ${t?.include===!1?``:`checked`} /> Import</label>
                  </td>
                  <td data-label="In the file">${J(e.name)}</td>
                  <td data-label="Teams">${e.teams}${e.expected===null?``:` <span class="season-dates">(file says ${e.expected})</span>`}</td>
                  <td data-label="Your division">
                    <select data-div-target="${J(e.key)}" aria-label="Division for ${J(e.name)}" ${t?.include===!1?`disabled`:``}>
                      <option value="${Io}" ${r?`selected`:``}>Create a new division</option>
                      ${l.map(e=>`
                        <option value="${J(e.id)}" ${n?.kind===`existing`&&n.id===e.id?`selected`:``}>${J(e.name)}</option>
                      `).join(``)}
                    </select>
                    <input type="text" data-div-name="${J(e.key)}" maxlength="100"
                      value="${J(n?.kind===`new`?n.name:``)}"
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
                      <input type="checkbox" data-team-line="${e.line}" aria-label="Import ${J(e.name)}"
                        ${e.status===`skipped`?``:`checked`} ${t?`disabled`:``} />
                    </td>
                    <td data-label="Team">${J(e.name)}</td>
                    <td data-label="Division">${J(e.divisionName||e.fileDivision)}</td>
                    <td data-label="Note">${J(e.note)}</td>
                  </tr>
                `}).join(``)}
            </tbody>
          </table>
        </div>
      </details>
    `)},y=()=>{let e=f.querySelector(`#si-preview`);if(!e||!c)return;let t=c,n=e=>e===1?`team`:`teams`,r=e=>e===1?`division`:`divisions`,i=t.newDivisions.length===0&&t.newTeams.length===0&&t.season.kind===`existing`,a=t.problems.length>0||i||u,o=t.season.kind===`new`?`a new season, <strong>${J(t.season.name||`(no name)`)}</strong>${t.season.startsOn||t.season.endsOn?` (${J(t.season.startsOn||`?`)} to ${J(t.season.endsOn||`?`)})`:``}`:`the existing season <strong>${J(t.season.name)}</strong>, which is not changed`,s=i?`Nothing new to add`:t.season.kind===`new`?`Create the season, ${t.newDivisions.length} ${r(t.newDivisions.length)} and ${t.newTeams.length} ${n(t.newTeams.length)}`:`Add ${t.newTeams.length} ${n(t.newTeams.length)}${t.newDivisions.length?` and ${t.newDivisions.length} ${r(t.newDivisions.length)}`:``}`;e.innerHTML=`
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
          <ul class="imp-list">${t.problems.map(e=>`<li>${J(e)}</li>`).join(``)}</ul>
        </div>
      `:``}

      ${t.warnings.length?`
        <div class="imp-section" id="si-warnings">
          <h5>Worth a look</h5>
          <ul class="imp-list">${t.warnings.map(e=>`<li>${J(e)}</li>`).join(``)}</ul>
        </div>
      `:``}

      ${t.newDivisions.length?`
        <details class="imp-section">
          <summary>New divisions (${t.newDivisions.length})</summary>
          <ul class="imp-list">${t.newDivisions.map(e=>`<li>${J(e.name)}</li>`).join(``)}</ul>
        </details>
      `:``}

      <div class="account-actions">
        <button id="si-apply" class="primary-button" type="button" ${a?`disabled`:``}>${J(s)}</button>
      </div>
    `},b=async()=>{if(!c||!s||u||c.problems.length>0)return;u=!0,m(`Creating…`,`success`),y();let{data:e,error:n}=await H.rpc(`import_season`,{p_league_id:s.leagueId,p_season:c.season.kind===`new`?{name:c.season.name,starts_on:c.season.startsOn||null,ends_on:c.season.endsOn||null}:{id:c.season.id},p_divisions:c.newDivisions.map(e=>({id:e.id,name:e.name})),p_teams:c.newTeams.map(e=>({id:e.id,name:e.name,division_id:e.divisionId}))});if(u=!1,n){m(zo(n.message),`error`),y();return}let r=e??{},i=r.teams_created??0,a=r.divisions_created??0,o=c.season.name;t.onImported(r.season_created?`Created the season "${o}" with ${a} new ${a===1?`division`:`divisions`} and ${i} ${i===1?`team`:`teams`}.`:`Added ${i} ${i===1?`team`:`teams`} to "${o}"${a?` and created ${a} new ${a===1?`division`:`divisions`}`:``}.`,r.season_id??``)},x=async(e,t)=>{if(m(``),/\.xlsx?$/i.test(e.name)){m(`That is an Excel file. Please save it as CSV first (File, Save as or Download, Comma-separated values) and choose that file.`);return}if(e.size>Lo){m(`That file is too large (the limit is 2 MB).`);return}let r;try{r=Fo(await e.text())}catch(e){m(e instanceof Error?e.message:`That file could not be read.`);return}if(r.length<2)m(`That file has no rows below the headings.`);else{if(t===`team`){let t=To(r);if(t.missing.length){m(`That does not look like a Team Detail file: these headings were not found: ${t.missing.join(`, `)}.`);return}i={...i,teams:t.rows},a=e.name}else{let t=Eo(r);if(t.missing.length){m(`That does not look like a Division Details file: these headings were not found: ${t.missing.join(`, `)}.`);return}i={...i,divisions:t.rows},o=e.name}n.length===0?m(`There is no active league yet. Add a league first, then come back.`):g(s?.leagueId??n[0].id,s?.program||void 0)}};d.querySelector(`#si-team-file`)?.addEventListener(`change`,e=>{let t=e.target.files?.[0];t&&x(t,`team`)}),d.querySelector(`#si-division-file`)?.addEventListener(`change`,e=>{let t=e.target.files?.[0];t&&x(t,`division`)}),d.querySelector(`#si-close`)?.addEventListener(`click`,t.onClose),f.addEventListener(`click`,e=>{let t=e.target;t instanceof Element&&t.closest(`#si-apply`)&&b()}),f.addEventListener(`change`,e=>{let t=e.target;if(t instanceof HTMLElement&&s){if(t instanceof HTMLSelectElement&&t.id===`si-league`)g(t.value,s.program);else if(t instanceof HTMLSelectElement&&t.id===`si-program`)g(s.leagueId,t.value);else if(t instanceof HTMLSelectElement&&t.id===`si-season`){if(t.value===Io){let e=Ao(ko(i,s.program).filter(e=>s.divisions[e.key]?.include!==!1));s.season={kind:`new`,name:s.program,startsOn:e.startsOn,endsOn:e.endsOn}}else s.season={kind:`existing`,id:t.value};h(),_()}else if(t instanceof HTMLInputElement&&t.dataset.divInclude!==void 0){let e=s.divisions[t.dataset.divInclude];if(e&&(e.include=t.checked),s.season.kind===`new`&&!l){let e=Ao(ko(i,s.program).filter(e=>s.divisions[e.key]?.include!==!1));s.season={...s.season,startsOn:e.startsOn,endsOn:e.endsOn}}h(),_()}else if(t instanceof HTMLSelectElement&&t.dataset.divTarget!==void 0){let e=t.dataset.divTarget,n=f.querySelector(`[data-div-name="${CSS.escape(e)}"]`),r=s.divisions[e];if(!r)return;if(t.value===Io){let t=n?.value.trim()||ko(i,s.program).find(t=>t.key===e)?.name||``;r.target={kind:`new`,name:t},n&&(n.value=t,n.hidden=!1)}else r.target={kind:`existing`,id:t.value},n&&(n.hidden=!0);h(),v(),y()}else t instanceof HTMLInputElement&&t.dataset.teamLine!==void 0?(s.skipTeams[t.dataset.teamLine]=!t.checked,h(),v(),y()):t instanceof HTMLInputElement&&(t.id===`si-season-start`||t.id===`si-season-end`)&&s.season.kind===`new`&&(l=!0,s.season={...s.season,startsOn:t.id===`si-season-start`?t.value:s.season.startsOn,endsOn:t.id===`si-season-end`?t.value:s.season.endsOn},h(),y())}}),f.addEventListener(`input`,e=>{let t=e.target;if(t instanceof HTMLInputElement&&s){if(t.id===`si-season-name`&&s.season.kind===`new`)s.season={...s.season,name:t.value},h(),y();else if(t.dataset.divName!==void 0){let e=s.divisions[t.dataset.divName];e&&e.target.kind===`new`&&(e.target={kind:`new`,name:t.value},h(),v(),y())}}})}function Vo(e){let t=[],n=[],r=e.replace(/^\uFEFF/,``).split(/\r\n|\n|\r/),i=!1,a=0,o=new Set,s=new Set;for(let e=0;e<r.length;e++){let c=e+1,l=r[e].trim();if(!l)continue;if(l.includes(`"`)){t.push(`Line ${c}: quotation marks are not supported.`);continue}let u=l.split(`,`).map(e=>e.trim());if(!i){i=!0;let e=[...Ua,`AGE`],n=u.map(e=>e.toUpperCase());if(!(n.length===e.length&&e.every((e,t)=>n[t]===e)))return t.push(`Line ${c}: the header must be exactly ${e.join(`,`)}.`),{entries:[],errors:t};continue}if(a++,u.length!==13){t.push(`Line ${c}: expected 13 values but found ${u.length}.`);continue}let d=u[12];if(!/^\d+$/.test(d)){t.push(`Line ${c}: AGE "${d}" is not a whole number.`);continue}let f=Number(d);if(f<4||f>18){t.push(`Line ${c}: AGE ${f} is outside the supported range 4–18.`);continue}let p=[],m=[];if(u.slice(0,12).forEach((e,t)=>{let n=Number(e);!/^\d{4}$/.test(e)||n<1900||n>2100?m.push(Ua[t]):p.push({birth_month:t+1,birth_year:n,ll_age:f})}),m.length>0){t.push(`Line ${c}: invalid birth year in ${m.join(`, `)}. Use four-digit years.`);continue}let h=[],g=!1;for(let e of p)o.has(`${e.birth_month}-${e.birth_year}`)&&h.push(Ua[e.birth_month-1]),s.has(`${e.birth_month}-${e.ll_age}`)&&(g=!0);if(h.length>0)t.push(`Line ${c}: the birth year repeats one already used for ${h.join(`, `)}.`);else if(g)t.push(`Line ${c}: age ${f} appears more than once.`);else for(let e of p)o.add(`${e.birth_month}-${e.birth_year}`),s.add(`${e.birth_month}-${e.ll_age}`),n.push(e)}return i?a===0&&t.push(`The file has a header but no data rows.`):t.push(`The file is empty.`),{entries:t.length>0?[]:n,errors:t}}function Ho(e){let t=e.map(e=>e.ll_age),n=e.map(e=>e.birth_year);return`${e.length} entries, Little League ages ${Math.min(...t)}–${Math.max(...t)}, birth years ${Math.min(...n)}–${Math.max(...n)}.`}async function Uo(){let{data:e,error:t}=await H.from(`little_league_age_charts`).select(`id, chart_year, name`).order(`chart_year`,{ascending:!1}).order(`name`);return t?(console.error(`Age chart load failed:`,t.message),null):e??[]}function Wo(e,t){return`<option value="">No chart selected</option>`+e.map(e=>`
      <option value="${J(e.id)}"
        ${e.id===t?`selected`:``}>
        ${J(e.name)}
      </option>
    `).join(``)}function X(e,t,n,r=[]){let i=e.querySelector(`#chart-import-feedback`);if(!i)return;let a=r.slice(0,8),o=r.length>a.length?`<p>…and ${r.length-a.length} more.</p>`:``,s=a.length?`<ul>${a.map(e=>`<li>${J(e)}</li>`).join(``)}</ul>`:``;i.innerHTML=`<p class="message ${t===`info`?``:t}">${J(n)}</p>${s}${o}`}function Go(e){let t=e.querySelector(`#chart-file`),n=e.querySelector(`#chart-year`),r=e.querySelector(`#chart-name`),i=e.querySelector(`#chart-import-button`),a=e.querySelector(`#season-chart`);if(!t||!n||!r||!i||!a)return;let o=[];e.querySelector(`#chart-import`)?.addEventListener(`keydown`,e=>{e.key===`Enter`&&e.preventDefault()}),t.addEventListener(`change`,async()=>{o=[],i.disabled=!0;let a=t.files?.[0];if(!a){X(e,`info`,``);return}if(a.size>102400){X(e,`error`,`That file is too large for an age chart. Choose the chart CSV.`);return}let s;try{s=await a.text()}catch{X(e,`error`,`The file could not be read.`);return}let c=Vo(s);if(c.errors.length>0){X(e,`error`,`This file can't be imported. Fix these problems and choose it again:`,c.errors);return}o=c.entries;let l=a.name.match(/(20\d{2})/);!n.value&&l&&(n.value=l[1]),!r.value.trim()&&n.value&&(r.value=`${n.value} Little League Age Chart`),X(e,`success`,`File checked: ${Ho(o)} Confirm the year and name, then select Import chart.`),i.disabled=!1}),i.addEventListener(`click`,async()=>{let s=Number(n.value),c=r.value.trim();if(o.length===0){X(e,`error`,`Choose a chart CSV file first.`);return}if(!Number.isInteger(s)||s<2e3||s>2100){X(e,`error`,`Enter a chart year between 2000 and 2100.`);return}if(!c){X(e,`error`,`Enter a chart name.`);return}i.disabled=!0,i.textContent=`Importing…`;let{data:l,error:u}=await H.rpc(`import_age_chart`,{p_chart_year:s,p_name:c,p_entries:o});if(i.textContent=`Import chart`,u){X(e,`error`,u.code===`23505`?`A chart with this year and name already exists. Choose a different name.`:`Could not import the chart: ${u.message}`),i.disabled=!1;return}let d=typeof l==`string`?l:null,f=await Uo();o=[],t.value=``,f?(K.ageCharts=f,a.innerHTML=Wo(K.ageCharts,d),X(e,`success`,`Chart imported and selected. It is saved, but it is not attached to this season until you select Save season.`)):X(e,`success`,`The chart was imported, but the list could not refresh. Select Refresh at the top of League Setup.`)})}function Ko(e){return`
    <section class="setup-panel">
      <h3>Seasons</h3>
      <button id="add-season-button" type="button"
        class="primary-button">
        Add season
      </button>
      ${e.length?`<ul class="setup-list">${e.map(e=>{let t=K.ageCharts.find(t=>t.id===e.age_chart_id),n=e.age_chart_id?`Age chart: ${t?t.name:`unavailable`}`:`No age chart selected`;return`
        <li class="season-item">
          <div>
            <strong>${J(e.name)}</strong>
            <p class="season-dates">
              ${e.starts_on||`Start date not set`}
              &ndash;
              ${e.ends_on||`End date not set`}
            </p>
            <p class="season-dates">${J(n)}</p>
            <span class="setup-status">
              ${e.is_active?`Active`:`Inactive`}
            </span>
          </div>
          <button type="button"
            class="secondary-button season-edit-button"
            data-edit-season="${J(e.id)}">
            Edit
          </button>
        </li>
      `}).join(``)}</ul>`:`<p class="directory-empty">No seasons have been added yet.</p>`}
    </section>
  `}function qo(e){let t=e?.name??``,n=e?.starts_on??``,r=e?.ends_on??``,i=e?.is_active??!0;return`
    <form id="season-form" class="create-umpire-form">
      <h3>${e?`Edit season`:`Add season`}</h3>

      <label for="season-name">Season name</label>
      <input id="season-name" name="name" required maxlength="100"
        value="${J(t)}"
        placeholder="e.g. Spring 2027" />

      <label for="season-start">Start date</label>
      <input id="season-start" name="starts_on" type="date"
        value="${J(n)}" />

      <label for="season-end">End date</label>
      <input id="season-end" name="ends_on" type="date"
        value="${J(r)}" />

      <label for="season-chart">Little League age chart</label>
      <select id="season-chart" name="age_chart_id">
        ${Wo(K.ageCharts,e?.age_chart_id??null)}
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
  `}function Jo(e){let t=e.querySelector(`#season-form`);t&&(Go(t),Ka(e,{buttonId:`#delete-season-button`,table:`seasons`,noun:`season`,getId:()=>K.editingSeasonId,inUseMessage:`This season can't be deleted because teams or games use it. Remove those first, or mark the season inactive instead.`,onDeleted:()=>{K.editingSeasonId=null}}),e.querySelector(`#cancel-season-button`)?.addEventListener(`click`,()=>{K.editingSeasonId=null,q(e)}),t.addEventListener(`submit`,async n=>{n.preventDefault();let r=e.querySelector(`#league-setup-message`),i=new FormData(t),a=String(i.get(`name`)??``).trim(),o=String(i.get(`starts_on`)??``)||null,s=String(i.get(`ends_on`)??``)||null,c=String(i.get(`age_chart_id`)??``)||null,l=t.querySelector(`[name="is_active"]`)?.checked??!1;if(!a){r&&(r.textContent=`Enter a season name.`,r.className=`message error`);return}if(o&&s&&s<o){r&&(r.textContent=`The end date must be on or after the start date.`,r.className=`message error`);return}let u=K.editingSeasonId?K.loadedSeasons.find(e=>e.id===K.editingSeasonId)?.age_chart_id??null:null;if(K.editingSeasonId&&u&&c!==u&&!window.confirm(`This season already uses an age chart. Changing it changes the Little League ages calculated for this season. Change the chart?`))return;let d=t.querySelector(`button[type="submit"]`);d&&(d.disabled=!0,d.textContent=`Saving…`);let f={name:a,starts_on:o,ends_on:s,age_chart_id:c,is_active:l},p=K.editingSeasonId?await H.from(`seasons`).update(f).eq(`id`,K.editingSeasonId):await H.from(`seasons`).insert(f);if(p.error){r&&(r.textContent=`Could not save season: ${p.error.message}`,r.className=`message error`),d&&(d.disabled=!1,d.textContent=`Save season`);return}K.editingSeasonId=null,await q(e);let m=e.querySelector(`#league-setup-message`);m&&(m.textContent=`Season saved successfully.`,m.className=`message success`)}))}function Yo(e){return e.youngest_ll_age===null||e.oldest_ll_age===null?``:e.youngest_ll_age===e.oldest_ll_age?` (LL age ${e.youngest_ll_age})`:` (LL ages ${e.youngest_ll_age}\u2013${e.oldest_ll_age})`}function Xo(){let e=K.loadedLeagues.length>1,t=K.teamSeasonFilter?K.loadedTeams.filter(e=>e.season_id===K.teamSeasonFilter):K.loadedTeams,n=`__none__`,r=t.filter(e=>!e.division_id).length,i=K.teamDivisionFilter===``?t:K.teamDivisionFilter===n?t.filter(e=>!e.division_id):t.filter(e=>e.division_id===K.teamDivisionFilter),a=`<option value="">All divisions (${t.length})</option>`+K.loadedDivisions.map(e=>`
      <option value="${J(e.id)}"
        ${e.id===K.teamDivisionFilter?`selected`:``}>
        ${J(e.name)}
        (${t.filter(t=>t.division_id===e.id).length})
      </option>
    `).join(``)+(r>0||K.teamDivisionFilter===n?`<option value="${n}" ${K.teamDivisionFilter===n?`selected`:``}>
          No division (${r})
        </option>`:``);return`
    <h3>Teams</h3>
    <button id="add-team-button" type="button" class="primary-button">
      Add team
    </button>
    <label for="team-season-filter">Show season</label>
    <select id="team-season-filter">${`<option value="">All seasons</option>`+K.loadedSeasons.map(e=>`
      <option value="${J(e.id)}"
        ${e.id===K.teamSeasonFilter?`selected`:``}>
        ${J(e.name)}
      </option>
    `).join(``)}</select>
    <label for="team-division-filter">Show division</label>
    <select id="team-division-filter">${a}</select>
    ${i.length?`<ul class="setup-list">${i.map(t=>{let n=K.loadedSeasons.find(e=>e.id===t.season_id),r=K.loadedDivisions.find(e=>e.id===t.division_id),i=K.loadedLeagues.find(e=>e.id===t.league_id),a=[n?n.name:`Unknown season`,r?r.name:`No division`,e&&i?i.name:``].filter(e=>e!==``).join(`, `);return`
        <li class="season-item">
          <div>
            <strong>${J(t.name)}</strong>
            <p class="season-dates">${J(a)}</p>
            <span class="setup-status">
              ${t.is_active?`Active`:`Inactive`}
            </span>
          </div>
          <button type="button"
            class="secondary-button season-edit-button"
            data-edit-team="${J(t.id)}">
            Edit
          </button>
        </li>
      `}).join(``)}</ul>`:`<p class="directory-empty">${K.loadedTeams.length===0?`No teams yet. Add the teams that play in each season.`:t.length===0?`No teams in this season yet.`:`No teams in this division.`}</p>`}
  `}function Zo(e,t){return`<option value="">No division</option>`+K.loadedDivisions.filter(n=>n.league_id===e&&(n.is_active||n.id===t)).map(e=>`
      <option value="${J(e.id)}"
        ${e.id===t?`selected`:``}>
        ${J(e.name+Yo(e))}
      </option>
    `).join(``)}function Qo(e){let t=K.loadedLeagues.filter(e=>e.is_active),n=K.loadedSeasons.filter(e=>e.is_active),r=e?e.league_id:t.length===1?t[0].id:``,i=e?e.season_id:n.some(e=>e.id===K.teamSeasonFilter)?K.teamSeasonFilter:n.length===1?n[0].id:``,a=e?`
      <p class="season-dates">
        League: ${J(K.loadedLeagues.find(t=>t.id===e.league_id)?.name??`Unknown league`)}
      </p>
      <p class="season-dates">
        Season: ${J(K.loadedSeasons.find(t=>t.id===e.season_id)?.name??`Unknown season`)}
      </p>
    `:`
      <label for="team-league">League</label>
      <select id="team-league" name="league_id" required>
        ${t.length===1?``:`<option value="">Choose a league</option>`}
        ${t.map(e=>`
          <option value="${J(e.id)}"
            ${e.id===r?`selected`:``}>
            ${J(e.name)}
          </option>
        `).join(``)}
      </select>

      <label for="team-season">Season</label>
      <select id="team-season" name="season_id" required>
        ${n.length===1?``:`<option value="">Choose a season</option>`}
        ${n.map(e=>`
          <option value="${J(e.id)}"
            ${e.id===i?`selected`:``}>
            ${J(e.name)}
          </option>
        `).join(``)}
      </select>
    `;return`
    <form id="team-form" class="create-umpire-form">
      <h3>${e?`Edit team`:`Add team`}</h3>

      ${a}

      <label for="team-name">Team name</label>
      <input id="team-name" name="name" required maxlength="100"
        value="${J(e?.name??``)}"
        placeholder="e.g. Tigers" />

      <label for="team-division">Division (optional)</label>
      <select id="team-division" name="division_id">
        ${Zo(r,e?.division_id??null)}
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
  `}function $o(e,t){let n=e.querySelector(`#team-editor`);n&&(K.editingTeamId=t?t.id:null,n.innerHTML=Qo(t),es(e),n.scrollIntoView({behavior:`smooth`}))}function es(e){let t=e.querySelector(`#team-form`);if(!t)return;Ka(e,{buttonId:`#delete-team-button`,table:`teams`,noun:`team`,getId:()=>K.editingTeamId,inUseMessage:`This team can't be deleted because games use it. Move or remove those games first, or mark the team inactive instead.`,onDeleted:()=>{K.editingTeamId=null}}),e.querySelector(`#cancel-team-button`)?.addEventListener(`click`,()=>{K.editingTeamId=null,q(e)});let n=t.querySelector(`#team-league`),r=t.querySelector(`#team-division`);n?.addEventListener(`change`,()=>{r&&(r.innerHTML=Zo(n.value,null))}),t.addEventListener(`submit`,async n=>{n.preventDefault();let r=e.querySelector(`#league-setup-message`),i=e=>{r&&(r.textContent=e,r.className=`message error`)},a=new FormData(t),o=String(a.get(`name`)??``).trim(),s=String(a.get(`division_id`)??``)||null,c=t.querySelector(`[name="is_active"]`)?.checked??!1,l=K.editingTeamId?K.loadedTeams.find(e=>e.id===K.editingTeamId)??null:null,u,d;if(l)u=l.league_id,d=l.season_id;else{if(u=String(a.get(`league_id`)??``),d=String(a.get(`season_id`)??``),!K.loadedLeagues.some(e=>e.id===u)){i(`Choose a league.`);return}if(!K.loadedSeasons.some(e=>e.id===d)){i(`Choose a season.`);return}}if(!o){i(`Enter a team name.`);return}if(s&&!K.loadedDivisions.some(e=>e.id===s&&e.league_id===u)){i(`Choose a division that belongs to the team's league.`);return}let f=t.querySelector(`button[type="submit"]`);f&&(f.disabled=!0,f.textContent=`Saving…`);let p={name:o,division_id:s,is_active:c},m=l?await H.from(`teams`).update(p).eq(`id`,l.id):await H.from(`teams`).insert({...p,league_id:u,season_id:d});if(m.error){i(m.error.code===`23505`?`A team with that name already exists in this league and season. Choose a different name.`:`Could not save team: ${m.error.message}`),f&&(f.disabled=!1,f.textContent=`Save team`);return}K.editingTeamId=null,await q(e);let h=e.querySelector(`#league-setup-message`);h&&(h.textContent=`Team saved successfully.`,h.className=`message success`)})}var ts=null;async function ns(e){e.innerHTML=`
    <section class="directory-section">
      <h2>League Setup</h2>
      <p class="directory-description">Loading setup records…</p>
    </section>
  `;let[t,n,r,i,a,o]=await Promise.all([H.from(`leagues`).select(`id, name, is_active`).order(`name`),H.from(`seasons`).select(`id, name, starts_on, ends_on, is_active, age_chart_id`).order(`starts_on`,{ascending:!1}),H.from(`divisions`).select(`id, name, age_group, league_id, description, youngest_ll_age, oldest_ll_age, is_active`).order(`name`),H.from(`locations`).select(`id, name, address, notes, is_active`).order(`name`),H.from(`little_league_age_charts`).select(`id, chart_year, name`).order(`chart_year`,{ascending:!1}).order(`name`),H.from(`teams`).select(`id, league_id, season_id, division_id, name, is_active`).order(`name`)]),s=t.error??n.error??r.error??i.error??a.error??o.error;if(s){e.innerHTML=`
      <section class="directory-section">
        <h2>League Setup</h2>
        <p class="message error">
          Unable to load setup records. Refresh and try again.
        </p>
      </section>
    `,console.error(`League setup load failed:`,s.message);return}let c=t.data??[],l=n.data??[],u=r.data??[],d=i.data??[],f=o.data??[];K.ageCharts=a.data??[],K.loadedSeasons=l,K.loadedLeagues=c,K.loadedDivisions=u,K.loadedTeams=f;let p=K.editingLeagueId?c.find(e=>e.id===K.editingLeagueId)??null:null,m=K.editingTeamId?f.find(e=>e.id===K.editingTeamId)??null:null,h=K.editingLocationId?d.find(e=>e.id===K.editingLocationId)??null:null,g=K.editingDivisionId?u.find(e=>e.id===K.editingDivisionId)??null:null,_=K.editingSeasonId?l.find(e=>e.id===K.editingSeasonId)??null:null;e.innerHTML=`
    <section class="directory-section">
      <div class="directory-header">
        <div>
          <h2>League Setup</h2>
          <p class="directory-description">
            Configure leagues, seasons, divisions, and game locations.
          </p>
        </div>
        <div class="header-actions">
          <button id="import-season-button"
            class="secondary-button" type="button">Create a season from a file</button>
          <button id="refresh-league-setup"
            class="secondary-button" type="button">Refresh</button>
        </div>
      </div>

      <p id="league-setup-message" class="message"
        role="status" aria-live="polite"></p>

      <div id="season-import-editor"></div>

      <div id="league-editor">
        ${p?$a(p):``}
      </div>

      <div id="season-editor">
        ${_?qo(_):``}
      </div>

      <div id="division-editor">
        ${g?Xa(g,c):``}
      </div>

      <div id="team-editor">
        ${m?Qo(m):``}
      </div>

      <div id="location-editor">
        ${h?no(h):``}
      </div>

      <div class="setup-grid">
        ${Qa(c)}
        ${Ko(l)}
        ${Ya(u,c)}
        <section id="teams-panel" class="setup-panel">
          ${Xo()}
        </section>
        ${to(d)}
      </div>
    </section>
  `,e.querySelector(`#refresh-league-setup`)?.addEventListener(`click`,()=>{K.editingSeasonId=null,K.editingLeagueId=null,K.editingDivisionId=null,K.editingLocationId=null,K.editingTeamId=null,ns(e)}),e.querySelector(`#import-season-button`)?.addEventListener(`click`,()=>{let t=e.querySelector(`#season-import-editor`);t&&(Bo(t,{leagues:c,seasons:l,divisions:u,teams:f,onClose:()=>{t.innerHTML=``},onImported:(t,n)=>{ts=t,n&&(K.teamSeasonFilter=n),ns(e)}}),t.scrollIntoView({behavior:`smooth`,block:`start`}))}),e.querySelector(`#add-league-button`)?.addEventListener(`click`,()=>{K.editingLeagueId=null;let t=e.querySelector(`#league-editor`);t&&(t.innerHTML=$a(null),eo(e),t.scrollIntoView({behavior:`smooth`}))}),e.querySelectorAll(`[data-edit-league]`).forEach(t=>{t.addEventListener(`click`,()=>{K.editingLeagueId=t.dataset.editLeague??null;let n=c.find(e=>e.id===K.editingLeagueId),r=e.querySelector(`#league-editor`);n&&r&&(r.innerHTML=$a(n),eo(e),r.scrollIntoView({behavior:`smooth`}))})}),p&&eo(e);let v=e.querySelector(`#teams-panel`);if(v?.addEventListener(`click`,t=>{let n=t.target;if(!(n instanceof Element))return;if(n.closest(`#add-team-button`)){if(!c.some(e=>e.is_active)||!l.some(e=>e.is_active)){let t=e.querySelector(`#league-setup-message`);t&&(t.textContent=`Add an active league and an active season before you create teams.`,t.className=`message error`);return}$o(e,null);return}let r=n.closest(`[data-edit-team]`);if(r){let t=f.find(e=>e.id===r.dataset.editTeam);t&&$o(e,t)}}),v?.addEventListener(`change`,e=>{let t=e.target;t instanceof HTMLSelectElement&&t.id===`team-season-filter`&&(K.teamSeasonFilter=t.value,v.innerHTML=Xo()),t instanceof HTMLSelectElement&&t.id===`team-division-filter`&&(K.teamDivisionFilter=t.value,v.innerHTML=Xo())}),m&&es(e),e.querySelector(`#add-location-button`)?.addEventListener(`click`,()=>{K.editingLocationId=null;let t=e.querySelector(`#location-editor`);t&&(t.innerHTML=no(null),ro(e),t.scrollIntoView({behavior:`smooth`}))}),e.querySelectorAll(`[data-edit-location]`).forEach(t=>{t.addEventListener(`click`,()=>{K.editingLocationId=t.dataset.editLocation??null;let n=d.find(e=>e.id===K.editingLocationId),r=e.querySelector(`#location-editor`);n&&r&&(r.innerHTML=no(n),ro(e),r.scrollIntoView({behavior:`smooth`}))})}),h&&ro(e),e.querySelector(`#add-division-button`)?.addEventListener(`click`,()=>{let t=e.querySelector(`#league-setup-message`);if(!c.some(e=>e.is_active)){t&&(t.textContent=`Add an active league before you create divisions.`,t.className=`message error`);return}K.editingDivisionId=null;let n=e.querySelector(`#division-editor`);n&&(n.innerHTML=Xa(null,c),Za(e),n.scrollIntoView({behavior:`smooth`}))}),e.querySelectorAll(`[data-edit-division]`).forEach(t=>{t.addEventListener(`click`,()=>{K.editingDivisionId=t.dataset.editDivision??null;let n=u.find(e=>e.id===K.editingDivisionId),r=e.querySelector(`#division-editor`);n&&r&&(r.innerHTML=Xa(n,c),Za(e),r.scrollIntoView({behavior:`smooth`}))})}),g&&Za(e),e.querySelector(`#add-season-button`)?.addEventListener(`click`,()=>{K.editingSeasonId=null;let t=e.querySelector(`#season-editor`);t&&(t.innerHTML=qo(null),Jo(e),t.scrollIntoView({behavior:`smooth`}))}),e.querySelectorAll(`[data-edit-season]`).forEach(t=>{t.addEventListener(`click`,()=>{K.editingSeasonId=t.dataset.editSeason??null;let n=l.find(e=>e.id===K.editingSeasonId),r=e.querySelector(`#season-editor`);n&&r&&(r.innerHTML=qo(n),Jo(e),r.scrollIntoView({behavior:`smooth`}))})}),_&&Jo(e),ts){let t=e.querySelector(`#league-setup-message`);t&&(t.textContent=ts,t.className=`message success`),ts=null}}Ga(ns);var rs={youth_umpire:`adult_umpire`,adult_umpire:`youth_umpire`},is=``;function as(e){let t=e.replace(/_/g,` `);return t.charAt(0).toUpperCase()+t.slice(1)}function os(e){return e.display_name||e.email||`Name not provided`}function ss(e,t,n,r,i){let a=n.length?`<ul class="role-chips">${n.map(n=>{let i=t.find(e=>e.id===n),a=!(r&&n===`super_admin`);return`
          <li class="role-chip" title="${J(i?.description??``)}">
            <span>${J(as(n))}</span>
            ${a?`<button type="button" class="role-chip-remove"
                  data-remove-role="${J(n)}"
                  data-user-id="${J(e.id)}"
                  aria-label="Remove ${J(as(n))} from ${J(os(e))}">
                  &times;
                </button>`:``}
          </li>
        `}).join(``)}</ul>`:`<p class="role-chip-none">No roles yet</p>`,o=t.filter(e=>{if(n.includes(e.id))return!1;let t=rs[e.id];return!(t&&n.includes(t))}),s=o.length?`
      <div class="role-add">
        <select data-add-select="${J(e.id)}"
          aria-label="Role to add for ${J(os(e))}">
          <option value="">Add a role&hellip;</option>
          ${o.map(e=>`
            <option value="${J(e.id)}">
              ${J(as(e.id))}
            </option>
          `).join(``)}
        </select>
        <button type="button" class="secondary-button"
          data-add-role="${J(e.id)}">
          Add
        </button>
      </div>
    `:``;return`
    <li class="role-account"
      data-search="${J(`${e.display_name??``} ${e.email??``} ${i??``}`.toLowerCase())}">
      <span class="role-account-name">
        ${J(os(e))}${r?` (you)`:``}
      </span>
      <span class="role-account-email">
        ${J(e.email??`Email unavailable`)}
      </span>
      <span class="role-account-contact">
        Phone: ${J(i??`not on file`)}
      </span>
      ${a}
      ${s}
    </li>
  `}async function cs(e){e.innerHTML=`
    <section class="directory-section">
      <h2>Roles</h2>
      <p class="directory-description">Loading accounts&hellip;</p>
    </section>
  `;let[t,n,r,i,a,o]=await Promise.all([H.from(`profiles`).select(`id, display_name, email, account_status`).eq(`account_status`,`approved`).order(`display_name`),H.from(`roles`).select(`id, description`).order(`id`),H.from(`user_roles`).select(`user_id, role_id`),H.auth.getSession(),H.from(`umpires`).select(`profile_id, phone`),H.from(`account_contact`).select(`profile_id, phone`)]),s=t.error??n.error??r.error;if(s){e.innerHTML=`
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
              <strong>${J(as(e.id))}</strong>:
              ${J(e.description)}
            </li>
          `).join(``)}
        </ul>
      </details>

      <p id="role-manager-message" class="message"
        role="status" aria-live="polite"></p>

      <label for="role-search">Search accounts</label>
      <input id="role-search" type="search"
        placeholder="Search by name or email"
        value="${J(is)}" />

      ${c.length?`<ul class="role-list">${c.map(e=>ss(e,l,m(e.id),e.id===d,f.get(e.id)??p.get(e.id)??null)).join(``)}</ul>
          <p id="role-no-match" class="directory-empty" hidden>
            No accounts match your search.
          </p>`:`<p class="directory-empty">
            There are no approved accounts yet. Approve an account first.
          </p>`}
    </section>
  `;let h=e.querySelector(`#role-manager`);if(!h)return;let g=(e,t)=>{let n=h.querySelector(`#role-manager-message`);n&&(n.textContent=e,n.className=`message ${t}`)},_=()=>{let e=is.trim().toLowerCase(),t=0;h.querySelectorAll(`.role-account`).forEach(n=>{let r=!e||(n.dataset.search??``).includes(e);n.hidden=!r,r&&t++});let n=h.querySelector(`#role-no-match`);n&&(n.hidden=t>0)};_(),h.querySelector(`#role-search`)?.addEventListener(`input`,e=>{is=e.target.value,_()}),h.querySelector(`#refresh-roles`)?.addEventListener(`click`,()=>{cs(e)});let v=async(t,n)=>{await cs(e);let r=e.querySelector(`#role-manager-message`);r&&(r.textContent=t,r.className=`message ${n}`)};h.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`[data-remove-role]`);if(n){let e=n.dataset.userId??``,t=n.dataset.removeRole??``,r=c.find(t=>t.id===e),i=r?os(r):`this account`,a=t===`super_admin`?` They will lose all administrator access.`:``;if(!window.confirm(`Remove the "${as(t)}" role from ${i}?${a}`))return;n.disabled=!0,(async()=>{let{data:r,error:a}=await H.from(`user_roles`).delete().eq(`user_id`,e).eq(`role_id`,t).select(`user_id`);a||!r||r.length===0?(g(a?`Could not remove the role: ${a.message}`:`The role was not removed. You may not have permission, or it was already removed.`,`error`),n.disabled=!1):await v(`Removed ${as(t)} from ${i}.`,`success`)})();return}let r=t.closest(`[data-add-role]`);if(r){let e=r.dataset.addRole??``,t=h.querySelector(`select[data-add-select="${CSS.escape(e)}"]`)?.value??``,n=c.find(t=>t.id===e),i=n?os(n):`this account`;if(!t){g(`Choose a role to add first.`,`error`);return}r.disabled=!0,(async()=>{let{error:n}=await H.from(`user_roles`).insert({user_id:e,role_id:t,granted_by:d});n?(g(n.code===`23505`?`${i} already has that role.`:`Could not add the role: ${n.message}`,`error`),r.disabled=!1):await v(`Added ${as(t)} to ${i}.`,`success`)})()}})}var ls=/^[0-9+() .-]{7,30}$/;async function us(e,t={}){let n=t.heading??!0;e.innerHTML=`
    <p class="directory-description">Loading your details&hellip;</p>
  `;let{data:r}=await H.auth.getSession(),i=r.session?.user;if(!i){e.innerHTML=``;return}let[a,o]=await Promise.all([H.from(`account_contact`).select(`phone, sms_opt_in`).eq(`profile_id`,i.id).maybeSingle(),H.from(`profiles`).select(`email`).eq(`id`,i.id).maybeSingle()]);if(a.error){e.innerHTML=`
      <p class="message error">
        Unable to load your details. Refresh and try again.
      </p>
    `,console.error(`My details load failed:`,a.error.message);return}let s=a.data??null,c=o.data?.email??i.email??``;e.innerHTML=`
    <section class="my-details">
      ${n?`<h2>My details</h2>`:``}

      <p class="season-dates">
        Email: ${J(c||`not available`)}
        (this is how you sign in)
      </p>

      <form id="my-details-form">
        <label for="my-phone">Phone number</label>
        <input id="my-phone" name="phone" type="tel" maxlength="30"
          autocomplete="tel" placeholder="e.g. 650-555-0123"
          value="${J(s?.phone??``)}" />

        <label class="season-checkbox-label">
          <input name="sms_opt_in" type="checkbox"
            ${s?.sms_opt_in?`checked`:``} />
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
  `;let l=e.querySelector(`#my-details-form`),u=e.querySelector(`#my-details-message`);if(!l||!u)return;let d=(e,t)=>{u.textContent=e,u.className=`message ${t}`};l.addEventListener(`submit`,async t=>{t.preventDefault();let n=String(new FormData(l).get(`phone`)??``).trim(),r=l.querySelector(`[name="sms_opt_in"]`)?.checked??!1;if(n&&!ls.test(n)){d(`Enter the phone number using digits, spaces, and + ( ) . - only.`,`error`);return}if(r&&!n){d(`Enter a mobile number to choose text messages.`,`error`);return}let a=e.querySelector(`#my-details-save`);a&&(a.disabled=!0,a.textContent=`Saving…`),d(``,`success`);let{error:o}=await H.from(`account_contact`).upsert({profile_id:i.id,phone:n||null,sms_opt_in:r},{onConflict:`profile_id`});a&&(a.disabled=!1,a.textContent=`Save my details`),o?d(`Could not save your details: ${o.message}`,`error`):d(`Your details were saved.`,`success`)})}var ds={youth_umpire:`Youth umpire`,adult_umpire:`Adult umpire`};function fs(e,t){if(!e)return t===`youth`?`A birth date is required for a youth umpire. Check it against the league's records.`:`A birth date is optional for an adult umpire.`;let n=qa(e);return n===null?`Enter a valid birth date.`:n<0?`That birth date is in the future.`:n<13?`Age ${n}. Umpires under 13 cannot be approved here: a parent account and consent are needed first.`:t===`youth`&&n>=18?`Age ${n}. This person is 18 or older, so approve them as an adult umpire.`:t===`adult`&&n<18?`Age ${n}. This person is under 18, so approve them as a youth umpire.`:`Age ${n}.`}async function ps(e){e.innerHTML=`
    <section class="directory-section">
      <h2>Umpire registrations</h2>
      <p class="directory-description">Loading registrations&hellip;</p>
    </section>
  `;let t=await H.from(`profiles`).select(`id, display_name, email, registration_kind, created_at`).eq(`account_status`,`pending`).in(`registration_kind`,[`youth_umpire`,`adult_umpire`]).order(`created_at`);if(t.error){e.innerHTML=`
      <section class="directory-section">
        <h2>Umpire registrations</h2>
        <p class="message error">
          Unable to load registrations. Refresh and try again.
        </p>
      </section>
    `,console.error(`Registrations load failed:`,t.error.message);return}let n=t.data??[],r=[];if(n.length>0){let e=await H.from(`umpires`).select(`profile_id`).in(`profile_id`,n.map(e=>e.id));e.error?console.error(`Registrations lookup failed:`,e.error.message):r=e.data??[]}let i=n.filter(e=>r.some(t=>t.profile_id===e.id));e.innerHTML=`
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

      ${i.length?`<ul class="role-list">${i.map(e=>{let t=e.registration_kind,n=t===`youth_umpire`?`youth`:`adult`,r=e.display_name||`Name not provided`;return`
              <li class="role-account" data-profile-id="${J(e.id)}">
                <span class="role-account-name">${J(r)}</span>
                <span class="role-account-email">
                  ${J(e.email??`Email unavailable`)}
                </span>
                <span class="role-account-contact">
                  Signed up as: ${J(ds[t]??t)}
                  &middot; ${J(e.created_at.slice(0,10))}
                </span>

                <label for="reg-class-${J(e.id)}">Approve as</label>
                <select id="reg-class-${J(e.id)}"
                  data-reg-class="${J(e.id)}">
                  <option value="adult" ${n===`adult`?`selected`:``}>
                    Adult umpire
                  </option>
                  <option value="youth" ${n===`youth`?`selected`:``}>
                    Youth umpire
                  </option>
                </select>

                <label for="reg-birth-${J(e.id)}">Birth date</label>
                <input id="reg-birth-${J(e.id)}" type="date"
                  data-reg-birth="${J(e.id)}" />
                <p class="season-dates" data-reg-hint="${J(e.id)}">
                  ${J(fs(``,n))}
                </p>

                <div class="account-actions">
                  <button type="button" class="primary-button"
                    data-approve="${J(e.id)}">Approve</button>
                  <button type="button" class="secondary-button"
                    data-reject="${J(e.id)}">Reject</button>
                </div>
              </li>
            `}).join(``)}</ul>`:`<p class="directory-empty">
            No umpire registrations are waiting for review.
          </p>`}
    </section>
  `;let a=e.querySelector(`#registrations`);if(!a)return;let o=(e,t)=>{let n=a.querySelector(`#registrations-message`);n&&(n.textContent=e,n.className=`message ${t}`)},s=async t=>{await ps(e);let n=e.querySelector(`#registrations-message`);n&&(n.textContent=t,n.className=`message success`)},c=e=>({select:a.querySelector(`[data-reg-class="${CSS.escape(e)}"]`),date:a.querySelector(`[data-reg-birth="${CSS.escape(e)}"]`),hint:a.querySelector(`[data-reg-hint="${CSS.escape(e)}"]`)}),l=e=>{let{select:t,date:n,hint:r}=c(e);t&&n&&r&&(r.textContent=fs(n.value,t.value))},u=e=>{let t=e.target;if(!(t instanceof HTMLElement))return;let n=t.dataset.regClass??t.dataset.regBirth;n&&l(n)};a.addEventListener(`input`,u),a.addEventListener(`change`,u),a.querySelector(`#refresh-registrations`)?.addEventListener(`click`,()=>{ps(e)}),a.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`[data-approve]`);if(n){let e=n.dataset.approve??``,{select:t,date:r}=c(e),a=t?.value??``,l=r?.value??``,u=i.find(t=>t.id===e)?.display_name||`this person`;if(a===`youth`&&!l){o(`Enter a birth date to approve a youth umpire.`,`error`);return}if(l){let e=qa(l);if(e===null||e<0){o(`Enter a valid birth date that is not in the future.`,`error`);return}if(e<13){o(`Umpires under 13 cannot be approved here. They need a parent account and consent first.`,`error`);return}if(a===`adult`&&e<18){o(`This person is under 18, so approve them as a youth umpire.`,`error`);return}if(a===`youth`&&e>=18){o(`This person is 18 or older, so approve them as an adult umpire.`,`error`);return}}n.disabled=!0,(async()=>{let{error:t}=await H.rpc(`approve_umpire_registration`,{p_profile_id:e,p_classification:a,p_birth_date:l||null});t?(o(`Could not approve: ${t.message}`,`error`),n.disabled=!1):await s(`Approved ${u} as ${a===`youth`?`a youth`:`an adult`} umpire.`)})();return}let r=t.closest(`[data-reject]`);if(r){let e=r.dataset.reject??``,t=i.find(t=>t.id===e)?.display_name||`this person`;if(!window.confirm(`Reject the registration from ${t}? They will not get access.`))return;r.disabled=!0,(async()=>{let{error:n}=await H.rpc(`reject_umpire_registration`,{p_profile_id:e});n?(o(`Could not reject: ${n.message}`,`error`),r.disabled=!1):await s(`Rejected the registration from ${t}.`)})()}})}var ms={queued:`Waiting`,sent:`Sent`,failed:`Failed`,skipped:`Skipped`},hs={invitation:`Invitation`,assignment:`Assignment`,schedule_change:`Schedule change`,reminder:`Reminder`,broadcast:`Announcement`,other:`Message`},gs=!1;async function _s(e){e.innerHTML=`
    <p class="directory-description">Loading the outbox&hellip;</p>
  `;let{data:t,error:n}=await H.from(`email_outbox`).select(`id, kind, to_email, subject, body, status, sent_via, created_at, sent_at`).order(`created_at`,{ascending:!1}).limit(200);if(n){e.innerHTML=`
      <p class="message error">
        Unable to load the outbox. Refresh and try again.
      </p>
    `,console.error(`Outbox load failed:`,n.message);return}let r=t??[],i=r.filter(e=>e.status===`queued`||e.status===`failed`),a=gs?r:i;e.innerHTML=`
    <section class="outbox" id="outbox-root">
      <p class="directory-description">
        Email sending is not set up yet, so messages wait here. Open a
        message, copy it, send it yourself, then press
        <strong>Mark as sent</strong>. When automatic sending is switched
        on later, waiting messages will go out by themselves.
      </p>

      <label for="outbox-filter">Show</label>
      <div class="role-add">
        <select id="outbox-filter">
          <option value="waiting" ${gs?``:`selected`}>
            Waiting only (${i.length})
          </option>
          <option value="all" ${gs?`selected`:``}>
            Everything (${r.length})
          </option>
        </select>
        <button id="outbox-refresh" class="secondary-button"
          type="button">Refresh</button>
      </div>

      <p id="outbox-message" class="message" role="status"
        aria-live="polite"></p>

      ${a.length?`<ul class="role-list">${a.map(e=>`
            <li class="role-account" data-message-id="${J(e.id)}">
              <span class="role-account-name">${J(e.subject)}</span>
              <span class="role-account-email">To: ${J(e.to_email)}</span>
              <span class="role-account-contact">
                ${J(hs[e.kind]??e.kind)}
                &middot; ${J(ms[e.status]??e.status)}
                &middot; ${J(e.created_at.slice(0,10))}
                ${e.sent_at?`&middot; sent ${J(e.sent_at.slice(0,10))}${e.sent_via===`manual`?` by hand`:``}`:``}
              </span>

              <details class="outbox-body">
                <summary>Show message</summary>
                <textarea readonly rows="8">${J(e.body)}</textarea>
                <button type="button" class="secondary-button"
                  data-copy="${J(e.id)}">Copy message</button>
              </details>

              ${e.status===`queued`||e.status===`failed`?`<div class="account-actions">
                    <button type="button" class="primary-button"
                      data-sent="${J(e.id)}">Mark as sent</button>
                    <button type="button" class="secondary-button"
                      data-skip="${J(e.id)}">Skip</button>
                  </div>`:``}
            </li>
          `).join(``)}</ul>`:`<p class="directory-empty">
            ${gs?`The outbox is empty.`:`No messages are waiting to be sent.`}
          </p>`}
    </section>
  `;let o=e.querySelector(`#outbox-root`);if(!o)return;let s=(e,t)=>{let n=o.querySelector(`#outbox-message`);n&&(n.textContent=e,n.className=`message ${t}`)},c=async t=>{await _s(e);let n=e.querySelector(`#outbox-message`);n&&(n.textContent=t,n.className=`message success`)};o.querySelector(`#outbox-refresh`)?.addEventListener(`click`,()=>{_s(e)}),o.querySelector(`#outbox-filter`)?.addEventListener(`change`,t=>{gs=t.target.value===`all`,_s(e)}),o.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`[data-copy]`);if(n){let e=n.parentElement?.querySelector(`textarea`);if(!e)return;(async()=>{try{await navigator.clipboard.writeText(e.value),s(`Message copied.`,`success`)}catch{e.select(),s(`Press Ctrl+C to copy the selected message.`,`success`)}})();return}let r=t.closest(`[data-sent]`);if(r){let e=r.dataset.sent??``;r.disabled=!0,(async()=>{let{error:t}=await H.rpc(`mark_email_sent`,{p_id:e});t?(s(`Could not update the message: ${t.message}`,`error`),r.disabled=!1):await c(`Marked as sent.`)})();return}let i=t.closest(`[data-skip]`);if(i){let e=i.dataset.skip??``;if(!window.confirm(`Skip this message? It will not be sent, but a record of it is kept.`))return;i.disabled=!0,(async()=>{let{error:t}=await H.rpc(`skip_email`,{p_id:e});t?(s(`Could not update the message: ${t.message}`,`error`),i.disabled=!1):await c(`Skipped.`)})()}})}var vs=1e3,ys=`id, season_id, division_id, game_type, home_team_id, away_team_id, home_label, away_label, location_id, starts_at, ends_at, status, notes, external_game_id`;async function bs(e){let t=[];for(let n=0;;n+=vs){let{data:r,error:i}=await e(n,n+vs-1);if(i)return{rows:[],error:i.message};let a=r??[];if(t.push(...a),a.length<vs)break}return{rows:t,error:null}}async function xs(){let[e,t,n,r,i]=await Promise.all([H.from(`seasons`).select(`id, name, is_active, starts_on`),H.from(`divisions`).select(`id, name, is_active, league_id`).order(`name`),bs((e,t)=>H.from(`teams`).select(`id, name, is_active, season_id, division_id`).order(`name`).range(e,t)),H.from(`locations`).select(`id, name, is_active, address`).order(`name`),bs((e,t)=>H.from(`umpires`).select(`id, display_name`).order(`id`).range(e,t))]),a=e.error?.message??t.error?.message??n.error??r.error?.message??i.error;return a?{context:null,error:a}:{context:{seasons:e.data??[],divisions:t.data??[],teams:n.rows,locations:r.data??[],umpireNames:new Map(i.rows.map(e=>[e.id,e.display_name]))},error:null}}async function Ss(e){let t=await bs((t,n)=>H.from(`games`).select(ys).eq(`season_id`,e).order(`starts_at`).range(t,n));if(t.error)return{games:[],assignments:[],error:t.error};let n=await bs((e,t)=>H.from(`game_assignments`).select(`game_id, position, umpire_id`).order(`game_id`).order(`position`).range(e,t));if(n.error)return{games:[],assignments:[],error:n.error};let r=new Set(t.rows.map(e=>e.id));return{games:t.rows,assignments:n.rows.filter(e=>r.has(e.game_id)),error:null}}async function Cs(e){let t=await bs((t,n)=>H.from(`game_assignments`).select(`game_id, position, umpire_id`).eq(`umpire_id`,e).order(`game_id`).range(t,n));if(t.error)return{games:[],assignments:[],error:t.error};let n=[...new Set(t.rows.map(e=>e.game_id))],r=[];for(let e=0;e<n.length;e+=100){let t=n.slice(e,e+100),i=await bs((e,n)=>H.from(`games`).select(ys).in(`id`,t).order(`starts_at`).range(e,n));if(i.error)return{games:[],assignments:[],error:i.error};r.push(...i.rows)}return{games:r,assignments:t.rows,error:null}}var ws=e=>String(e).padStart(2,`0`);function Ts(e){let t=new Date(e);return`${t.getFullYear()}-${ws(t.getMonth()+1)}-${ws(t.getDate())}T${ws(t.getHours())}:${ws(t.getMinutes())}`}function Es(e){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(e))return null;let t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function Ds(e,t){return new Date(new Date(e).getTime()+t*6e4).toISOString()}function Os(e,t){return Math.round((new Date(t).getTime()-new Date(e).getTime())/6e4)}var ks=new Intl.DateTimeFormat(`en-US`,{weekday:`short`,month:`short`,day:`numeric`,year:`numeric`}),As=new Intl.DateTimeFormat(`en-US`,{hour:`numeric`,minute:`2-digit`});function js(e,t=new Date().getFullYear()){let n=new Date(e),r=ks.format(n);return n.getFullYear()===t?r.replace(/,\s*\d{4}$/,``):r}function Z(e){return As.format(new Date(e)).replace(/\u202f/g,` `)}function Ms(e){let t=new Date(e);return`${t.getFullYear()}-${ws(t.getMonth()+1)}-${ws(t.getDate())}`}function Ns(e){return new Date(e.getFullYear(),e.getMonth(),e.getDate())}var Ps=new Intl.DateTimeFormat(`en-US`,{weekday:`long`,month:`long`,day:`numeric`,year:`numeric`});function Fs(e){return Ps.format(new Date(e))}var Is=new Intl.DateTimeFormat(`en-US`,{weekday:`long`});function Ls(e){return Is.format(new Date(e))}function Rs(e,t){return`${Z(e)} \u2013 ${Z(t)}`}var zs=new Intl.DateTimeFormat(`en-US`,{year:`numeric`,month:`short`,day:`numeric`,hour:`numeric`,minute:`2-digit`,timeZoneName:`short`});function Bs(e){return zs.format(e).replace(/\u202f/g,` `)}var Vs=`__undecided`,Hs={draft:`Draft`,scheduled:`Scheduled`,canceled:`Canceled`,completed:`Completed`},Us={regular:`Regular season`,tournament:`Tournament`,scrimmage:`Scrimmage`};function Ws(e){let t=e.message;return e.code===`23505`&&t.includes(`games_season_external_id_unique`)?`Another game in this season already has that master calendar Game ID.`:t.includes(`games_home_team_in_division`)?`The home team must belong to this season's chosen division.`:t.includes(`games_away_team_in_division`)?`The away team must belong to this season's chosen division.`:t.includes(`games_home_team_in_season`)||t.includes(`games_away_team_in_season`)?`Both teams must belong to the chosen season.`:t.includes(`games_valid_time`)?`The game must end after it starts.`:t.includes(`games_different_teams`)?`A team cannot play itself.`:e.code===`42501`?`You do not have permission to change games.`:`The game could not be saved: ${t}`}function Gs(e,t,n){let{game:r}=n,i=r!==null,a=r?.status??`scheduled`,o=r?.game_type??`regular`,s=r?Os(r.starts_at,r.ends_at):120;e.innerHTML=`
    <form id="game-form" class="create-umpire-form game-form" novalidate>
      <h3>${i?`Edit game`:`Add game`}</h3>

      ${r?.external_game_id?`<p class="season-dates">
            This game has master calendar Game ID
            <strong>${J(r.external_game_id)}</strong>, so it is a
            copy of a game on the master calendar. Changes made here may be
            replaced the next time the master calendar spreadsheet is imported.
          </p>`:``}

      <label for="game-season">Season</label>
      <select id="game-season">
        ${t.seasons.map(e=>`
          <option value="${J(e.id)}">${J(e.name)}</option>
        `).join(``)}
      </select>

      <label for="game-division">Division</label>
      <select id="game-division"></select>

      <label for="game-type">Game type</label>
      <select id="game-type">
        ${Object.keys(Us).map(e=>`
          <option value="${e}" ${e===o?`selected`:``}>${Us[e]}</option>
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
        value="${r?J(Ts(r.starts_at)):``}" />

      <label for="game-duration">Length in minutes</label>
      <input id="game-duration" type="number" min="15" max="600" step="5"
        value="${s}" />

      <label for="game-status">Status</label>
      <select id="game-status">
        ${Object.keys(Hs).map(e=>`
          <option value="${e}" ${e===a?`selected`:``}>${Hs[e]}</option>
        `).join(``)}
      </select>

      <label for="game-external-id">Master calendar Game ID (optional)</label>
      <input id="game-external-id" type="text" maxlength="100"
        value="${J(r?.external_game_id??``)}"
        placeholder="Leave empty for a game that is not on the master calendar" />

      <label for="game-notes">Notes</label>
      <textarea id="game-notes" rows="3">${J(r?.notes??``)}</textarea>

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
  `;let c=e.querySelector(`#game-form`),l=e=>c.querySelector(`#${e}`),u=l(`game-season`),d=l(`game-division`),f=l(`game-home`),p=l(`game-away`),m=l(`game-home-label`),h=l(`game-away-label`),g=l(`game-field`),_=l(`game-form-message`),v=(e,t=`error`)=>{_.textContent=e,_.className=`message ${t}`};u.value=r?.season_id??n.defaultSeasonId;let y=e=>{d.innerHTML=t.divisions.filter(t=>t.is_active||t.id===e).map(e=>`
        <option value="${J(e.id)}">${J(e.name)}</option>
      `).join(``),d.value=t.divisions.some(t=>t.id===e)?e:d.options[0]?.value??``},b=(e,n,r,i)=>{let a=t.teams.filter(e=>e.season_id===u.value&&e.division_id===d.value&&(e.is_active||e.id===r)).sort((e,t)=>e.name.localeCompare(t.name));e.innerHTML=`
      <option value="">Choose a team</option>
      ${a.map(e=>`
        <option value="${J(e.id)}">${J(e.name)}</option>
      `).join(``)}
      <option value="${Vs}">Not decided yet (bracket slot)</option>
    `,i===null?e.value=r&&a.some(e=>e.id===r)?r:``:(e.value=Vs,n.value=i),n.hidden=e.value!==Vs};y(r?.division_id??n.defaultDivisionId),b(f,m,r?.home_team_id??null,r?.home_label??null),b(p,h,r?.away_team_id??null,r?.away_label??null),(()=>{let e=r?.location_id??``;g.innerHTML=`
      <option value="">Choose a field</option>
      ${t.locations.filter(t=>t.is_active||t.id===e).map(e=>`
          <option value="${J(e.id)}">${J(e.name)}</option>
        `).join(``)}
    `,g.value=e})();let x=()=>{b(f,m,f.value&&f.value!==Vs?f.value:null,f.value===Vs?m.value:null),b(p,h,p.value&&p.value!==Vs?p.value:null,p.value===Vs?h.value:null)};u.addEventListener(`change`,x),d.addEventListener(`change`,x);for(let[e,t]of[[f,m],[p,h]])e.addEventListener(`change`,()=>{t.hidden=e.value!==Vs,t.hidden||t.focus()});c.addEventListener(`submit`,e=>{e.preventDefault(),S()});async function S(){let e=Es(l(`game-start`).value),t=Number(l(`game-duration`).value),i=l(`game-external-id`).value.trim(),a=l(`game-notes`).value.trim(),o=(e,t,n)=>{if(e.value===Vs){let e=t.value.trim();return e?{team:null,label:e}:`Type a short label for the ${n} side (for example "Winner of Game 3").`}return e.value?{team:e.value,label:null}:`Choose the ${n} team, or mark it as not decided yet.`},s=o(f,m,`home`),c=o(p,h,`away`);if(!u.value)return v(`Choose a season.`);if(!d.value)return v(`Choose a division.`);if(typeof s==`string`)return v(s);if(typeof c==`string`)return v(c);if(s.team&&s.team===c.team)return v(`A team cannot play itself.`);if(!g.value)return v(`Choose a field.`);if(!e)return v(`Enter the date and time the game starts.`);if(!Number.isInteger(t)||t<15||t>600)return v(`The length must be a whole number of minutes between 15 and 600.`);let _={season_id:u.value,division_id:d.value,game_type:l(`game-type`).value,home_team_id:s.team,away_team_id:c.team,home_label:s.label,away_label:c.label,location_id:g.value,starts_at:e,ends_at:Ds(e,t),status:l(`game-status`).value,notes:a||null,external_game_id:i||null},y=l(`game-save`);y.disabled=!0;let b=r?await H.from(`games`).update(_).eq(`id`,r.id).select(`id`):await H.from(`games`).insert(_);if(y.disabled=!1,b.error)return v(Ws(b.error));if(r&&(!b.data||b.data.length===0))return v(`The game was not saved. You may not have permission, or someone else removed it. Refresh the list and try again.`);n.onDone(r?`Game saved.`:`Game added.`)}c.querySelector(`#game-cancel`)?.addEventListener(`click`,()=>{n.onDone(null)}),c.querySelector(`#delete-game`)?.addEventListener(`click`,()=>{if(!r)return;let e=n.assignmentCount?` Its ${n.assignmentCount} umpire assignment${n.assignmentCount===1?``:`s`} will be removed too.`:``,t=r.external_game_id?` This game is on the master calendar, so importing the spreadsheet again would add it back. Setting the status to Canceled is usually better.`:``;window.confirm(`Delete this game for good?${e}${t}`)&&(async()=>{let{data:e,error:t}=await H.from(`games`).delete().eq(`id`,r.id).select(`id`);if(t)return v(`The game could not be deleted: ${t.message}`);if(!e||e.length===0)return v(`The game was not deleted. You may not have permission, or someone else already removed it.`);n.onDone(`Game deleted.`)})()})}function Ks(e){return`${e.location}|${e.field}`}function qs(e,t){return e.filter(e=>!fo(e)&&t[po(e)]!==!1)}function Js(e,t){let n=new Map;for(let t of e){let e=po(t),r=n.get(e)??{rows:0,practiceRows:0};r.rows+=1,fo(t)&&(r.practiceRows+=1),n.set(e,r)}let r=qs(e,t.includeEvents),i=(e,t)=>{let n=new Map;for(let r of e){let e=t(r),i=n.get(e);i?i.count+=1:n.set(e,{first:r,count:1})}return n},a=i(r,e=>po(e)),o=i(r,e=>Ks(e)),s=i(r.flatMap(e=>[e.home,e.away]).filter(e=>e!==``),e=>Y(e));return{events:[...n].map(([e,n])=>({label:e,rows:n.rows,practiceRows:n.practiceRows,include:n.rows>n.practiceRows&&t.includeEvents[e]!==!1})),divisions:[...a].map(([e,t])=>({label:e,games:t.count})),fields:[...o].map(([e,t])=>({key:e,location:t.first.location,field:t.first.field,games:t.count})),teams:[...s].map(([e,t])=>({key:e,name:t.first,games:t.count}))}}function Ys(e,t,n){let r={};for(let t of e){let e=po(t);r[e]===void 0&&(r[e]=!1),fo(t)||(r[e]=!0)}if(n)for(let[e,t]of Object.entries(n.includeEvents))e in r&&(r[e]=t);let i=qs(e,r),a={};for(let e of i){let n=po(e);n in a||(a[n]=bo(n,t.divisions))}let o=new Map;for(let e of i){let t=o.get(e.location)??new Set;t.add(e.field),o.set(e.location,t)}let s={};for(let e of i){let n=Ks(e);if(n in s)continue;let r=(o.get(e.location)?.size??0)<=1,i=e.location||e.field,a=e.location&&e.field?`${e.location} - ${e.field}`:i,c=r?[a,i]:[a],l=t.locations.find(e=>c.some(t=>Y(e.name)===Y(t)));s[n]=l?{kind:`existing`,id:l.id}:{kind:`new`,name:r?i:a}}let c=t.teams.filter(e=>e.season_id===t.seasonId),l={};for(let e of i)for(let t of[e.home,e.away]){let e=Y(t);if(!t||e in l)continue;let n=c.find(t=>Y(t.name)===e);l[e]=n?{kind:`existing`,id:n.id}:xo(t)?{kind:`new`}:{kind:`label`}}if(n){for(let e of Object.keys(a))e in n.divisionByLabel&&(a[e]=n.divisionByLabel[e]);for(let e of Object.keys(s))e in n.locationByKey&&(s[e]=n.locationByKey[e]);for(let e of Object.keys(l))e in n.teamByKey&&(l[e]=n.teamByKey[e])}return{includeEvents:r,divisionByLabel:a,locationByKey:s,teamByKey:l}}function Xs(e){let t=e.trim().toLowerCase();return t?/cancel|postpone|rain|forfeit/.test(t)?`canceled`:/complete|final/.test(t)?`completed`:/schedul|confirm|active/.test(t)?`scheduled`:null:null}function Zs(e){let{rows:t,settings:n,context:r,existingGames:i,assignedCount:a,newId:o}=e,s=new Map(r.divisions.map(e=>[e.id,e.name])),c=new Map(r.teams.map(e=>[e.id,e])),l=new Set(r.teams.filter(e=>e.season_id===r.seasonId).map(e=>e.id)),u=new Map(r.locations.map(e=>[e.id,e.name])),d=new Map;for(let e of i)e.external_game_id&&d.set(e.external_game_id,e);let f=t.filter(fo).length,p=qs(t,n.includeEvents),m=t.length-f-p.length,h=new Map;for(let e of p){if(!e.externalId)continue;let t=h.get(e.externalId)??[];t.push(e.line),h.set(e.externalId,t)}let g=[],_=[];for(let e of p){let t=[];e.externalId?(h.get(e.externalId)?.length??0)>1&&t.push(`Game ID ${e.externalId} is used on more than one line (${h.get(e.externalId).join(`, `)}). Each game needs its own ID.`):t.push(`It has no Game ID.`);let r=mo(e.date),i=go(e.start),a=go(e.end);r||t.push(`The date "${e.date}" cannot be read.`),i||t.push(`The start time "${e.start}" cannot be read.`),a||t.push(`The end time "${e.end}" cannot be read.`);let o=r&&i?_o(r,i):null,u=r&&a?_o(r,a):null;r&&i&&!o&&t.push(`The start time does not exist on that date (clock change).`),r&&a&&!u&&t.push(`The end time does not exist on that date (clock change).`),o&&u&&new Date(u)<=new Date(o)&&t.push(`The game ends at or before it starts.`);let d=po(e),f=n.divisionByLabel[d]??null;f&&s.has(f)||t.push(`Its division "${vo(d)||d}" is not matched to one of your divisions.`);let p=null;!e.location&&!e.field?t.push(`It has no field or location.`):(p=n.locationByKey[Ks(e)]??null,p||t.push(`Its field "${e.location||e.field}" is not matched.`));let m=[];for(let[r,i]of[[`home`,e.home],[`away`,e.away]]){let e=Y(i);if(!i){t.push(`It has no ${r} team.`);continue}let a=n.teamByKey[e];if(!a)t.push(`The team "${i}" is not matched.`);else{if(a.kind===`existing`){let e=c.get(a.id);if(!e||!l.has(a.id)){t.push(`The team "${i}" is not a team in this season.`);continue}if(f&&e.division_id!==f){t.push(`The team "${e.name}" is in the ${s.get(e.division_id??``)??`no`} division, but this game is in ${s.get(f)??`another division`}.`);continue}}m.push({name:i,key:e,target:a})}}if(m.length===2){let[e,n]=m;(e.key===n.key||e.target.kind===`existing`&&n.target.kind===`existing`&&e.target.id===n.target.id)&&t.push(`The same team is on both sides.`)}t.length>0||!o||!u||!f||!p||m.length!==2?g.push({line:e.line,externalId:e.externalId,messages:t}):_.push({row:e,divisionId:f,locationTarget:p,home:m[0],away:m[1],startsAt:o,endsAt:u,status:Xs(e.status)})}let v=new Map;for(let e of _)for(let t of[e.home,e.away]){if(t.target.kind!==`new`)continue;let n=v.get(t.key)??new Set;n.add(e.divisionId),v.set(t.key,n)}let y=new Set([...v].filter(([,e])=>e.size>1).map(([e])=>e)),b=new Set(r.locations.map(e=>Y(e.name))),x=[];for(let e of _){let t=[];for(let n of[e.home,e.away])n.target.kind===`new`&&y.has(n.key)&&t.push(`The team "${n.name}" would have to be created in more than one division. Choose which team it is, or mark it as an outside team.`);e.locationTarget.kind===`new`&&b.has(Y(e.locationTarget.name))&&t.push(`A field called "${e.locationTarget.name}" already exists. Choose it from the list instead of creating it again.`),t.length>0?g.push({line:e.row.line,externalId:e.row.externalId,messages:t}):x.push(e)}let S=[],ee=new Map,C=[],te=new Map,ne=(e,t)=>{let n=ee.get(e.key);return n||(n=o(),ee.set(e.key,n),S.push({id:n,name:e.name,divisionId:t})),n},re=e=>{if(e.kind===`existing`)return e.id;let t=Y(e.name),n=te.get(t);return n||(n=o(),te.set(t,n),C.push({id:n,name:e.name})),n},w=e=>e.target.kind===`existing`?c.get(e.target.id)?.name??e.name:e.name,ie=(e,t)=>{let n=t===`home`?e.home_team_id:e.away_team_id,r=t===`home`?e.home_label:e.away_label;return n?c.get(n)?.name??`a team`:r??`?`},ae=[],oe=0;for(let e of x){let t=t=>t.target.kind===`label`?{team:null,label:t.name}:t.target.kind===`existing`?{team:t.target.id,label:null}:{team:ne(t,e.divisionId),label:null},n=t(e.home),r=t(e.away),i=re(e.locationTarget),o={division_id:e.divisionId,home_team_id:n.team,away_team_id:r.team,home_label:n.label,away_label:r.label,location_id:i,starts_at:e.startsAt,ends_at:e.endsAt,status:e.status},c=e.locationTarget.kind===`new`?e.locationTarget.name:u.get(e.locationTarget.id)??``,l={externalId:e.row.externalId,line:e.row.line,title:`${w(e.home)} vs ${w(e.away)}`,when:`${js(e.startsAt)}, ${Z(e.startsAt)} - ${Z(e.endsAt)}`,where:`${s.get(e.divisionId)??``}, ${c}`,payload:o},f=d.get(e.row.externalId);if(!f){ae.push({...l,op:`insert`,id:null,changes:[],hasUmpires:!1});continue}let p=[];f.division_id!==o.division_id&&p.push(`Division: ${s.get(f.division_id)??`?`} \u2192 ${s.get(o.division_id)??`?`}`),((f.home_team_id??null)!==o.home_team_id||(f.home_label??null)!==o.home_label)&&p.push(`Home team: ${ie(f,`home`)} \u2192 ${w(e.home)}`),((f.away_team_id??null)!==o.away_team_id||(f.away_label??null)!==o.away_label)&&p.push(`Away team: ${ie(f,`away`)} \u2192 ${w(e.away)}`),f.location_id!==o.location_id&&p.push(`Field: ${u.get(f.location_id)??`?`} \u2192 ${c}`),(Date.parse(f.starts_at)!==Date.parse(o.starts_at)||Date.parse(f.ends_at)!==Date.parse(o.ends_at))&&p.push(`Time: ${js(f.starts_at)}, ${Z(f.starts_at)} - ${Z(f.ends_at)} \u2192 ${js(o.starts_at)}, ${Z(o.starts_at)} - ${Z(o.ends_at)}`),o.status&&o.status!==f.status&&p.push(`Status: ${f.status} \u2192 ${o.status}`),p.length===0?oe+=1:ae.push({...l,op:`update`,id:f.id,changes:p,hasUmpires:(a.get(f.id)??0)>0})}ae.sort((e,t)=>e.payload.starts_at.localeCompare(t.payload.starts_at)||e.externalId.localeCompare(t.externalId));let se=new Set(p.map(e=>e.externalId).filter(Boolean)),ce=[],le=new Set;for(let e of p){let t=mo(e.date);t&&ce.push(`${t.y}-${String(t.m).padStart(2,`0`)}-${String(t.d).padStart(2,`0`)}`);let r=n.divisionByLabel[po(e)];r&&le.add(r)}ce.sort();let ue=ce.length===0?[]:i.filter(e=>e.external_game_id!==null&&!se.has(e.external_game_id)&&e.status!==`canceled`&&le.has(e.division_id)&&Ms(e.starts_at)>=ce[0]&&Ms(e.starts_at)<=ce[ce.length-1]);return g.sort((e,t)=>e.line-t.line),{totalRows:t.length,practicesSkipped:f,eventsSkipped:m,considered:p.length,games:ae,newCount:ae.filter(e=>e.op===`insert`).length,changedCount:ae.filter(e=>e.op===`update`).length,unchangedCount:oe,problems:g,newTeams:S,newLocations:C,missing:ue,changedWithUmpires:ae.filter(e=>e.hasUmpires).length}}var Qs=`__new__`,$s=`__label__`,ec=5242880,tc=[`externalId`,`event`,`group`,`home`,`away`,`date`,`start`,`end`,`field`,`location`,`status`];function nc(){if(typeof crypto.randomUUID==`function`)return crypto.randomUUID();let e=crypto.getRandomValues(new Uint8Array(16));e[6]=e[6]&15|64,e[8]=e[8]&63|128;let t=[...e].map(e=>e.toString(16).padStart(2,`0`)).join(``);return`${t.slice(0,8)}-${t.slice(8,12)}-${t.slice(12,16)}-${t.slice(16,20)}-${t.slice(20)}`}function rc(e){let t=``;return e.includes(`games_season_external_id_unique`)?t=` Another game in this season already has that master Game ID.`:e.includes(`games_home_team_in_division`)||e.includes(`games_away_team_in_division`)?t=` A team is not in that game's division.`:e.includes(`games_home_team_in_season`)||e.includes(`games_away_team_in_season`)?t=` A team is not in this season.`:/row-level security|permission denied/i.test(e)&&(t=` You may not have permission to import games.`),`Nothing was imported. ${e}${t}`}function ic(e,t){let{context:n}=t,r=Intl.DateTimeFormat().resolvedOptions().timeZone,i=t.seasonId,a=null,o=null,s=[],c=null,l=[],u=new Map,d=null,f=!1;e.innerHTML=`
    <section class="importer" id="importer">
      <h3>Import games from a spreadsheet</h3>
      <p class="directory-description">
        Choose the master calendar file (saved as CSV). Nothing is changed
        until you press <strong>Import</strong> at the bottom. Games are matched
        on the master Game ID: games already here are updated, new ones are
        added, and nothing is added twice. Times in the file are read as
        <strong>${J(r)}</strong> time (your computer's time zone).
      </p>

      <label for="imp-season">Import into season</label>
      <select id="imp-season">
        ${n.seasons.map(e=>`
          <option value="${J(e.id)}" ${e.id===i?`selected`:``}>${J(e.name)}</option>
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
  `;let p=e.querySelector(`#importer`),m=p.querySelector(`#imp-body`),h=p.querySelector(`#imp-message`),g=(e,t=`error`)=>{h.textContent=e,h.className=e?`message ${t}`:`message`},_=()=>({seasonId:i,divisions:n.divisions,teams:n.teams,locations:n.locations}),v=Promise.resolve(),y=async()=>{let e=await Ss(i);if(e.error)l=[],u=new Map,g(`Could not read this season's games, so changes cannot be worked out. Close and try again.`);else{l=e.games,u=new Map;for(let t of e.assignments)u.set(t.game_id,(u.get(t.game_id)??0)+1)}},b=()=>{c&&(d=Zs({rows:s,settings:c,context:_(),existingGames:l,assignedCount:u,newId:nc}))},x=()=>{if(!a||!o)return;let e=lo(o);s=e.length?[]:uo(a,o),c=e.length?null:Ys(s,_()),d=null,c&&b(),ee()},S=e=>e===1?`game`:`games`,ee=()=>{if(!a||!o){m.innerHTML=``;return}let e=a[0],t=lo(o),r=`
      <details id="imp-columns" ${t.length?`open`:``}>
        <summary>Columns in the file (${e.length})</summary>
        ${t.length?`<p class="message error">These could not be found, so please choose them below: ${t.map(e=>J(io[e])).join(`, `)}.</p>`:`<p class="directory-description">These were recognised from the headings. Change one only if it is wrong.</p>`}
        <div class="table-scroll">
          <table class="umpire-table imp-table" aria-label="Columns">
            <thead><tr><th>Needed for</th><th>Column in your file</th></tr></thead>
            <tbody>
              ${tc.map(t=>`
                <tr>
                  <td data-label="Needed for">${J(io[t])}</td>
                  <td data-label="Column in your file">
                    <select data-column="${t}" aria-label="${J(io[t])}">
                      <option value="">(none)</option>
                      ${e.map((e,n)=>`
                        <option value="${n}" ${o[t]===n?`selected`:``}>${J(e)}</option>
                      `).join(``)}
                    </select>
                  </td>
                </tr>
              `).join(``)}
            </tbody>
          </table>
        </div>
      </details>
    `;if(t.length||!c){m.innerHTML=r;return}let l=Js(s,c),u=`
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
                  <td data-label="Kind of row">${J(e.label||`(no name)`)}</td>
                  <td data-label="Rows">${e.rows}${e.practiceRows?` (${e.practiceRows} practice)`:``}</td>
                  <td data-label="Import as games">
                    ${t===0?`<span class="season-dates">Practices: skipped</span>`:`<label class="season-checkbox-label"><input type="checkbox" data-event="${J(e.label)}" ${e.include?`checked`:``} /> Import</label>`}
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
                <td data-label="In the file">${J(vo(e.label)||e.label)}</td>
                <td data-label="Games">${e.games}</td>
                <td data-label="Your division">
                  <select data-division="${J(e.label)}" aria-label="Division for ${J(e.label)}">
                    <option value="">Choose a division&hellip;</option>
                    ${n.divisions.map(t=>`
                      <option value="${J(t.id)}" ${c.divisionByLabel[e.label]===t.id?`selected`:``}>${J(t.name)}</option>
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
                  <td data-label="In the file">${J(e.location||e.field)}${e.location&&e.field?` <span class="season-dates">(${J(e.field)})</span>`:``}</td>
                  <td data-label="Games">${e.games}</td>
                  <td data-label="Your field">
                    <select data-field="${J(e.key)}" aria-label="Field for ${J(e.location||e.field)}">
                      <option value="${Qs}" ${r?`selected`:``}>Create a new field</option>
                      ${n.locations.map(e=>`
                        <option value="${J(e.id)}" ${t?.kind===`existing`&&t.id===e.id?`selected`:``}>${J(e.name)}</option>
                      `).join(``)}
                    </select>
                    <input type="text" data-field-name="${J(e.key)}" maxlength="100"
                      value="${J(t?.kind===`new`?t.name:``)}"
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
                  <td data-label="In the file">${J(e.name)}</td>
                  <td data-label="Games">${e.games}</td>
                  <td data-label="Your team">
                    <select data-team="${J(e.key)}" aria-label="Team for ${J(e.name)}">
                      <option value="${Qs}" ${t?.kind===`new`?`selected`:``}>Create a new team</option>
                      <option value="${$s}" ${t?.kind===`label`?`selected`:``}>Outside team (name only)</option>
                      ${p.map(e=>`
                        <option value="${J(e.id)}" ${t?.kind===`existing`&&t.id===e.id?`selected`:``}>${J(e.name)}</option>
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
    `,C()},C=()=>{let e=m.querySelector(`#imp-preview`);if(!e||!d)return;let t=d,r=t.games.length,i=t.games.filter(e=>e.op===`update`),a=t.games.filter(e=>e.op===`insert`);e.innerHTML=`
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
            ${t.newTeams.map(e=>`<li>Team: ${J(e.name)} <span class="season-dates">(${J(n.divisions.find(t=>t.id===e.divisionId)?.name??``)})</span></li>`).join(``)}
            ${t.newLocations.map(e=>`<li>Field: ${J(e.name)}</li>`).join(``)}
          </ul>
        </details>
      `:``}

      ${t.problems.length?`
        <div class="imp-section imp-problems">
          <h5>${t.problems.length} ${t.problems.length===1?`row has`:`rows have`} a problem and will be skipped</h5>
          <ul class="imp-list">
            ${t.problems.map(e=>`
              <li>Line ${e.line}${e.externalId?` (Game ID ${J(e.externalId)})`:``}: ${e.messages.map(J).join(` `)}</li>
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
                <strong>${J(e.title)}</strong> <span class="season-dates">(Game ID ${J(e.externalId)})</span>
                ${e.hasUmpires?`<span class="imp-umpires">umpires assigned</span>`:``}
                <ul>${e.changes.map(e=>`<li>${J(e)}</li>`).join(``)}</ul>
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
              <li><strong>${J(e.title)}</strong> <span class="season-dates">${J(e.when)}, ${J(e.where)} (Game ID ${J(e.externalId)})</span></li>
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
            ${t.missing.map(e=>`<li>Game ID ${J(e.external_game_id??``)}</li>`).join(``)}
          </ul>
        </div>
      `:``}

      <div class="account-actions">
        <button id="imp-apply" class="primary-button" type="button" ${r===0||f?`disabled`:``}>
          ${r===0?`Nothing to import`:`Import ${r} ${S(r)} (${t.newCount} new, ${t.changedCount} changed)`}
        </button>
      </div>
    `},te=async()=>{if(!d||f||d.games.length===0||d.problems.length>0&&!window.confirm(`${d.problems.length} ${d.problems.length===1?`row has a problem and will`:`rows have problems and will`} be skipped. Import the other games anyway?`))return;f=!0,g(`Importing…`,`success`),C();let{data:e,error:n}=await H.rpc(`import_games`,{p_season_id:i,p_new_teams:d.newTeams.map(e=>({id:e.id,name:e.name,division_id:e.divisionId})),p_new_locations:d.newLocations.map(e=>({id:e.id,name:e.name})),p_games:d.games.map(e=>({op:e.op,id:e.id,external_game_id:e.externalId,...e.payload}))});if(f=!1,n){g(rc(n.message),`error`),C();return}let r=e??{},a=[`Imported ${(r.games_inserted??0)+(r.games_updated??0)} games (${r.games_inserted??0} new, ${r.games_updated??0} changed).`];r.teams_created&&a.push(`Created ${r.teams_created} ${r.teams_created===1?`team`:`teams`}.`),r.locations_created&&a.push(`Created ${r.locations_created} ${r.locations_created===1?`field`:`fields`}.`);let o=Ns(new Date).toISOString();d.games.some(e=>e.payload.starts_at<o)&&a.push(`The list starts from today: change From to see earlier games.`),t.onImported(a.join(` `))},ne=async e=>{if(g(``),a=null,o=null,c=null,d=null,ee(),/\.xlsx?$/i.test(e.name)){g(`That is an Excel file. Please save it as CSV first (in Excel or Google Sheets: File, Save as or Download, Comma-separated values) and choose that file.`);return}if(e.size>ec){g(`That file is too large (the limit is 5 MB).`);return}let t;try{t=Fo(await e.text())}catch(e){g(e instanceof Error?e.message:`That file could not be read.`);return}t.length<2?g(`That file has no rows below the headings.`):(await v,a=t,o=co(t[0]),x())};p.querySelector(`#imp-file`)?.addEventListener(`change`,e=>{let t=e.target.files?.[0];t&&ne(t)}),p.querySelector(`#imp-season`)?.addEventListener(`change`,e=>{i=e.target.value,v=y().then(()=>{a&&x()})}),p.querySelector(`#imp-close`)?.addEventListener(`click`,t.onClose),m.addEventListener(`click`,e=>{let t=e.target;t instanceof Element&&t.closest(`#imp-apply`)&&te()}),m.addEventListener(`change`,e=>{let t=e.target;if(t instanceof HTMLElement){if(t instanceof HTMLSelectElement&&t.dataset.column&&o)o[t.dataset.column]=t.value===``?null:Number(t.value),x();else if(c){if(t instanceof HTMLInputElement&&t.dataset.event!==void 0)c.includeEvents[t.dataset.event]=t.checked,c=Ys(s,_(),c),b(),ee();else{if(t instanceof HTMLSelectElement&&t.dataset.division!==void 0)c.divisionByLabel[t.dataset.division]=t.value||null;else if(t instanceof HTMLSelectElement&&t.dataset.field!==void 0){let e=t.dataset.field,n=m.querySelector(`[data-field-name="${CSS.escape(e)}"]`);if(t.value===Qs){let t=s.find(t=>Ks(t)===e),r=n?.value.trim()||t?.location||t?.field||`New field`;c.locationByKey[e]={kind:`new`,name:r},n&&(n.value=r,n.hidden=!1)}else c.locationByKey[e]={kind:`existing`,id:t.value},n&&(n.hidden=!0)}else if(t instanceof HTMLSelectElement&&t.dataset.team!==void 0)c.teamByKey[t.dataset.team]=t.value===Qs?{kind:`new`}:t.value===$s?{kind:`label`}:{kind:`existing`,id:t.value};else return;b(),C()}}}}),m.addEventListener(`input`,e=>{let t=e.target;if(!(t instanceof HTMLInputElement)||t.dataset.fieldName===void 0||!c)return;let n=t.value.trim();n&&(c.locationByKey[t.dataset.fieldName]={kind:`new`,name:n},b(),C())}),v=y()}function ac(e){let t=e??``;return/^[=+\-@\t\r]/.test(t)&&(t=`'${t}`),/[",\r\n]/.test(t)?`"${t.replace(/"/g,`""`)}"`:t}function oc(e){return`\uFEFF${e.map(e=>e.map(ac).join(`,`)).join(`\r
`)}\r\n`}function sc(e){return e.replace(/[^A-Za-z0-9._-]+/g,`-`).replace(/-+/g,`-`).replace(/^-|-$/g,``)||`download`}function cc(e,t){let n=new Blob([t],{type:`text/csv;charset=utf-8`}),r=URL.createObjectURL(n),i=document.createElement(`a`);i.href=r,i.download=e,document.body.appendChild(i),i.click(),i.remove(),window.setTimeout(()=>URL.revokeObjectURL(r),1e3)}function lc(e){document.getElementById(`print-root`)?.remove();let t=document.createElement(`div`);t.id=`print-root`,t.innerHTML=e,document.body.appendChild(t),document.body.classList.add(`printing`);let n=!1,r=()=>{n||(n=!0,window.removeEventListener(`afterprint`,r),t.remove(),document.body.classList.remove(`printing`))};window.addEventListener(`afterprint`,r),window.setTimeout(r,6e5),window.print()}function uc(e){let t=new Map(e.teams.map(e=>[e.id,e.name])),n=new Map(e.locations.map(e=>[e.id,e])),r=new Map(e.divisions.map(e=>[e.id,e.name]));return{teamName:e=>t.get(e)??`A team`,fieldName:e=>n.get(e)?.name??``,fieldAddress:e=>n.get(e)?.address??``,divisionName:e=>r.get(e)??``,umpireName:t=>e.umpireNames.get(t)??`Unknown umpire`}}function dc(e,t,n){let r=t===`home`?e.home_team_id:e.away_team_id,i=t===`home`?e.home_label:e.away_label;return r?n.teamName(r):i??`?`}var fc=(e,t)=>Date.parse(e.startsAt)-Date.parse(t.startsAt)||e.field.localeCompare(t.field)||e.home.localeCompare(t.home);function pc(e,t,n){let r=new Map;for(let e of t){let t=r.get(e.game_id)??{};t[e.position]=n.umpireName(e.umpire_id),r.set(e.game_id,t)}return e.map(e=>{let t=r.get(e.id);return{id:e.id,day:Ms(e.starts_at),startsAt:e.starts_at,endsAt:e.ends_at,time:Rs(e.starts_at,e.ends_at),start:Z(e.starts_at),end:Z(e.ends_at),weekday:Ls(e.starts_at),division:n.divisionName(e.division_id),field:n.fieldName(e.location_id),address:n.fieldAddress(e.location_id),home:dc(e,`home`,n),away:dc(e,`away`,n),plate:t?.plate??null,fieldUmpire:t?.field??null,status:e.status,type:e.game_type,masterId:e.external_game_id??``,notes:e.notes??``}}).sort(fc)}function mc(e){let t=new Map;for(let n of[...e].sort(fc)){let e=t.get(n.day);e||(e={day:n.day,heading:Fs(n.startsAt),games:[]},t.set(n.day,e)),e.games.push(n)}return[...t.values()].sort((e,t)=>e.day.localeCompare(t.day))}var hc=[`Date`,`Day`,`Start`,`End`,`Division`,`Field`,`Address`,`Home`,`Away`,`Plate umpire`,`Field umpire`,`Status`,`Type`,`Master Game ID`,`Notes`];function gc(e){return[...e].sort(fc).map(e=>[e.day,e.weekday,e.start,e.end,e.division,e.field,e.address,e.home,e.away,e.plate??``,e.fieldUmpire??``,e.status,e.type,e.masterId,e.notes])}function _c(e,t,n,r){let i=new Map;for(let t of n)t.umpire_id===e&&i.set(t.game_id,t.position===`plate`?`Plate`:`Field`);return pc(t.filter(e=>i.has(e.id)),[],r).map(e=>({...e,position:i.get(e.id)}))}var vc=[`Date`,`Day`,`Start`,`End`,`Position`,`Field`,`Address`,`Division`,`Home`,`Away`,`Status`,`Master Game ID`];function yc(e){return[...e].sort(fc).map(e=>[e.day,e.weekday,e.start,e.end,e.position,e.field,e.address,e.division,e.home,e.away,e.status,e.masterId])}var bc=(e,t,n)=>`${e} ${e===1?t:n}`;function xc(e){return`
    <strong>${J(e.home)}</strong> vs <strong>${J(e.away)}</strong>
    ${e.type===`regular`?``:`<span class="print-tag">${J(e.type)}</span>`}
    ${e.status===`canceled`?`<span class="print-canceled-tag">CANCELED</span>`:``}
    ${e.status===`completed`?`<span class="print-tag">completed</span>`:``}
  `}function Sc(e){return`${J(e.field)}${e.address?`<br><small>${J(e.address)}</small>`:``}`}function Cc(e,t){return t.status===`canceled`?`&mdash;`:e?J(e):`<span class="print-open">OPEN</span>`}function wc(e,t){let n=e.reduce((e,t)=>e+t.games.length,0);return`
    <article class="print-doc">
      <header class="print-head">
        <h1>${J(t.title)}</h1>
        ${t.lines.map(e=>`<p class="print-sub">${J(e)}</p>`).join(``)}
        <p class="print-meta">
          ${bc(n,`game`,`games`)} on ${bc(e.length,`day`,`days`)}
          &middot; Printed ${J(t.printedAt)}
        </p>
      </header>

      ${e.length===0?`<p>There are no games to show.</p>`:``}

      ${e.map((e,n)=>`
        <section class="print-day ${t.pagePerDay&&n>0?`print-new-page`:``}">
          <h2>${J(e.heading)}
            <span class="print-count">${bc(e.games.length,`game`,`games`)}</span>
          </h2>
          <table class="print-table">
            <thead>
              <tr>
                <th class="c-time">Time</th><th>Division</th><th>Field</th>
                <th>Game</th><th>Plate umpire</th><th>Field umpire</th>
              </tr>
            </thead>
            <tbody>
              ${e.games.map(e=>`
                <tr class="${e.status===`canceled`?`print-canceled`:``}">
                  <td class="c-time">${J(e.time)}</td>
                  <td>${J(e.division)}</td>
                  <td>${Sc(e)}</td>
                  <td>${xc(e)}</td>
                  <td>${Cc(e.plate,e)}</td>
                  <td>${Cc(e.fieldUmpire,e)}</td>
                </tr>
              `).join(``)}
            </tbody>
          </table>
        </section>
      `).join(``)}
    </article>
  `}function Tc(e,t,n){let r=[...t].sort(fc);return`
    <article class="print-doc">
      <header class="print-head">
        <h1>${J(n.title)}: ${J(e)}</h1>
        ${n.lines.map(e=>`<p class="print-sub">${J(e)}</p>`).join(``)}
        <p class="print-meta">
          ${bc(r.length,`game`,`games`)} &middot; Printed ${J(n.printedAt)}
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
                <td>${J(js(e.startsAt))}</td>
                <td class="c-time">${J(e.time)}</td>
                <td><strong>${J(e.position)}</strong></td>
                <td>${Sc(e)}</td>
                <td>${xc(e)}</td>
                <td>${J(e.division)}</td>
              </tr>
            `).join(``)}
          </tbody>
        </table>
      `}
    </article>
  `}function Ec(e,t){let{umpireName:n,items:r}=t;e.innerHTML=`
    <div class="schedule-view">
      <div class="game-filters">
        <div>
          <label for="sv-from">From</label>
          <input id="sv-from" type="date" value="${J(Ms(new Date().toISOString()))}" />
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
      <div id="sv-list"></div>

      <div class="account-actions">
        <button id="sv-print" class="primary-button" type="button">Print this schedule</button>
        <button id="sv-csv" class="secondary-button" type="button">Download CSV</button>
      </div>
    </div>
  `;let i=t=>e.querySelector(`#${t}`),a=()=>{let e=i(`sv-from`).value,t=i(`sv-to`).value,n=i(`sv-canceled`).checked;return r.filter(r=>(!e||r.day>=e)&&(!t||r.day<=t)&&(n||r.status!==`canceled`))},o=()=>{let e=i(`sv-from`).value,t=i(`sv-to`).value,n=e=>js(new Date(`${e}T12:00:00`).toISOString());return e&&t?`From ${n(e)} to ${n(t)}`:e?`From ${n(e)}`:t?`Up to ${n(t)}`:`All dates`},s=()=>{let e=a(),n=i(`sv-summary`),s=i(`sv-list`),c=e.length===0;i(`sv-print`).disabled=c,i(`sv-csv`).disabled=c,n.textContent=`${e.length} ${e.length===1?`game`:`games`} \u00b7 ${o()}`,s.innerHTML=e.length===0?`<p class="directory-empty">${r.length===0?J(t.emptyText):`No games in these dates. Change From and To to see more.`}</p>`:`
      <div class="table-scroll">
        <table class="umpire-table imp-table" aria-label="Schedule">
          <thead>
            <tr><th>Date</th><th>Time</th><th>Position</th><th>Field</th><th>Game</th><th>Division</th></tr>
          </thead>
          <tbody>
            ${e.map(e=>`
              <tr class="${e.status===`canceled`?`game-row-canceled`:``}">
                <td data-label="Date" class="sv-date">${J(js(e.startsAt))}</td>
                <td data-label="Time" class="sv-time">${J(e.time)}</td>
                <td data-label="Position" class="sv-position"><strong>${J(e.position)}</strong></td>
                <td data-label="Field" class="sv-field">${J(e.field)}${e.address?`<br><span class="game-where">${J(e.address)}</span>`:``}</td>
                <td data-label="Game" class="sv-game">${J(e.home)} vs ${J(e.away)}${e.status===`canceled`?` (canceled)`:``}</td>
                <td data-label="Division" class="sv-division">${J(e.division)}</td>
              </tr>
            `).join(``)}
          </tbody>
        </table>
      </div>
    `};for(let e of[`sv-from`,`sv-to`,`sv-canceled`])i(e).addEventListener(`change`,s);i(`sv-print`).addEventListener(`click`,()=>{let e=a();e.length!==0&&lc(Tc(n,e,{title:`Umpire schedule`,lines:[o(),i(`sv-canceled`).checked?`Including canceled games`:`Canceled games are not shown`],printedAt:Bs(new Date)}))}),i(`sv-csv`).addEventListener(`click`,()=>{let e=a();if(e.length===0)return;let t=i(`sv-from`).value||`start`,r=i(`sv-to`).value||`end`;cc(`${sc(`RWCLL-schedule-${n}-${t}-${r}`)}.csv`,oc([vc,...yc(e)]))}),s()}function Dc(e,t){let{context:n}=t;e.innerHTML=`
    <section class="importer" id="umpire-schedule-panel">
      <h3>One umpire's schedule</h3>
      <p class="directory-description">
        Choose an umpire to see, print or download all of their games, in
        every season. Times are shown in your computer's time zone.
      </p>

      <label for="us-umpire">Umpire</label>
      <select id="us-umpire">
        <option value="">Choose an umpire&hellip;</option>
        ${[...n.umpireNames.entries()].sort((e,t)=>e[1].localeCompare(t[1])).map(([e,t])=>`<option value="${J(e)}">${J(t)}</option>`).join(``)}
      </select>

      <p id="us-message" class="message" role="status" aria-live="polite"></p>
      <div id="us-view"></div>

      <div class="account-actions">
        <button id="us-close" class="secondary-button" type="button">Close</button>
      </div>
    </section>
  `;let r=e.querySelector(`#us-view`),i=e.querySelector(`#us-message`),a=0;e.querySelector(`#us-umpire`)?.addEventListener(`change`,async e=>{let t=e.target.value,o=++a;if(r.innerHTML=``,i.textContent=``,i.className=`message`,!t)return;i.textContent=`Loading…`;let s=await Cs(t);o===a&&(s.error?(i.textContent=`Could not load this umpire's games. Try again.`,i.className=`message error`,console.error(`Umpire schedule failed:`,s.error)):(i.textContent=``,Ec(r,{umpireName:n.umpireNames.get(t)??`Umpire`,items:_c(t,s.games,s.assignments,uc(n)),emptyText:`This umpire has not been assigned any games yet.`})))}),e.querySelector(`#us-close`)?.addEventListener(`click`,t.onClose)}var Oc=3;function kc(e){return e.status===`draft`||e.status===`scheduled`}function Ac(e){let t=new Map,n=Ns(e.now).getTime(),r=e.games.map(e=>({game:e,start:Date.parse(e.starts_at),end:Date.parse(e.ends_at)}));for(let{game:i,start:a}of r)kc(i)&&a>=n&&(e.assignedCount.get(i.id)??0)===0&&t.set(i.id,[{kind:`no_umpire`,text:`No umpire assigned`}]);let i=r.filter(e=>e.game.status!==`canceled`),a=new Map,o=t=>{let n=a.get(t.id);return n===void 0&&(n=Z(t.starts_at),a.set(t.id,n)),`${e.sidesText(t)} at ${n}`},s=new Map,c=new Map,l=(e,t,n)=>{let r=e.get(t)??{count:0,lines:[]};r.count+=1,r.lines.length<Oc&&r.lines.push(n()),e.set(t,r)},u=(e,t)=>{let n=[...e].sort((e,t)=>e.start-t.start);for(let e=0;e<n.length;e+=1)for(let r=e+1;r<n.length&&!(n[r].start>=n[e].end);r+=1)t(n[e],n[r])},d=new Map;for(let e of i){let t=d.get(e.game.location_id)??[];t.push(e),d.set(e.game.location_id,t)}for(let t of d.values())u(t,(t,n)=>{let r=e.fieldName(t.game.location_id);kc(t.game)&&l(s,t.game.id,()=>`${r} is also used by ${o(n.game)}`),kc(n.game)&&l(s,n.game.id,()=>`${r} is also used by ${o(t.game)}`)});let f=new Map;for(let e of i)for(let t of[e.game.home_team_id,e.game.away_team_id]){if(!t)continue;let n=f.get(t)??[];n.push(e),f.set(t,n)}for(let[t,n]of f)u(n,(n,r)=>{let i=e.teamName(t);kc(n.game)&&l(c,n.game.id,()=>`${i} also plays ${o(r.game)}`),kc(r.game)&&l(c,r.game.id,()=>`${i} also plays ${o(n.game)}`)});let p=(e,n,r)=>{for(let[i,a]of e){let e=t.get(i)??[];for(let t of a.lines)e.push({kind:n,text:t});if(a.count>a.lines.length){let t=a.count-a.lines.length;e.push({kind:n,text:`...and ${t} more ${r} conflict${t===1?``:`s`}`})}t.set(i,e)}};return p(s,`field_conflict`,`field`),p(c,`team_conflict`,`team`),t}var jc=null,Mc=!1,Nc=null,Pc={draft:`Draft`,scheduled:`Scheduled`,canceled:`Canceled`,completed:`Completed`},Fc={no_umpire:``,field_conflict:`Field conflict: `,team_conflict:`Team conflict: `};function Ic(e){let t=[...e].sort((e,t)=>(t.starts_on??``).localeCompare(e.starts_on??``)||e.name.localeCompare(t.name));return(t.find(e=>e.is_active)??t[0]).id}async function Lc(e){e.innerHTML=`
    <section class="games-page">
      <h2>Games</h2>
      <p class="directory-description">Loading games&hellip;</p>
    </section>
  `;let{context:t,error:n}=await xs();if(!t){e.innerHTML=`
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
    `;return}jc||={seasonId:Ic(t.seasons),divisionId:``,fieldId:``,from:Ms(new Date().toISOString()),to:``,status:`not_canceled`,search:``,onlyWarnings:!1};let r=jc;t.seasons.some(e=>e.id===r.seasonId)||(r.seasonId=Ic(t.seasons));let i=new Map(t.teams.map(e=>[e.id,e.name])),a=new Map(t.locations.map(e=>[e.id,e.name])),o=new Map(t.divisions.map(e=>[e.id,e.name])),s=[],c=[],l=(e,t)=>t===`home`?(e.home_team_id?i.get(e.home_team_id):e.home_label)??`?`:(e.away_team_id?i.get(e.away_team_id):e.away_label)??`?`,u=e=>`${l(e,`home`)} vs ${l(e,`away`)}`;e.innerHTML=`
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
              <option value="${J(e.id)}" ${e.id===r.seasonId?`selected`:``}>${J(e.name)}</option>
            `).join(``)}
          </select>
        </div>
        <div>
          <label for="gf-division">Division</label>
          <select id="gf-division">
            <option value="">All divisions</option>
            ${t.divisions.map(e=>`
              <option value="${J(e.id)}" ${e.id===r.divisionId?`selected`:``}>${J(e.name)}</option>
            `).join(``)}
          </select>
        </div>
        <div>
          <label for="gf-field">Field</label>
          <select id="gf-field">
            <option value="">All fields</option>
            ${t.locations.map(e=>`
              <option value="${J(e.id)}" ${e.id===r.fieldId?`selected`:``}>${J(e.name)}</option>
            `).join(``)}
          </select>
        </div>
        <div>
          <label for="gf-from">From</label>
          <input id="gf-from" type="date" value="${J(r.from)}" />
        </div>
        <div>
          <label for="gf-to">To</label>
          <input id="gf-to" type="date" value="${J(r.to)}" />
        </div>
        <div>
          <label for="gf-status">Status</label>
          <select id="gf-status">
            <option value="not_canceled" ${r.status===`not_canceled`?`selected`:``}>All except canceled</option>
            <option value="all" ${r.status===`all`?`selected`:``}>All</option>
            ${Object.keys(Pc).map(e=>`
              <option value="${e}" ${r.status===e?`selected`:``}>${Pc[e]}</option>
            `).join(``)}
          </select>
        </div>
        <div class="game-filter-wide">
          <label for="gf-search">Search</label>
          <input id="gf-search" type="search" value="${J(r.search)}"
            placeholder="Team, field, umpire or master Game ID" />
        </div>
        <label class="season-checkbox-label game-filter-wide">
          <input id="gf-warnings" type="checkbox" ${r.onlyWarnings?`checked`:``} />
          Only games with warnings
        </label>
        <label class="season-checkbox-label game-filter-wide">
          <input id="print-page-per-day" type="checkbox" ${Mc?`checked`:``} />
          When printing, start each day on a new page
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
  `;let d=t=>e.querySelector(`#${t}`),f=(e,t=`success`)=>{let n=d(`games-message`);n.textContent=e,n.className=e?`message ${t}`:`message`},p=e=>{if(e.season_id!==r.seasonId||r.divisionId&&e.division_id!==r.divisionId||r.fieldId&&e.location_id!==r.fieldId)return!1;let n=Ms(e.starts_at);if(r.from&&n<r.from||r.to&&n>r.to||r.status===`not_canceled`&&e.status===`canceled`||r.status!==`not_canceled`&&r.status!==`all`&&e.status!==r.status)return!1;let i=r.search.trim().toLowerCase();if(i){let n=c.filter(t=>t.game_id===e.id).map(e=>t.umpireNames.get(e.umpire_id)??``);if(![l(e,`home`),l(e,`away`),a.get(e.location_id)??``,o.get(e.division_id)??``,e.external_game_id??``,...n].join(` `).toLowerCase().includes(i))return!1}return!0},m=()=>{let e=new Map,n=new Map;for(let r of c){e.set(r.game_id,(e.get(r.game_id)??0)+1);let i=n.get(r.game_id)??{};i[r.position]=t.umpireNames.get(r.umpire_id)??`Unknown umpire`,n.set(r.game_id,i)}let f=Ac({games:s,assignedCount:e,now:new Date,teamName:e=>i.get(e)??`A team`,fieldName:e=>a.get(e)??`The field`,sidesText:u}),m=s.filter(p).filter(e=>!r.onlyWarnings||(f.get(e.id)?.length??0)>0).sort((e,t)=>e.starts_at.localeCompare(t.starts_at)||(a.get(e.location_id)??``).localeCompare(a.get(t.location_id)??``));g=m,_=c;let h=e=>m.filter(t=>f.get(t.id)?.some(t=>t.kind===e)).length,v=h(`no_umpire`),y=h(`field_conflict`),b=h(`team_conflict`),x=[v?`<strong>${v}</strong> ${v===1?`needs`:`need`} an umpire`:``,y?`<strong>${y}</strong> with a field conflict`:``,b?`<strong>${b}</strong> with a team conflict`:``].filter(Boolean),S=d(`game-summary`);S.className=x.length?`game-summary game-summary-warn`:`game-summary`,S.innerHTML=`${m.length} ${m.length===1?`game`:`games`} shown`+(x.length?` &middot; ${x.join(` &middot; `)}`:` &middot; no warnings`);let ee=d(`game-list`);ee.innerHTML=m.length===0?`
        <p class="directory-empty">
          ${s.length===0?`There are no games in this season yet. Add a game above.`:`No games match these filters.`}
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
            ${m.map(e=>{let t=f.get(e.id)??[],r=n.get(e.id);return`
                <tr class="${t.length?`game-row-warn`:``} ${e.status===`canceled`?`game-row-canceled`:``}">
                  <td class="game-when">
                    <span class="game-date">${J(js(e.starts_at))}</span><br>
                    <span class="game-time">${J(Z(e.starts_at))} &ndash; ${J(Z(e.ends_at))}</span>
                  </td>
                  <td class="game-main">
                    <span class="game-sides">${J(l(e,`home`))} vs ${J(l(e,`away`))}</span>
                    ${e.game_type===`regular`?``:`<span class="game-type">${J(e.game_type)}</span>`}<br>
                    <span class="game-where">${J(o.get(e.division_id)??``)} &middot; ${J(a.get(e.location_id)??``)}</span>
                  </td>
                  <td class="game-umpires" data-label="Umpires">${r?[r.plate?`Plate: ${J(r.plate)}`:``,r.field?`Field: ${J(r.field)}`:``].filter(Boolean).join(`<br>`):`&mdash;`}</td>
                  <td class="game-status" data-label="Status">
                    <span class="game-status-text">${J(Pc[e.status])}</span>
                    ${e.external_game_id?`<br><span class="game-master" title="Master calendar Game ID">${J(e.external_game_id)}</span>`:``}
                  </td>
                  <td class="game-warn-cell" data-label="Warnings">${t.length?`<ul class="game-warnings">${t.map(e=>`
                        <li class="game-warning game-warning-${e.kind}">${J(Fc[e.kind]+e.text)}</li>
                      `).join(``)}</ul>`:``}</td>
                  <td><button type="button" class="secondary-button"
                    data-edit-game="${J(e.id)}">Edit</button></td>
                </tr>
              `}).join(``)}
          </tbody>
        </table>
      </div>
    `},h=async()=>{d(`game-list`).innerHTML=`<p class="directory-description">Loading games&hellip;</p>`;let e=await Ss(r.seasonId);e.error?(s=[],c=[],d(`game-summary`).textContent=``,d(`game-list`).innerHTML=`<p class="message error">Unable to load the games. Press Refresh to try again.</p>`,console.error(`Games load failed:`,e.error)):(s=e.games,c=e.assignments,m())},g=[],_=[],v=()=>{let e=t.seasons.find(e=>e.id===r.seasonId)?.name??``,n=e=>js(new Date(`${e}T12:00:00`).toISOString()),i=r.from&&r.to?`${n(r.from)} to ${n(r.to)}`:r.from?`From ${n(r.from)}`:r.to?`Up to ${n(r.to)}`:`All dates`,s=r.status===`not_canceled`?`Canceled games not shown`:r.status===`all`?`All statuses`:Pc[r.status]??r.status;return[[e,r.divisionId?o.get(r.divisionId)??``:`All divisions`,r.fieldId?a.get(r.fieldId)??``:`All fields`,i,s,r.search.trim()?`matching "${r.search.trim()}"`:``,r.onlyWarnings?`only games with warnings`:``].filter(Boolean).join(` · `)]},y=()=>{d(`game-form-container`).innerHTML=``},b=e=>{let n=d(`game-form-container`);Gs(n,t,{game:e,defaultSeasonId:r.seasonId,defaultDivisionId:r.divisionId||t.divisions[0]?.id||``,assignmentCount:e?c.filter(t=>t.game_id===e.id).length:0,onDone:e=>{y(),e&&(f(e),h())}}),n.scrollIntoView({behavior:`smooth`,block:`start`})},x=(e,t,n)=>{d(e).addEventListener(t,e=>n(e.target))};x(`gf-season`,`change`,e=>{r.seasonId=e.value,y(),f(``),h()}),x(`gf-division`,`change`,e=>{r.divisionId=e.value,m()}),x(`gf-field`,`change`,e=>{r.fieldId=e.value,m()}),x(`gf-from`,`input`,e=>{r.from=e.value,m()}),x(`gf-to`,`input`,e=>{r.to=e.value,m()}),x(`gf-status`,`change`,e=>{r.status=e.value,m()}),x(`gf-search`,`input`,e=>{r.search=e.value,m()}),x(`gf-warnings`,`change`,e=>{r.onlyWarnings=e.checked,m()}),d(`add-game`).addEventListener(`click`,()=>{f(``),d(`importer-container`).innerHTML=``,b(null)}),d(`import-games`).addEventListener(`click`,()=>{f(``),y(),d(`umpire-schedule-container`).innerHTML=``;let n=d(`importer-container`);ic(n,{context:t,seasonId:r.seasonId,onClose:()=>{n.innerHTML=``},onImported:t=>{Nc=t,Lc(e)}}),n.scrollIntoView({behavior:`smooth`,block:`start`})}),d(`refresh-games`).addEventListener(`click`,()=>{f(``),h()}),x(`print-page-per-day`,`change`,e=>{Mc=e.checked}),d(`print-games`).addEventListener(`click`,()=>{f(``),g.length===0?f(`There are no games to print. Change the filters first.`,`error`):lc(wc(mc(pc(g,_,uc(t))),{title:`Umpire schedule`,lines:v(),printedAt:Bs(new Date),pagePerDay:Mc}))}),d(`download-games`).addEventListener(`click`,()=>{if(f(``),g.length===0){f(`There are no games to download. Change the filters first.`,`error`);return}let e=pc(g,_,uc(t));cc(`${sc(`RWCLL-schedule-${t.seasons.find(e=>e.id===r.seasonId)?.name??`season`}-${r.from||`start`}-${r.to||`end`}`)}.csv`,oc([hc,...gc(e)])),f(`Downloaded ${e.length} ${e.length===1?`game`:`games`}.`,`success`)}),d(`umpire-schedule`).addEventListener(`click`,()=>{f(``),d(`importer-container`).innerHTML=``,y();let e=d(`umpire-schedule-container`);Dc(e,{context:t,onClose:()=>{e.innerHTML=``}}),e.scrollIntoView({behavior:`smooth`,block:`start`})}),d(`game-list`).addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`[data-edit-game]`);if(!n)return;let r=s.find(e=>e.id===n.dataset.editGame);r&&(f(``),b(r))}),await h(),Nc&&=(f(Nc),null)}function Rc(){jc=null}async function zc(e){e.innerHTML=`
    <section class="my-schedule">
      <h2>My schedule</h2>
      <p class="directory-description">Loading your games&hellip;</p>
    </section>
  `;let t=t=>{e.innerHTML=`
      <section class="my-schedule">
        <h2>My schedule</h2>
        <p class="directory-empty">${J(t)}</p>
      </section>
    `},{data:n}=await H.auth.getSession(),r=n.session?.user.id;if(!r)return t(`Sign in again to see your schedule.`);let{data:i,error:a}=await H.from(`umpires`).select(`id, display_name`).eq(`profile_id`,r).maybeSingle();if(a)return console.error(`My schedule failed:`,a.message),t(`Your schedule could not be loaded. Refresh and try again.`);if(!i)return t(`Your account is not connected to an umpire record yet, so there is no schedule to show. Please ask an administrator.`);let[{context:o,error:s},c]=await Promise.all([xs(),Cs(i.id)]);if(!o||c.error)return console.error(`My schedule failed:`,s??c.error),t(`Your schedule could not be loaded. Refresh and try again.`);e.innerHTML=`
    <section class="my-schedule">
      <h2>My schedule</h2>
      <p class="directory-description">
        Your assigned games. Times are shown in your computer's time zone.
      </p>
      <div id="my-schedule-view"></div>
    </section>
  `,Ec(e.querySelector(`#my-schedule-view`),{umpireName:i.display_name||`Me`,items:_c(i.id,c.games,c.assignments,uc(o)),emptyText:`You have not been assigned any games yet. They will appear here as soon as the scheduler assigns you.`})}function Bc(e,t,n){e.querySelector(`.topbar`)?.remove(),e.insertAdjacentHTML(`afterbegin`,`
      <header class="topbar">
        <span class="topbar-user">
          ${t?`Signed in as ${J(t)}`:`Signed in`}
        </span>
        <button id="topbar-signout" class="secondary-button"
          type="button">Sign out</button>
      </header>
    `),e.querySelector(`#topbar-signout`)?.addEventListener(`click`,n)}var Vc=null;function Hc(e,t){let{pages:n}=t;e.innerHTML=`
    <nav class="app-nav" aria-label="Main menu" ${n.length<2?`hidden`:``}>
      <ul>
        ${n.map(e=>`
          <li>
            <button type="button" class="app-nav-button"
              data-page="${J(e.id)}">
              ${J(e.label)}
            </button>
          </li>
        `).join(``)}
      </ul>
    </nav>
    <div id="page-content"></div>
  `,Bc(e,t.name,t.onSignOut);let r=e=>{window.location.hash=`#/${e}`};e.querySelector(`.app-nav`)?.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`[data-page]`);n?.dataset.page&&r(n.dataset.page)});let i=()=>{let e=document.querySelector(`#page-content`);if(!e)return;let t=/^#\/([a-z0-9-]+)$/.exec(window.location.hash)?.[1],i=n.find(e=>e.id===t)??n[0];i&&(document.querySelectorAll(`.app-nav-button`).forEach(e=>{e.dataset.page===i.id?e.setAttribute(`aria-current`,`page`):e.removeAttribute(`aria-current`)}),e.innerHTML=``,i.render(e,r),window.scrollTo(0,0))};Vc&&window.removeEventListener(`hashchange`,Vc),Vc=i,window.addEventListener(`hashchange`,Vc),i()}var Uc=document.querySelector(`#app`);if(!Uc)throw Error(`Application container was not found.`);var Q=`login`,Wc=!1,Gc=new URLSearchParams(`${window.location.hash.replace(/^#/,``)}&${window.location.search.replace(/^\?/,``)}`),Kc=Gc.get(`type`)===`recovery`,qc=Gc.has(`error_description`),Jc=null;function Yc(){let e=document.querySelector(`#outbox-details`),t=document.querySelector(`#outbox-container`);e&&t&&(e.addEventListener(`toggle`,()=>{e.open&&_s(t)}),Jc&&document.removeEventListener(`outbox:changed`,Jc),Jc=()=>{e.isConnected&&e.open&&_s(t)},document.addEventListener(`outbox:changed`,Jc))}function Xc(e){Bc(Uc,e,()=>void _l())}function $(e,t=`error`){let n=document.querySelector(`#message`);n&&(n.textContent=e,n.className=`message ${t}`)}function Zc(){Uc.innerHTML=`
    <main class="page">
      <section class="auth-card">
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
  `,document.querySelector(`#login-tab`)?.addEventListener(`click`,()=>{Q=`login`,Zc()}),document.querySelector(`#signup-tab`)?.addEventListener(`click`,()=>{Q=`signup`,Zc()}),document.querySelector(`#auth-form`)?.addEventListener(`submit`,e=>{e.preventDefault(),Qc()}),document.querySelector(`#forgot-password-button`)?.addEventListener(`click`,()=>{pl()}),document.querySelectorAll(`input[name="signupKind"]`).forEach(e=>{e.addEventListener(`change`,()=>{let e=document.querySelector(`input[name="signupKind"][value="youth_umpire"]`)?.checked??!1,t=document.querySelector(`#age-confirm`);t&&(t.hidden=!e)})})}async function Qc(){if(Wc)return;let e=document.querySelector(`#auth-form`),t=document.querySelector(`#submit-button`);if(!e||!t)return;let n=new FormData(e),r=String(n.get(`email`)??``).trim(),i=String(n.get(`password`)??``);Wc=!0,t.disabled=!0,t.textContent=Q===`signup`?`Creating account…`:`Signing in…`,$(``);try{if(Q===`signup`){let e=String(n.get(`displayName`)??``).trim(),t=String(n.get(`confirmPassword`)??``);if(!e){$(`Please enter your full name.`);return}if(i.length<8){$(`Your password must be at least 8 characters.`);return}if(i!==t){$(`The passwords do not match.`);return}let a=String(n.get(`signupKind`)??``);if(a!==`adult_umpire`&&a!==`youth_umpire`){$(`Please choose whether you are an adult or a youth umpire.`);return}if(a===`youth_umpire`&&!n.get(`ageConfirm`)){$(`Umpires under 13 cannot register themselves. Please ask a parent or your league administrator to set up your account.`);return}let{data:o,error:s}=await H.auth.signUp({email:r,password:i,options:{data:{display_name:e,signup_kind:a},emailRedirectTo:`${window.location.origin}/`}});if(s)throw s;o.session?await $c(o.session):(Zc(),$(`Registration submitted. Check your email for a confirmation link. After confirming, sign in to check your account approval status.`,`success`))}else{let{data:e,error:t}=await H.auth.signInWithPassword({email:r,password:i});if(t)throw t;await $c(e.session)}}catch(e){$(e instanceof Error?e.message:`Something went wrong. Please try again.`)}finally{Wc=!1;let e=document.querySelector(`#submit-button`);e&&(e.disabled=!1,e.textContent=Q===`signup`?`Create account`:`Sign in`)}}async function $c(e,t=!1){let{data:n,error:r}=await H.from(`profiles`).select(`display_name, account_status`).eq(`id`,e.user.id).single();if(Kc)return;if(r||!n){Uc.innerHTML=`
      <main class="page">
        <section class="auth-card">
          <h1>Account status unavailable</h1>
          <p>We couldn't load your profile. Please try again later.</p>
          <button id="signout-button" class="secondary-button">
            Sign out
          </button>
        </section>
      </main>
    `,document.querySelector(`#signout-button`)?.addEventListener(`click`,()=>void _l()),Xc(``);return}if(n.account_status===`pending`&&!t){let{data:t}=await H.rpc(`claim_registration`);if(Kc)return;if(t===`invited`){await $c(e,!0);return}}let{data:i,error:a}=await H.from(`user_roles`).select(`role_id`).eq(`user_id`,e.user.id);if(Kc)return;if(a){el(n),$(`Unable to check account permissions. Please try again.`);return}let o=(i??[]).map(e=>e.role_id);if(n.account_status===`approved`){let e=cl({isSuperAdmin:o.includes(`super_admin`),isUmpireChief:o.includes(`umpire_chief`),isScheduler:o.includes(`scheduler`),isUmpire:o.includes(`youth_umpire`)||o.includes(`adult_umpire`)},n);if(e.length>0){Hc(Uc,{name:n.display_name,pages:e,onSignOut:()=>void _l()});return}}el(n)}function el(e){let t={pending:{title:`Awaiting approval`,text:`Your account has been created, but an administrator must approve it before you can access protected umpire features.`},approved:{title:`Account approved`,text:`Your account is approved. The scheduling dashboard will be added in a later step.`},rejected:{title:`Account not approved`,text:`Your account has not been approved. Please contact your league administrator if you believe this is a mistake.`},suspended:{title:`Account suspended`,text:`Access to the umpire system is currently suspended. Please contact your league administrator.`}},n=t[e.account_status]??t.pending;if(Uc.innerHTML=`
    <main class="page">
      <section class="auth-card">
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
  `,document.querySelector(`#account-heading`).textContent=n.title,document.querySelector(`#account-message`).textContent=n.text,document.querySelector(`#account-status`).textContent=`Signed in as ${e.display_name||`user`} · ${e.account_status}`,e.account_status===`approved`){let e=document.querySelector(`#my-details-container`);e&&us(e)}document.querySelector(`#signout-button`)?.addEventListener(`click`,()=>{_l()}),Xc(e.display_name)}function tl(e){e.innerHTML=`
    <main class="page">
      <section class="auth-card admin-card">
        <p class="eyebrow">RWCLL · ADMINISTRATION</p>
        <h1>Account Management</h1>
        <p class="intro">Review new account requests.</p>

        <details class="role-legend">
          <summary>My details (phone and text messages)</summary>
          <div id="my-details-admin"></div>
        </details>

        <details class="role-legend" id="outbox-details">
          <summary>Outbox (messages waiting to be sent)</summary>
          <div id="outbox-container"></div>
        </details>

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

        <hr class="directory-divider" />

        <div id="role-manager-container"></div>

        <hr class="directory-divider" />

        <div id="league-setup-container"></div>

        <div id="umpire-directory-container"></div>
      </section>
    </main>
  `,document.querySelector(`#refresh-accounts`)?.addEventListener(`click`,()=>void ul()),document.querySelector(`#pending-accounts`)?.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof HTMLButtonElement))return;let n=t.dataset.userId,r=t.dataset.status;!n||r!==`approved`&&r!==`rejected`||dl(n,r)}),ul();let t=document.querySelector(`#umpire-directory-container`);t&&Ha(t);let n=document.querySelector(`#league-setup-container`);n&&ns(n);let r=document.querySelector(`#role-manager-container`);r&&cs(r);let i=document.querySelector(`#my-details-admin`);i&&us(i,{heading:!1});let a=document.querySelector(`#registrations-container`);a&&ps(a),Yc()}function nl(e){e.innerHTML=`
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
  `;let t=document.querySelector(`#umpire-directory-container`);t&&Ha(t);let n=document.querySelector(`#registrations-container`);n&&ps(n);let r=document.querySelector(`#my-details-admin`);r&&us(r,{heading:!1}),Yc()}function rl(e){e.innerHTML=`
    <main class="page">
      <section class="auth-card admin-card">
        <div id="games-container"></div>
      </section>
    </main>
  `;let t=e.querySelector(`#games-container`);t&&Lc(t)}function il(e){e.innerHTML=`
    <main class="page">
      <section class="auth-card admin-card">
        <details class="role-legend" id="outbox-details">
          <summary>Outbox (messages waiting to be sent)</summary>
          <div id="outbox-container"></div>
        </details>

        <div id="umpire-directory-container"></div>
      </section>
    </main>
  `;let t=e.querySelector(`#umpire-directory-container`);t&&Ha(t),Yc()}function al(e){e.innerHTML=`
    <main class="page">
      <section class="auth-card admin-card">
        <div id="league-setup-container"></div>
      </section>
    </main>
  `;let t=e.querySelector(`#league-setup-container`);t&&ns(t)}function ol(e){e.innerHTML=`
    <main class="page">
      <section class="auth-card admin-card">
        <div id="my-details-page"></div>
      </section>
    </main>
  `;let t=e.querySelector(`#my-details-page`);t&&us(t)}function sl(e,t,n){e.innerHTML=`
    <main class="page">
      <section class="auth-card admin-card">
        <p class="eyebrow">RWCLL · UMPIRE</p>
        <h1>Welcome${t?`, ${ll(t)}`:``}</h1>
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
  `;let r=e.querySelector(`#my-schedule-container`);r&&zc(r),n&&e.querySelector(`#home-open-details`)?.addEventListener(`click`,n)}function cl(e,t){let n=[];e.isSuperAdmin?n.push({id:`admin`,label:`Administration`,render:e=>tl(e)}):(e.isUmpireChief&&n.push({id:`chief`,label:`Umpire Management`,render:e=>nl(e)}),e.isScheduler&&!e.isUmpireChief&&n.push({id:`umpires`,label:`Umpires`,render:il})),(e.isSuperAdmin||e.isUmpireChief||e.isScheduler)&&n.push({id:`games`,label:`Games`,render:e=>rl(e)}),!e.isSuperAdmin&&e.isScheduler&&n.push({id:`setup`,label:`League Setup`,render:al});let r=!e.isSuperAdmin&&!e.isUmpireChief;return e.isUmpire&&n.push({id:`home`,label:n.length===0?`Home`:`As an umpire`,render:(e,n)=>sl(e,t.display_name,r?()=>n(`details`):null)}),r&&n.length>0&&n.push({id:`details`,label:`My details`,render:ol}),n}function ll(e){return e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e])}async function ul(){let e=document.querySelector(`#pending-accounts`);if(!e)return;e.replaceChildren();let t=document.createElement(`p`);t.textContent=`Loading pending accounts…`,e.append(t);let{data:n,error:r}=await H.from(`profiles`).select(`id, display_name, email`).eq(`account_status`,`pending`).is(`registration_kind`,null).order(`display_name`);if(e.replaceChildren(),r){let t=document.createElement(`p`);t.textContent=`Unable to load pending accounts.`,e.append(t),fl(r.message);return}let i=n??[];if(i.length===0){let t=document.createElement(`p`);t.textContent=`There are no pending accounts.`,e.append(t)}else for(let t of i){let n=document.createElement(`div`);n.className=`pending-account`;let r=document.createElement(`h3`);r.textContent=t.display_name||`Name not provided`;let i=document.createElement(`p`);i.textContent=t.email||`Email unavailable`;let a=document.createElement(`div`);a.className=`account-actions`;for(let e of[{label:`Approve`,status:`approved`},{label:`Reject`,status:`rejected`}]){let n=document.createElement(`button`);n.type=`button`,n.textContent=e.label,n.className=e.status===`approved`?`primary-button`:`secondary-button`,n.dataset.userId=t.id,n.dataset.status=e.status,a.append(n)}n.append(r,i,a),e.append(n)}}async function dl(e,t){let n=t===`approved`?`Approve this account?`:`Reject this account?`;if(!window.confirm(n))return;let r=document.querySelectorAll(`[data-user-id="${CSS.escape(e)}"]`);r.forEach(e=>{e.disabled=!0});let{error:i}=await H.rpc(`set_account_status`,{target_user_id:e,new_status:t});i?(fl(`Could not update account: ${i.message}`),r.forEach(e=>{e.disabled=!1})):(fl(t===`approved`?`Account approved.`:`Account rejected.`,`success`),await ul())}function fl(e,t=`error`){let n=document.querySelector(`#admin-message`);n&&(n.textContent=e,n.className=`message ${t}`)}function pl(){Uc.innerHTML=`
    <main class="page">
      <section class="auth-card">
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
  `,document.querySelector(`#forgot-back`)?.addEventListener(`click`,()=>{Q=`login`,Zc()}),document.querySelector(`#forgot-form`)?.addEventListener(`submit`,e=>{e.preventDefault(),ml()})}async function ml(){if(Wc)return;let e=document.querySelector(`#forgot-form`),t=document.querySelector(`#forgot-submit`);if(!e||!t)return;let n=String(new FormData(e).get(`email`)??``).trim().toLowerCase();Wc=!0,t.disabled=!0,t.textContent=`Sending…`,$(``);try{let{error:e}=await H.auth.resetPasswordForEmail(n,{redirectTo:`${window.location.origin}/`});if(e)throw e;$(`If an account exists for that email, a reset link is on its way. Check your inbox and spam folder. The link works for a limited time.`,`success`)}catch(e){$(e instanceof Error?e.message:`Could not send the reset link. Please try again.`)}finally{Wc=!1;let e=document.querySelector(`#forgot-submit`);e&&(e.disabled=!1,e.textContent=`Send reset link`)}}function hl(){Uc.innerHTML=`
    <main class="page">
      <section class="auth-card">
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
  `,document.querySelector(`#new-password-cancel`)?.addEventListener(`click`,()=>{_l()}),document.querySelector(`#new-password-form`)?.addEventListener(`submit`,e=>{e.preventDefault(),gl()}),Xc(``)}async function gl(){if(Wc)return;let e=document.querySelector(`#new-password-form`),t=document.querySelector(`#new-password-submit`);if(!e||!t)return;let n=new FormData(e),r=String(n.get(`password`)??``),i=String(n.get(`confirmPassword`)??``);if(r.length<8)$(`Your password must be at least 8 characters.`);else if(r!==i)$(`The passwords do not match.`);else{Wc=!0,t.disabled=!0,t.textContent=`Saving…`,$(``);try{let{error:e}=await H.auth.updateUser({password:r});if(e)throw e;await H.auth.signOut({scope:`others`}),Kc=!1,window.history.replaceState(null,``,window.location.pathname);let{data:t}=await H.auth.getSession();t.session?await $c(t.session):(Q=`login`,Zc(),$(`Your password was changed. Please sign in.`,`success`))}catch(e){let t=e instanceof Error?e.message:``;$(/session missing|not authenticated/i.test(t)?`This reset link has expired or was already used. Please request a new one.`:t||`Could not change the password. Please try again.`)}finally{Wc=!1;let e=document.querySelector(`#new-password-submit`);e&&(e.disabled=!1,e.textContent=`Save new password`)}}}async function _l(){let{error:e}=await H.auth.signOut();e?$(e.message):(Kc=!1,Q=`login`,window.history.replaceState(null,``,window.location.pathname),Rc(),Zc())}async function vl(){if(Kc){hl();return}if(Zc(),qc){window.history.replaceState(null,``,window.location.pathname),$(`That email link is invalid or has expired. If you were resetting your password, please request a new link.`);return}let{data:e,error:t}=await H.auth.getSession();t?$(`Unable to check your current session. Please sign in again.`):e.session&&await $c(e.session)}H.auth.onAuthStateChange(e=>{e===`PASSWORD_RECOVERY`&&(Kc=!0,document.querySelector(`#new-password-form`)||hl())}),vl();