// Wokamon Evolucionado - Procedural SVG Renderer (Ultra Cute & Expressive Edition)

export function renderWokamonSVG(wokamon) {
  const { status, genetics } = wokamon;
  const {
    bodyType = 'round',
    ears = 'teddy',
    eyes = 'normal',
    horns = 'none',
    wings = 'none',
    primaryColor = '#ffcc00',
    bellyColor = '#ffe57f',
    paintedPattern = null
  } = genetics;

  const isDead = status === 'dead';
  const isStarving = status === 'starving';
  const isDepressed = status === 'depressed';
  const isHappy = status === 'happy';
  
  // Decide opacity, bounce animations, and shiver styles based on status
  let animationClass = 'wk-bounce';
  let bodyOpacity = '1.0';
  
  if (isDead) {
    animationClass = 'wk-ghost';
    bodyOpacity = '0.6';
  } else if (isStarving) {
    animationClass = 'wk-shiver';
  } else if (isDepressed) {
    animationClass = 'wk-depressed';
  }

  // Base SVG markup
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="wokamon-svg ${animationClass}" data-id="${wokamon.id}">
      <defs>
        <!-- Glowing filter for premium neon elements -->
        <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        <!-- Glowing filter for ghost halo -->
        <filter id="halo-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- Body Gradient -->
        <linearGradient id="grad-body-${wokamon.id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${primaryColor}" />
          <stop offset="100%" stop-color="${adjustColorBrightness(primaryColor, -15)}" />
        </linearGradient>

        <!-- Belly Gradient -->
        <linearGradient id="grad-belly-${wokamon.id}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${bellyColor}" />
          <stop offset="100%" stop-color="${adjustColorBrightness(bellyColor, -10)}" />
        </linearGradient>

        <!-- Wings Gradients -->
        <linearGradient id="grad-wings-${wokamon.id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${adjustColorBrightness(primaryColor, 10)}" />
          <stop offset="100%" stop-color="${adjustColorBrightness(primaryColor, -30)}" />
        </linearGradient>
      </defs>

      <!-- 1. GHOST PARTICLES OR STARS -->
      ${renderStateParticles(status)}

      <!-- 2. WINGS (BACKGROUND) -->
      <g class="wk-wings">
        ${renderWings(wings, `url(#grad-wings-${wokamon.id})`, isDead)}
      </g>

      <!-- 3. EARS (BACKGROUND PARTS / BASE) -->
      <g class="wk-ears">
        ${renderEars(ears, primaryColor, isDepressed || isStarving, isDead, 'back')}
      </g>

      <!-- 4. HORNS -->
      <g class="wk-horns">
        ${renderHorns(horns, primaryColor, isDead)}
      </g>

      <!-- 5. GENTLE SHY HEAD SPROUT (HAPPY ONLY) -->
      ${renderSprout(isHappy, isDead)}

      <!-- 6. STUBBY FEET (OVERLAPPED UNDER BODY) -->
      ${!isDead ? renderFeet(primaryColor, bodyType) : ''}

      <!-- 7. MAIN BODY -->
      <g class="wk-body-group" style="opacity: ${bodyOpacity}">
        ${renderBody(bodyType, `url(#grad-body-${wokamon.id})`, isDead)}
        
        <!-- Belly Overlay -->
        ${!isDead ? renderBelly(bodyType, `url(#grad-belly-${wokamon.id})`) : ''}

        <!-- Custom Hand Painted Pattern Overlay -->
        ${paintedPattern ? `<path d="${paintedPattern}" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />` : ''}
      </g>

      <!-- 8. EARS (FOREGROUND PARTS) -->
      <g class="wk-ears-front">
        ${renderEars(ears, primaryColor, isDepressed || isStarving, isDead, 'front')}
      </g>

      <!-- 9. STUBBY LITTLE ARMS -->
      ${!isDead ? renderArms(primaryColor) : ''}

      <!-- 10. FACE (EYES, CHEEKS, MOUTH, STATE EXTRAS) -->
      <g class="wk-face">
        ${renderCheeks(isDead, isStarving)}
        ${renderEyes(eyes, isDead, isDepressed, isStarving)}
        ${renderMouth(status)}
        ${isDepressed ? renderTearDroplets() : ''}
      </g>

      <!-- 11. GHOST HALO -->
      ${isDead ? `
        <ellipse cx="50" cy="15" rx="14" ry="4" fill="none" stroke="#e0f7fa" stroke-width="2.5" filter="url(#halo-glow)" style="animation: wk-halo-float 3s ease-in-out infinite" />
      ` : ''}
    </svg>
  `;
}

// Helper to adjust color brightness in HSL or Hex
function adjustColorBrightness(hex, percent) {
  let num = parseInt(hex.replace("#",""), 16),
  amt = Math.round(2.55 * percent),
  R = (num >> 16) + amt,
  G = (num >> 8 & 0x00FF) + amt,
  B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
}

// 1. PARTICLES BASED ON EMOTIONAL STATE
function renderStateParticles(status) {
  if (status === 'happy') {
    return `
      <!-- Happy floating star particles -->
      <g class="wk-particles">
        <polygon points="15,25 17,28 20,28 18,30 19,33 15,31 11,33 12,30 10,28 13,28" fill="#ffd700" class="wk-star-particle" style="animation: wk-part-float 2.5s infinite; transform-origin: 15px 28px;" />
        <polygon points="85,30 87,33 90,33 88,35 89,38 85,36 81,38 82,35 80,33 83,33" fill="#ffd700" class="wk-star-particle" style="animation: wk-part-float 2s infinite 0.8s; transform-origin: 85px 33px;" />
        <polygon points="25,75 27,78 30,78 28,80 29,83 25,81 21,83 22,80 20,78 23,78" fill="#ffd700" class="wk-star-particle" style="animation: wk-part-float 3s infinite 0.4s; transform-origin: 25px 78px;" />
      </g>
    `;
  }
  if (status === 'dead') {
    return `
      <!-- Ghost sparkle elements -->
      <g class="wk-particles">
        <circle cx="20" cy="35" r="1.5" fill="#e0f7fa" opacity="0.6" style="animation: wk-ghost-sparkle 2.5s infinite" />
        <circle cx="80" cy="40" r="1" fill="#e0f7fa" opacity="0.8" style="animation: wk-ghost-sparkle 1.8s infinite 0.5s" />
        <circle cx="30" cy="15" r="1" fill="#e0f7fa" opacity="0.5" style="animation: wk-ghost-sparkle 3s infinite 1.2s" />
      </g>
    `;
  }
  return '';
}

// 2. WINGS GENERATOR
function renderWings(wings, wingColor, isDead) {
  if (wings === 'none') return '';
  
  const wingsColorHex = isDead ? '#b0bec5' : wingColor;
  
  if (wings === 'angel') {
    return `
      <!-- Left Angel Wing -->
      <path d="M 28 45 C 10 38, 5 50, 15 65 C 22 72, 28 62, 28 55 Z" fill="${wingsColorHex}" opacity="0.85" stroke="${isDead ? '#cfd8dc' : 'rgba(0,0,0,0.1)'}" stroke-width="1.5" />
      <!-- Right Angel Wing -->
      <path d="M 72 45 C 90 38, 95 50, 85 65 C 78 72, 72 62, 72 55 Z" fill="${wingsColorHex}" opacity="0.85" stroke="${isDead ? '#cfd8dc' : 'rgba(0,0,0,0.1)'}" stroke-width="1.5" />
    `;
  }
  
  if (wings === 'dragon') {
    const batColor = isDead ? '#90a4ae' : '#455a64'; // Dark leather wing, grey if dead
    const wingAccent = isDead ? '#cfd8dc' : '#ff1744'; // Red accent or light grey
    return `
      <!-- Left Dragon Wing -->
      <path d="M 26 48 L 5 35 C 3 45, 10 52, 14 55 L 8 68 C 16 64, 20 58, 26 53 Z" fill="${batColor}" stroke="${wingAccent}" stroke-width="1.5" />
      <!-- Right Dragon Wing -->
      <path d="M 74 48 L 95 35 C 97 45, 90 52, 86 55 L 92 68 C 84 64, 80 58, 74 53 Z" fill="${batColor}" stroke="${wingAccent}" stroke-width="1.5" />
    `;
  }
  return '';
}

// 3. EARS GENERATOR (Renders either background 'back' or foreground overlay 'front')
function renderEars(ears, primaryColor, droop, isDead, layer) {
  const color = isDead ? '#cfd8dc' : primaryColor;
  const innerColor = isDead ? '#b0bec5' : '#ff8a80'; // Pink inner ear unless dead
  
  // Angle adjustments for droopy/sad ears
  const leftEarRotation = droop ? 'rotate(-25, 25, 30)' : 'rotate(0)';
  const rightEarRotation = droop ? 'rotate(25, 75, 30)' : 'rotate(0)';

  if (ears === 'pointy') { // Cat ears
    if (layer === 'back') {
      return `
        <!-- Left Pointy Ear -->
        <polygon points="20,40 22,20 38,34" fill="${color}" transform="${leftEarRotation}" />
        <polygon points="23,37 25,24 35,32" fill="${innerColor}" transform="${leftEarRotation}" />
        <!-- Right Pointy Ear -->
        <polygon points="80,40 78,20 62,34" fill="${color}" transform="${rightEarRotation}" transform-origin="78px 20px" />
        <polygon points="77,37 75,24 65,32" fill="${innerColor}" transform="${rightEarRotation}" />
      `;
    }
    return '';
  }

  if (ears === 'floppy') { // Dog floppy ears (Foreground overlays mostly)
    if (layer === 'front') {
      const flopAngleL = droop ? 'rotate(20, 23, 40)' : 'rotate(5, 23, 40)';
      const flopAngleR = droop ? 'rotate(-20, 77, 40)' : 'rotate(-5, 77, 40)';
      return `
        <!-- Left Floppy Ear -->
        <path d="M 23 38 C 14 38, 12 55, 14 68 C 16 72, 22 72, 25 60 Z" fill="${color}" transform="${flopAngleL}" />
        <path d="M 21 42 C 16 42, 15 52, 16 62 C 17 64, 21 64, 22 56 Z" fill="${innerColor}" transform="${flopAngleL}" />
        <!-- Right Floppy Ear -->
        <path d="M 77 38 C 86 38, 88 55, 86 68 C 84 72, 78 72, 75 60 Z" fill="${color}" transform="${flopAngleR}" />
        <path d="M 79 42 C 84 42, 85 52, 84 62 C 83 64, 79 64, 78 56 Z" fill="${innerColor}" transform="${flopAngleR}" transform-origin="77 38" />
      `;
    }
    return '';
  }

  if (ears === 'long') { // Rabbit long ears
    if (layer === 'back') {
      const rabbitAngleL = droop ? 'rotate(-38, 36, 28)' : 'rotate(-5, 36, 28)';
      const rabbitAngleR = droop ? 'rotate(38, 64, 28)' : 'rotate(5, 64, 28)';
      return `
        <!-- Left Rabbit Ear -->
        <rect x="32" y="3" width="8" height="28" rx="4" fill="${color}" transform="${rabbitAngleL}" transform-origin="36px 28px" />
        <rect x="34" y="6" width="4" height="22" rx="2" fill="${innerColor}" transform="${rabbitAngleL}" transform-origin="36px 28px" />
        <!-- Right Rabbit Ear -->
        <rect x="60" y="3" width="8" height="28" rx="4" fill="${color}" transform="${rabbitAngleR}" transform-origin="64px 28px" />
        <rect x="62" y="6" width="4" height="22" rx="2" fill="${innerColor}" transform="${rabbitAngleR}" transform-origin="64px 28px" />
      `;
    }
    return '';
  }

  if (ears === 'teddy') { // Teddy bear round ears
    if (layer === 'back') {
      return `
        <!-- Left Teddy Ear -->
        <circle cx="28" cy="30" r="9" fill="${color}" />
        <circle cx="28" cy="30" r="5" fill="${innerColor}" />
        <!-- Right Teddy Ear -->
        <circle cx="72" cy="30" r="9" fill="${color}" />
        <circle cx="72" cy="30" r="5" fill="${innerColor}" />
      `;
    }
    return '';
  }

  return '';
}

// 4. HORNS GENERATOR
function renderHorns(horns, primaryColor, isDead) {
  if (horns === 'none') return '';
  
  const hornColor = isDead ? '#cfd8dc' : '#e0e0e0';
  const detailColor = isDead ? '#b0bec5' : '#b0bec5';

  if (horns === 'small') {
    return `
      <!-- Two small pointy horns -->
      <polygon points="40,30 42,18 47,28" fill="${hornColor}" stroke="${detailColor}" stroke-width="0.5" />
      <polygon points="60,30 58,18 53,28" fill="${hornColor}" stroke="${detailColor}" stroke-width="0.5" />
    `;
  }
  
  if (horns === 'ram') {
    const ramFill = isDead ? '#90a4ae' : '#8d6e63';
    return `
      <!-- Left Ram Horn -->
      <path d="M 28 36 C 22 28, 14 36, 16 46 C 18 50, 24 46, 26 40 Z" fill="${ramFill}" stroke="rgba(0,0,0,0.15)" />
      <!-- Right Ram Horn -->
      <path d="M 72 36 C 78 28, 86 36, 84 46 C 82 50, 76 46, 74 40 Z" fill="${ramFill}" stroke="rgba(0,0,0,0.15)" />
    `;
  }
  
  if (horns === 'neon') {
    const neonColor = isDead ? '#90a4ae' : '#00e5ff';
    return `
      <!-- Central glowing horn -->
      <polygon points="50,10 44,30 56,30" fill="${neonColor}" ${isDead ? '' : 'filter="url(#neon-glow)"'} />
      <polygon points="50,15 47,28 53,28" fill="#ffffff" opacity="0.6" />
    `;
  }
  
  return '';
}

// 5. HEAD SPROUT (For happy status, extremely cute!)
function renderSprout(isHappy, isDead) {
  if (!isHappy || isDead) return '';
  return `
    <!-- Tiny green head leaf sprout -->
    <g class="wk-head-sprout">
      <path d="M 50,31 L 50,26" stroke="#4caf50" stroke-width="1.5" stroke-linecap="round" />
      <!-- Left Leaf -->
      <path d="M 50,26 Q 44,18 39,22 Q 44,25 50,26" fill="#81c784" stroke="#388e3c" stroke-width="0.5" />
      <!-- Right Leaf -->
      <path d="M 50,26 Q 56,18 61,22 Q 56,25 50,26" fill="#81c784" stroke="#388e3c" stroke-width="0.5" />
    </g>
  `;
}

// 6. STUBBY FEET GENERATOR (renders below body)
function renderFeet(primaryColor, bodyType) {
  const footColor = adjustColorBrightness(primaryColor, -18);
  const detailColor = adjustColorBrightness(primaryColor, -30);
  
  return `
    <g class="wk-feet-group">
      <!-- Left Foot -->
      <ellipse cx="38" cy="80.5" rx="6.5" ry="4" fill="${footColor}" stroke="${detailColor}" stroke-width="0.75" />
      <!-- Right Foot -->
      <ellipse cx="62" cy="80.5" rx="6.5" ry="4" fill="${footColor}" stroke="${detailColor}" stroke-width="0.75" />
    </g>
  `;
}

// 7. BODY SHAPE GENERATOR
function renderBody(bodyType, bodyGradient, isDead) {
  // If dead, render ghost shape (tail) instead of normal base body!
  if (isDead) {
    return `
      <!-- Ghost Body with floaty bottom tail -->
      <path d="M 26 50 C 26 33, 74 33, 74 50 C 74 65, 68 76, 68 76 C 65 72, 60 74, 57 76 C 54 78, 50 75, 47 76 C 43 78, 38 72, 35 76 C 32 78, 26 65, 26 50 Z" fill="${bodyGradient}" />
    `;
  }

  if (bodyType === 'round') {
    return `<circle cx="50" cy="56" r="26" fill="${bodyGradient}" />`;
  }
  
  if (bodyType === 'oval') {
    return `<ellipse cx="50" cy="56" rx="24" ry="28" fill="${bodyGradient}" />`;
  }
  
  if (bodyType === 'squarish') {
    return `<rect x="25" y="30" width="50" height="48" rx="12" fill="${bodyGradient}" />`;
  }
  
  if (bodyType === 'cloud') {
    return `
      <!-- Fluffy cloud path -->
      <path d="M 36,46 C 29,46 24,51 24,57 C 24,63 29,68 36,68 C 37,68 38,68 39,68 C 41,73 45,76 50,76 C 55,76 59,73 61,68 C 62,68 63,68 64,68 C 71,68 76,63 76,57 C 76,51 71,46 64,46 C 63,46 62,46 61,46 C 59,41 55,37 50,37 C 45,37 41,41 39,46 C 38,46 37,46 36,46 Z" fill="${bodyGradient}" />
    `;
  }
  
  if (bodyType === 'blob') {
    return `
      <!-- Asymmetrical cute organic blob -->
      <path d="M 50,28 C 30,28 22,40 22,57 C 22,72 32,80 48,80 C 66,80 78,69 78,54 C 78,38 70,28 50,28 Z" fill="${bodyGradient}" />
    `;
  }
  
  return `<circle cx="50" cy="56" r="26" fill="${bodyGradient}" />`;
}

// 8. BELLY OVERLAY RENDERER
function renderBelly(bodyType, bellyGradient) {
  if (bodyType === 'round') {
    return `<circle cx="50" cy="62" r="14" fill="${bellyGradient}" opacity="0.85" />`;
  }
  if (bodyType === 'oval') {
    return `<ellipse cx="50" cy="62" rx="13" ry="16" fill="${bellyGradient}" opacity="0.85" />`;
  }
  if (bodyType === 'squarish') {
    return `<rect x="32" y="50" width="36" height="22" rx="6" fill="${bellyGradient}" opacity="0.85" />`;
  }
  if (bodyType === 'cloud') {
    return `<ellipse cx="50" cy="60" rx="14" ry="10" fill="${bellyGradient}" opacity="0.85" />`;
  }
  if (bodyType === 'blob') {
    return `<path d="M 48,46 C 36,46 34,56 34,66 C 34,74 44,76 48,76 C 58,76 66,72 66,62 C 66,52 58,46 48,46 Z" fill="${bellyGradient}" opacity="0.85" />`;
  }
  return '';
}

// 9. STUBBY LITTLE ARMS GENERATOR
function renderArms(primaryColor) {
  const armColor = adjustColorBrightness(primaryColor, -5);
  const detailColor = adjustColorBrightness(primaryColor, -25);
  return `
    <g class="wk-arms-group">
      <!-- Left Hand -->
      <path d="M 25,60 Q 18,63 24,67" fill="none" stroke="${armColor}" stroke-width="3" stroke-linecap="round" />
      <path d="M 25,60 Q 18,63 24,67" fill="none" stroke="${detailColor}" stroke-width="1" stroke-linecap="round" opacity="0.5" />
      <!-- Right Hand -->
      <path d="M 75,60 Q 82,63 76,67" fill="none" stroke="${armColor}" stroke-width="3" stroke-linecap="round" />
      <path d="M 75,60 Q 82,63 76,67" fill="none" stroke="${detailColor}" stroke-width="1" stroke-linecap="round" opacity="0.5" />
    </g>
  `;
}

// 10. ROSY BLUSHING CHEEKS (High-Fidelity Kawaii style)
function renderCheeks(isDead, isStarving) {
  if (isDead) return '';
  const op = isStarving ? '0.3' : '0.6';
  return `
    <g class="wk-cheeks">
      <!-- Left Cheek -->
      <ellipse cx="32.5" cy="57" rx="4.5" ry="2" fill="#ff7a8a" opacity="${op}" />
      <!-- Right Cheek -->
      <ellipse cx="67.5" cy="57" rx="4.5" ry="2" fill="#ff7a8a" opacity="${op}" />
    </g>
  `;
}

// 11. EYES GENERATOR (Kawaii Glossy reflections)
function renderEyes(eyes, isDead, isDepressed, isStarving) {
  if (isDead) {
    // Dead cross eyes with cute little tongue out smile
    return `
      <!-- Cross Eyes -->
      <path d="M 33,47 L 41,55 M 41,47 L 33,55" stroke="#455a64" stroke-width="2.5" stroke-linecap="round" />
      <path d="M 59,47 L 67,55 M 67,47 L 59,55" stroke="#455a64" stroke-width="2.5" stroke-linecap="round" />
    `;
  }
  
  // Set eyelids droop if depressed or starving
  const eyelidTransform = isDepressed || isStarving ? 'scale(1, 0.75) translate(0, 7)' : '';

  if (eyes === 'sleepy') {
    return `
      <!-- Sleeping / Happy closed eyes -->
      <path d="M 31,52 Q 37,57 43,52" fill="none" stroke="#212121" stroke-width="3" stroke-linecap="round" />
      <path d="M 57,52 Q 63,57 69,52" fill="none" stroke="#212121" stroke-width="3" stroke-linecap="round" />
    `;
  }
  
  if (eyes === 'sparkle') {
    return `
      <g style="transform: ${eyelidTransform}">
        <!-- Left Sparkle Eye -->
        <circle cx="37" cy="50" r="5.5" fill="#212121" />
        <polygon points="37,46 38,48 40,48 38,49 39,51 37,50 35,51 36,49 34,48 36,48" fill="#ffffff" />
        <circle cx="35" cy="52.5" r="1.3" fill="#ffffff" />
        
        <!-- Right Sparkle Eye -->
        <circle cx="63" cy="50" r="5.5" fill="#212121" />
        <polygon points="63,46 64,48 66,48 64,49 65,51 63,50 61,51 62,49 60,48 62,48" fill="#ffffff" />
        <circle cx="61" cy="52.5" r="1.3" fill="#ffffff" />
      </g>
    `;
  }
  
  if (eyes === 'fire') {
    const fireColor = '#ff3d00';
    return `
      <g>
        <!-- Fire background flares -->
        <path d="M 32,48 Q 37,35 42,48 Z" fill="${fireColor}" opacity="0.8" class="wk-fire-eye" />
        <path d="M 58,48 Q 63,35 68,48 Z" fill="${fireColor}" opacity="0.8" class="wk-fire-eye" />
        
        <!-- Black pupil center -->
        <circle cx="37" cy="50" r="5.5" fill="#212121" stroke="${fireColor}" stroke-width="1.2" />
        <circle cx="63" cy="50" r="5.5" fill="#212121" stroke="${fireColor}" stroke-width="1.2" />
        
        <!-- Fiery glow highlights -->
        <circle cx="38" cy="48" r="1.8" fill="#ffd600" />
        <circle cx="62" cy="48" r="1.8" fill="#ffd600" />
      </g>
    `;
  }

  // Normal high glossy Kawaii eyes (Triple reflections)
  return `
    <g style="transform: ${eyelidTransform}">
      <!-- Left Normal Eye -->
      <circle cx="37" cy="50" r="5.5" fill="#212121" />
      <circle cx="39.2" cy="48" r="2.2" fill="#ffffff" /> <!-- Large reflection -->
      <circle cx="35" cy="52.2" r="1.1" fill="#ffffff" /> <!-- Secondary reflection -->
      <circle cx="38.5" cy="52" r="0.65" fill="#ffffff" /> <!-- Sparkling starlet -->
      
      <!-- Right Normal Eye -->
      <circle cx="63" cy="50" r="5.5" fill="#212121" />
      <circle cx="65.2" cy="48" r="2.2" fill="#ffffff" />
      <circle cx="61" cy="52.2" r="1.1" fill="#ffffff" />
      <circle cx="64.5" cy="52" r="0.65" fill="#ffffff" />
    </g>
  `;
}

// 12. MOUTH GENERATOR
function renderMouth(status) {
  if (status === 'dead') {
    // Cute dead wobbly cat face tongue out (:p style)
    return `
      <!-- Dead mouth -->
      <path d="M 47,59 Q 50,61 53,59" fill="none" stroke="#455a64" stroke-width="1.8" stroke-linecap="round" />
      <path d="M 48,60 C 48,60 48,63 50,63 C 52,63 52,60 52,60 Z" fill="#ff8a80" stroke="#455a64" stroke-width="0.75" />
    `;
  }
  
  if (status === 'starving') {
    // Large round surprised mouth to ask for steps
    return `<circle cx="50" cy="60" r="3.2" fill="none" stroke="#212121" stroke-width="2" />`;
  }
  
  if (status === 'depressed') {
    // Wobbly sad wave
    return `<path d="M 46,62 Q 50,58 54,62" fill="none" stroke="#212121" stroke-width="2.2" stroke-linecap="round" />`;
  }
  
  // Happy w-shaped tiny cat lip wiggles (:3)
  return `
    <path d="M 46,58 Q 48,61 50,59 Q 52,61 54,58" fill="none" stroke="#212121" stroke-width="2.2" stroke-linecap="round" />
    <!-- Cute red tongue sticking out slightly -->
    <path d="M 48.5,59.2 C 48.5,59.2 48.5,62.5 50,62.5 C 51.5,62.5 51.5,59.2 51.5,59.2 Z" fill="#ff5252" />
  `;
}

// 12b. TEAR DROPS (For depressed Wokamons)
function renderTearDroplets() {
  return `
    <!-- Left Tear Droplet -->
    <path d="M 36,55 C 36,55 34,61 34,64 C 34,65 35,66 36,66 C 37,66 38,65 38,64 C 38,61 36,55 36,55 Z" fill="#29b6f6" class="wk-tear" style="animation: wk-tear-drop 2s infinite" />
    <!-- Right Tear Droplet -->
    <path d="M 64,55 C 64,55 62,61 62,64 C 62,65 63,66 64,66 C 65,66 66,65 66,64 C 66,61 64,55 64,55 Z" fill="#29b6f6" class="wk-tear" style="animation: wk-tear-drop 2s infinite 0.7s" />
  `;
}
