const progress = document.querySelector('.world-progress');
const fill = document.querySelector('[data-progress-fill]');
const value = document.querySelector('[data-progress-value]');
const bar = document.querySelector('.world-progress-track');

if (progress && fill && value && bar) {
  const target = 99;
  const duration = 3000;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setProgress(amount) {
    const percent = Math.round(amount);
    fill.style.width = `${amount}%`;
    value.textContent = `${percent}%`;
    bar.setAttribute('aria-valuenow', percent);
    bar.setAttribute('aria-valuetext', `${percent} percent`);
  }

  if (reducedMotion) {
    setProgress(target);
  } else {
    progress.classList.add('is-loading');
    const startedAt = performance.now();
    const segmentCount = 12;
    const segmentWeights = Array.from({ length: segmentCount }, () => 0.55 + Math.random() * 0.9);
    const weightTotal = segmentWeights.reduce((sum, weight) => sum + weight, 0);
    const segmentEnds = [];
    let accumulated = 0;

    for (const weight of segmentWeights) {
      accumulated += (weight / weightTotal) * duration;
      segmentEnds.push(accumulated);
    }

    function animate(now) {
      const elapsed = Math.min(now - startedAt, duration);
      const segment = segmentEnds.findIndex((end) => elapsed <= end);
      const index = segment === -1 ? segmentCount - 1 : segment;
      const segmentStart = index === 0 ? 0 : segmentEnds[index - 1];
      const local = Math.min((elapsed - segmentStart) / (segmentEnds[index] - segmentStart), 1);
      const smooth = local * local * (3 - 2 * local);
      const startRatio = segmentStart / duration;
      const endRatio = segmentEnds[index] / duration;
      const nonlinear = (ratio) => ratio < 0.5
        ? 4 * ratio ** 3
        : 1 - ((-2 * ratio + 2) ** 3) / 2;
      const startValue = nonlinear(startRatio);
      const endValue = nonlinear(endRatio);
      setProgress(target * (startValue + (endValue - startValue) * smooth));

      if (elapsed < duration) requestAnimationFrame(animate);
      else progress.classList.remove('is-loading');
    }

    requestAnimationFrame(animate);
  }
}
