import {env} from 'cloudflare:workers';
import {authConfig,getSessionUser} from './auth';
import {z} from 'zod';
import {translate} from './messages';
import {requestedLocale} from './locale-server';
export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
export function db(){if(!env.DB)throw new HttpError(503,'数据库暂时不可用，请稍后重试。');return env.DB;}
export function bucket(){if(!env.BUCKET)throw new HttpError(503,'证据存储暂时不可用，请稍后重试。');return env.BUCKET;}
export async function writer(req:Request){const origin=req.headers.get('origin');if(!origin||origin!==new URL(req.url).origin)throw new HttpError(403,'请从本站页面提交。');const config=authConfig();if(config&&origin!==config.origin)throw new HttpError(403,'请从本站页面提交。');const u=await getSessionUser(req.headers);if(!u)throw new HttpError(401,'请先登录后再提交。');return u;}
export async function json(req:Request,max=3000000){if(Number(req.headers.get('content-length')||0)>max)throw new HttpError(413,'提交内容过大。');const reader=req.body?.getReader();if(!reader)throw new HttpError(400,'提交内容不能为空。');let total=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>max){await reader.cancel();throw new HttpError(413,'提交内容过大。');}chunks.push(value);}const bytes=new Uint8Array(total);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new HttpError(400,'提交格式无效。');}}
export async function failure(e:unknown){const locale=await requestedLocale();if(e instanceof HttpError)return Response.json({error:translate(e.message,locale)},{status:e.status});if(e instanceof z.ZodError)return Response.json({error:translate('请检查必填内容、日期和链接格式。',locale)},{status:400});console.error('Request failed',e instanceof Error?e.message:'unknown');return Response.json({error:translate('保存或读取暂时失败，请稍后重试，输入不会被清空。',locale)},{status:503});}
export const webUrl=z.string().max(2000).url().refine(s=>/^https?:\/\//.test(s));
export const date=z.string().refine(s=>s===''||(/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s));
export async function quota(table:'games'|'comparisons'|'reviews'|'review_history'|'responses',field:'created_by'|'author_id'|'user_id',uid:string,limit:number){const timestamp=table==='reviews'?'updated_at':'created_at';const row=await db().prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${field} = ? AND ${timestamp} >= ?`).bind(uid,new Date(Date.now()-86400000).toISOString()).first<{n:number}>();if((row?.n||0)>=limit)throw new HttpError(429,'过去 24 小时的提交次数已达到上限，请稍后再试。');}
export function publicName(_fullName:string|null,userId:string){return 'Member '+userId.replace(/[^a-z0-9]/gi,'').slice(-6);}
