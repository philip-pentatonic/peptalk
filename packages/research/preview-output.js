// Add a preview flag to output HTML

import { readFile } from 'fs/promises';

// Read the CLI output and add preview functionality
const originalProcessPeptide = await import('./dist/cli/process-peptide.js');

console.log('Preview mode would output HTML here');
