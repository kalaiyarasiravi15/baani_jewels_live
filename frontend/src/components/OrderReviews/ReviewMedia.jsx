import React from 'react';
import { API_BASE } from '../../config/apiConfig';
export const parseReviewMedia = value => { try { const files = Array.isArray(value) ? value : JSON.parse(value || '[]'); return Array.isArray(files) ? files.filter(file => typeof file === 'string') : []; } catch { return []; } };
export const isReviewVideo = file => /\.(mp4|webm)$/i.test(file);
export default function ReviewMedia({ value }) {
  const files = parseReviewMedia(value);
  return <div className="review-media-groups">
    {[false, true].map(video => {
      const group = files.filter(file => isReviewVideo(file) === video);
      return group.length ? <section key={String(video)}><strong>{video ? 'Videos' : 'Photos'}</strong><div className="review-media-grid">
        {group.map(file => {
          const src = API_BASE + '/uploads/' + encodeURIComponent(file);
          return video ? <video key={file} src={src} controls preload="metadata" aria-label="Customer review video" /> : <a key={file} href={src} target="_blank" rel="noreferrer"><img src={src} alt="Customer review photo" loading="lazy" /></a>;
        })}
      </div></section> : null;
    })}
  </div>;
}
