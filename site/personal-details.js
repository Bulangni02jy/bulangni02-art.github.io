(() => {
  const trigger=document.querySelector('#openAbilities');
  const modal=document.querySelector('#abilitiesDialog');
  trigger.addEventListener('click',()=>{modal.showModal();modal.scrollTop=0;});
  modal.querySelectorAll('[data-close-abilities]').forEach(button=>button.addEventListener('click',()=>modal.close()));
  modal.addEventListener('close',()=>trigger.focus({preventScroll:true}));
  modal.addEventListener('click',event=>{
    if(event.target!==modal)return;
    const r=modal.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)modal.close();
  });
})();
