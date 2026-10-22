'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { desktopCapturer, screen } = require('electron');

/**
 * Captures the real, composited window (chrome UI + embedded page views)
 * using the OS screen capture pipeline, cropped to the window rectangle.
 */
async function captureWindow(win, file, options = {}) {
  if (!win || win.isDestroyed()) return null;
  try {
    if (!options.noActivate) {
      win.show();
      win.moveTop();
    }
    await delay(420);

    const bounds = win.getBounds();
    const contentBounds = typeof win.getContentBounds === 'function' ? win.getContentBounds() : bounds;
    console.log('[demo] bounds', JSON.stringify(bounds), 'content', JSON.stringify(contentBounds));
    const display = screen.getDisplayMatching(bounds);
    const scale = display.scaleFactor || 1;
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.round(display.bounds.width * scale),
        height: Math.round(display.bounds.height * scale)
      },
      fetchWindowIcons: false
    });
    if (!sources.length) throw new Error('No screen sources available');
    const source = sources.find((s) => String(s.display_id) === String(display.id)) || sources[0];
    const thumb = source.thumbnail;
    if (!thumb || thumb.isEmpty()) throw new Error('Empty screen thumbnail');

    const thumbSize = thumb.getSize();
    const sx = thumbSize.width / display.bounds.width;
    const sy = thumbSize.height / display.bounds.height;

    let x = Math.round((contentBounds.x - display.bounds.x) * sx);
    let y = Math.round((contentBounds.y - display.bounds.y) * sy);
    let width = Math.round(contentBounds.width * sx);
    let height = Math.round(contentBounds.height * sy);
    x = Math.max(0, Math.min(x, thumbSize.width - 10));
    y = Math.max(0, Math.min(y, thumbSize.height - 10));
    width = Math.min(width, thumbSize.width - x);
    height = Math.min(height, thumbSize.height - y);

    const cropped = thumb.crop({ x, y, width, height });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, cropped.toPNG());
    console.log('[demo] captured', file, cropped.getSize());
    return file;
  } catch (err) {
    console.error('[demo] capture failed:', err.message);
    return null;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { captureWindow, delay };
