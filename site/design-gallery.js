(() => {
  const trigger=document.querySelector('[data-design]');
  const modal=document.createElement('dialog');
  modal.className='design-dialog'; modal.setAttribute('aria-labelledby','designTitle'); document.body.append(modal);
  const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let works=[],category='落地类',selected=null,index=0,lastId=null,drag=null,busy=false,listingScroll=0,suppressClick=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function shell(content) {
    modal.innerHTML='<button class="dialog-close" aria-label="返回笔记本">返回笔记本 ↙</button>'+content;
    modal.querySelector('.dialog-close').onclick=()=>modal.close(); modal.scrollTop=0;
  }
  const categories=['落地类','线上类','推文排版类'];
  function home(focusCategory){
    selected=null;listingScroll=0;
    modal.classList.remove('is-viewing','is-zoomed','is-category');
    shell('<p class="design-eyebrow">HU JIAYU / SELECTED DESIGN</p><h1 id="designTitle">设计作品册</h1><p class="design-subtitle">选一组，慢慢翻看。</p><div class="module-groups">'+categories.map((c,i)=>{
      const samples=works.filter(w=>w.category===c).slice(0,3);
      const papers=(samples.length?samples:[null,null,null]).map((w,j)=>{
        const art=w?'<img class="'+(w.layout==='article'?'article-cover':'')+'" src="'+safe(w.thumbnail||w.cover||w.images[0].src)+'" alt="'+safe(w.coverAlt||w.images[0].alt)+'" draggable="false" decoding="async" loading="lazy">':'<span class="editorial-cover" aria-hidden="true"><span class="editorial-kicker">WORDS & LAYOUT</span><span class="editorial-lines"></span><span class="editorial-paper"></span></span>';
        return '<span class="deck-paper" style="--offset:'+(j-((samples.length||3)-1)/2)+';--paper-angle:'+[-11,0,11][j]+'deg;--paper-y:'+ [13,-5,15][j]+'px;--paper-z:'+ [1,3,2][j]+';--delay:'+(i*130+j*80)+'ms"><span class="deck-image">'+art+'</span></span>';
      }).join('');
      return '<button class="module-group" data-module="'+c+'" aria-label="浏览'+c+'作品"><span class="module-deck">'+papers+'</span><span class="module-label">'+c+' <span aria-hidden="true">↗</span></span>'+(samples.length?'':'<small class="module-pending">作品整理中</small>')+'</button>';
    }).join('')+'</div><p class="design-hint">悬停展开一组纸卡 · 点击进入分类</p>');
    modal.querySelectorAll('[data-module]').forEach(b=>b.onclick=()=>{category=b.dataset.module;listingScroll=0;gallery();modal.querySelector('#designTitle').focus({preventScroll:true});});
    if(focusCategory)[...modal.querySelectorAll('[data-module]')].find(b=>b.dataset.module===focusCategory)?.focus({preventScroll:true});
  }

  function gallery(focusId){
    selected=null;
    modal.classList.remove('is-viewing','is-zoomed');modal.classList.add('is-category');
    const filtered=works.filter(w=>w.category===category);
    let active=Math.max(0,filtered.findIndex(w=>w.id===focusId)),gesture=null,ignoreClick=false;
    shell('<button class="design-back" data-home>← 返回分类</button><p class="design-eyebrow">DESIGN COLLECTION / '+String(categories.indexOf(category)+1).padStart(2,'0')+'</p><h1 id="designTitle" tabindex="-1">'+category+'</h1><p class="design-subtitle">'+(filtered.length?filtered.length+' 组作品 · 左右翻看，点击中间作品查看详情':'作品正在整理中。')+'</p>'+(filtered.length?'<section class="depth-gallery" aria-label="'+category+'作品轮播" aria-roledescription="轮播"><div class="depth-stage">'+filtered.map((w,i)=>'<button class="depth-card" data-slide="'+i+'" aria-label="查看第'+(i+1)+'组作品"><span class="depth-art"><img data-gallery-image class="'+(w.layout==='article'?'article-cover':'')+'" data-src="'+safe(w.thumbnail||w.cover||w.images[0].src)+'" alt="'+safe(w.coverAlt||w.images[0].alt)+'" draggable="false" decoding="async" loading="lazy"></span><span class="depth-caption">'+String(i+1).padStart(2,'0')+' <span>查看 ↗</span></span></button>').join('')+'</div><div class="depth-controls"><button data-depth-prev aria-label="上一组作品">←</button><span class="depth-count" role="status" aria-live="polite"></span><button data-depth-next aria-label="下一组作品">→</button></div><div class="depth-thumbs" aria-label="选择作品">'+filtered.map((w,i)=>'<button data-thumb="'+i+'" aria-label="选择第'+(i+1)+'组作品" aria-pressed="false"><img class="'+(w.layout==='article'?'article-cover':'')+'" src="'+safe(w.thumbnail||w.cover||w.images[0].src)+'" alt="" draggable="false" decoding="async" loading="lazy"><span>'+String(i+1).padStart(2,'0')+'</span></button>').join('')+'</div><p class="design-hint">拖动纸卡或使用左右箭头翻看</p></section>':'<div class="category-empty"><span class="empty-paper" aria-hidden="true"></span><p>推文排版作品整理后，会放在这里。</p></div>'));
    modal.querySelector('[data-home]').onclick=()=>home(category);
    if(!filtered.length)return;
    const stage=modal.querySelector('.depth-stage'),cards=[...modal.querySelectorAll('[data-slide]')],thumbs=[...modal.querySelectorAll('[data-thumb]')];
    function update(next){
      active=(next+filtered.length)%filtered.length;
      cards.forEach((card,i)=>{
        let delta=i-active;
        if(delta>filtered.length/2)delta-=filtered.length;
        if(delta<-filtered.length/2)delta+=filtered.length;
        const side=Math.sign(delta),distance=Math.abs(delta);
        card.style.setProperty('--side',side);card.style.setProperty('--distance',distance);card.style.zIndex=String(10-distance);
        card.classList.toggle('is-active',distance===0);card.classList.toggle('is-hidden',distance>1);
        card.tabIndex=distance===0?0:-1;card.setAttribute('aria-hidden',String(distance>1));
        const image=card.querySelector('[data-src]');if(distance<=1&&image){image.src=image.dataset.src;image.removeAttribute('data-src');}
        card.setAttribute('aria-label',distance===0?'查看第'+(i+1)+'组作品完整设计':'切换到第'+(i+1)+'组作品');
      });
      thumbs.forEach((t,i)=>t.setAttribute('aria-pressed',String(i===active)));
      modal.querySelector('.depth-count').textContent=String(active+1).padStart(2,'0')+' / '+String(filtered.length).padStart(2,'0');
    }
    cards.forEach((card,i)=>card.onclick=()=>{if(ignoreClick){ignoreClick=false;return;}if(i!==active){update(i);return;}lastId=filtered[i].id;selected=filtered[i];index=0;viewer();});
    thumbs.forEach((t,i)=>t.onclick=()=>update(i));
    modal.querySelector('[data-depth-prev]').onclick=()=>update(active-1);
    modal.querySelector('[data-depth-next]').onclick=()=>update(active+1);
    const gallery=modal.querySelector('.depth-gallery');
    gallery.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();update(e.key==='Home'?0:e.key==='End'?filtered.length-1:active+(e.key==='ArrowRight'?1:-1));}};
    stage.onpointerdown=e=>{if(e.button!==0||e.isPrimary===false)return;ignoreClick=false;gesture={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};};
    stage.onpointermove=e=>{if(!gesture||e.pointerId!==gesture.id)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(!gesture.moved&&Math.abs(dx)>9&&Math.abs(dx)>Math.abs(dy)){gesture.moved=true;stage.setPointerCapture(e.pointerId);stage.classList.add('is-dragging');}if(gesture.moved)stage.style.setProperty('--drag-x',Math.max(-75,Math.min(75,dx))+'px');};
    stage.onpointerup=e=>{if(!gesture||gesture.id!==e.pointerId)return;const dx=e.clientX-gesture.x,moved=gesture.moved;gesture=null;stage.classList.remove('is-dragging');stage.style.removeProperty('--drag-x');if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);ignoreClick=moved;if(moved&&Math.abs(dx)>35)update(active+(dx<0?1:-1));};
    const cancel=()=>{gesture=null;stage.classList.remove('is-dragging');stage.style.removeProperty('--drag-x');};
    stage.onpointercancel=cancel;stage.onlostpointercapture=cancel;
    update(active);
    if(focusId)cards[active].focus({preventScroll:true});
  }
  function articleViewer(w){
    modal.classList.remove('is-category','is-zoomed');modal.classList.add('is-viewing');
    shell('<button class="design-back">← 返回作品</button><p class="design-eyebrow">推文排版类 / 公众号推文排版</p><h1 id="designTitle" class="design-sr-only">'+safe(w.title)+'</h1><p class="design-subtitle">开篇预览 · 展开后向下阅读完整排版</p><div class="view-modes"><button data-article-mode="cover" aria-pressed="true">开篇预览</button><button data-article-mode="full" aria-pressed="false">阅读完整排版</button><a class="article-source" href="'+safe(w.link)+'" target="_blank" rel="noopener">阅读原文 ↗</a></div><div class="article-reader"><button class="article-cover-preview" aria-label="展开完整推文排版"><img src="'+safe(w.cover)+'" alt="'+safe(w.coverAlt)+'" draggable="false" decoding="async" loading="lazy"></button><div class="article-pages" hidden>'+w.images.map((img,i)=>'<img data-src="'+safe(img.src)+'" alt="'+safe(img.alt)+'" decoding="async" loading="'+(i?'lazy':'eager')+'">').join('')+'</div></div>');
    const cover=modal.querySelector('.article-cover-preview'),pages=modal.querySelector('.article-pages');
    function unfold(full){
      if(full)pages.querySelectorAll('[data-src]').forEach(img=>{img.src=img.dataset.src;img.removeAttribute('data-src');});
      cover.hidden=full;pages.hidden=!full;
      modal.querySelectorAll('[data-article-mode]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.articleMode==='full')===full)));
      modal.scrollTop=0;
    }
    cover.onclick=()=>unfold(true);
    modal.querySelectorAll('[data-article-mode]').forEach(b=>b.onclick=()=>unfold(b.dataset.articleMode==='full'));
    modal.querySelector('.design-back').onclick=()=>gallery(lastId);
  }
  function viewer() {
    if(selected.layout==='article'){articleViewer(selected);return;}
    modal.classList.remove('is-category');modal.classList.add('is-viewing');
    const w=selected,img=w.images[index],longPreview=w.layout==='long'&&w.cover,stack=w.layout!=='long'&&w.images.length>1;
    modal.classList.remove('is-zoomed');suppressClick=false;
    shell(`<button class="design-back">← 返回作品</button><p class="design-eyebrow">${safe(w.category)} / ${safe(w.description||'')}</p><h1 id="designTitle" class="design-sr-only">作品预览</h1><p class="design-subtitle">${w.layout==='long'?'完整预览 · 放大后可向下阅读细节':'完整预览 · 点击图片查看细节'}</p><div class="view-modes" aria-label="图片显示方式"><button data-mode="fit" aria-pressed="true">完整预览</button><button data-mode="read" aria-pressed="false">放大阅读</button></div><div class="work-view ${stack?'stack-view':'long-view'}"><figure class="art-sheet"><button class="art-zoom" aria-label="放大作品图"><img src="${safe(longPreview?w.cover:img.src)}" alt="${safe(img.alt)}" draggable="false" decoding="async" loading="lazy"></button></figure></div><div class="image-controls">${w.images.length>1?'<button data-prev aria-label="上一张作品图">← 上一张</button>':''}<span role="status" aria-live="polite">${index+1} / ${w.images.length}</span>${w.images.length>1?'<button data-next aria-label="下一张作品图">下一张 →</button>':''}<a href="${safe(img.originalSrc||img.src)}" download>下载原图 ↓</a>${w.link?`<a href="${safe(w.link)}" target="_blank" rel="noopener">阅读原文 ↗</a>`:''}</div>`);
    if(img.label)modal.querySelector('.design-subtitle').textContent=img.label+' · '+(index+1)+' / '+w.images.length+' · 左右翻看';
    const zoom=modal.querySelector('.art-zoom');
    const artwork=zoom.querySelector('img');
    if(longPreview){
      const notice=modal.querySelector('.work-view');
      notice.classList.add('is-notice');
      function sizeFromCover(){if(artwork.getAttribute('src')===w.cover&&artwork.naturalWidth&&artwork.naturalHeight)notice.style.setProperty('--notice-ratio',artwork.naturalWidth/artwork.naturalHeight);}
      artwork.onload=sizeFromCover;
      artwork.src=w.cover;artwork.alt=w.coverAlt||img.alt;
      if(artwork.complete)sizeFromCover();
      modal.querySelector('.design-subtitle').textContent='版头预览 · 阅读完整公告可向下浏览长图';
      modal.querySelector('[data-mode="fit"]').textContent='版头预览';
      modal.querySelector('[data-mode="read"]').textContent='阅读完整公告';
    }
    function setZoom(active){
      modal.classList.toggle('is-zoomed',active);
      if(longPreview){artwork.src=active?img.src:w.cover;artwork.alt=active?img.alt:w.coverAlt||img.alt;modal.scrollTop=0;}
      zoom.setAttribute('aria-label',active?'缩小作品图':'放大作品图');
      modal.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.mode==='read')===active)));
      if(!active)modal.scrollTop=0;
    }
    zoom.onclick=()=>{if(suppressClick){suppressClick=false;return;}setZoom(!modal.classList.contains('is-zoomed'));};
    modal.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setZoom(b.dataset.mode==='read'));
    modal.querySelector('.design-back').onclick=()=>{modal.classList.remove('is-zoomed');gallery(lastId);};
    modal.querySelector('[data-prev]')?.addEventListener('click',()=>advance(-1));
    modal.querySelector('[data-next]')?.addEventListener('click',()=>advance(1));
    const sheet=modal.querySelector('.art-sheet');
    if(stack&&w.images.length>1) {
      sheet.addEventListener('pointerdown',e=>{if(e.button!==0||modal.classList.contains('is-zoomed'))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};sheet.setPointerCapture(e.pointerId);});
      sheet.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x;sheet.style.setProperty('--drag',`${Math.max(-100,Math.min(100,dx))}px`);});
      sheet.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;suppressClick=Math.abs(dx)>8||Math.abs(dy)>8;drag=null;sheet.style.removeProperty('--drag');if(sheet.hasPointerCapture(e.pointerId))sheet.releasePointerCapture(e.pointerId);if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy))advance(dx<0?1:-1);});
      const cancel=()=>{drag=null;sheet.style.removeProperty('--drag');};
      sheet.addEventListener('pointercancel',cancel);sheet.addEventListener('lostpointercapture',cancel);
    }
  }
  function advance(step) {
    if(busy||!selected||selected.images.length<2)return;
    const direction=step>0?'[data-next]':'[data-prev]';
    const previousScroll=modal.scrollTop;
    busy=true; const sheet=modal.querySelector('.art-sheet');
    sheet.animate([{transform:'translateX(0) rotate(0)',opacity:1},{transform:`translateX(${step>0?-45:45}px) rotate(${step>0?-6:6}deg)`,opacity:0}],{duration:reduced.matches?0:180,easing:'ease-in'}).finished.then(()=>{
      if(!modal.open||!selected){busy=false;return;}
      index=(index+step+selected.images.length)%selected.images.length;viewer();modal.scrollTop=previousScroll;modal.querySelector(direction)?.focus({preventScroll:true});busy=false;
    });
  }
  trigger.addEventListener('click',async()=>{
    shell('<h1 id="designTitle">设计作品集</h1><p class="design-subtitle">正在展开作品…</p>'); modal.showModal();
    try{if(!works.length){const r=await fetch('assets/design-works.json?v=images1');if(!r.ok)throw Error();works=await r.json();}if(modal.open)home();}
    catch{shell('<h1 id="designTitle">暂时无法读取作品</h1><p class="design-subtitle">请关闭后重试。</p>');}
  });
  modal.addEventListener('close',()=>{selected=null;drag=null;busy=false;modal.classList.remove('is-zoomed');trigger.focus({preventScroll:true});});
  modal.addEventListener('keydown',e=>{if(selected&&selected.layout==='series'&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();advance(e.key==='ArrowRight'?1:-1);}});
  modal.addEventListener('click',e=>{if(e.target!==modal)return;const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();});
})();


