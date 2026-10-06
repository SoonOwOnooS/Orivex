import {localize as t} from './messages';
export async function readResponse<T>(response:Response):Promise<T>{let value:unknown;try{value=await response.json();}catch{throw Error(t("服务器暂时没有返回有效数据，请稍后重试。"));}if(!response.ok){const error=value&&typeof value==='object'&&'error' in value?String(value.error):t("请求失败，请稍后重试。");throw Error(t(error));}return value as T;}
