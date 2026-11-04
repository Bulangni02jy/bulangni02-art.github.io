const desk = document.querySelector('#desk');
const book = document.querySelector('#book');
const cover = document.querySelector('#cover');
const closeBook = document.querySelector('#closeBook');
const hit = document.querySelector('#badgeHit');
const rig = document.querySelector('#badgeRig');
const layer = document.querySelector('#profileLayer');
const projectLayer = document.querySelector('#projectsLayer');
const dialog = document.querySelector('#resumeDialog');
const status = document.querySelector('#status');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const ropePaths = ['ropeBase', 'ropeWeave', 'ropeEdge'].map(id => document.getElementById(id));
let open = false;
let turning = false;
let bookProgress = 0;
let bookMotion = null;

// Closed loop: one upper pin, two continuous strap legs, one lower clasp.
const anchor = { x: 180, y: 72 };
const length = 200;
const restAngle = -.11;
const restTilt = -4;
let angle = restAngle, speed = 0, tilt = 0, tiltSpeed = 0;
let drag = null;
let previousTime = 0;

function renderBadge() {
  const x = anchor.x + Math.sin(angle) * length;
  const y = anchor.y + Math.cos(angle) * length;
  const theta = (angle - restAngle) * 180 / Math.PI + restTilt + tilt;
  const radians = theta * Math.PI / 180;
  // The ring belongs to the same transformed body as the badge.
  const cardX = x - Math.sin(radians) * 48;
  const cardY = y + Math.cos(radians) * 48;
  rig.setAttribute('transform', `translate(${cardX} ${cardY}) rotate(${theta})`);
  // A closed ribbon passes behind the pin at top and through the ring below.
  const dx = x - anchor.x, dy = y - anchor.y;
  const distance = Math.hypot(dx,dy);
  const nx = -dy / distance, ny = dx / distance;
  const bx = anchor.x + dx * .52, by = anchor.y + dy * .52;
  const path = `M${anchor.x-10},${anchor.y+1} C${bx+nx*24},${by+ny*24} ${x-12},${y-22} ${x},${y-6} C${x+12},${y-22} ${bx-nx*24},${by-ny*24} ${anchor.x+10},${anchor.y+1} Q${anchor.x},${anchor.y-13} ${anchor.x-10},${anchor.y+1}Z`;
  ropePaths.forEach(pathElement => pathElement.setAttribute('d', path));
  // SVG coordinates map to the page's 500 × 700 interaction plane.
  hit.style.left = `${(cardX - 112) / 5}%`;
  hit.style.top = `${cardY / 7}%`;
  hit.style.transform = `rotate(${theta}deg)`;
}

function frame(time) {
  const dt = Math.min((time - previousTime) / 1000 || 1/60, .033);
  previousTime = time;
  if (bookMotion) {
    const t = Math.min(1, (time-bookMotion.start)/bookMotion.duration);
    // One continuous clock for hinge, translation and shadow, in both directions.
    const eased = t*t*t*(t*(t*6-15)+10);
    bookProgress = bookMotion.from + (bookMotion.to-bookMotion.from)*eased;
    book.style.setProperty('--progress', bookProgress);
    book.style.setProperty('--turn', `${-180*bookProgress}deg`);
    book.style.setProperty('--shade', Math.sin(Math.PI*bookProgress)*.43);
    if (t === 1) finishBook();
  }
  if (open && !turning && !drag && !document.querySelector('dialog[open]')) {
    if (reducedMotion.matches) { angle = restAngle; speed = 0; tilt = 0; tiltSpeed = 0; }
    else {
      // Damped pendulum, fixed rope length: no elastic stretching or detachments.
      speed += (-13.5 * Math.sin(angle-restAngle) - 2.6 * speed) * dt;
      angle += speed * dt;
      if (angle < -.22) { angle = -.22; speed = Math.abs(speed)*.2; }
      if (angle > .32) { angle = .32; speed = -Math.abs(speed)*.2; }
      tiltSpeed += (-30 * tilt - 6.4 * tiltSpeed) * dt;
      tilt += tiltSpeed * dt;
      if (Math.abs(angle-restAngle) < .00001 && Math.abs(speed) < .0001) { angle = restAngle; speed = 0; }
    }
  }
  renderBadge();
  requestAnimationFrame(frame);
}

function setBook(next) {
  if (next === open) return;
  turning = true;
  open = next;
  desk.classList.add('is-turning');
  desk.classList.remove('is-settled');
  desk.classList.toggle('is-open', next);
  layer.inert = true;
  projectLayer.inert = true;
  closeBook.hidden = false;
  cover.disabled = true;
  cover.tabIndex = -1;
  drag = null;
  speed = tiltSpeed = 0;
  bookMotion = { start: performance.now(), from: bookProgress, to: next ? 1 : 0, duration: reducedMotion.matches ? 1 : 1250*Math.max(.25,Math.abs((next ? 1 : 0)-bookProgress)) };
  desk.dispatchEvent(new Event('notebookchange'));
}

function finishBook() {
  bookMotion = null;
  turning = false;
  desk.classList.remove('is-turning');
  desk.classList.toggle('is-settled', open);
  layer.inert = !open;
  projectLayer.inert = !open;
  closeBook.hidden = !open;
  cover.disabled = open;
  cover.tabIndex = open ? -1 : 0;
  if (open) {
    status.textContent = '笔记本已打开。左页为个人档案；右页上方为策划作品，下方为设计作品集。';
    hit.focus({ preventScroll: true });
  } else {
    angle = restAngle;
    speed = tilt = tiltSpeed = 0;
    status.textContent = '笔记本已合上。';
    cover.focus({ preventScroll: true });
  }
  desk.dispatchEvent(new Event('notebookchange'));
}

function point(event) {
  const box = layer.getBoundingClientRect();
  return { x: (event.clientX - box.left) / box.width * 500, y: (event.clientY - box.top) / box.height * 700 };
}

hit.addEventListener('pointerdown', event => {
  if (!open || turning || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const p = point(event);
  drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, lastTime: event.timeStamp, lastAngle: angle, moved: false, offsetX: p.x - (anchor.x + Math.sin(angle) * length), offsetY: p.y - (anchor.y + Math.cos(angle) * length) };
  speed = 0;
  hit.setPointerCapture(event.pointerId);
});
hit.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  const movement = Math.hypot(event.clientX-drag.startX, event.clientY-drag.startY);
  if (movement < 7 && !drag.moved) return;
  drag.moved = true;
  const p = point(event);
  const target = Math.atan2(p.x - drag.offsetX - anchor.x, Math.max(70, p.y - drag.offsetY - anchor.y));
  // Keep the card on its page and front-facing. Both legs remain attached.
  angle = Math.max(-.22, Math.min(.32, target));
  const dt = Math.max((event.timeStamp - drag.lastTime) / 1000, .012);
  speed = Math.max(-2, Math.min(2, (angle - drag.lastAngle) / dt));
  tilt = Math.max(-3, Math.min(3, speed * 1.5));
  drag.lastAngle = angle;
  drag.lastTime = event.timeStamp;
  renderBadge();
});

function release(event, cancelled = false) {
  if (!drag || drag.id !== event.pointerId) return;
  const moved = drag.moved;
  drag = null;
  if (hit.hasPointerCapture(event.pointerId)) hit.releasePointerCapture(event.pointerId);
  if (cancelled) speed = 0;
  if (!moved && !cancelled) openResume();
}
hit.addEventListener('pointerup', event => release(event));
hit.addEventListener('pointercancel', event => release(event, true));
hit.addEventListener('lostpointercapture', () => { if (drag) { drag = null; speed = 0; } });
// Keyboard-generated click; pointer activation is handled above after drag threshold.
hit.addEventListener('click', event => { if (event.detail === 0) openResume(); });

function openResume() { if (open && !turning && !dialog.open) dialog.showModal(); }
function closeResume() { dialog.close(); hit.focus({ preventScroll: true }); }
document.querySelector('#closeResume').addEventListener('click', closeResume);
document.querySelector('#returnBook').addEventListener('click', closeResume);
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeResume();
});
dialog.addEventListener('close', () => hit.focus({ preventScroll: true }));
cover.addEventListener('click', () => setBook(true));
closeBook.addEventListener('click', () => setBook(false));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && open && !document.querySelector('dialog[open]') && !turning) setBook(false);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { drag = null; speed = 0; }
});
window.addEventListener('blur', () => { drag = null; speed = 0; });
renderBadge();
requestAnimationFrame(frame);
