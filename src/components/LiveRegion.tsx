// SPEC 15: one singleton live region. SPEC 6.3 step 1 mirrors every spoken
// string here, in every mode, for screen-reader parity — that wiring arrives
// with speak() in P2, so P1 mounts the element empty.
export default function LiveRegion() {
  return <div aria-live="polite" role="status" className="sr-only" />;
}
