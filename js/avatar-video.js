// Gee-Gee en vidéo : clips filmés du vrai costume, devant un mur blanc, en format vertical.
// Pour l'activer, déposer les clips dans assets/video/ puis remplir CLIPS ci-dessous (voir le README).
// Seul « idle » est obligatoire ; un clip manquant est remplacé par « idle » (ou « talk » pendant qu'il parle).
export const CLIPS = null;
// Exemple :
// export const CLIPS = {
//   idle: 'assets/video/idle.mp4',     // au repos, respire, bouge un peu (boucle)
//   talk: 'assets/video/talk.mp4',     // fait des gestes comme s'il parlait (boucle pendant la voix)
//   wave: 'assets/video/wave.mp4',     // salue (une fois)
//   point: 'assets/video/point.mp4',   // montre l'écran à sa droite (une fois, quand une réponse arrive)
//   shrug: 'assets/video/shrug.mp4',   // hausse les épaules (pas de réponse)
//   thumbs: 'assets/video/thumbs.mp4'  // pouce en l'air (merci)
// };

// Réaction de l'application → clip joué une fois
const REACT = { hello: 'wave', answer: 'point', none: 'shrug', thanks: 'thumbs' };

export class VideoGeeGee {
  constructor(clips) {
    this.clips = clips;
    this.talking = false;
    this.oneShot = null;
    this.el = document.createElement('div');
    this.el.className = 'geegee video';
    this.videos = [this.make(), this.make()];
    this.front = null;
    this.show('idle', true);
  }
  make() {
    const v = document.createElement('video');
    Object.assign(v, { muted: true, playsInline: true, preload: 'auto' });
    v.setAttribute('aria-hidden', 'true');
    this.el.append(v);
    return v;
  }
  // Fondu enchaîné entre deux lecteurs : pas d'écran blanc entre les clips.
  show(name, loop) {
    const src = this.clips[name] || (this.talking && this.clips.talk) || this.clips.idle;
    if (loop && this.front && this.front.dataset.src === src && !this.front.paused) return;
    const next = this.videos.find((v) => v !== this.front);
    next.dataset.src = src; next.src = src; next.loop = loop;
    next.onended = loop ? null : () => { this.oneShot = null; this.show(this.talking ? 'talk' : 'idle', true); };
    next.onplaying = () => {
      next.onplaying = null;
      next.classList.add('on');
      if (this.front && this.front !== next) { const old = this.front; old.classList.remove('on'); setTimeout(() => old.pause(), 300); }
      this.front = next;
    };
    next.play().catch(() => { /* lecture bloquée : réessayée à la prochaine interaction */ });
  }

  // Même interface que le Gee-Gee 3D (js/mascot.js), utilisée par js/app.js
  mount(parent) { if (this.el.parentNode !== parent) parent.appendChild(this.el); parent.classList.add('is-video'); }
  startTalking() { this.talking = true; if (!this.oneShot) this.show('talk', true); }
  sayWord() { if (!this.talking) this.startTalking(); }
  sayText() { if (!this.talking) this.startTalking(); }
  stopTalking() { this.talking = false; if (!this.oneShot) this.show('idle', true); }
  react(kind) {
    const name = REACT[kind];
    if (!name || !this.clips[name]) return;
    this.oneShot = name; this.show(name, false);
  }
  play(name) { if (this.clips[name]) { this.oneShot = name; this.show(name, false); } }
  frame() {} resize() {} setView() {} lookToward() {}
}
