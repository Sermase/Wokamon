// Wokamon Evolucionado - Stable & Life Cycle Manager Component

import store, { getWokamonScale } from '../utils/state.js';
import { renderWokamonSVG } from './WokamonRenderer.js';

export class StableManager {
  constructor() {
    this.container = null;
    this.giftCodeGenerated = null;
    this.giftedWokName = '';
  }

  init(containerElement) {
    this.container = containerElement;
    
    // Subscribe to state changes
    store.subscribe(() => this.render());
    this.render();
  }

  // Visual modal to display gift codes
  showGiftModal(wokamon) {
    const base64Code = store.giftWokamon(wokamon.id);
    if (!base64Code) return;

    this.giftCodeGenerated = base64Code;
    this.giftedWokName = wokamon.name;

    const overlay = document.createElement('div');
    overlay.className = 'payment-overlay';
    overlay.innerHTML = `
      <div class="gift-modal glass-panel pad-lg text-center flex-center flex-col">
        <div class="gift-giftbox animate-bounce-slow">🎁</div>
        <h3>Wokamon ${wokamon.name} Listo</h3>
        <p class="subtitle">Se ha empaquetado a <strong>${wokamon.name}</strong> en un código de regalo. Se ha retirado de tu criadero y has ganado <strong class="sparkle-gold">+10 Cristales</strong>.</p>
        
        <p class="lbl-info">Copia este código y envíaselo a tu amigo para que lo adopte en su criadero:</p>
        
        <div class="gift-code-box">
          <textarea readonly id="gift-code-text">${base64Code}</textarea>
        </div>

        <div class="gift-actions-row flex-center">
          <button class="btn btn-primary" id="btn-copy-code">Copiar Código</button>
          <button class="btn btn-secondary" id="btn-close-gift">Cerrar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#btn-copy-code').addEventListener('click', () => {
      const txt = overlay.querySelector('#gift-code-text');
      txt.select();
      document.execCommand('copy');
      
      const copyBtn = overlay.querySelector('#btn-copy-code');
      copyBtn.textContent = '¡Copiado!';
      copyBtn.classList.add('btn-active-glow');
      setTimeout(() => {
        copyBtn.textContent = 'Copiar Código';
        copyBtn.classList.remove('btn-active-glow');
      }, 1500);
    });

    overlay.querySelector('#btn-close-gift').addEventListener('click', () => {
      overlay.remove();
      this.giftCodeGenerated = null;
    });
  }

  // Visual modal to display gorgeous recursive infinite cascading pedigree family tree
  showPedigreeModal(wokamon) {
    const overlay = document.createElement('div');
    overlay.className = 'payment-overlay';
    overlay.style.zIndex = '2500';
    
    const isAncestorGhost = (node) => {
      if (!node) return false;
      const activeWoks = store.getWokamons();
      const found = activeWoks.find(w => w.id === node.id);
      if (!found) return true; // released/absent -> spectral ghost!
      if (found.status === 'dead') return true; // dead -> spectral ghost!
      return false;
    };
    
    // Recursive generator of beautiful cascading vertical accordion node cards
    const renderNodeHTML = (node, title) => {
      if (!node) {
        return `
          <div class="pedigree-row-container" style="display: flex; flex-direction: column; align-items: center; width: 100%; margin: 0.15rem 0;">
            <div class="pedigree-node node-empty glass-panel-inner text-center pad-xs" style="border: 1.5px dashed rgba(0,0,0,0.08); border-radius: 8px; background: rgba(0,0,0,0.03); min-width: 150px; padding: 0.5rem; opacity: 0.5;">
              <span class="lbl" style="font-size: 0.55rem; color: var(--text-grey); font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 0.2rem;">${title}</span>
              <div style="font-size: 1.2rem; margin: 0.15rem 0; opacity: 0.25;">🍃</div>
              <p style="font-size: 0.55rem; color: var(--text-grey); margin: 0;">Silvestre (Desconocido)</p>
            </div>
          </div>
        `;
      }
      
      const isGhost = isAncestorGhost(node);
      const ghostClass = isGhost ? 'node-ghost-spectral' : '';
      const ghostTitle = isGhost ? ' (Espectral 👻)' : '';
      
      const mockWok = {
        status: isGhost ? 'dead' : 'happy',
        stage: node.generation ? (node.generation >= 5 ? 'Anciano' : (node.generation >= 3 ? 'Adulto' : 'Niño')) : 'Niño',
        genetics: node.genetics || {
          bodyType: 'round', ears: 'teddy', eyes: 'normal', horns: 'none', wings: 'none',
          primaryColor: node.primaryColor || '#ffcc00', bellyColor: '#ffe57f', paintedPattern: null
        }
      };
      
      const svgHTML = renderWokamonSVG(mockWok);
      const geneLabels = [];
      if (node.genotype) {
        for (const locus in node.genotype) {
          const alleles = node.genotype[locus];
          geneLabels.push(`<span style="font-size: 0.42rem; background: rgba(0,0,0,0.05); padding: 0.05rem 0.12rem; border-radius: 3px; border: 1px solid rgba(0,0,0,0.05); color: var(--text-main); font-family: monospace;">${locus.substr(0,2)}:${alleles[0]}${alleles[1]}</span>`);
        }
      }

      const hasAncestors = !!node.familyTree;
      const nodeUniqueId = node.id || 'gen_' + Math.random().toString(36).substr(2, 9);

      return `
        <div class="pedigree-row-container" style="display: flex; flex-direction: column; align-items: center; width: 100%; margin: 0.15rem 0;">
          
          <!-- The Node Card -->
          <div class="pedigree-node glass-panel-inner text-center pad-xs ${ghostClass}" style="border: 1px solid rgba(0,0,0,0.08); border-radius: 10px; background: rgba(255,255,255,0.7); min-width: 160px; padding: 0.6rem; position: relative; box-shadow: 0 4px 12px rgba(0, 77, 64, 0.04);">
            <span class="lbl" style="font-size: 0.55rem; color: var(--primary-accent); font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 0.2rem; letter-spacing: 0.3px;">${title}${ghostTitle}</span>
            <div style="height: 42px; display: flex; align-items: center; justify-content: center; margin: 0.15rem 0;">
              <div style="width: 36px; height: 36px;">${svgHTML}</div>
            </div>
            <h4 style="font-size: 0.72rem; font-weight: 800; margin: 0 0 0.1rem 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; color: var(--text-main);">${node.name}</h4>
            <span class="gen-tag" style="font-size: 0.48rem; padding: 0.02rem 0.18rem; background: rgba(0,0,0,0.04); border-radius: 4px; color: var(--text-grey);">Gen ${node.generation || 1}</span>
            
            <div class="node-genes" style="display: flex; gap: 0.1rem; flex-wrap: wrap; justify-content: center; margin-top: 0.25rem;">
              ${geneLabels.slice(0, 3).join('')}
            </div>

            ${hasAncestors ? `
              <button class="btn btn-secondary btn-toggle-ancestors" data-target-id="parents-${nodeUniqueId}" style="margin-top: 0.45rem; font-size: 0.55rem; padding: 0.15rem 0.3rem; font-weight: 700; width: 100%; cursor: pointer;">
                🧬 Ver Padres [+]
              </button>
            ` : `
              <div style="font-size: 0.52rem; color: var(--text-grey); font-style: italic; margin-top: 0.45rem;">(Fundador Salvaje)</div>
            `}
          </div>

          <!-- Hidden Sliding Accordion Parent Loci -->
          ${hasAncestors ? `
            <div class="pedigree-parents-accordion" id="parents-${nodeUniqueId}" style="display: none; width: 100%; border-left: 2px dashed rgba(0, 172, 193, 0.25); margin-left: 0.5rem; padding-left: 0.5rem; margin-top: 0.25rem;">
              <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%;">
                ${renderNodeHTML(node.familyTree.parentA, 'Padre A (Línea EP)')}
                ${renderNodeHTML(node.familyTree.parentB, 'Padre B (Línea Amigo)')}
              </div>
            </div>
          ` : ''}

        </div>
      `;
    };

    overlay.innerHTML = `
      <div class="pedigree-modal glass-panel pad-md text-center flex-col animate-slide-in" style="max-width: 480px; width: 95%; display: flex; gap: 1rem; max-height: 85vh; overflow-y: auto; background: rgba(255, 255, 255, 0.95); border: 2px solid var(--primary-accent); padding: 1.5rem; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,77,64,0.15);">
        <h3 style="font-weight: 800; color: var(--text-main); display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 1.15rem; margin-bottom: 0rem; letter-spacing: -0.2px;">
          🧬 Árbol de Linaje de ${wokamon.name}
        </h3>
        <p class="subtitle" style="font-size: 0.72rem; color: var(--text-grey); margin-bottom: 0.25rem; margin-top: -0.25rem;">
          Variabilidad Genética (Heterocigosis): <strong style="color: var(--primary-accent); font-weight: 800;">${wokamon.heterozygosity}%</strong>
        </p>
        <p style="font-size: 0.62rem; color: var(--text-grey); font-style: italic; margin-top: -0.4rem; margin-bottom: 0.5rem;">
          💡 Expande el linaje pulsando en "Ver Padres" para retroceder en las generaciones conocidas.
        </p>

        <!-- Dynamic Tree Flowchart Area -->
        <div class="pedigree-tree-flow" style="display: flex; flex-direction: column; align-items: center; width: 100%; margin: 0.25rem 0;">
          
          <!-- Generation 1: The Child -->
          <div class="pedigree-row-container" style="display: flex; flex-direction: column; align-items: center; width: 100%;">
            <div class="pedigree-node active-node glass-panel-inner text-center ${wokamon.status === 'dead' ? 'node-ghost-spectral' : ''}" style="border: 2px solid var(--primary-accent); background: rgba(0, 172, 193, 0.08); min-width: 170px; padding: 0.65rem; border-radius: 10px; box-shadow: 0 0 15px rgba(0,172,193,0.08); position: relative;">
              <span class="lbl" style="font-size: 0.55rem; color: var(--primary-accent); font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 0.2rem; letter-spacing: 0.5px;">CRIATURA SELECCIONADA</span>
              <div style="height: 48px; display: flex; align-items: center; justify-content: center; margin: 0.15rem 0;">
                <div style="width: 40px; height: 40px;">${renderWokamonSVG(wokamon)}</div>
              </div>
              <h4 style="font-size: 0.8rem; font-weight: 800; margin: 0 0 0.15rem 0; color: var(--text-main);">${wokamon.name}</h4>
              <span class="gen-tag" style="font-size: 0.52rem; padding: 0.05rem 0.25rem; background: rgba(0,0,0,0.04); border-radius: 4px; color: var(--text-grey);">Gen ${wokamon.generation}</span>
              
              ${wokamon.familyTree ? `
                <button class="btn btn-primary btn-toggle-ancestors" data-target-id="parents-root" style="margin-top: 0.5rem; font-size: 0.6rem; padding: 0.2rem 0.4rem; font-weight: 700; width: 100%; cursor: pointer;">
                  🧬 Ver Padres [+]
                </button>
              ` : `
                <div style="font-size: 0.52rem; color: var(--text-grey); font-style: italic; margin-top: 0.45rem;">(Fundador Salvaje)</div>
              `}
            </div>

            <!-- Root Accordion -->
            ${wokamon.familyTree ? `
              <div class="pedigree-parents-accordion" id="parents-root" style="display: none; width: 100%; border-left: 2px dashed rgba(0, 172, 193, 0.3); margin-left: 0.5rem; padding-left: 0.5rem; margin-top: 0.4rem;">
                <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%;">
                  ${renderNodeHTML(wokamon.familyTree.parentA, 'Padre A (EP Line)')}
                  ${renderNodeHTML(wokamon.familyTree.parentB, 'Padre B (Amigo Line)')}
                </div>
              </div>
            ` : ''}

          </div>

        </div>

        <button class="btn btn-primary" id="btn-close-pedigree" style="width: 100%; padding: 0.75rem; font-size: 0.8rem; font-weight: 700; margin-top: 0.75rem; border-radius: 8px;">Cerrar Linaje</button>
      </div>
    `;
    
    document.body.appendChild(overlay);

    // Event delegation click listener inside modal overlay to toggle accordion expanders
    overlay.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('.btn-toggle-ancestors');
      if (toggleBtn) {
        const targetId = toggleBtn.dataset.targetId;
        const targetEl = overlay.querySelector(`#${targetId}`);
        if (targetEl) {
          const isHidden = targetEl.style.display === 'none';
          targetEl.style.display = isHidden ? 'block' : 'none';
          toggleBtn.textContent = isHidden ? '🧬 Ocultar Ancestros [-]' : '🧬 Ver Padres [+]';
          toggleBtn.style.background = isHidden ? '#ff5252' : 'var(--primary-accent)';
          toggleBtn.style.color = '#fff';
        }
      }
    });

    overlay.querySelector('#btn-close-pedigree').addEventListener('click', () => {
      overlay.remove();
    });
  }

  render() {
    if (!this.container) return;

    const user = store.getUser();
    const wokamons = store.getWokamons();
    const shop = store.getShop();

    const livingWokamons = wokamons.filter(w => w.status !== 'dead');
    const numLiving = livingWokamons.length;
    
    // Calculate consumption scaling
    let decayMultiplier = 1;
    if (numLiving > 1) {
      decayMultiplier = 1 + (numLiving - 1) * 0.6;
    }

    this.container.innerHTML = `
      <div class="stable-manager glass-panel" id="stable-view">
        <div class="stable-header-row">
          <div>
            <h2 class="section-title">Tu Criadero Wokamon</h2>
            <p class="subtitle">Alimentas a tus criaturas con Energía de Pasos (EP). Si no caminas, se deprimirán y morirán de hambre.</p>
          </div>
          
          <div class="nursery-badge glass-panel-inner ${numLiving >= 4 ? 'nursery-overcrowded' : ''}">
            <span class="count">${wokamons.length} Criaturas</span>
            <span class="mult">Tasa de Hambre: <strong>${decayMultiplier.toFixed(1)}x</strong></span>
          </div>
        </div>

        ${numLiving >= 3 ? `
          <div class="overcrowded-warning flex-center">
            <svg viewBox="0 0 24 24" class="warning-icon animate-pulse"><path fill="currentColor" d="M12,2L1,21H23L12,2M12,18A1.5,1.5,0,1,1,13.5,16.5A1.5,1.5,0,0,1,12,18M13,10H11V15H13V10Z"/></svg>
            <span><strong>¡Advertencia de Superpoblación!</strong> Tienes muchas criaturas vivas en el criadero. Consumen comida un <strong>${Math.round((decayMultiplier-1)*100)}%</strong> más rápido. Considera liberar o regalar algunas para que no mueran de hambre.</span>
          </div>
        ` : ''}

        <!-- Wokamons Card Grid -->
        ${wokamons.length === 0 ? `
          <div class="empty-stable-card glass-panel-inner flex-center flex-col pad-lg text-center" style="margin: 1.5rem 0; gap: 1rem; border: 2px dashed rgba(255,255,255,0.08); border-radius: 12px; padding: 2rem;">
            <div style="font-size: 3rem; animation: bounce-wok 2s infinite;">🥚</div>
            <h3 style="font-weight: 700; margin-bottom: 0.25rem;">Tu criadero está vacío</h3>
            <p class="subtitle" style="max-width: 400px; margin: 0 auto; line-height: 1.4;">Tu criadero está vacío. ¡Da tus primeros pasos arriba para atraer a tu primera criatura!</p>
          </div>
        ` : `
          <div class="wokamon-stable-grid">
            ${wokamons.map(w => {
              const isDead = w.status === 'dead';
              const isStarving = w.status === 'starving';
              const isDepressed = w.status === 'depressed';
              const isSick = w.status === 'sick';
              
              let statusBadge = '<span class="status-tag tag-happy">Feliz</span>';
              if (isDead) statusBadge = '<span class="status-tag tag-dead">Muerto (Fantasma)</span>';
              else if (isSick) statusBadge = '<span class="status-tag tag-sick animate-pulse">¡Enfermo! 🦠</span>';
              else if (isStarving) statusBadge = '<span class="status-tag tag-starving animate-pulse">¡Hambriento!</span>';
              else if (isDepressed) statusBadge = '<span class="status-tag tag-depressed">Deprimido</span>';

              // Hybrid Vigor biological bonus indicators
              let vigorBadge = '';
              let vigorDesc = '';
              if (w.heterozygosity >= 80) {
                vigorBadge = '<span class="status-tag" style="background: rgba(0, 172, 193, 0.12); color: var(--primary-accent); border: 1px solid rgba(0, 172, 193, 0.25);">Vigor Extremo</span>';
                vigorDesc = '⚡ Vigor Híbrido Extremo: +30% crecimiento, -25% hambre.';
              } else if (w.heterozygosity >= 40) {
                vigorBadge = '<span class="status-tag" style="background: rgba(139, 195, 74, 0.12); color: #aed581; border: 1px solid rgba(139, 195, 74, 0.25);">Vigor Alto</span>';
                vigorDesc = '⚡ Vigor Híbrido Alto: +15% crecimiento.';
              } else {
                vigorBadge = '<span class="status-tag" style="background: rgba(255, 87, 34, 0.1); color: #ffab91; border: 1px solid rgba(255, 87, 34, 0.25);">Homocigoto</span>';
                vigorDesc = '⚠️ Homocigosis alta: sin bonos de vigor.';
              }

              let epigeneticBadge = '';
              if (w.efficientMetabolism) {
                epigeneticBadge = '<span class="status-tag tag-epigenetic" style="background: rgba(103, 58, 183, 0.15); color: #9575cd; border: 1px solid rgba(103, 58, 183, 0.3);">Epigenético 🧬</span>';
                vigorDesc = '🧬 Epigenética: -15% hambre. ' + vigorDesc;
              }

              // Hunger color coding
              let hungerClass = 'bar-green';
              if (w.hunger <= 25) hungerClass = 'bar-red';
              else if (w.hunger <= 50) hungerClass = 'bar-orange';

              // Scale factor from expressed genes
              const scale = getWokamonScale(w.genotype);
              const sizeName = scale === 1.25 ? 'Grande 🦖' : (scale === 0.85 ? 'Pequeño 👶' : 'Mediano 🐢');

              return `
                <div class="wokamon-card glass-panel-inner ${isDead ? 'card-ghost-opacity' : ''} ${isStarving || isDepressed ? 'card-low-energy' : ''} ${isSick ? 'card-sick-state' : ''}" data-id="${w.id}">
                  <div class="card-header">
                    <div class="card-title-block">
                      <h3 style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        ${w.name}
                        <span class="gen-tag">Gen ${w.generation}</span>
                      </h3>
                      <div class="card-tags-row" style="display: flex; gap: 0.35rem; margin-top: 0.35rem; flex-wrap: wrap;">
                        ${statusBadge}
                        <span class="stage-tag stage-${w.stage.toLowerCase()}">${w.stage}</span>
                        ${vigorBadge}
                        ${epigeneticBadge}
                      </div>
                    </div>
                    <span class="level-badge">Nivel ${w.level}</span>
                  </div>

                  <div class="card-render-wrapper" style="overflow: hidden;">
                    <div style="transform: scale(${scale}); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; transition: transform 0.3s ease;">
                      ${renderWokamonSVG(w)}
                    </div>
                  </div>

                  <div class="card-stats-block">
                    <div class="stat-row">
                      <span class="lbl">Edad y Tamaño:</span>
                      <span class="val">${Math.floor(w.age)} d | <strong>${sizeName}</strong></span>
                    </div>

                    <div class="stat-row">
                      <span class="lbl">Heterocigosis:</span>
                      <span class="val" style="color: var(--primary-accent); font-weight: 800;">${w.heterozygosity}%</span>
                    </div>

                    <div class="stat-row" style="font-size: 0.62rem; color: var(--text-grey); font-style: italic; margin-top: -0.2rem; margin-bottom: 0.1rem; line-height: 1.3;">
                      <span>${vigorDesc}</span>
                    </div>

                    <!-- Main Stats bars -->
                    <div class="progress-indicator">
                      <div class="lbl-row">
                        <span>Nutrición / Hambre:</span>
                        <strong>${w.hunger}%</strong>
                      </div>
                      <div class="progress-bar-container">
                        <div class="progress-bar-fill ${hungerClass}" style="width: ${w.hunger}%"></div>
                      </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: -0.1rem;">
                      <div class="progress-indicator">
                        <div class="lbl-row">
                          <span>Alegría:</span>
                          <strong>${w.joy !== undefined ? w.joy : 100}%</strong>
                        </div>
                        <div class="progress-bar-container" style="height: 6px;">
                          <div class="progress-bar-fill bar-pink" style="width: ${w.joy !== undefined ? w.joy : 100}%"></div>
                        </div>
                      </div>

                      <div class="progress-indicator">
                        <div class="lbl-row">
                          <span>Vitalidad:</span>
                          <strong>${w.vitality !== undefined ? w.vitality : 100}%</strong>
                        </div>
                        <div class="progress-bar-container" style="height: 6px;">
                          <div class="progress-bar-fill bar-vitality" style="width: ${w.vitality !== undefined ? (w.vitality / (w.genetics.bodyType === 'round' || w.genetics.bodyType === 'oval' ? 1.2 : 1.0)) : 100}%"></div>
                        </div>
                      </div>
                    </div>

                    <div class="progress-indicator">
                      <div class="lbl-row">
                        <span>Carga Viral / Enfermedad:</span>
                        <strong style="color: ${w.disease > 50 ? '#d32f2f' : 'var(--text-grey)'};">${w.disease !== undefined ? w.disease : 0}%</strong>
                      </div>
                      <div class="progress-bar-container" style="height: 6px;">
                        <div class="progress-bar-fill bar-disease" style="width: ${w.disease !== undefined ? w.disease : 0}%"></div>
                      </div>
                    </div>

                    <div class="progress-indicator">
                      <div class="lbl-row">
                        <span>Crecimiento (Nivel):</span>
                        <strong>${w.growth}%</strong>
                      </div>
                      <div class="progress-bar-container" style="height: 6px;">
                        <div class="progress-bar-fill bar-blue" style="width: ${w.growth}%"></div>
                      </div>
                    </div>
                  </div>

                  <div class="card-footer-actions">
                    ${isDead ? `
                      <div class="dropdown-actions-row">
                        <button class="btn btn-action-card btn-secondary btn-pedigree-action" data-id="${w.id}">Ver Pedigrí 🧬</button>
                        <button class="btn btn-action-card btn-danger-outline btn-release-action" data-id="${w.id}">Memorializar</button>
                      </div>
                    ` : `
                      ${isSick ? `
                        <button class="btn btn-action-card btn-cure-action ${user.crystals < 10 ? 'btn-disabled' : ''}" data-id="${w.id}" style="background: linear-gradient(135deg, #7b1fa2, #ab47bc); color: #fff; font-weight: 700; border: none;">
                          Dar Medicina (-10 💎) 💊
                        </button>
                      ` : `
                        <button class="btn btn-action-card btn-primary btn-feed-action ${user.totalEnergy < 15 ? 'btn-disabled' : ''}" data-id="${w.id}">
                          Alimentar (-15 EP)
                        </button>
                      `}
                      
                      <div class="dropdown-actions-row">
                        <button class="btn btn-action-card btn-secondary btn-pedigree-action" data-id="${w.id}" title="Ver Árbol Genealógico">Pedigrí 🧬</button>
                        <button class="btn btn-action-card btn-secondary btn-gift-action" data-id="${w.id}" title="Regalar Wokamon a un Antiguo">Regalar 🎁</button>
                        <button class="btn btn-action-card btn-danger-outline btn-release-action" data-id="${w.id}" title="Liberar en la Naturaleza">Soltar 🍃</button>
                      </div>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}

        <!-- Claim Gift Egg Panel -->
        <div class="claim-gift-panel glass-panel-inner">
          <div class="claim-header">
            <h3>¿Recibiste un Regalo de un Amigo?</h3>
            <p>Pega el código de regalo Base64 aquí abajo para importar su Wokamon o huevo genético en tu criadero.</p>
          </div>
          
          <div class="claim-input-row">
            <input type="text" id="gift-claim-code-input" placeholder="Pega el código Base64 aquí...">
            <button class="btn btn-primary" id="btn-claim-gift-egg">Adoptar Código 🎁</button>
          </div>
        </div>

        <!-- Premium Rare genetics Shop -->
        <div class="rare-genes-shop">
          <h3 class="shop-title">🧬 Tienda de Genes Raros y Mutaciones</h3>
          <p class="subtitle">Adquiere genes raros con tus cristales. Los genes comprados aparecerán aleatoriamente como mutaciones exclusivas en futuros cruces.</p>
          
          <div class="genes-grid">
            <!-- Wing Gene Card -->
            <div class="gene-card glass-panel-inner">
              <span class="gene-type">GEN DE ALAS</span>
              <h4>Alas de Dragón 🐉</h4>
              <p>Otorga alas de demonio/dragón imponentes de color oscuro.</p>
              
              <div class="gene-buy-row">
                <span class="crystal-price">💎 20 Cristales</span>
                ${shop.unlockedGenes.includes('dragon') ? `
                  <span class="gene-unlocked-badge">DESBLOQUEADO</span>
                ` : `
                  <button class="btn btn-secondary btn-buy-gene" data-gene="dragon" data-cost="20" ${user.crystals < 20 ? 'disabled' : ''}>
                    Comprar
                  </button>
                `}
              </div>
            </div>

            <!-- Horns Gene Card -->
            <div class="gene-card glass-panel-inner">
              <span class="gene-type">GEN DE CUERNOS</span>
              <h4>Cuernos de Neón ⚡</h4>
              <p>Otorga un afilado cuerno de energía neón que brilla en la oscuridad.</p>
              
              <div class="gene-buy-row">
                <span class="crystal-price">💎 25 Cristales</span>
                ${shop.unlockedGenes.includes('neon') ? `
                  <span class="gene-unlocked-badge">DESBLOQUEADO</span>
                ` : `
                  <button class="btn btn-secondary btn-buy-gene" data-gene="neon" data-cost="25" ${user.crystals < 25 ? 'disabled' : ''}>
                    Comprar
                  </button>
                `}
              </div>
            </div>

            <!-- Eyes Gene Card -->
            <div class="gene-card glass-panel-inner">
              <span class="gene-type">GEN DE OJOS</span>
              <h4>Ojos de Fuego 🔥</h4>
              <p>Desbloquea ojos encendidos con llamaradas de fuego animadas.</p>
              
              <div class="gene-buy-row">
                <span class="crystal-price">💎 15 Cristales</span>
                ${shop.unlockedGenes.includes('fire') ? `
                  <span class="gene-unlocked-badge">DESBLOQUEADO</span>
                ` : `
                  <button class="btn btn-secondary btn-buy-gene" data-gene="fire" data-cost="15" ${user.crystals < 15 ? 'disabled' : ''}>
                    Comprar
                  </button>
                `}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Hook Feeding Actions
    this.container.querySelectorAll('.btn-feed-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const fed = store.feedWokamon(id, 15);
        if (fed) {
          this.playActionSound(350, 440);
        }
      });
    });

    // Hook Curing Actions
    this.container.querySelectorAll('.btn-cure-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const cured = store.cureWokamon(id);
        if (cured) {
          this.playActionSound(523, 880);
          alert("¡Tu Wokamon ha sido curado con éxito! 💊");
        } else {
          alert("No tienes suficientes cristales. Cuesta 10 Cristales 💎 comprar medicina.");
        }
      });
    });

    // Hook Gifting Actions
    this.container.querySelectorAll('.btn-gift-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const targetWok = wokamons.find(w => w.id === id);
        if (targetWok) {
          this.showGiftModal(targetWok);
        }
      });
    });

    // Hook Pedigree Actions
    this.container.querySelectorAll('.btn-pedigree-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const targetWok = wokamons.find(w => w.id === id);
        if (targetWok) {
          this.showPedigreeModal(targetWok);
        }
      });
    });

    // Hook Releasing / Memorializing Actions
    this.container.querySelectorAll('.btn-release-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const targetWok = wokamons.find(w => w.id === id);
        if (!targetWok) return;

        if (targetWok.status === 'dead') {
          // Memorialize (remove dead bicho)
          store.releaseWokamon(id); // removes from list
          this.playActionSound(220, 150);
          return;
        }

        const confirmRelease = confirm(`¿Estás seguro de liberar a ${targetWok.name} en la naturaleza? Se irá para siempre y te dará +15 Cristales.`);
        if (confirmRelease) {
          const released = store.releaseWokamon(id);
          if (released) {
            this.playActionSound(440, 523);
          } else {
            alert("¡No puedes liberar a tu última criatura! Debes mantener al menos una para continuar jugando.");
          }
        }
      });
    });

    // Hook Gift Claims
    const claimBtn = this.container.querySelector('#btn-claim-gift-egg');
    if (claimBtn) {
      claimBtn.addEventListener('click', () => {
        const input = this.container.querySelector('#gift-claim-code-input');
        const code = input.value.trim();
        if (!code) return;

        const claimed = store.claimGiftedCode(code);
        if (claimed) {
          this.playActionSound(523, 659);
          if (claimed.type === 'egg') {
            alert(`¡Huevo Adoptado con éxito! Se ha añadido "${claimed.item.name}" a tu incubadora.`);
          } else {
            alert(`¡Wokamon Adoptado con éxito! Se ha añadido "${claimed.item.name}" a tu criadero.`);
          }
          input.value = '';
        } else {
          alert("Código de regalo inválido o corrupto. Por favor, asegúrate de copiar el código completo sin espacios.");
        }
      });
    }

    // Hook Shop Purchases
    this.container.querySelectorAll('.btn-buy-gene').forEach(btn => {
      btn.addEventListener('click', () => {
        const gene = btn.dataset.gene;
        const cost = parseInt(btn.dataset.cost);
        const bought = store.buyShopGene(gene, cost);
        if (bought) {
          this.playActionSound(659, 880);
          alert(`¡Gen "${gene}" desbloqueado con éxito! Se descontaron ${cost} cristales.`);
        }
      });
    });
  }

  playActionSound(f1, f2) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f1, ctx.currentTime);
      osc.frequency.setValueAtTime(f2, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch(e) {}
  }
}
