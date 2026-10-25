/**
 * Rubber-stamp label. variants: gold | blood | moss | paper.
 * size: '' | 'sm' | 'lg'
 */
export function Stamp({ children, variant = 'gold', size = '', className = '' }) {
  return (
    <span className={`stamp stamp-${variant}${size ? ` stamp-${size}` : ''} ${className}`}>
      {children}
    </span>
  );
}

export default Stamp;
