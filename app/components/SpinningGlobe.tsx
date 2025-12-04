"use client";

export default function SpinningGlobe({ size = 80 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        perspective: '1000px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          animation: 'globeSpin 8s linear infinite',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.3) 0%, rgba(59, 130, 246, 0.2) 50%, rgba(234, 88, 12, 0.3) 100%)',
          boxShadow: 'inset -10px -10px 30px rgba(0, 0, 0, 0.4), inset 10px 10px 30px rgba(255, 255, 255, 0.1), 0 0 40px rgba(234, 88, 12, 0.3)',
          border: '2px solid rgba(234, 88, 12, 0.5)',
        }}
      >
        {/* Latitude lines */}
        {[75, 45, 0, -45, -75].map((angle, i) => (
          <div
            key={`lat-${i}`}
            style={{
              position: 'absolute',
              left: '10%',
              right: '10%',
              top: '50%',
              height: '80%',
              transform: `translateY(-50%) rotateX(${angle}deg)`,
              borderRadius: '50%',
              border: '1px solid rgba(234, 88, 12, 0.5)',
            }}
          />
        ))}
        {/* Longitude lines */}
        {[0, 60, 120].map((angle, i) => (
          <div
            key={`lng-${i}`}
            style={{
              position: 'absolute',
              top: '10%',
              bottom: '10%',
              left: '50%',
              width: '80%',
              transform: `translateX(-50%) rotateY(${angle}deg)`,
              borderRadius: '50%',
              border: '1px solid rgba(234, 88, 12, 0.5)',
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes globeSpin {
          from { transform: rotateY(0deg) rotateX(-15deg); }
          to { transform: rotateY(360deg) rotateX(-15deg); }
        }
      `}</style>
    </div>
  );
}
