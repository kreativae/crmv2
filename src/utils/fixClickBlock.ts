/**
 * Fix para problema de cliques bloqueados por overlays "presos"
 * 
 * Este utilitário limpa overlays que podem ter ficado no DOM
 * após animações de fechamento incompletas.
 */
import { logger } from './logger';

// Lista de classes que identificam overlays (para referência)
// '.fixed.inset-0', '[class*="backdrop"]', '[class*="z-40"]', etc.

/**
 * Remove overlays órfãos que estão bloqueando cliques
 */
export function cleanupOrphanedOverlays(): void {
  // Encontra todos os elementos fixed que cobrem toda a tela
  const fixedElements = document.querySelectorAll('.fixed');
  
  fixedElements.forEach(el => {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    
    // Se o elemento cobre toda a tela e está invisível (opacity 0), remove
    if (
      rect.width === window.innerWidth &&
      rect.height === window.innerHeight &&
      (style.opacity === '0' || style.pointerEvents === 'none')
    ) {
      el.remove();
    }
  });
}

/**
 * Verifica se há algum overlay bloqueando cliques
 */
export function hasBlockingOverlay(): boolean {
  const fixedElements = document.querySelectorAll('.fixed.inset-0');
  
  for (const el of fixedElements) {
    const style = window.getComputedStyle(el);
    if (style.pointerEvents !== 'none' && parseFloat(style.opacity) > 0) {
      return true;
    }
  }
  
  return false;
}

/**
 * Handler de emergência para "destravar" cliques
 * Pode ser chamado pelo usuário pressionando ESC várias vezes
 */
let escPressCount = 0;
let escResetTimeout: NodeJS.Timeout | null = null;

export function initEmergencyUnblock(): void {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      escPressCount++;
      
      if (escResetTimeout) {
        clearTimeout(escResetTimeout);
      }
      
      escResetTimeout = setTimeout(() => {
        escPressCount = 0;
      }, 1000);
      
      // Se ESC for pressionado 3 vezes em 1 segundo, força limpeza
      if (escPressCount >= 3) {
        logger.log('[NexCRM] Emergency cleanup triggered');
        forceCleanup();
        escPressCount = 0;
      }
    }
  });
}

/**
 * Força limpeza de todos os overlays
 */
export function forceCleanup(): void {
  // Remove todos os elementos fixed com inset-0 que têm z-index alto
  document.querySelectorAll('.fixed.inset-0').forEach(el => {
    const zIndex = window.getComputedStyle(el).zIndex;
    if (parseInt(zIndex) >= 40) {
      logger.log('[NexCRM] Removing stuck overlay:', el);
      el.remove();
    }
  });
  
  // Reseta pointer-events no body
  document.body.style.pointerEvents = '';
  document.body.style.overflow = '';
  
  // Dispara evento customizado para que componentes React possam reagir
  window.dispatchEvent(new CustomEvent('nexcrm:emergency-cleanup'));
}
