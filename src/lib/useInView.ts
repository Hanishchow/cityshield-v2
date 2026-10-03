import { useEffect, useRef, useState } from 'react';

/** True while the element is on screen and the tab is visible — used to pause 3D rendering. */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  useEffect(() => {
    const el = ref.current;
    const io = el ? new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: '80px' }) : null;
    if (el && io) io.observe(el);
    const vis = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', vis);
    return () => { io?.disconnect(); document.removeEventListener('visibilitychange', vis); };
  }, []);
  return { ref, inView: onScreen && visible };
}
