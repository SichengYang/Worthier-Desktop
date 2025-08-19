// High-quality device icons using Bootstrap Icons

// Apple/macOS icon using Bootstrap's Apple icon
export function AppleIcon({ size = 24, className = "" }) {
  return (
    <i 
      className={`bi bi-apple ${className}`} 
      style={{ 
        fontSize: `${size}px`, 
        lineHeight: '1',
        color: '#000',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    ></i>
  );
}

// Windows icon using Bootstrap's Windows icon
export function MicrosoftIcon({ size = 24, className = "" }) {
  return (
    <i 
      className={`bi bi-windows ${className}`} 
      style={{ 
        fontSize: `${size}px`, 
        lineHeight: '1',
        color: '#0078d4',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    ></i>
  );
}

// Alternative: Linux icon for other platforms
export function LinuxIcon({ size = 24, className = "" }) {
  return (
    <i 
      className={`bi bi-ubuntu ${className}`} 
      style={{ 
        fontSize: `${size}px`, 
        lineHeight: '1',
        color: '#e95420',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    ></i>
  );
}
