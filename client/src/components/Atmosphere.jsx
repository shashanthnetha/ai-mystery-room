/** Film grain + vignette overlays shared by every page. */
export default function Atmosphere() {
  return (
    <>
      <div aria-hidden className="grain-overlay" />
      <div aria-hidden className="vignette-overlay" />
    </>
  );
}
