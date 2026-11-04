(() => {
  const folder = document.querySelector('#planningFolder');
  const toggle = document.querySelector('#folderToggle');
  const putBack = document.querySelector('#returnSheet');
  const page = document.querySelector('#projectsLayer');
  const states = [...folder.querySelectorAll('.folder-sheet')].map(sheet => ({sheet,detached:false,drag:null,suppressClick:false,x:0,y:0}));
  let pinned = false;
  const rotation = 5 * Math.PI / 180;
  const hasDetached = () => states.some(s => s.detached);
  function peek(next) {
    folder.classList.toggle('is-peeking',next);
    toggle.setAttribute('aria-expanded',String(next));
    toggle.setAttribute('aria-label',next ? '收起策划文件夹' : '展开策划文件夹');
  }
  function reset() {
    pinned=false;
    states.forEach(s=>{
      s.drag=null; s.detached=false; s.suppressClick=false; s.x=s.y=0;
      s.sheet.classList.remove('is-detached','is-dragging','is-top');
      s.sheet.style.removeProperty('--sheet-x'); s.sheet.style.removeProperty('--sheet-y');
    });
    folder.classList.remove('is-detached','is-dragging'); putBack.hidden=true; peek(false);
  }
  // Require a real hover movement: refreshing with the pointer already here stays closed.
  folder.addEventListener('pointermove',e=>{
    if(e.pointerType==='mouse' && (e.movementX || e.movementY) && !page.inert)peek(true);
  });
  folder.addEventListener('pointerleave',()=>{if(!pinned&&!hasDetached())peek(false);});
  folder.addEventListener('focusout',e=>{if(!folder.contains(e.relatedTarget)&&!pinned&&!hasDetached())peek(false);});
  toggle.addEventListener('click',()=>{pinned=!pinned;peek(pinned||hasDetached());});
  putBack.addEventListener('click',()=>{reset();toggle.focus({preventScroll:true});});
  states.forEach(s=>{
    const sheet=s.sheet;
    sheet.addEventListener('pointerdown',e=>{
      if(e.button!==0||page.inert)return;
      s.suppressClick=false;
      s.drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,rect:sheet.getBoundingClientRect(),moved:false,x:s.x,y:s.y};
      sheet.setPointerCapture(e.pointerId);
    });
    sheet.addEventListener('pointermove',e=>{
      const drag=s.drag;
      if(!drag||drag.id!==e.pointerId)return;
      let dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
      if(!drag.moved&&Math.hypot(dx,dy)<7)return;
      if(!drag.moved){
        const matrix=new DOMMatrix(getComputedStyle(sheet).transform);
        drag.x=matrix.m41;drag.y=matrix.m42;
        drag.moved=s.detached=pinned=true;
        states.forEach(other=>other.sheet.classList.remove('is-top'));
        sheet.classList.add('is-detached','is-dragging','is-top');
        folder.classList.add('is-detached','is-dragging');putBack.hidden=false;
      }
      const bounds=page.getBoundingClientRect(),margin=6;
      dx=Math.max(bounds.left+margin-drag.rect.left,Math.min(dx,bounds.right-margin-drag.rect.right));
      dy=Math.max(bounds.top+margin-drag.rect.top,Math.min(dy,bounds.bottom-margin-drag.rect.bottom));
      s.x=drag.x+dx*Math.cos(rotation)+dy*Math.sin(rotation);
      s.y=drag.y-dx*Math.sin(rotation)+dy*Math.cos(rotation);
      sheet.style.setProperty('--sheet-x',`${s.x}px`);sheet.style.setProperty('--sheet-y',`${s.y}px`);
    });
    function finish(e,cancelled=false){
      if(!s.drag||s.drag.id!==e.pointerId)return;
      const moved=s.drag.moved;
      s.drag=null;s.suppressClick=moved||cancelled;
      sheet.classList.remove('is-dragging');folder.classList.remove('is-dragging');
      if(sheet.hasPointerCapture(e.pointerId))sheet.releasePointerCapture(e.pointerId);
      if(moved)document.querySelector('#status').textContent='作品纸张已取出。点击查看对应项目，或选择放回文件夹。';
    }
    sheet.addEventListener('pointerup',e=>finish(e));
    sheet.addEventListener('pointercancel',e=>finish(e,true));
    sheet.addEventListener('lostpointercapture',e=>{if(s.drag)finish(e,true);});
    // Capture before the project opener, so releasing a drag never opens a dialog.
    sheet.addEventListener('click',e=>{
      if(s.suppressClick&&e.detail!==0){e.preventDefault();e.stopImmediatePropagation();s.suppressClick=false;}
    },true);
  });
  new MutationObserver(()=>{if(page.inert)reset();}).observe(page,{attributes:true,attributeFilter:['inert']});
  window.addEventListener('resize',()=>{if(hasDetached())reset();});
  window.addEventListener('pageshow',reset);
  window.addEventListener('pagehide',reset);
  reset();
})();
