(() => {
  const desk = document.querySelector('#desk');
  const scene = desk.querySelector('.scene');
  const nav = document.querySelector('#mobilePageNav');
  const profile = document.querySelector('#profileLayer');
  const projects = document.querySelector('#projectsLayer');
  const profileButton = document.querySelector('#mobileProfile');
  const worksButton = document.querySelector('#mobileWorks');
  const compact = matchMedia('(max-width: 900px) and (orientation: portrait)');
  let selected = 'profile';
  let gesture = null;

  function update() {
    const isOpen = desk.classList.contains('is-open');
    const ready = desk.classList.contains('is-settled');
    if (!isOpen && !desk.classList.contains('is-turning')) selected = 'profile';
    const works = compact.matches && selected === 'works';
    desk.classList.toggle('mobile-works', works);
    nav.hidden = !compact.matches || !ready;
    profile.inert = !ready || works;
    projects.inert = !ready || (compact.matches && !works);
    profileButton.setAttribute('aria-pressed', String(selected === 'profile'));
    worksButton.setAttribute('aria-pressed', String(selected === 'works'));
    // A page hidden after rotation must not keep keyboard focus.
    const active = document.activeElement;
    if ((profile.inert && profile.contains(active)) || (projects.inert && projects.contains(active)) || (nav.hidden && nav.contains(active))) {
      const target = ready ? (works ? worksButton : document.querySelector('#badgeHit')) : document.querySelector('#cover');
      target.focus({ preventScroll: true });
    }
  }

  function select(page) {
    if (!compact.matches || !desk.classList.contains('is-settled')) return;
    selected = page;
    update();
    document.querySelector('#status').textContent = page === 'works'
      ? '第 2 页，作品收藏。上方为策划文件夹，下方为设计作品集。'
      : '第 1 页，个人档案。轻点工作证查看简历，便签查看个人能力。';
  }

  profileButton.addEventListener('click', () => select('profile'));
  worksButton.addEventListener('click', () => select('works'));
  nav.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const works = event.key === 'ArrowRight';
    select(works ? 'works' : 'profile');
    (works ? worksButton : profileButton).focus();
  });
  scene.addEventListener('pointerdown', event => {
    gesture = null;
    if (!compact.matches || !desk.classList.contains('is-settled') || event.button !== 0) return;
    if (event.target.closest('button, a, input, dialog, [role="button"]')) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  scene.addEventListener('pointerup', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    gesture = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) select(dx < 0 ? 'works' : 'profile');
  });
  scene.addEventListener('pointercancel', () => { gesture = null; });
  compact.addEventListener('change', () => { gesture = null; update(); });
  desk.addEventListener('notebookchange', update);
  update();
})();
