import { redirect } from 'next/navigation';
export default function LegacyOwnerSalesActivityRoute({searchParams={}}:{searchParams?:Record<string,string|undefined>}) {
  const query = new URLSearchParams();
  for(const [key,value] of Object.entries(searchParams)) if(value && key!=='mode')query.set(key,value);
  redirect('/dashboard'+(query.size?'?'+query.toString():''));
}
