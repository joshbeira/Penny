// SPEC 4: the product's single visual signature — a 10px amber dot that pulses
// whenever Penny is speaking or playing an earcon. aria-hidden per SPEC 10.
// A <span> rather than a <div> so it stays valid phrasing content inside
// Splash's full-screen <button>.
//
// P2 adds the .sound-dot--speaking class (keyframes already in styles.css)
// while audio.ts reports playback.
export default function SoundDot() {
  return (
    <span
      aria-hidden="true"
      className="block h-[10px] w-[10px] shrink-0 rounded-full bg-amber"
    />
  );
}
