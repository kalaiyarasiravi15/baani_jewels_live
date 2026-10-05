const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Disable sharp file cache so Windows never locks files
sharp.cache(false);

const uploadsDir = path.join(__dirname, '../uploads');

async function optimizeImages() {
  console.log('══ Starting High-Performance Image Optimization (Buffer-Mode) ══');
  
  if (!fs.existsSync(uploadsDir)) {
    throw new Error('Uploads dir does not exist');
  }

  const files = fs.readdirSync(uploadsDir);
  const imageFiles = files.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) && !f.startsWith('temp-');
  });

  console.log(`Found ${imageFiles.length} image files to check.`);

  let totalBefore = 0;
  let totalAfter = 0;
  let optimizedCount = 0;

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const fullPath = path.join(uploadsDir, file);
    
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch (_) {
      continue;
    }
    totalBefore += stat.size;

    // Optimize if file > 180 KB
    if (stat.size > 180 * 1024) {
      try {
        const inputBuffer = fs.readFileSync(fullPath);
        const metadata = await sharp(inputBuffer).metadata();
        const maxDim = 1200;
        let resizeOptions = {};
        if (metadata.width > maxDim || metadata.height > maxDim) {
          if (metadata.width >= metadata.height) {
            resizeOptions = { width: maxDim, withoutEnlargement: true };
          } else {
            resizeOptions = { height: maxDim, withoutEnlargement: true };
          }
        }

        let pipeline = sharp(inputBuffer).rotate();
        if (Object.keys(resizeOptions).length > 0) {
          pipeline = pipeline.resize(resizeOptions);
        }

        const ext = path.extname(file).toLowerCase();
        let outputBuffer;
        if (ext === '.png') {
          outputBuffer = await pipeline.png({ quality: 80, compressionLevel: 8 }).toBuffer();
        } else if (ext === '.webp') {
          outputBuffer = await pipeline.webp({ quality: 80 }).toBuffer();
        } else {
          outputBuffer = await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
        }

        if (outputBuffer.length < stat.size) {
          fs.writeFileSync(fullPath, outputBuffer);
          totalAfter += outputBuffer.length;
          optimizedCount++;
        } else {
          totalAfter += stat.size;
        }
      } catch (err) {
        console.warn(`Could not optimize ${file}: ${err.message}`);
        totalAfter += stat.size;
      }
    } else {
      totalAfter += stat.size;
    }

    if ((i + 1) % 50 === 0 || i === imageFiles.length - 1) {
      console.log(`Optimized ${optimizedCount} / ${i + 1} checked...`);
    }
  }

  const savedMB = ((totalBefore - totalAfter) / 1024 / 1024).toFixed(2);
  const beforeMB = (totalBefore / 1024 / 1024).toFixed(2);
  const afterMB = (totalAfter / 1024 / 1024).toFixed(2);

  console.log('════════════════════════════════════════════════════');
  console.log(` Optimization Complete!`);
  console.log(` • Images Optimized: ${optimizedCount}`);
  console.log(` • Original Size: ${beforeMB} MB`);
  console.log(` • New Size: ${afterMB} MB`);
  console.log(` • Bandwidth Saved: ${savedMB} MB (${Math.round((totalBefore - totalAfter) / totalBefore * 100)}% reduction!)`);
  console.log('════════════════════════════════════════════════════');
}

optimizeImages()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
