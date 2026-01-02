#!/usr/bin/env node

/**
 * Generate placeholder PNG images for walkthrough tutorial steps
 * Creates 7 images at 1600x1200 resolution, <200KB each
 */

const fs = require('fs');
const path = require('path');

// Try to use sharp if available, otherwise create minimal PNGs
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('sharp not available, creating minimal PNGs...');
}

const outputDir = path.join(__dirname, '..', 'media', 'walkthrough');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Image specifications
const images = [
  {
    filename: '01-cluster-view.png',
    title: 'Cluster View',
    description: 'Kube9 activity bar icon and cluster tree view',
    annotations: ['Activity Bar Icon', 'Tree View', 'Click here to open Kube9']
  },
  {
    filename: '02-cluster-manager.png',
    title: 'Cluster Manager',
    description: 'Cluster Manager UI with customization options',
    annotations: ['Custom Views', 'Namespace Organization', 'Customization Options']
  },
  {
    filename: '03-navigation.png',
    title: 'Navigation',
    description: 'Expanded namespace with resources visible',
    annotations: ['Expand Namespaces', 'Resource Hierarchy', 'Pods, Deployments, Services']
  },
  {
    filename: '04-view-resource.png',
    title: 'View Resource',
    description: 'Describe webview showing pod details',
    annotations: ['Pod Status', 'Conditions', 'Events', 'Click any pod to view details']
  },
  {
    filename: '05-logs.png',
    title: 'Pod Logs',
    description: 'Pod logs webview interface',
    annotations: ['Log Viewer', 'Search & Filter', 'Log Output']
  },
  {
    filename: '06-management.png',
    title: 'Resource Management',
    description: 'Context menu with scale and delete options',
    annotations: ['Right-click for options', 'Scale', 'Delete']
  },
  {
    filename: '07-documentation.png',
    title: 'Documentation',
    description: 'Command Palette and help resources',
    annotations: ['Command Palette', 'Documentation Links', 'Help Resources']
  }
];

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function createImageWithSharp(imageSpec) {
  const width = 1600;
  const height = 1200;
  
  // Escape XML special characters
  const escapedTitle = escapeXml(imageSpec.title);
  const escapedDescription = escapeXml(imageSpec.description);
  
  // Create SVG with text and annotations
  const svg = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#2d2d2d;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <text x="${width/2}" y="100" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#ffffff" text-anchor="middle">${escapedTitle}</text>
      <text x="${width/2}" y="160" font-family="Arial, sans-serif" font-size="24" fill="#cccccc" text-anchor="middle">${escapedDescription}</text>
      ${imageSpec.annotations.map((annotation, i) => {
        const x = 200 + (i % 4) * 350;
        const y = 300 + Math.floor(i / 4) * 250;
        const escapedAnnotation = escapeXml(annotation);
        return `
          <circle cx="${x}" cy="${y}" r="25" fill="#007acc" opacity="0.8"/>
          <line x1="${x}" y1="${y + 25}" x2="${x}" y2="${y + 80}" stroke="#007acc" stroke-width="3" marker-end="url(#arrowhead)"/>
          <text x="${x}" y="${y + 110}" font-family="Arial, sans-serif" font-size="18" fill="#ffffff" text-anchor="middle">${escapedAnnotation}</text>
        `;
      }).join('')}
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto">
          <polygon points="0 0, 10 3, 0 6" fill="#007acc"/>
        </marker>
      </defs>
      <text x="${width/2}" y="${height - 50}" font-family="Arial, sans-serif" font-size="18" fill="#888888" text-anchor="middle">Placeholder Image - Replace with final design</text>
    </svg>
  `);
  
  const pngBuffer = await sharp(svg)
    .png({ compressionLevel: 9, quality: 85 })
    .resize(width, height)
    .toBuffer();
  
  const outputPath = path.join(outputDir, imageSpec.filename);
  fs.writeFileSync(outputPath, pngBuffer);
  
  const stats = fs.statSync(outputPath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  console.log(`Created ${imageSpec.filename} (${sizeKB} KB)`);
  
  return sizeKB < 200;
}

function createMinimalPNG(imageSpec) {
  // Create a minimal valid PNG (1x1 pixel, then resize conceptually)
  // This is a fallback if sharp is not available
  // For now, we'll create a simple colored rectangle PNG
  
  const width = 1600;
  const height = 1200;
  
  // Create a simple PNG using a minimal approach
  // We'll create a basic PNG file with solid color
  const png = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    // This is a very basic approach - we'll use a library instead
  ]);
  
  console.log(`Warning: Cannot create ${imageSpec.filename} without image library`);
  return false;
}

async function generateImages() {
  console.log('Generating walkthrough placeholder images...\n');
  
  if (!sharp) {
    console.error('Error: sharp library is required. Installing...');
    console.log('Run: npm install --save-dev sharp');
    process.exit(1);
  }
  
  let allSuccess = true;
  
  for (const imageSpec of images) {
    try {
      const success = await createImageWithSharp(imageSpec);
      if (!success) {
        console.warn(`Warning: ${imageSpec.filename} may exceed 200KB`);
      }
    } catch (error) {
      console.error(`Error creating ${imageSpec.filename}:`, error.message);
      allSuccess = false;
    }
  }
  
  if (allSuccess) {
    console.log('\n✓ All images created successfully!');
  } else {
    console.log('\n✗ Some images failed to create');
    process.exit(1);
  }
}

generateImages().catch(console.error);

