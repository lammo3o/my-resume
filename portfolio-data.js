export const STORAGE_KEY='lam.sticker-portfolio.v1';
export const DEFAULT_STICKERS=[
  {id:'school',kind:'school',label:'校园经历',title:'把好奇心，变成行动',organization:'示例学校 · 校园活动策划',period:'2020 — 2024 · 示例内容',description:'这里是可替换的校园经历。\n\n从一次校园活动开始，练习把想法写成方案、协调伙伴，再把现场照顾好。可以在这里介绍你的学校、专业、社团经历或具体项目。\n\n替换成真实经历时，建议写清楚：你负责什么、采取了什么行动，以及最终结果。',image:'',position:[.067,.718,.082],normal:[.42,.05,.906],size:.038,rotation:-12},
  {id:'escape',kind:'escape',label:'密室工作',title:'让每一次入场，都有故事',organization:'示例密室逃脱门店 · 体验运营',period:'2024 — 至今 · 示例内容',description:'这里是可替换的工作履历。\n\n负责玩家接待、场次安排与体验流程，在剧情节奏、现场沟通和细节反馈之间，让一次游戏成为值得记住的体验。\n\n可以加入你参与的主题、门店照片、团队合影或项目成绩。这些文字仅用于演示，不代表你的真实工作经历。',image:'',position:[-.066,.716,.084],normal:[-.40,.04,.916],size:.038,rotation:10}
];
const EXAMPLE_RESUME={school:{highlights:'参与校园活动的策划与执行，整理流程、分工和现场安排。\n协调成员协作，收集参与者反馈并复盘改进。',skills:'活动策划,团队协作,沟通表达'},escape:{highlights:'组织玩家接待与场次安排，跟进完整体验流程。\n协调现场节奏与突发情况，将玩家反馈转化为服务改进。',skills:'体验运营,现场协调,客户沟通'}};
for(const s of DEFAULT_STICKERS)Object.assign(s,EXAMPLE_RESUME[s.kind]);
export function normalizeStickers(input) {
  if(!Array.isArray(input)||input.length>30||input.length<1) throw Error('请导入包含 1–30 张贴纸的配置。');
  const ids=new Set();
  return input.map((s,i)=>{
    if(!s||typeof s!=='object')throw Error('贴纸格式不正确。');
    const vector=(v,name)=>{if(!Array.isArray(v)||v.length!==3||v.some(n=>typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>10))throw Error(`${name}坐标不正确。`);return [...v];};
    const id=String(s.id||`sticker-${i}`).slice(0,80);if(ids.has(id))throw Error('贴纸编号重复。');ids.add(id);
    const normal=vector(s.normal,'方向'); const length=Math.hypot(...normal);if(length<.001)throw Error('贴纸方向不能为零。');
    const image=String(s.image||'');if(image&&!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(image))throw Error('图片必须是通过编辑器上传的 PNG、JPEG 或 WebP。');
    if(image.length>4000000)throw Error('单张图片过大，请换一张较小的图片。');
    const size=Number(s.size),rotation=Number(s.rotation);if(!Number.isFinite(size)||!Number.isFinite(rotation))throw Error('贴纸尺寸或角度无效。');
    const out={id,kind:s.kind==='escape'?'escape':'school',image,position:vector(s.position,'位置'),normal:Math.abs(length-1)<1e-12?normal:normal.map(n=>n/length),size:Math.max(.015,Math.min(.18,size)),rotation:Math.max(-180,Math.min(180,rotation))};
    for(const key of ['label','title','organization','period','description'])out[key]=String(s[key]||'').slice(0,key==='description'?10000:180);
    const sample=out.organization.startsWith('示例')?EXAMPLE_RESUME[out.kind]:{};
    out.highlights=String(s.highlights??sample.highlights??'').slice(0,5000);
    out.skills=String(s.skills??sample.skills??'').slice(0,1000);
    return out;
  });
}
export function readPortfolio(storage=localStorage) {
  const saved=storage.getItem(STORAGE_KEY);
  return saved ? normalizeStickers(JSON.parse(saved).stickers) : structuredClone(DEFAULT_STICKERS);
}
export function savePortfolio(stickers,storage=localStorage) {
  const clean=normalizeStickers(stickers);
  storage.setItem(STORAGE_KEY,JSON.stringify({version:1,stickers:clean}));
  return clean;
}
export function isClick(start,end){return Math.hypot(end.x-start.x,end.y-start.y)<6;}
