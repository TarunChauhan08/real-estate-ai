import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/lib/site';

/** The preview card shown when the site is shared on WhatsApp, LinkedIn, X or Facebook. */
export const alt = `${SITE_NAME} — AI sales agent for real estate in India`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: 'linear-gradient(135deg, #071429 0%, #0c1f3f 60%, #1a3460 100%)',
        color: 'white',
        fontFamily: 'Georgia, serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="44" height="44" viewBox="0 0 32 32">
            <path
              d="M7 15.5 16 8l9 7.5"
              fill="none"
              stroke="#c8a25a"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10.5 14v10h4v-5.5h3V24h4V14"
              fill="none"
              stroke="white"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div style={{ fontSize: 30, fontFamily: 'sans-serif', fontWeight: 700 }}>{SITE_NAME}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 30, color: '#c8a25a', fontFamily: 'sans-serif', letterSpacing: 2 }}>
          AI SALES AGENT FOR REAL ESTATE IN INDIA
        </div>
        <div style={{ fontSize: 72, lineHeight: 1.08, marginTop: 20, maxWidth: 1000 }}>
          Every enquiry answered. Every serious buyer on your calendar.
        </div>
      </div>
      <div style={{ fontSize: 28, color: '#aebfda', fontFamily: 'sans-serif' }}>
        WhatsApp · Hindi · English · Hinglish
      </div>
    </div>,
    size,
  );
}
