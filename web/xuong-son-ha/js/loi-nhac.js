// Lời nhắc Muse sinh theo dữ liệu (dùng ở Danh mục và Quy trình). Câu khoá cuối mỗi lời nhắc đã kiểm chứng: nền phải
// phẳng một màu thì công cụ mới tách sạch (nv-video.py: nền xanh #00FF00 · fx-video.py: nền đen #000000).
(function () {
  const NEN_XANH = 'The background must stay a perfectly flat, uniform pure green (#00FF00) chroma-key screen for the whole video: no shadows, no glow, no light, no particles on the green.';
  const NEN_DEN = 'Bright glowing colors only, everything else PURE BLACK (#000000): no environment, no person, no ground, no smoke, no fog. Smooth, elegant, animated-film quality.';
  const VU = { son: 'a Dong Son bronze longbow', thuy: 'a silver spear with wave patterns' };
  const HUONG = { son: 'to the right', thuy: 'to the left' };
  const MAU = { son: 'golden mountain-stone and jade-green', thuy: 'aqua and silver water' };

  /** Video động tác nhân vật theo hệ công pháp (một bộ áo cần 3 video: cong, thu, hoi — dùng chung cho mọi môn cùng hệ). */
  function dongTac(dong, phe) {
    const dau = 'Create a video from this exact image: the same character in the same costume (keep face, hair, costume, colors and painting style EXACTLY). Static camera, the character stays in place and keeps the same size, feet planted. ';
    const viec = {
      cong:
        phe === 'son'
          ? `One clear attack: the archer draws ${VU.son} fully, holds for a beat, then RELEASES the arrow ${HUONG.son}, the bowstring snaps forward, sleeves and robe whip with the recoil, then returns to the ready stance. The release happens about one third into the video.`
          : `One clear attack: the warrior pulls ${VU.thuy} back, then THRUSTS / hurls it forward ${HUONG.thuy} in one powerful motion, sleeves and sash whip, then returns to the ready stance. The thrust happens about one third into the video.`,
      thu: `Defensive move: the character braces, raises the ${phe === 'son' ? 'bow' : 'spear'} crosswise in front, a translucent ${MAU[phe]} shield shimmers up in front of the body, sleeves and robe pushed back by an impact wave, then the shield fades and the character returns to the ready stance.`,
      hoi: `Healing qi circulation: the character closes the eyes, brings both hands together in front of the chest, soft ${phe === 'son' ? 'green-gold' : 'aqua'} light gathers in the palms and spirals up around the body, hair and sleeves lift gently, then the light sinks into the body and the character opens the eyes, ready stance.`,
    }[dong];
    return `${dau}${viec} ${NEN_XANH}`;
  }

  /** Video thiền một bộ áo. */
  function thien(gioi) {
    return `Create a video from this exact image: the same immortal ${gioi === 'nu' ? 'maiden' : 'young man'} sitting in lotus meditation on a glowing lotus cloud, keep the face, hair, costume, colors and painting style EXACTLY the same, keep the character in the same place and size. Static camera, gentle looping motion like an animated film: slow breathing (chest and shoulders rise and fall softly), eyes stay closed, long hair and the sheer sleeves and ribbons float and ripple slowly, the aura behind flows and swirls slowly, tassels sway a little, the lotus petals glow and pulse softly. The character does NOT move the hands, does not stand up, does not turn. ${NEN_XANH} Vertical format, as long as possible, seamless loop.`;
  }

  /** Video hiệu ứng dùng chung (fx/<id>.webm). */
  const FX_EN = {
    'bien-trang-son': 'a magical MOUNTAIN COSTUME-TRANSFORMATION effect: glowing golden bamboo leaves and small jade gems appear at the bottom, spiral upward and wrap around an invisible standing figure shape (tall column in the center, about half the frame width), thicken into a bright swirling cocoon of golden light, flash brilliant white at the peak, then burst outward into soft glittering golden leaves and sparks that drift down and fade to black. Colors: gold, warm white, jade green.',
    'bien-trang-thuy': 'a magical WATER COSTUME-TRANSFORMATION effect: a few glowing aqua and silver silk-water ribbons appear at the bottom, spiral upward and wrap around an invisible standing figure shape (tall column in the center, about half the frame width), thicken into a bright swirling cocoon of glowing water and pearl sparkles, flash brilliant white at the peak, then burst outward into soft glittering droplets and tiny pearl stars that drift down and fade to black. Colors: aqua, white, silver, pale blue.',
    'binh-khi-son': 'a WEAPON SUMMONING effect: a narrow pillar of golden light descends from the top to the center, a glowing ring with a Dong Son bronze-drum sun-star pattern spins open horizontally around it, golden sparks spiral in, then a bright flash in the center and the light fades, leaving a few floating sparks. Colors: gold, warm white, bronze.',
    'binh-khi-thuy': 'a WEAPON SUMMONING effect: a vertical whirlpool of silver water rises in the center, concentric glowing ripple rings spread horizontally at its base, droplets spiral inward, then a bright flash in the center and the water falls away into sparkles. Colors: silver, aqua, white.',
    'dan-khi': 'a QI ABSORPTION effect: soft cyan-green spiritual energy swirls up in a spiral from the bottom to the top of an invisible standing figure shape (center column, half the frame width), small light motes rise with it, then it gathers at the top and fades. Colors: cyan, jade green, white.',
    'dan-pha': 'a BREAKTHROUGH effect: a brilliant golden pillar of light bursts upward from the bottom center to the top of the frame, a horizontal shockwave ring of golden light expands at the base, rays shimmer, then the pillar fades. Colors: gold, white.',
    'dan-bao': 'a RAGE POWER-UP effect: red-orange flames rise around an invisible standing figure shape (center column, half the frame width), embers fly upward, the flames flare once brightly then settle and fade. Colors: red, orange, yellow.',
    'dan-kim': 'a DIAMOND SHIELD effect: a translucent spherical shield of blue and gold light appears around the center (half the frame width), glowing hexagonal ripples run across its surface twice, then it fades. Colors: light blue, gold, white.',
    'dan-hon': 'a SOUL FIRE effect: three violet ghost-flame wisps circle slowly around an invisible standing figure shape in the center, leaving soft trails, then fly into the chest area and vanish with a soft flash. Colors: violet, lavender, white.',
    'dan-kiep': 'a PROTECTIVE HALO effect: a golden halo ring with fine radiating rays opens above an invisible figure in the upper center, thin golden light beams shower down, then it gently fades. Colors: gold, warm white.',
  };
  function fx(id) {
    return `Create a vertical video (portrait 2:3), visual effect only, centered in the middle of the frame: ${FX_EN[id] ?? id} ${NEN_DEN} About 3–4 seconds of action, starting and ending on pure black.`;
  }

  window.LOI_NHAC = { dongTac, thien, fx, NEN_XANH, NEN_DEN };
})();
