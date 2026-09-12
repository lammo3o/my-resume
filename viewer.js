import {createResumeDialog} from './resume-dialog.js?v=20260912show';
import {stickerSVG,svgURL} from './stickers.js?v=20260912show';
export function setupEditor({getStickers,onExperienceClosed}){
 const resume=createResumeDialog({dialog:document.getElementById('experience'),onClosed:onExperienceClosed});
 return {show(id,origin){const s=getStickers().find(s=>s.id===id);if(s)resume.show(s,s.image||svgURL(stickerSVG(s.kind,true)),origin);}};
}