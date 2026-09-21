/** Browser expressions are kept separate so input races can be tested without
 * starting the complete browser smoke or changing the production scheduler. */
export function stableControlPointExpression(selector: string): string {
  return `(async () => {
    const selector = ${JSON.stringify(selector)};
    let previousNode = null;
    let previousBox = '';
    let stableFrames = 0;
    let diagnostic = 'document not ready';
    for (let frame = 0; frame < 120; frame += 1) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      if (document.readyState !== 'complete' || document.fonts?.status === 'loading') continue;
      const node = document.querySelector(selector);
      if (!(node instanceof HTMLElement)) throw new Error('Missing interactive element: ' + selector);
      if (node !== previousNode) {
        node.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
        previousNode = node;
        previousBox = '';
        stableFrames = 0;
        continue;
      }
      const rect = node.getBoundingClientRect();
      const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const style = getComputedStyle(node);
      const hit = document.elementFromPoint(point.x, point.y);
      const usable = rect.width > 0 && rect.height > 0 && point.x >= 0 && point.y >= 0 && point.x < innerWidth && point.y < innerHeight && style.visibility === 'visible' && !node.matches(':disabled') && hit !== null && node.contains(hit);
      const box = JSON.stringify([rect.x, rect.y, rect.width, rect.height]);
      stableFrames = usable && box === previousBox ? stableFrames + 1 : 0;
      diagnostic = JSON.stringify({ box, usable, hit: hit?.tagName });
      if (stableFrames >= 2) return point;
      previousBox = box;
    }
    throw new Error('Interactive element did not become stable and hittable: ' + selector + ': ' + diagnostic);
  })()`;
}

/** Arm before launch: observing and activating the short-lived control in one
 * browser task avoids a CDP round trip after observing ai.active. The click
 * runs the shipped button handler; it does not call or alter the controller. */
export function armFastForwardExpression(): string {
  return `(() => {
    const evidence = { status: 'WAITING', detail: null };
    globalThis.__V7_FAST_FORWARD_CONTROL__ = evidence;
    const observer = new MutationObserver(check);
    const timeout = setTimeout(() => finish('ERROR', 'Fast Forward control did not reach an AI or completed human boundary'), 90000);
    globalThis.__V7_FAST_FORWARD_CONTROL_CANCEL__ = () => finish('ERROR', 'Launch interaction failed before Fast Forward completed');
    function finish(status, detail = null) {
      observer.disconnect();
      clearTimeout(timeout);
      delete globalThis.__V7_FAST_FORWARD_CONTROL_CANCEL__;
      evidence.status = status;
      evidence.detail = detail;
    }
    function check() {
      try {
        const snapshot = globalThis.__PULP_WARS_APP__?.controller.snapshot();
        const view = snapshot?.view;
        if (snapshot?.phase === 'ERROR') throw new Error('Launch entered ERROR');
        if (snapshot?.ai.active) {
          const button = document.querySelector('[data-action="fast-forward"]');
          if (!(button instanceof HTMLButtonElement)) throw new Error('Active AI has no Fast Forward button');
          const rect = button.getBoundingClientRect();
          const style = getComputedStyle(button);
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          if (button.disabled || rect.width <= 0 || rect.height <= 0 || style.visibility !== 'visible' || hit === null || !button.contains(hit)) throw new Error('Active AI Fast Forward button is disabled, hidden or occluded');
          observer.disconnect();
          button.click();
          if (globalThis.__PULP_WARS_APP__.controller.snapshot().ai.fastForward !== true) throw new Error('Fast Forward button did not enable public ai.fastForward');
          finish('ACTIVATED');
        } else if (snapshot?.phase === 'ACTIVE' && !snapshot.transitioning && view?.commandIndex > 0 && view.turnOrder[view.activeSeatIndex] === view.humanPlayerId) {
          finish('COMPLETED');
        }
      } catch (error) {
        finish('ERROR', error instanceof Error ? error.message : String(error));
      }
    }
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    check();
  })()`;
}
