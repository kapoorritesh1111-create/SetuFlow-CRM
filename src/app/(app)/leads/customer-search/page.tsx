import { redirect } from 'next/navigation';
// Kept only as a compatibility redirect. Customer lookup is now embedded in Inbound and CRM Leads.
export default function LegacyCustomerSearch({searchParams={}}:{searchParams?:{q?:string;view?:string}}){
 const query=new URLSearchParams();
 if(searchParams.q)query.set('q',searchParams.q);
 redirect('/leads'+(query.size?'?'+query.toString():''));
}
