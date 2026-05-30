// Wokamon Evolucionado - Procedural SVG Renderer v2 (Organic Blob & High-Fidelity Textures)

export function renderWokamonSVG(wokamon) {
  const { status, genetics = {} } = wokamon;
  
  // Extract 11 Loci with safe backward-compatibility fallbacks
  const {
    bodyBase = genetics.bodyType || 'round',
    bodyProportion = 'balanced',
    limbType = 'stubby',
    headMerge = 'integrated',
    topAppendage = genetics.horns || 'none',
    tailType = 'none',
    bellyShape = 'oval',
    eyeShape = genetics.eyes || 'round',
    pupilStyle = 'dot',
    mouthStyle = 'smile',
    surfaceType = 'smooth',
    primaryColor = '#ffcc00',
    bellyColor = '#ffe57f',
    paintedPattern = null
  } = genetics;

  const isDead = status === 'dead';
  const isStarving = status === 'starving';
  const isDepressed = status === 'depressed';
  const isHappy = status === 'happy';

  // Animation classes
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

  // Calculate body proportions scale transformation
  let proportionTransform = 'scale(1, 1)';
  if (bodyProportion === 'chubby') {
    proportionTransform = 'scale(1.1, 0.95)';
  } else if (bodyProportion === 'tall') {
    proportionTransform = 'scale(0.85, 1.2)';
  } else if (bodyProportion === 'tiny') {
    proportionTransform = 'scale(0.75, 0.75)';
  }

  // Adjust colors for gradients
  const baseColor = isDead ? '#cfd8dc' : primaryColor;
  const shadowColor = adjustColorBrightness(baseColor, -20);
  const highlightColor = adjustColorBrightness(baseColor, 15);
  const bellFill = isDead ? '#b0bec5' : bellyColor;

  const bodyFillAttr = `url(#grad-body-${wokamon.id})`;
  const textureFilterAttr = '';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="wokamon-svg ${animationClass}" data-id="${wokamon.id}" style="width: 100%; height: 100%;">
      <defs>
        <!-- Soft drop shadow for character anchoring -->
        <filter id="drop-shadow-${wokamon.id}" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2" flood-color="#0c231e" flood-opacity="0.12" />
        </filter>

        <!-- Body Linear Gradient with volume -->
        <radialGradient id="grad-body-${wokamon.id}" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stop-color="${highlightColor}" />
          <stop offset="60%" stop-color="${baseColor}" />
          <stop offset="100%" stop-color="${shadowColor}" />
        </radialGradient>

        <!-- Belly Gradient -->
        <linearGradient id="grad-belly-${wokamon.id}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${bellFill}" />
          <stop offset="100%" stop-color="${adjustColorBrightness(bellFill, -12)}" />
        </linearGradient>

        <!-- Limbs & Appendages Gradient -->
        <linearGradient id="grad-limb-${wokamon.id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${baseColor}" />
          <stop offset="100%" stop-color="${shadowColor}" />
        </linearGradient>

        <!-- Jelly Shine Gradient -->
        <linearGradient id="grad-jelly-shine-${wokamon.id}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0" />
        </linearGradient>
      </defs>

      <!-- 1. GENTLE SHADOW UNDER THE WOKAMON (Anchoring) -->
      ${!isDead ? `
        <ellipse cx="50" cy="85.5" rx="20" ry="4.5" fill="#000" opacity="0.12" />
      ` : ''}

      <!-- STATE PARTICLES -->
      ${renderStateParticles(status)}

      <!-- 2. TAIL TYPE (BACKGROUND) -->
      <g class="wk-tail" ${textureFilterAttr}>
        ${renderTail(tailType, `url(#grad-limb-${wokamon.id})`, isDead)}
      </g>

      <!-- 3. TOP APPENDAGE / HORNS / EARS (BACKGROUND LAYER) -->
      <g class="wk-horns" ${textureFilterAttr}>
        ${renderTopAppendage(topAppendage, baseColor, isDead, droopAngle(isDepressed, isStarving))}
      </g>

      <!-- 4. SPROUTS (CUTE LEAF SPROUT ON HEAD) -->
      ${renderSprout(isHappy || topAppendage === 'sprouts', isDead)}

      <!-- 5. LIMBS / FEET / LEGS -->
      <g class="wk-limbs" ${textureFilterAttr}>
        ${!isDead ? renderFeetAndLegs(limbType, `url(#grad-limb-${wokamon.id})`) : ''}
      </g>

      <!-- 6. MAIN BODY CONTAINER (UNIFIED BEZIER BLOB LAYER) -->
      <g class="wk-body-container" ${textureFilterAttr} filter="url(#drop-shadow-${wokamon.id})" style="transform-origin: 50px 56px; transform: ${proportionTransform}; opacity: ${bodyOpacity};">
        
        <!-- Main body Bézier silhouette path -->
        ${renderBodyBase(bodyBase, bodyFillAttr)}

        <!-- Semi-separated head division mass overlay -->
        ${headMerge === 'semi-separated' ? `
          <circle cx="50" cy="42" r="16.5" fill="${bodyFillAttr}" stroke="${shadowColor}" stroke-opacity="0.15" stroke-width="1" />
        ` : ''}

        <!-- Integrated Belly Shape overlay -->
        ${!isDead ? renderBellyShape(bellyShape, `url(#grad-belly-${wokamon.id})`, shadowColor) : ''}

        <!-- Custom painted NFC patterns -->
        ${paintedPattern ? `<path d="${paintedPattern}" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />` : ''}

      </g>

      <!-- 7. LIMBS / ARMS -->
      <g class="wk-limbs-front" ${textureFilterAttr}>
        ${!isDead ? renderArms(limbType, `url(#grad-limb-${wokamon.id})`) : ''}
      </g>

      <!-- 8. FACE GROUP (EYES, CHEEKS, MOUTH) -->
      <g class="wk-face" style="transform-origin: 50px 56px; transform: ${proportionTransform};">
        ${renderCheeks(isDead, isStarving)}
        ${renderEyes(eyeShape, pupilStyle, isDead, isDepressed, isStarving)}
        ${renderMouth(mouthStyle, status)}
        ${isDepressed ? renderTearDroplets() : ''}
      </g>

      <!-- 9. GHOST HALO -->
      ${isDead ? `
        <ellipse cx="50" cy="15" rx="14" ry="4" fill="none" stroke="#e0f7fa" stroke-width="2.5" opacity="0.8" style="animation: wk-halo-float 3s ease-in-out infinite" />
      ` : ''}

    </svg>
  `;
}

// 1. Helper to adjust HSL hex colors
function adjustColorBrightness(hex, percent) {
  let num = parseInt(hex.replace("#",""), 16),
  amt = Math.round(2.55 * percent),
  R = (num >> 16) + amt,
  G = (num >> 8 & 0x00FF) + amt,
  B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
}

// droop angle for ears based on status
function droopAngle(isDepressed, isStarving) {
  return isDepressed || isStarving;
}

// STATE PARTICLES
function renderStateParticles(status) {
  if (status === 'happy') {
    return `
      <g class="wk-particles">
        <polygon points="15,25 17,28 20,28 18,30 19,33 15,31 11,33 12,30 10,28 13,28" fill="#ffb300" class="wk-star-particle" style="animation: wk-part-float 2.5s infinite; transform-origin: 15px 28px;" />
        <polygon points="85,30 87,33 90,33 88,35 89,38 85,36 81,38 82,35 80,33 83,33" fill="#ffb300" class="wk-star-particle" style="animation: wk-part-float 2s infinite 0.8s; transform-origin: 85px 33px;" />
      </g>
    `;
  }
  if (status === 'dead') {
    return `
      <g class="wk-particles">
        <circle cx="20" cy="35" r="1.5" fill="#e0f7fa" opacity="0.5" style="animation: wk-ghost-sparkle 2.5s infinite" />
        <circle cx="80" cy="40" r="1" fill="#e0f7fa" opacity="0.6" style="animation: wk-ghost-sparkle 1.8s infinite 0.5s" />
      </g>
    `;
  }
  return '';
}

// 2. UNIFIED BEZIER SILHOUETTE BODY RENDERER
function renderBodyBase(bodyBase, bodyGradient) {
  // If cloud body
  if (bodyBase === 'cloud') {
    return `
      <path d="M 36,44 C 28,44 23,49 23,55 C 23,61 28,66 35,66 C 36,66 37,66 38,66 C 40,71 45,74 50,74 C 55,74 59,71 61,66 C 62,66 63,66 64,66 C 71,66 76,61 76,55 C 76,49 71,44 64,44 C 63,44 62,44 61,44 C 59,39 55,35 50,35 C 45,35 41,39 38,44 C 37,44 36,44 35,44 Z" fill="${bodyGradient}" />
    `;
  }
  
  // If bean kidney body shape
  if (bodyBase === 'bean') {
    return `
      <path d="M 30,56 C 28,40 72,40 70,56 C 68,70 60,76 50,73 C 40,76 32,70 30,56 Z" fill="${bodyGradient}" />
    `;
  }

  // Teardrop pear shape body
  if (bodyBase === 'pear') {
    return `
      <path d="M 50,32 C 38,32 29,46 29,60 C 29,74 38,79 50,79 C 62,79 71,74 71,60 C 71,46 62,32 50,32 Z" fill="${bodyGradient}" />
    `;
  }

  // Blob organic shape
  if (bodyBase === 'blob') {
    return `
      <path d="M 50,30 C 32,30 23,41 23,58 C 23,73 33,79 50,79 C 67,79 77,70 77,55 C 77,39 68,30 50,30 Z" fill="${bodyGradient}" />
    `;
  }

  // Squishy flattened blob
  if (bodyBase === 'squishy') {
    return `
      <path d="M 50,42 C 27,42 24,53 24,65 C 24,75 33,81 50,81 C 67,81 76,75 76,65 C 76,53 73,42 50,42 Z" fill="${bodyGradient}" />
    `;
  }

  // Standard round circle-like path
  return `
    <circle cx="50" cy="56" r="24.5" fill="${bodyGradient}" />
  `;
}

// 3. STUBBY / SOFT / LONG LIMBS (ARMS)
function renderArms(limbType, limbGradient) {
  if (limbType === 'long') {
    return `
      <!-- Long organic arms naciendo del cuerpo smoothly -->
      <path d="M 27,58 Q 14,56 12,64" fill="none" stroke="${limbGradient}" stroke-width="4" stroke-linecap="round" />
      <path d="M 73,58 Q 86,56 88,64" fill="none" stroke="${limbGradient}" stroke-width="4" stroke-linecap="round" />
    `;
  }

  if (limbType === 'springy') {
    return `
      <!-- Curly organic springy arms -->
      <path d="M 27,58 Q 16,52 14,61 T 10,65" fill="none" stroke="${limbGradient}" stroke-width="3" stroke-linecap="round" />
      <path d="M 73,58 Q 84,52 86,61 T 90,65" fill="none" stroke="${limbGradient}" stroke-width="3" stroke-linecap="round" />
    `;
  }

  if (limbType === 'soft') {
    return `
      <!-- Soft curved tiny arms -->
      <path d="M 26,60 Q 18,63 23,68" fill="none" stroke="${limbGradient}" stroke-width="4" stroke-linecap="round" />
      <path d="M 74,60 Q 82,63 77,68" fill="none" stroke="${limbGradient}" stroke-width="4" stroke-linecap="round" />
    `;
  }

  // Default stubby
  return `
    <path d="M 27,60 Q 20,62 25,66" fill="none" stroke="${limbGradient}" stroke-width="3.5" stroke-linecap="round" />
    <path d="M 73,60 Q 80,62 75,66" fill="none" stroke="${limbGradient}" stroke-width="3.5" stroke-linecap="round" />
  `;
}

// 4. FEET AND LEGS
function renderFeetAndLegs(limbType, limbGradient) {
  if (limbType === 'long') {
    return `
      <!-- Slender cute legs -->
      <rect x="34" y="74" width="6" height="9.5" rx="3" fill="${limbGradient}" />
      <rect x="60" y="74" width="6" height="9.5" rx="3" fill="${limbGradient}" />
      <ellipse cx="37" cy="83.5" rx="5.5" ry="3" fill="${limbGradient}" />
      <ellipse cx="63" cy="83.5" rx="5.5" ry="3" fill="${limbGradient}" />
    `;
  }
  
  if (limbType === 'springy') {
    return `
      <!-- Curly legs -->
      <path d="M 37,74 Q 34,80 39,83.5" fill="none" stroke="${limbGradient}" stroke-width="4.5" stroke-linecap="round" />
      <path d="M 63,74 Q 66,80 61,83.5" fill="none" stroke="${limbGradient}" stroke-width="4.5" stroke-linecap="round" />
    `;
  }

  // Default stubby feet (Overlapped under body)
  return `
    <ellipse cx="38.5" cy="80" rx="6.5" ry="3.5" fill="${limbGradient}" />
    <ellipse cx="61.5" cy="80" rx="6.5" ry="3.5" fill="${limbGradient}" />
  `;
}

// 5. BELLY SHAPE OVERLAY
function renderBellyShape(bellyShape, bellyGradient, shadowColor) {
  if (bellyShape === 'none') return '';

  if (bellyShape === 'heart') {
    return `
      <!-- Heart shaped belly integrated with soft shadow border -->
      <path d="M 50,56 C 50,56 42,48 37,53 C 32,58 39,69 50,74 C 61,69 68,58 63,53 C 58,48 50,56 50,56 Z" fill="${bellyGradient}" opacity="0.9" stroke="${shadowColor}" stroke-opacity="0.1" stroke-width="1" />
    `;
  }

  if (bellyShape === 'teardrop') {
    return `
      <path d="M 50,47 C 42,47 37,56 37,67 C 37,74 42,75 50,75 C 58,75 63,74 63,67 C 63,56 58,47 50,47 Z" fill="${bellyGradient}" opacity="0.9" />
    `;
  }

  if (bellyShape === 'cloud') {
    return `
      <path d="M 42,54 C 38,54 36,58 36,62 C 36,66 40,68 44,68 C 45,71 47,73 50,73 C 53,73 55,71 56,68 C 60,68 64,66 64,62 C 64,58 62,54 58,54 C 57,51 54,49 50,49 C 46,49 43,51 42,54 Z" fill="${bellyGradient}" opacity="0.9" />
    `;
  }

  // Default oval integrated belly
  return `
    <ellipse cx="50" cy="62.5" rx="13.5" ry="14" fill="${bellyGradient}" opacity="0.9" />
  `;
}

// 6. TOP APPENDAGE / HORNS / ANTENNAE / EARS
function renderTopAppendage(topAppendage, baseColor, isDead, droop) {
  if (topAppendage === 'none') return '';

  const color = isDead ? '#cfd8dc' : baseColor;
  const innerColor = isDead ? '#b0bec5' : '#ff8a80';
  
  if (topAppendage === 'horns') {
    const hornFill = isDead ? '#b0bec5' : '#eaeaea';
    return `
      <!-- High gloss energy horns with anchor base -->
      <path d="M 35,34 C 33,26 31,18 36,18 C 39,18 38,26 40,32 Z" fill="${hornFill}" stroke="${adjustColorBrightness(hornFill, -20)}" stroke-width="0.75" />
      <path d="M 65,34 C 67,26 69,18 64,18 C 61,18 62,26 60,32 Z" fill="${hornFill}" stroke="${adjustColorBrightness(hornFill, -20)}" stroke-width="0.75" />
    `;
  }

  if (topAppendage === 'antennae') {
    const neonColor = isDead ? '#90a4ae' : '#ff3d00';
    return `
      <!-- Antennae with glowing neon circle bulb -->
      <path d="M 38,32 Q 28,16 26,18" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" />
      <circle cx="26" cy="18" r="3.5" fill="${neonColor}" ${isDead ? '' : 'filter="url(#neon-glow)"'} />
      
      <path d="M 62,32 Q 72,16 74,18" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" />
      <circle cx="74" cy="18" r="3.5" fill="${neonColor}" ${isDead ? '' : 'filter="url(#neon-glow)"'} />
    `;
  }

  if (topAppendage === 'ears') {
    // Teddy bear round animal ears
    const earRotationL = droop ? 'rotate(-25, 29, 31)' : 'rotate(0)';
    const earRotationR = droop ? 'rotate(25, 71, 31)' : 'rotate(0)';
    return `
      <g transform="${earRotationL}" transform-origin="29px 31px">
        <circle cx="29" cy="31" r="8" fill="${color}" />
        <circle cx="29" cy="31" r="4.5" fill="${innerColor}" />
      </g>
      <g transform="${earRotationR}" transform-origin="71px 31px">
        <circle cx="71" cy="31" r="8" fill="${color}" />
        <circle cx="71" cy="31" r="4.5" fill="${innerColor}" />
      </g>
    `;
  }

  return '';
}

// sprouts leaves helper
function renderSprout(isSprout, isDead) {
  if (!isSprout || isDead) return '';
  return `
    <g class="wk-head-sprout" style="transform-origin: 50px 31px; animation: wk-bounce 2s infinite ease-in-out;">
      <path d="M 50,33 L 50,26" stroke="#4caf50" stroke-width="1.8" stroke-linecap="round" />
      <!-- Left Leaf -->
      <path d="M 50,26 Q 43,18 39,22 Q 44,25 50,26" fill="#81c784" stroke="#388e3c" stroke-width="0.5" />
      <!-- Right Leaf -->
      <path d="M 50,26 Q 57,18 61,22 Q 56,25 50,26" fill="#81c784" stroke="#388e3c" stroke-width="0.5" />
    </g>
  `;
}

// 7. TAIL TYPES (BACKGROUND PARTS)
function renderTail(tailType, tailGradient, isDead) {
  if (tailType === 'none') return '';

  if (tailType === 'pom') {
    return `
      <!-- Pompon cute fluffy tail -->
      <circle cx="76" cy="68" r="7" fill="${tailGradient}" opacity="0.95" />
      <circle cx="74" cy="65" r="4" fill="#ffffff" opacity="0.15" />
    `;
  }

  if (tailType === 'spike') {
    const spikeColor = isDead ? '#cfd8dc' : '#ff9100';
    return `
      <!-- Dinosaur cute spike tail -->
      <path d="M 72,66 L 85,74 L 75,76 Z" fill="${tailGradient}" />
      <polygon points="76,62 82,58 78,66" fill="${spikeColor}" />
      <polygon points="80,70 85,67 82,73" fill="${spikeColor}" />
    `;
  }

  if (tailType === 'fluff') {
    return `
      <!-- Large fluff squirrel-like tail -->
      <path d="M 70,68 C 84,68 93,52 87,42 C 82,34 74,48 72,56 Z" fill="${tailGradient}" />
    `;
  }

  return '';
}

// Rosy blushing cheeks
function renderCheeks(isDead, isStarving) {
  if (isDead) return '';
  const op = isStarving ? '0.3' : '0.65';
  return `
    <g class="wk-cheeks">
      <ellipse cx="32" cy="56" rx="4.5" ry="2" fill="#ff7a8a" opacity="${op}" />
      <ellipse cx="68" cy="56" rx="4.5" ry="2" fill="#ff7a8a" opacity="${op}" />
    </g>
  `;
}

// 8. MASSIVE EXPRESSIVE EYES WITH HIGH-FIDELITY PUPILS
function renderEyes(eyeShape, pupilStyle, isDead, isDepressed, isStarving) {
  if (isDead) {
    return `
      <!-- Dead crosses -->
      <path d="M 33,46 L 41,54 M 41,46 L 33,54" stroke="#455a64" stroke-width="2.5" stroke-linecap="round" />
      <path d="M 59,46 L 67,54 M 67,46 L 59,54" stroke="#455a64" stroke-width="2.5" stroke-linecap="round" />
    `;
  }

  const eyelidTransform = isDepressed || isStarving ? 'scale(1, 0.7) translate(0, 8)' : '';

  if (eyeShape === 'sleepy') {
    return `
      <path d="M 30,52 Q 36.5,57 43,52" fill="none" stroke="#212121" stroke-width="3" stroke-linecap="round" />
      <path d="M 57,52 Q 63.5,57 70,52" fill="none" stroke="#212121" stroke-width="3" stroke-linecap="round" />
    `;
  }

  // Draw eye outline based on shape (very big diameter)
  const drawEyeBall = (cx, cy) => {
    let r = 6.2;
    if (eyeShape === 'droopy') {
      return `<path d="M ${cx - 5.5},${cy - 2} C ${cx - 5.5},${cy + 6} ${cx + 5.5},${cy + 6} ${cx + 5.5},${cy - 2} Z" fill="#212121" />`;
    }
    if (eyeShape === 'wide') {
      r = 7.0; // Extra massive!
    }
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#212121" />`;
  };

  // Draw double glossy highlights
  const drawGloss = (cx, cy) => {
    if (eyeShape === 'sleepy') return '';
    
    // Custom star highlight inside pupil
    let mainHighlight = `<circle cx="${cx + 2.0}" cy="${cy - 2.0}" r="2.4" fill="#ffffff" />`;
    let subHighlight = `<circle cx="${cx - 2.0}" cy="${cy + 2.0}" r="1.1" fill="#ffffff" />`;
    
    if (pupilStyle === 'star') {
      mainHighlight = `<polygon points="${cx+2},${cy-3.2} ${cx+2.4},${cy-2.2} ${cx+3.4},${cy-2.2} ${cx+2.6},${cy-1.6} ${cx+2.9},${cy-0.6} ${cx+2},${cy-1.2} ${cx+1.1},${cy-0.6} ${cx+1.4},${cy-1.6} ${cx+0.6},${cy-2.2} ${cx+1.6},${cy-2.2}" fill="#ffffff" />`;
    } else if (pupilStyle === 'slit') {
      // vertical slot reflection
      mainHighlight = `<rect x="${cx + 1}" y="${cy - 3}" width="1.5" height="6.0" rx="0.75" fill="#ffffff" />`;
    }

    return `
      ${mainHighlight}
      ${subHighlight}
      <!-- triple sparkle glint -->
      <circle cx="${cx + 2.5}" cy="${cy + 1.8}" r="0.65" fill="#ffffff" />
    `;
  };

  return `
    <g style="transform: ${eyelidTransform}">
      <!-- Left Eye -->
      ${drawEyeBall(36.5, 49)}
      ${drawGloss(36.5, 49)}

      <!-- Right Eye -->
      ${drawEyeBall(63.5, 49)}
      ${drawGloss(63.5, 49)}
    </g>
  `;
}

// 9. EXPRESSIVE MOUTH
function renderMouth(mouthStyle, status) {
  if (status === 'dead') {
    return `
      <path d="M 47,59 Q 50,61 53,59" fill="none" stroke="#455a64" stroke-width="1.8" stroke-linecap="round" />
      <path d="M 48,60 C 48,60 48,63 50,63 C 52,63 52,60 52,60 Z" fill="#ff8a80" stroke="#455a64" stroke-width="0.75" />
    `;
  }
  if (status === 'starving') {
    return `<circle cx="50" cy="59.5" r="3.2" fill="none" stroke="#212121" stroke-width="2" />`;
  }
  if (status === 'depressed') {
    return `<path d="M 46,61 Q 50,57.5 54,61" fill="none" stroke="#212121" stroke-width="2.2" stroke-linecap="round" />`;
  }

  // Mapped from mouthStyle genes
  if (mouthStyle === 'open-smile') {
    return `
      <!-- Open excited laugh mouth with cute little red tongue -->
      <path d="M 46.5,58.5 C 46.5,58.5 46.5,63.5 50,63.5 C 53.5,63.5 53.5,58.5 53.5,58.5 Z" fill="#212121" />
      <path d="M 48.5,61.0 C 48.5,61.0 49.0,63.0 50,63.0 C 51.0,63.0 51.5,61.0 51.5,61.0 Z" fill="#ff5252" />
    `;
  }

  if (mouthStyle === 'tiny-fang') {
    return `
      <path d="M 46,58 Q 48,60.5 50,58.5 Q 52,60.5 54,58" fill="none" stroke="#212121" stroke-width="2.2" stroke-linecap="round" />
      <!-- Left cute tiny vampire fang -->
      <polygon points="47.5,59.2 49,59.4 48,61.2" fill="#ffffff" />
    `;
  }

  if (mouthStyle === 'shy') {
    return `<line x1="47" y1="59.5" x2="53" y2="59.5" stroke="#212121" stroke-width="2" stroke-linecap="round" />`;
  }

  // Default tierno cat smile (:3)
  return `
    <path d="M 46,58 Q 48,61 50,59 Q 52,61 54,58" fill="none" stroke="#212121" stroke-width="2.2" stroke-linecap="round" />
    <path d="M 48.5,59.2 C 48.5,59.2 48.5,62 50,62 C 51.5,62 51.5,59.2 51.5,59.2 Z" fill="#ff5252" opacity="0.85" />
  `;
}

// Tear drops for depressed Wokamons
function renderTearDroplets() {
  return `
    <path d="M 35,54 C 35,54 33,60 33,63 C 33,64.2 34,65 35,65 C 36,65 37,64.2 37,63 C 37,60 35,54 35,54 Z" fill="#29b6f6" class="wk-tear" style="animation: wk-tear-drop 2s infinite" />
    <path d="M 65,54 C 65,54 63,60 63,63 C 63,64.2 64,65 65,65 C 66,65 67,64.2 67,63 C 67,60 65,54 65,54 Z" fill="#29b6f6" class="wk-tear" style="animation: wk-tear-drop 2s infinite 0.7s" />
  `;
}
