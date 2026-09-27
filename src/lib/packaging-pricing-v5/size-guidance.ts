export type SizeGuidanceInput = {
  fillGrams?: number | string | null;
  application?: string | null;
  limit?: number;
};

function words(value:unknown){
  return String(value??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter((item)=>item.length>=2);
}

function appExamples(value:unknown){
  if(Array.isArray(value)) return value.map(String).map((item)=>item.trim()).filter(Boolean);
  return String(value??'').split(/[,;|/]+/).map((item)=>item.trim()).filter(Boolean);
}

export function rankPackagingSizeGuidance(sizes:any[],input:SizeGuidanceInput){
  const grams=Number(input.fillGrams??0);
  const hasGrams=Number.isFinite(grams)&&grams>0;
  const app=String(input.application??'').trim();
  const appTokens=words(app);
  const hasApplication=appTokens.length>0;
  if(!hasGrams&&!hasApplication) return [];

  return (sizes??[]).map((item:any)=>{
    const configuredGrams=Array.isArray(item?.recommended_fill_grams)
      ? item.recommended_fill_grams.map(Number).filter((value:number)=>Number.isFinite(value)&&value>0)
      : [];
    const examples=appExamples(item?.application_examples);
    let gramDistance=Number.POSITIVE_INFINITY;
    let matchedGram:number|null=null;
    if(hasGrams&&configuredGrams.length){
      const closest=configuredGrams.reduce((best:number,current:number)=>Math.abs(current-grams)<Math.abs(best-grams)?current:best,configuredGrams[0]);
      matchedGram=closest;
      gramDistance=Math.abs(closest-grams)/Math.max(grams,closest,1);
    }
    const exampleText=words(examples.join(' '));
    const matchedTokens=hasApplication?appTokens.filter((token)=>exampleText.some((word)=>word.includes(token)||token.includes(word))):[];
    const appScore=hasApplication&&appTokens.length?matchedTokens.length/appTokens.length:0;
    const hasConfiguredSignal=(hasGrams&&Number.isFinite(gramDistance))||(hasApplication&&appScore>0);
    if(!hasConfiguredSignal) return null;
    const score=(hasGrams&&Number.isFinite(gramDistance)?Math.max(0,1-gramDistance):0)+(hasApplication?appScore*1.25:0);
    return {item,score,matchedGram,applicationExamples:examples,applicationMatch:appScore>0};
  }).filter(Boolean)
    .sort((a:any,b:any)=>b.score-a.score||Number(a.item?.width_mm??0)-Number(b.item?.width_mm??0))
    .slice(0,Math.max(1,Math.min(6,Number(input.limit??3))));
}
