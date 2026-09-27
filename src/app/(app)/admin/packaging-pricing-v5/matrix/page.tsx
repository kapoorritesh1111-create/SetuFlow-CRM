import { redirect } from 'next/navigation';

export const dynamic='force-dynamic';

export default async function PackagingPricingV5MatrixPage({searchParams}:{searchParams?:Promise<{view?:string}>}){
  const params=await searchParams;
  const view=params?.view==='competitor'?'competitor':'matrix';
  redirect('/admin/packaging-pricing-v5?view='+view);
}
