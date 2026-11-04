(() => {
  const safe = text => String(text).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let data;
  let lastCard;
  const isDesk = Boolean(document.querySelector('#book'));
  const view = document.body.dataset.view;
  let modal;

  const note = (p,dialog=false) => `${dialog?'<button class="dialog-close" aria-label="收起项目介绍">×</button>':''}<p class="brief-category">${safe(p.category)}</p><h1 class="brief-title" id="briefTitle">${safe(p.title)}</h1><p class="brief-name">${safe(p.name)}</p><p class="brief-intro">${safe(p.intro)}</p>${p.contribution?`<p class="brief-contribution"><span>我的分工</span>${safe(p.contribution)}</p>`:''}${p.eventNote?`<p class="brief-event">${safe(p.eventNote)}</p>`:''}<ul class="brief-points">${p.points.map(point=>`<li><h2>${safe(point.title)}</h2><p>${safe(point.text)}</p></li>`).join('')}</ul><div class="brief-files"><a class="pdf-primary" href="${p.pdf}" target="_blank" rel="noopener">阅读完整 PDF ↗︎</a><a href="${p.pdf}" download="${safe(p.downloadName)}">下载原文件 ↓</a><small>${p.pages} PAGES</small></div>`;

  function showProject(key,card) {
    if(!data?.[key]) return;
    lastCard=card;
    modal.innerHTML=note(data[key],true);
    modal.querySelector('.dialog-close').addEventListener('click',()=>modal.close());
    modal.showModal();
    modal.scrollTop=0;
  }

  function render() {
    if(isDesk) {
      modal=document.createElement('dialog');
      modal.className='project-dialog';
      modal.id='projectDialog';
      modal.setAttribute('aria-labelledby','briefTitle');
      document.body.append(modal);
      modal.addEventListener('close',()=>lastCard?.focus({preventScroll:true}));
      modal.addEventListener('click',event=>{if(event.target===modal){const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)modal.close();}});
      document.querySelectorAll('[data-project]').forEach(card=>card.addEventListener('click',()=>showProject(card.dataset.project,card)));

      return;
    }
    const content=document.querySelector('#content');
    if(view==='detail') {
      const p=data[new URLSearchParams(location.search).get('project')];
      if(!p){content.textContent='没有找到这个项目。';return;}
      document.title=`${p.name} · 作品笔记本`;
      content.innerHTML=note(p);
    } else {
      content.classList.add('brief-directory');
      content.innerHTML=`<h1>策划作品</h1>${Object.entries(data).map(([key,p])=>`<a href="project.html?project=${key}"><span>${safe(p.category)}</span><strong>${safe(p.title)} ↗︎</strong><p>${safe(p.intro)}</p></a>`).join('')}`;
    }
  }

  fetch('assets/projects/projects-short.json').then(response=>{
    if(!response.ok) throw new Error('Project notes unavailable');
    return response.json();
  }).then(result=>{data=result;render();}).catch(error=>{
    console.error(error);
    if(!isDesk)document.querySelector('#content').textContent='暂时无法读取项目，请稍后刷新。';
    else document.querySelectorAll('[data-project]').forEach(card=>{card.disabled=true;card.title='暂时无法读取项目，请稍后刷新';});
  });
})();





