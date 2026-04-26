// Design tokens for the Console design language.
//
// `consoleTokens` is a shared mutable object. Components read from it
// directly, so calling `applyTokens('paper' | 'blueprint')` re-skins
// everything on the next render. When porting to the real app, swap this
// to CSS variables or React context.

const consoleTokens = {
  bg: '#F4EFE6', panel: '#EDE7DC50', panelSolid: '#EDE7DC',
  surface: '#E5DECF', surfaceHi: '#DBD2BF',
  ink: '#1A1814', inkDim: '#6B6356', inkMuted: '#9A917F',
  border: '#CFC5B0', borderHi: '#B5AC97',
  lime: '#0F7F3F', limeDim: '#27964F',
  warn: '#B5651D', add: '#0F7F3F', del: '#A0322B',
  display: '"Inter", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

const PALETTES = {
  // Light — default
  paper: {
    label: 'Paper',
    bg:'#F4EFE6', panel:'#EDE7DC50', panelSolid:'#EDE7DC',
    surface:'#E5DECF', surfaceHi:'#DBD2BF',
    ink:'#1A1814', inkDim:'#6B6356', inkMuted:'#9A917F',
    border:'#CFC5B0', borderHi:'#B5AC97',
    lime:'#0F7F3F', limeDim:'#27964F',
    warn:'#B5651D', add:'#0F7F3F', del:'#A0322B',
  },
  // Dark — accent #7cb0ff cornflower blue
  blueprint: {
    label: 'Blueprint',
    bg:'#0A1830', panel:'#11225050', panelSolid:'#11264D',
    surface:'#163066', surfaceHi:'#1F4080',
    ink:'#E8EEFF', inkDim:'#92A6CC', inkMuted:'#637598',
    border:'#27437A', borderHi:'#365990',
    lime:'#7CB0FF', limeDim:'#3F6FB8',
    warn:'#FFD37A', add:'#A6E0AB', del:'#FFA6A6',
  },
};

const LIGHT_PALETTES = new Set(['paper']);

function applyTokens(paletteName) {
  const pal = PALETTES[paletteName] || PALETTES.paper;
  Object.assign(consoleTokens, pal, {
    display: '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  });
}

window.consoleTokens = consoleTokens;
window.PALETTES = PALETTES;
window.LIGHT_PALETTES = LIGHT_PALETTES;
window.applyTokens = applyTokens;
