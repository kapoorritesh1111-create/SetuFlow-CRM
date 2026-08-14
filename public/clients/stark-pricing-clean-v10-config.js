window.APP_STATE={
 active:'overview', family:'sup', masterTab:'cogs', template:'sup', answers:{}, approval:'',
 families:[
  {id:'sup',name:'Stand Up Pouches',mode:'Approved sizes',pricing:'Formula recipe',desc:'15 approved pouch sizes with family-specific manufacturing recipe.'},
  {id:'flat',name:'Flat Bottom Pouches',mode:'Approved / custom',pricing:'Formula recipe',desc:'Same master library, separate geometry and recipe.'},
  {id:'center',name:'Center Seal Pouches',mode:'Dynamic dimensions',pricing:'Client matrix + geometry',desc:'Dimensions determine pouches/frame; client Q1–Q5 matrix supplies current commercial rate.'},
  {id:'three',name:'3 Side Seal Pouches',mode:'Dynamic dimensions',pricing:'Roll + Pouch matrix',desc:'Roll Form and Pouch Form use separate client tables and geometry.'},
  {id:'labels',name:'Labels',mode:'Dynamic / SKU',pricing:'Separate template',desc:'Future label-specific recipe; does not inherit pouch math.'},
  {id:'shrink',name:'Shrink Sleeves',mode:'Dynamic',pricing:'Separate template',desc:'Future sleeve-specific recipe; layflat, gauge and seam rules.'}
 ],
 products:{sup:[["p1","28gm SUP",80,130,25],["p2","50gm SUP",98,150,30],["p3","70gm SUP",110,170,30],["p4","100gm SUP",120,210,40],["p5","150gm SUP",130,210,40],["p6","200gm SUP",140,210,40],["p7","200gm/250gm SUP",150,220,50],["p8","250gm SUP",160,230,50],["p9","350gm SUP",170,250,50],["p10","500gm SUP",185,270,50],["p11","750gm/800gm SUP",210,300,55],["p12","750gm/1kg SUP",220,300,55],["p13","1KG SUP",245,320,55],["p14","1.5KG SUP",260,340,60],["p15","2KG SUP",280,360,60]],flat:[],center:[],three:[],labels:[],shrink:[]},
 masters:{
  cogs:[
   {id:'bopp18',name:'18 Matt BOPP',kind:'Material',micron:18,density:.93,unit:'₹/kg',rate:190,families:['sup','flat','center','three']},
   {id:'pet12',name:'12 PET',kind:'Material',micron:12,density:1.4,unit:'₹/kg',rate:null,families:['sup','flat','center','three','labels','shrink']},
   {id:'metpet12',name:'12 MetPET',kind:'Material',micron:12,density:1.4,unit:'₹/kg',rate:165,families:['sup','flat','center','three']},
   {id:'clearpet12',name:'12 Clear PET',kind:'Material',micron:12,density:1.4,unit:'₹/kg',rate:null,families:['sup','flat','center','three']},
   {id:'alfoil9',name:'9 Al Foil',kind:'Material',micron:9,density:null,unit:'₹/kg',rate:null,families:['center','three']},
   {id:'holopet12',name:'12 HoloPET',kind:'Material',micron:12,density:null,unit:'₹/kg',rate:null,families:['center','three']},
   {id:'pe35',name:'PE 35µ',kind:'Material',micron:35,density:.925,unit:'₹/kg',rate:185,families:['center','three']},
   {id:'pe40',name:'PE 40µ',kind:'Material',micron:40,density:.925,unit:'₹/kg',rate:185,families:['center','three']},
   {id:'pe60',name:'PE 60µ',kind:'Material',micron:60,density:.925,unit:'₹/kg',rate:185,families:['sup','flat','center','three']},
   {id:'pe70',name:'PE 70µ',kind:'Material',micron:70,density:.925,unit:'₹/kg',rate:185,families:['center','three']},
   {id:'pe75',name:'PE 75µ',kind:'Material',micron:75,density:.925,unit:'₹/kg',rate:185,families:['sup','flat','center','three']},
   {id:'pe95',name:'PE 95µ',kind:'Material',micron:95,density:.925,unit:'₹/kg',rate:185,families:['sup','flat','center','three']},
   {id:'pe120',name:'PE 120µ',kind:'Material',micron:120,density:.925,unit:'₹/kg',rate:185,families:['sup','flat','center','three']},
   {id:'adh',name:'Adhesive',kind:'Material/Process',gsm:1.5,density:null,unit:'₹/kg',rate:350,families:['sup','flat','center','three']},
   {id:'printCMYKW',name:'CMYKW Print',kind:'Process',unit:'₹/frame',rate:46,families:['sup','flat']},
   {id:'printCMYK',name:'CMYK Print',kind:'Process',unit:'₹/frame',rate:38,families:['sup','flat']},
   {id:'lam',name:'Lamination',kind:'Process',unit:'₹/running m',rate:5,families:['sup','flat','center','three']},
   {id:'slit',name:'Slitting',kind:'Process',unit:'₹/running m',rate:2,families:['sup','flat','center','three']},
   {id:'pouch',name:'Pouching',kind:'Process',unit:'₹/running m',rate:8,families:['sup','flat','center','three']}
  ],
  extras:[
   {id:'zipper',name:'Zipper',basis:'per_m',rate:1.3,treatment:'production',families:['sup','flat']},
   {id:'tear',name:'Tear Notch',basis:'per_unit',rate:null,treatment:'included',families:['sup','flat','three']},
   {id:'euro',name:'Euro / Hang Hole',basis:'per_unit',rate:null,treatment:'included',families:['sup','flat','three','labels','shrink']},
   {id:'round',name:'Rounded Corners',basis:'per_unit',rate:null,treatment:'included',families:['sup','flat','three']},
   {id:'valve',name:'Valve',basis:'per_unit',rate:null,treatment:'included',families:['sup','flat']},
   {id:'spotuv',name:'Spot UV',basis:'per_job',rate:null,treatment:'separate',families:['labels','shrink','sup','flat']}
  ],
  pre:[{id:'design',name:'Design / Artwork',basis:'per_job',rate:0,families:['sup','flat','center','three','labels','shrink']},{id:'amend',name:'Artwork Amendments',basis:'per_job',rate:0,families:['sup','flat','center','three','labels','shrink']},{id:'ctp',name:'CTP / Pre-press',basis:'per_job',rate:0,families:['sup','flat','center','three','labels','shrink']}],
  post:[{id:'packing',name:'Packing',basis:'per_job',rate:0,families:['sup','flat','center','three','labels','shrink']},{id:'dispatch',name:'Dispatch / Handling',basis:'per_job',rate:0,families:['sup','flat','center','three','labels','shrink']},{id:'freight',name:'Freight',basis:'per_kg',rate:0,families:['sup','flat','center','three','labels','shrink']}]
 },
 templates:{
  sup:{machineW:740,machineL:1120,trim:20,outerWeb:760,bands:[{max:500,waste:20,margin:35},{max:1000,waste:10,margin:25},{max:2000,waste:8,margin:20},{max:3000,waste:7,margin:17},{max:5000,waste:6,margin:15},{max:10000,waste:5,margin:13}],finishes:{
   matte_foil:{label:'Matte + Foil',layers:['bopp18','metpet12'],peRule:{p1:'pe60',p2:'pe60',p3:'pe60',p4:'pe75',p5:'pe75',p6:'pe75',p7:'pe75',p8:'pe75',p9:'pe95',p10:'pe95',p11:'pe95',p12:'pe95',p13:'pe95',p14:'pe95',p15:'pe120'}},
   gloss_foil:{label:'Glossy + Foil',layers:['pet12','metpet12'],peRule:{p1:'pe60',p2:'pe60',p3:'pe60',p4:'pe75',p5:'pe75',p6:'pe75',p7:'pe75',p8:'pe75',p9:'pe95',p10:'pe95',p11:'pe95',p12:'pe95',p13:'pe95',p14:'pe95',p15:'pe120'}},
   gloss_clear:{label:'Gloss Clear Window',layers:['pet12'],peRule:{p1:'pe60',p2:'pe60',p3:'pe60',p4:'pe75',p5:'pe75',p6:'pe75',p7:'pe75',p8:'pe75',p9:'pe95',p10:'pe95',p11:'pe95',p12:'pe95',p13:'pe95',p14:'pe95',p15:'pe120'}},
   matte_frost:{label:'Matte Frosted Window',layers:['bopp18','clearpet12'],peRule:{p1:'pe60',p2:'pe60',p3:'pe60',p4:'pe75',p5:'pe75',p6:'pe75',p7:'pe75',p8:'pe75',p9:'pe95',p10:'pe95',p11:'pe95',p12:'pe95',p13:'pe95',p14:'pe95',p15:'pe120'}}
  }}, center:{machineW:740,machineL:1120,mode:'matrix'},three_roll:{machineW:740,machineL:1120,mode:'matrix'},three_pouch:{machineW:740,machineL:1120,sealAllowance:12,mode:'matrix'}
 },
 rateData:RATE_DATA,
 questions:[
  {key:'families',title:'Service families',prompt:'Are these the correct packaging families and names for Stark Packmate?',choices:['Approve as shown','Rename / add family']},
  {key:'sharedcogs',title:'Shared COGS Master',prompt:'Should material/process COGS be organization-wide and reusable across all applicable service families, with an Applies To control?',choices:['Yes — shared master','Need family-specific duplicates']},
  {key:'matrixunit',title:'Center Seal / 3SS Q1–Q5 meaning',prompt:'We currently treat the supplied Q1–Q5 values as ₹/frame commercial rates because the tier labels are frame counts. Please confirm the unit and whether these are final selling rates.',choices:['₹/frame final selling rate','Different unit / needs correction','Base rate needs more commercial logic']},
  {key:'tiergap',title:'Between Q1–Q5 tiers',prompt:'What should SETU Flow do when requested frame quantity falls between 250 / 500 / 1,000 / 2,000 / 3,000?',choices:['Use next tier','Use previous tier','Admin approval / custom']},
  {key:'rollunit',title:'Roll-form quote unit',prompt:'Should Center Seal / 3SS Roll Form quote primarily in ₹/kg, ₹/piece-equivalent, or show both?',choices:['₹/kg primary','₹/piece primary','Show both']},
  {key:'artworks',title:'Multiple artworks / SKUs',prompt:'If one order quantity is split across multiple artworks, should MOQ/run-length pricing be calculated per artwork or on the combined run?',choices:['Per artwork','Combined run','Depends / approval']},
  {key:'orientation',title:'Production orientation',prompt:'Should SETU Flow auto-select the best valid production orientation, use a locked family rule, or require Admin confirmation?',choices:['Auto best valid layout','Locked rule','Admin approval']},
  {key:'extras',title:'Extras charging basis',prompt:'Confirm whether zipper/tear notch/euro hole/etc. are per unit, frame, running metre or job, and whether they enter before wastage/margin or after commercial pricing.',choices:['Use shown basis','Needs correction']},
  {key:'prepost',title:'Pre/Post charges',prompt:'Should Design, CTP, Packing, Dispatch and Freight remain separate quote lines by default?',choices:['Separate by default','Include selected charges in unit price','Family-specific']},
  {key:'freight',title:'Freight estimate',prompt:'Should SETU Flow estimate freight from calculated packaging weight × transport ₹/kg, while still allowing manual freight?',choices:['Both estimate + manual','Manual only','Estimate only']},
  {key:'custom',title:'Custom SUP sizes',prompt:'Should Sales quote only approved SUP sizes, or can a calculated custom size be created with Admin approval?',choices:['Approved sizes only','Custom with Admin approval','Sales can quote custom']},
  {key:'override',title:'Sales price override',prompt:'Can Sales change the calculated selling price, and if yes what approval limit should apply?',choices:['Locked calculated price','Controlled override + approval','Free override']},
  {key:'version',title:'Quote price + KLD versioning',prompt:'When should the calculated rate and KLD version become frozen so later Master changes do not alter an issued quote?',choices:['Freeze on quote generation','Freeze on approval','Freeze on order confirmation']}
 ]
};
const SUP_URL='https://sjzfzloggabsmcuxktnl.supabase.co';const SUP_KEY='sb_publishable_adZoMRzfoPre1R24sTCcqg_1NfpMMEk';const ORG='b97913cb-3b95-4247-8ced-ffdc0d392d2a';const FORM='stark_sup_pricing_v1';
const $=id=>document.getElementById(id);const money=v=>Number.isFinite(Number(v))?'₹'+Number(v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}):'Rate needed';const num=v=>v===''||v==null?null:Number(v);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));