// Example / development scene presets.
// Call buildExampleScenes(defaultPieceConfig) to get the presets object.
// The 'tirita' poem scene is NOT here — it lives in tirita.html
// alongside the locale selector, built via buildBlocks(locale) from poem.js.

export function buildExampleScenes(defaultPieceConfig) {
  return {
    default: {
      label: 'Default: normal peels',
      config: {
        ...structuredClone(defaultPieceConfig),
        layout: { ...structuredClone(defaultPieceConfig.layout), margin: 20 },
        blocks: [
          {
            id: 'credits-title',
            text: '[b]PeelType[/b] - an editor and framework for experimental interactive typography.',
            transform: { x: 0, y: 0, scale: 1 },
            peel: { fromBeginning: true, initialUnlockCount: 2 },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'credits-what',
            text: 'It treats text like physical material: letters peel, fall, shake, tether, and respond to force fields. 25+ scenes showcase what\'s possible - use the editor to remix them or build your own.',
            transform: { x: 0, y: 0, scale: 1 },
            peel: { fromBeginning: true, initialUnlockCount: 3 },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'credits-origin',
            text: 'It began as the engine for [i]Peel After Reading[/i], a personal interactive story about meeting someone deeply.',
            transform: { x: 0, y: 0, scale: 1 },
            peel: { fromBeginning: true, initialUnlockCount: 3 },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'credits-license',
            text: 'Free for non-commercial use with attribution. Fork it, remix it, publish your own story, poem, essay, or typographic toy.',
            transform: { x: 0, y: 0, scale: 1 },
            peel: { fromBeginning: true, initialUnlockCount: 2 },
            style: { color: '#6a6a6a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'credits-author',
            text: 'Made by [url=https://gustavochico.com/]Gustavo Chico[/url]. More games at [url=https://clov.itch.io/]clov.itch.io[/url]. Source on [url=https://github.com/clovelt/PeelType]GitHub[/url].',
            transform: { x: 0, y: 0, scale: 1 },
            peel: { fromBeginning: true, initialUnlockCount: 2 },
            style: { color: '#6a6a6a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          ...structuredClone(defaultPieceConfig.blocks).map(b => {
            const { width, ...rest } = b.transform;
            return { ...b, transform: rest };
          })
        ]
      }
    },

    peelModes: {
      label: 'Peel modes',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-peel-modes',
        layout: { ...structuredClone(defaultPieceConfig.layout), topMargin: 64, blockGap: 48, bottomMargin: 160 },
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: false, visibleCount: 1, compactFlow: false }
        },
        blocks: [
          {
            id: 'mode-linear',
            text: 'Linear: letters unlock in strict left-to-right row order, one line at a time, a bit of a jump between lines but no sweat.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 3, mode: 'linear' },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'mode-zigzag',
            text: 'Zigzag: alternates direction each row: left-to-right on one line, right-to-left on the next, weaving through the paragraph like a boustrophedon.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 3, mode: 'zigzag' },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'espiral-caida',
            text: 'Spiral goes around the text. A estas alturas no conversáis el uno al otro, os habéis abrazado y estáis cayendo colina abajo girando sobre vosotros mismos con vuestros corazones como anclaje angular, que hace rato se fundieron en un amasijo amorfo de tendones, válvulas y fibras.  El exterior ya no importa, roza a trompicones dando vueltas por segundo contra el áspero suelo de asfalto de ese parque y se desprende como maraña cruda llena de tierra y pus. Hace rato la superficie, cada vez más esférica en su totalidad, pasó a ser carne viva.',
            transform: { x: 0, y: 0, scale: 1, width: 440, height: 440 },
            clipShape: { type: 'circle', svgOpacity: 0 },
            peel: { fromBeginning: true, initialUnlockCount: 5, mode: 'spiral' },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'espiral-caida-inside-out',
            text: 'Spiral inside is the opposite direction. A estas alturas no conversáis el uno al otro, os habéis abrazado y estáis cayendo colina abajo girando sobre vosotros mismos con vuestros corazones como anclaje angular, que hace rato se fundieron en un amasijo amorfo de tendones, válvulas y fibras.  El exterior ya no importa, roza a trompicones dando vueltas por segundo contra el áspero suelo de asfalto de ese parque y se desprende como maraña cruda llena de tierra y pus. Hace rato la superficie, cada vez más esférica.',
            transform: { x: 0, y: 0, scale: 1, width: 440, height: 440 },
            clipShape: { type: 'circle', svgOpacity: 0 },
            peel: { fromBeginning: true, initialUnlockCount: 5, mode: 'spiral-center' },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'mode-random',
            text: 'Random: each letter unlocked in a random order, no spatial pattern.',
            transform: { x: 0, y: 0, scale: 1, width: 180 },
            peel: { fromBeginning: true, initialUnlockCount: 1, mode: 'random' },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'mode-drunken',
            text: 'Drunken: a biased random walk that staggers through the text linearly - locally coherent but globally chaotic, like losing your place mid-sentence.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 3, mode: 'drunken' },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'mode-alternating-ends',
            text: 'Alternating ends: peels one letter from the left, one from the right, repeat.',
            transform: { x: 0, y: 0, scale: 1, width: 160 },
            peel: { fromBeginning: true, initialUnlockCount: 1, mode: 'alternating-ends' },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'mode-outward',
            text: 'Outward: letters unlock starting from the center of the paragraph and moving outward in all directions, like the opening of a book.',
            transform: { x: 0, y: 0, scale: 1, width: 680 },
            peel: { fromBeginning: true, initialUnlockCount: 3, mode: 'outward' },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'mode-inward',
            text: 'Inward: letters unlock starting from the outer edges and collapsing toward the center, as if the paragraph is being swallowed from all sides.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 3, mode: 'inward' },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'mode-center',
            text: 'Center: letters unlock strictly by proximity to the geometric center of the paragraph - the most central letters go first, the corners last.',
            transform: { x: 0, y: 0, scale: 1, width: 320 },
            peel: { fromBeginning: true, initialUnlockCount: 3, mode: 'center' },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'mode-random-neighbors',
            text: 'Random neighbors: starts from one letter and spreads by randomly picking adjacent unlocked letters next - the paragraph erodes like rust spreading across a surface.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 3, mode: 'random-neighbors' },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'mode-random-walk',
            text: 'Random walk: traces a single continuous path through the text, choosing the next letter randomly from those adjacent to the current one. This is the favorite mode of the developer, and he was really happy when seeing it walk for the first time. Works best on big, square-shaped paragraphs.',
            transform: { x: 0, y: 0, scale: 1, width: 400 },
            peel: { fromBeginning: true, initialUnlockCount: 1, mode: 'random-walk' },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          }
        ]
      }
    },

    persistence: {
      label: 'Peel state save',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-persistence-demo',
        blocks: [
          {
            id: 'saved-strip',
            text: 'This block saves the letters you peel, so reloading the page restores its loose state.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 3, persistState: true },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'unsaved-strip',
            text: 'This block does not save peel state, even in the same example.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 3, persistState: false },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          }
        ]
      }
    },

    gradients: {
      label: 'Gradient color styles',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-gradients',
        blocks: [
          {
            id: 'solid-green',
            text: 'Solid color paragraph. A quiet baseline for comparing the others.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            style: { color: '#1f6f52', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'linear-gradient',
            text: 'Linear gradient across each letter shape, useful for textile-like stripes.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            style: {
              colorMode: 'linear',
              fontFamily: 'Georgia',
              gradient: {
                type: 'linear',
                angle: 35,
                centerX: 50,
                centerY: 50,
                stops: [
                  { color: '#1f6f52', alpha: 1, position: 0 },
                  { color: '#c1a35f', alpha: 0.85, position: 55 },
                  { color: '#784830', alpha: 1, position: 100 }
                ]
              }
            }
          },
          {
            id: 'letter-gradient',
            text: 'Sequential letters: each letter samples the gradient at its own position.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            style: {
              colorMode: 'sequential',
              fontFamily: 'Georgia',
              gradient: {
                type: 'linear',
                angle: 90,
                centerX: 50,
                centerY: 50,
                stops: [
                  { color: '#244f3a', alpha: 1, position: 0 },
                  { color: '#8aa36f', alpha: 1, position: 50 },
                  { color: '#9b563f', alpha: 1, position: 100 }
                ]
              }
            }
          },
          {
            id: 'radial-gradient',
            text: 'Radial gradient for bruised centers, halos, stains, or soft reveals.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            style: {
              colorMode: 'radial',
              fontFamily: 'Georgia',
              gradient: {
                type: 'radial',
                angle: 90,
                centerX: 45,
                centerY: 50,
                stops: [
                  { color: '#f5f0e8', alpha: 0.25, position: 0 },
                  { color: '#1f6f52', alpha: 1, position: 45 },
                  { color: '#3f2f2a', alpha: 1, position: 100 }
                ]
              }
            }
          },
          {
            id: 'random-gradient',
            text: 'Random mode: each letter picks a random color sampled from the defined gradient stops, good for adding noise.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            style: {
              colorMode: 'random',
              fontFamily: 'Georgia',
              gradient: {
                type: 'linear',
                stops: [
                  { color: '#1f6f52', alpha: 1, position: 0 },
                  { color: '#c1a35f', alpha: 1, position: 50 },
                  { color: '#784830', alpha: 1, position: 100 }
                ]
              }
            }
          },
          {
            id: 'variation-mode',
            text: 'Variation mode: sets a base color and adds random HSL jitters to every letter for a textured look.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            style: {
              color: '#2e7d32',
              colorMode: 'variation',
              variationStrength: 0.85,
              fontFamily: 'Georgia'
            }
          }
        ]
      }
    },

    reveal: {
      label: 'Fade reveal',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-reveal',
        behaviors: {
          fadeReveal: { enabled: true, visibleLetters: 18, fadeSteps: 10 },
          stepParagraphs: { enabled: false, visibleCount: 2 }
        },
        blocks: [
          {
            id: 'estoy-bien',
            text: 'No no no me pasa nada y entonces tiras de la lengua y empieza a aparecer todo lo que había detrás.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'detras',
            text: 'La frase compacta se abre como si tuviera texto guardado detrás, con opacidad entrando por tramos.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          }
        ]
      }
    },

    steps: {
      label: 'Step paragraphs',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-steps',
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: true, visibleCount: 2 }
        },
        blocks: structuredClone(defaultPieceConfig.blocks)
      }
    },

    drawnText: {
      label: 'Drawn paragraph paths',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-drawn-text',
        layout: { ...defaultPieceConfig.layout, blockGap: 72, topMargin: 44 },
        blocks: [
          {
            id: 'drawn-wave',
            text: 'A sentence can breathe when it gets to wave around.',
            transform: { x: 0, y: 0, scale: 1, width: 700 },
            peelPoints: [{ fromGrapheme: 0, toGrapheme: 86, direction: 'right', starterCount: 3 }],
            drawPath: {
              enabled: true,
              spacing: 3,
              angleMix: 1,
              anchors: [
                { x: 42, y: 130, in: { x: 0, y: 0 }, out: { x: 120, y: -72 } },
                { x: 250, y: 124, in: { x: -110, y: 72 }, out: { x: 98, y: 78 } },
                { x: 480, y: 132, in: { x: -98, y: -78 }, out: { x: 90, y: -58 } },
                { x: 680, y: 124, in: { x: -90, y: 58 }, out: { x: 0, y: 0 } }
              ]
            },
            style: { color: '#325f51', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'drawn-spiral',
            text: 'Use it for a thought that curls inward before it lets itself be read.',
            transform: { x: 0, y: 0, scale: 1, width: 700 },
            peelPoints: [{ fromGrapheme: 0, toGrapheme: 72, direction: 'right', starterCount: 3 }],
            drawPath: {
              enabled: true,
              spacing: 2,
              angleMix: 0.9,
              anchors: [
                { x: 34, y: 134, in: { x: 0, y: 0 }, out: { x: 126, y: -104 } },
                { x: 438, y: 54, in: { x: -146, y: -82 }, out: { x: 128, y: 96 } },
                { x: 392, y: 262, in: { x: 134, y: -18 }, out: { x: -104, y: 82 } },
                { x: 188, y: 200, in: { x: 92, y: 86 }, out: { x: -48, y: -36 } }
              ]
            },
            style: { color: '#784830', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'drawn-margin',
            text: 'Or make a margin note climb the page.',
            transform: { x: 0, y: 0, scale: 0.95, width: 700 },
            peelPoints: [{ fromGrapheme: 0, toGrapheme: 104, direction: 'right', starterCount: 2 }],
            drawPath: {
              enabled: true,
              spacing: 2,
              angleMix: 1,
              anchors: [
                { x: 86, y: 330, in: { x: 0, y: 0 }, out: { x: -44, y: -88 } },
                { x: 130, y: 230, in: { x: -56, y: 58 }, out: { x: 58, y: -64 } },
                { x: 82, y: 128, in: { x: 52, y: 64 }, out: { x: -52, y: -64 } },
                { x: 124, y: 30, in: { x: -56, y: 62 }, out: { x: 0, y: 0 } }
              ]
            },
            style: { color: '#4a4a4a', colorMode: 'variation', variationStrength: 0.08, fontFamily: 'Georgia' }
          },
          {
            id: 'drawn-underline',
            text: 'A line can underline itself, then change its mind.',
            transform: { x: 0, y: 0, scale: 1, width: 700 },
            peelPoints: [{ fromGrapheme: 0, toGrapheme: 80, direction: 'right', starterCount: 3 }],
            drawPath: {
              enabled: true,
              spacing: 2,
              angleMix: 0.55,
              anchors: [
                { x: 54, y: 126, in: { x: 0, y: 0 }, out: { x: 160, y: 0 } },
                { x: 360, y: 126, in: { x: -150, y: 0 }, out: { x: 100, y: 0 } },
                { x: 585, y: 82, in: { x: -80, y: 70 }, out: { x: 0, y: 0 } }
              ]
            },
            style: { color: '#1f6f52', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'drawn-fall',
            text: 'The paragraph can also fall in pieces, hollow.',
            transform: { x: 0, y: 0, scale: 1, width: 700 },
            peelPoints: [{ fromGrapheme: 0, toGrapheme: 82, direction: 'right', starterCount: 4 }],
            drawPath: {
              enabled: true,
              spacing: 4,
              angleMix: 1,
              anchors: [
                { x: 56, y: 50, in: { x: 0, y: 0 }, out: { x: 88, y: 18 } },
                { x: 218, y: 96, in: { x: -90, y: -36 }, out: { x: 92, y: 58 } },
                { x: 370, y: 208, in: { x: -74, y: -90 }, out: { x: 88, y: 90 } },
                { x: 570, y: 312, in: { x: -88, y: -50 }, out: { x: 0, y: 0 } }
              ]
            },
            style: { color: '#7a3037', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'drawn-loop',
            text: 'A repeated thought can loop back through its own first word and still keep going.',
            transform: { x: 0, y: 0, scale: 1, width: 700 },
            peelPoints: [{ fromGrapheme: 0, toGrapheme: 84, direction: 'right', starterCount: 3 }],
            drawPath: {
              enabled: true,
              spacing: 2,
              angleMix: 0.95,
              anchors: [
                { x: 72, y: 176, in: { x: 0, y: 0 }, out: { x: 110, y: -128 } },
                { x: 322, y: 70, in: { x: -120, y: -92 }, out: { x: 132, y: 100 } },
                { x: 282, y: 244, in: { x: 118, y: 74 }, out: { x: -104, y: -80 } },
                { x: 170, y: 144, in: { x: -74, y: 82 }, out: { x: 160, y: 42 } },
                { x: 642, y: 184, in: { x: -154, y: -54 }, out: { x: 0, y: 0 } }
              ]
            },
            style: { color: '#3d4f7a', colorMode: 'solid', fontFamily: 'Georgia' }
          }
        ]
      }
    },

    fitVisible: {
      label: 'Fit visible',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-fit-visible',
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: true, visibleCount: 2, compactFlow: true }
        },
        blocks: [
          {
            id: 'fit-1',
            text: 'Primer párrafo largo para probar que la ventana activa se mantiene centrada mientras se tira del texto.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 2 },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'fit-2',
            text: 'Segundo párrafo: cuando el anterior termina, este sube suavemente en lugar de pegar un salto seco.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 3 },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'fit-3',
            text: 'Tercer párrafo escondido: sus físicas quedan congeladas hasta entrar en la ventana visible.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 1 },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'fit-4',
            text: 'Cuarto párrafo para confirmar que se puede trabajar con un texto más largo sin tener toda la física despierta a la vez.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 4 },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          }
        ]
      }
    },

    censorReveal: {
      label: 'Censored peeling',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-censor-reveal',
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: true, visibleCount: 1, compactFlow: true }
        },
        blocks: [
          {
            id: 'censor-a',
            text: '[censor]The document had been classified for thirty years, sealed without explanation.[/censor]',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 3 },
            hint: { enabled: true, peelPointIndex: 0, text: 'peel the bar' },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'censor-b',
            text: '[censor]What it contained changed nothing and changed everything at once.[/censor]',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: false, initialUnlockCount: 3 },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'censor-c',
            text: '[censor]The truth was exactly what everyone had already assumed.[/censor]',
            transform: { x: 0, y: 0, scale: 1.05, width: 620 },
            peel: { fromBeginning: true, initialUnlockCount: 4 },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          }
        ]
      }
    },

    meaningShift: {
      label: 'Meaning shift',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-meaning-shift',
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: true, visibleCount: 1, compactFlow: true, advanceDelayMs: 3000 }
        },
        blocks: [
          {
            id: 'shift-words',
            text: 'Al[peel] sentirte supe que el[/peel] final[peel] no existía. Tantos momentos... No[/peel] te iba a [peel]decir nada, pero debes saber que no te voy a[/peel] olvidar[peel] ni después de marzo, ni después del frío, pase lo que pase[/peel], después de todo.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { allWords: true, "reflowAnchors": true, "shrinkGaps": true },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'shift-spaces',
            text: '[peel]"[/peel]Si yo lo[peel] [/peel]quito, ella[peel]...[/peel] lo[peel] [/peel]caza.[peel]"[/peel]',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { allWords: true, "reflowAnchors": true, "shrinkGaps": true },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'noise-a-gap',
            text: 'Todo[peel]rwasxz[/peel] eso[peel]zxczx[/peel] también[peel]dhdfg[/peel] eres[peel]nianshu[/peel] tú.[peel]okaiwip[/peel] Todo[peel]nnzmhv[/peel] eso[peel]iimaso[/peel] sí[peel]okroobok[/peel] guárdalo[peel]mneinvnkpo[/peel] mamá.[peel]inehaw[/peel] Ya[peel]ninasn[/peel] lo[peel]mrovko[/peel] tiro[peel]nqiekyo[/peel] yo[peel]mdlgng[/peel] cuando[peel]qwbsjnonas[/peel] no[peel]nvivn[/peel] estés.',
            transform: { x: 0, y: 0, scale: 1, width: 500 },
            peel: { allWords: true, "reflowAnchors": true, "shrinkGaps": true },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'noise-stop',
            text: 'Todo [peel][shake]PARA AHORA MISMO[/shake] [/peel]va [peel][shake]SOCORRO[/shake] [/peel]bien , no [peel][shake]NO MIRES[/shake] [/peel]pasa [peel][shake]AYUDA[/shake] [/peel]nada; terminará [peel][shake]TODO[/shake] [/peel]el día y luego [peel][shake]SE TE OLVIDA ALGO[/shake] [/peel]habrá otro[peel] [shake]Y OTRO Y OTRO Y OTRO[/shake][/peel]. Respira[shake][peel] [shake]SIENTE EL PÁNICO[/shake][/peel][/shake], nota como [peel][shake]TODA TU VIDA VA A TERMINAR[/shake] [/peel]el aire [peel][shake]NO ME QUEDA[/shake] [/peel]entra [peel][shake]SAL AHORA MISMO[/shake] [/peel]por tus [peel][shake]SIENTO CÓMO ME ESTOY PUDRIENDO[/shake] [/peel]pulmones: [peel][shake]POR FAVOR, TE LO RUEGO, DIME QUE[/shake] [/peel]estás vivo.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { "allWords": false, "shrinkGaps": true, "fromBeginning": true, "persistState": false, "singleHandle": true },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'noise-b-gap',
            text: 'Cuando[peel] botes[/peel] alguna[peel] yogurtera[/peel] de las cosas que dijimos[peel] bolsas[/peel] que tirase[peel] tazas[/peel] se le da uso[peel] parrilla[/peel] se reafirma: "¿Ves?" dice[peel] zapatos[/peel]. Si fuese inmortal[peel] cinta[/peel] probablemente tendría razón[peel] fruteros[/peel] y a ver quien le decía algo…[peel] [/peel]Que jaleo[peel] azucareros[/peel].',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { "allWords": false, "reflowAnchors": true, "shrinkGaps": true, "fromBeginning": true, "persistState": false, "singleHandle": false },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'allies-slaughters',
            text: '[peel]al[/peel]lies are the [peel]s[/peel]laughters of those who are [peel]l[/peel]over[peel]s[/peel].',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { allWords: false, reflowAnchors: true, shrinkGaps: true, fromBeginning: true, persistState: false },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'stare-drain',
            text: 'i look, star[peel]e[/peel] in the [peel]d[/peel]rain, hear[peel]t[/peel] in my chest - its [peel]c[/peel]harm will feel as if it was [peel]f[/peel]right. i had [peel]y[/peel]earned it.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { allWords: false, reflowAnchors: true, shrinkGaps: true, fromBeginning: true, persistState: false },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          }

        ]
      }
    },

    forceFields: {
      label: 'Force fields',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-force-fields',
        layout: { ...structuredClone(defaultPieceConfig.layout), topMargin: 82, blockGap: 34, bottomMargin: 150 },
        peel: { ...structuredClone(defaultPieceConfig.peel), initialUnlockCount: 9 },
        optimization: { ...structuredClone(defaultPieceConfig.optimization), initialPeelActiveBlocks: 7 },
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: false, visibleCount: 2, compactFlow: false }
        },
        forceFields: [
          {
            id: 'attract-field',
            type: 'magnetic',
            mode: 'attract',
            blocks: ['field-attract'],
            cx: 360,
            cy: 130,
            radius: 360,
            strength: 1.05,
            lockedStrength: 0.55,
            feather: 260
          },
          {
            id: 'repel-field',
            type: 'magnetic',
            mode: 'repel',
            blocks: ['field-repel'],
            cx: 190,
            cy: 265,
            radius: 470,
            strength: 1,
            lockedStrength: 0.69,
            feather: 390
          },
          {
            id: 'wind-field',
            type: 'wind',
            blocks: ['field-wind'],
            global: true,
            direction: 'left',
            autoWake: true,
            strength: 0.25,
            lockedStrength: 0,
            gust: 0.35,
            feather: 0
          },
          {
            id: 'cursor-repel-field',
            type: 'cursor',
            mode: 'repel',
            active: 'hover',
            blocks: ['field-cursor-repel'],
            radius: 250,
            strength: 1.45,
            lockedStrength: 0.78,
            feather: 230
          },
          {
            id: 'cursor-attract-field',
            type: 'cursor',
            mode: 'attract',
            active: 'hover',
            blocks: ['field-cursor-attract'],
            radius: 270,
            strength: 1.25,
            lockedStrength: 0.7,
            feather: 245
          },
          {
            id: 'cursor-repel-loose-only-field',
            type: 'cursor',
            mode: 'repel',
            active: 'hover',
            blocks: ['field-cursor-repel-loose'],
            radius: 250,
            strength: 1.45,
            lockedStrength: 0,
            feather: 230
          },
          {
            id: 'cursor-attract-loose-only-field',
            type: 'cursor',
            mode: 'attract',
            active: 'hover',
            blocks: ['field-cursor-attract-loose'],
            radius: 270,
            strength: 1.25,
            lockedStrength: 0,
            feather: 245
          }
        ],
        blocks: [
          {
            id: 'field-attract',
            text: 'Attractor: loose letters gather around one invisible memory until the sentence starts to knot.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 9 },
            hint: { enabled: true, peelPointIndex: 0, text: 'pull, then watch' },
            style: { color: '#325f51', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'field-repel',
            text: 'Repeller: this narrower paragraph is longer, more crowded, and less willing to keep its shape. The invisible center insists on clearing a hole through the sentence, so each loosened letter is shoved outward while the still-attached text strains around it like ink avoiding a bruise.',
            transform: { x: 0, y: 0, scale: 1, width: 360 },
            peel: { fromBeginning: false, initialUnlockCount: 12, mode: 'spiral-center' },
            style: { color: '#7a3037', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'field-wind',
            text: 'Wind: the paragraph has a weather pattern, a hard draft dragging its loose letters sideways.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 14 },
            style: { color: '#4b4f7f', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'field-cursor-repel',
            text: 'Cursor repel: hover over the loosened words and your hand becomes pressure in the air.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: false, initialUnlockCount: 9 },
            style: { color: '#8a5c28', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'field-cursor-attract',
            text: 'Cursor attract: hover nearby and the letters come looking for the hand that disturbed them.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 9 },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'field-cursor-repel-loose',
            text: 'Cursor repel, loose only: the attached phrase stays calm, but peeled fragments flee from the hovering hand.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: false, initialUnlockCount: 9 },
            style: { color: '#6b5f24', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'field-cursor-attract-loose',
            text: 'Cursor attract, loose only: nothing bends until the letters are free, then the hand becomes a small gravity well.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 9 },
            style: { color: '#3f5f6f', colorMode: 'solid', fontFamily: 'Georgia' }
          }
        ]
      }
    },

    crossBlockConstraints: {
      label: 'Cross-block constraints',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-cross-block-constraints',
        layout: { ...structuredClone(defaultPieceConfig.layout), blockGap: 26, topMargin: 96, bottomMargin: 120 },
        optimization: { ...structuredClone(defaultPieceConfig.optimization), initialPeelActiveBlocks: 2 },
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: false, visibleCount: 2, compactFlow: false }
        },
        crossBlockConstraints: [
          {
            from: { block: 'cross-a', segment: 0, endpoint: 'end' },
            to: { block: 'cross-b', segment: 0, endpoint: 'end' },
            count: 1,
            initialArc: { count: 8, sag: 72, bow: 14, armSag: 8, jointBias: 0.5, releaseOnSpawn: true, settleMs: 0, bridgeLockMs: 0, prewarmSteps: 220 },
            stiffness: 0.58,
            unlockThreshold: 8
          }
        ],
        blocks: [
          {
            id: 'cross-a',
            text: 'La primera frase termina con unos hilos que no terminan del todo, como si dejara cinco letras agarradas al borde final.',
            transform: { x: 0, y: 0, scale: 1, width: 620 },
            peel: { fromBeginning: false, initialUnlockCount: 8 },
            hint: { enabled: true, peelPointIndex: 0, text: 'tira del final' },
            style: { color: '#3f4f46', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'cross-b',
            text: 'Y la frase siguiente empieza ya comprometida: si una se despega, la otra siente el tirón desde sus primeras letras.',
            transform: { x: 0, y: 0, scale: 1, width: 620 },
            peel: { fromBeginning: true, initialUnlockCount: 8 },
            style: { color: '#6f3f45', colorMode: 'solid', fontFamily: 'Georgia' }
          }
        ]
      }
    },

    tiesKnots: {
      label: 'Ties & knots',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-ties-knots',
        layout: { ...structuredClone(defaultPieceConfig.layout), blockGap: 28, topMargin: 96, bottomMargin: 180 },
        optimization: { ...structuredClone(defaultPieceConfig.optimization), initialPeelActiveBlocks: 6 },
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: false, visibleCount: 2, compactFlow: false }
        },
        ties: [
          {
            id: 'nudo-central',
            type: 'knot',
            ropeNodes: 10,
            from: { block: 'hilo-a', endpoint: 'end' },
            to: { block: 'hilo-b', endpoint: 'start' },
            stiffness: 0.5,
            untieDistance: 130,
            color: '#7a5a3a',
            label: 'tira del cabo',
            onUntie: { action: 'revealBlock', target: 'revelado' }
          },
          {
            id: 'lazo-bajo',
            type: 'bow',
            ropeNodes: 8,
            from: { block: 'hilo-b', endpoint: 'end' },
            to: { block: 'hilo-c', endpoint: 'start' },
            stiffness: 0.42,
            untieDistance: 96,
            color: '#8a4a5a',
            onUntie: { action: 'particles', target: 'spark', color: '#c06a78' }
          },
          {
            id: 'cable-diagonal',
            type: 'cable',
            ropeNodes: 12,
            from: { block: 'hilo-c', endpoint: 'end' },
            to: { block: 'hilo-d', endpoint: 'start' },
            stiffness: 0.58,
            untieDistance: 150,
            color: '#4a5a6a',
            width: 4,
            onUntie: { action: 'sound', target: 'peel' }
          }
        ],
        blocks: [
          {
            id: 'hilo-a',
            text: 'Esta línea no se pela sino que se desata: el cabo suelto cuelga a la derecha, es una cuerda real que puedes agarrar en cualquier punto.',
            transform: { x: 0, y: 0, scale: 1, width: 600 },
            peel: { fromBeginning: false, initialUnlockCount: 9 },
            hint: { enabled: true, peelPointIndex: 0, text: 'tira del nudo' },
            style: { color: '#3f4f46', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'hilo-b',
            text: 'Esta otra está atada por los dos lados: un nudo arriba la sujeta a la primera, un lazo abajo la engancha a la tercera.',
            transform: { x: 0, y: 0, scale: 1, width: 600 },
            peel: { fromBeginning: true, initialUnlockCount: 9 },
            style: { color: '#46474f', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'hilo-c',
            text: 'La tercera cuelga del lazo: un cable azul la engancha a la cuarta. Puedes tirar del cable mismo, no solo de las letras de sus extremos.',
            transform: { x: 0, y: 0, scale: 1, width: 600 },
            peel: { fromBeginning: true, initialUnlockCount: 9 },
            style: { color: '#6f3f45', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'hilo-d',
            text: 'Y esta última espera que el cable ceda. Cuando lo haga, habrás recorrido cuatro líneas desatando en lugar de pelando.',
            transform: { x: 0, y: 0, scale: 1, width: 600 },
            peel: { fromBeginning: true, initialUnlockCount: 6 },
            style: { color: '#4a5060', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'revelado',
            text: 'Lo que el nudo guardaba: no había que pelar nada, solo desatar lo que estaba atado.',
            transform: { x: 0, y: 0, scale: 1, width: 600 },
            hidden: true,
            peel: { fromBeginning: true, initialUnlockCount: 3 },
            style: { color: '#2f6f56', colorMode: 'solid', fontFamily: 'Georgia' }
          }
        ]
      }
    },

    tangledLines: {
      label: 'Tangling: cables',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-tangled-lines',
        physics: { ...(defaultPieceConfig.physics || {}), iterations: 12 },
        // blockGap leaves room below each column row for the hanging tangles.
        layout: { ...structuredClone(defaultPieceConfig.layout), blockGap: 230, topMargin: 64, bottomMargin: 300 },
        optimization: { ...structuredClone(defaultPieceConfig.optimization), initialPeelActiveBlocks: 24 },
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: false, visibleCount: 2, compactFlow: false }
        },
        // Each strand is the block's pre-peeled strip (initialUnlockCount letters
        // dangling from the locked frontier). At spawn the strips are PLACED woven
        // around each other following the crossings list and pre-settled, so they
        // hang already tangled. Each crossing is a sliding contact: pulling a
        // strand taut, or pulling the strands apart, makes the twist slide toward
        // the free tips and slip off — outermost (highest frac) first.
        tangledLines: [
          // ── A: two strips, three twists ───────────────────────────────────
          {
            id: 'twist-2',
            strands: [
              { id: 's0', block: 'mad-a', endpoint: 'end', color: '#7a4a2a', width: 3 },
              { id: 's1', block: 'mad-b', endpoint: 'end', color: '#2a5a4a', width: 3 }
            ],
            crossings: [
              { a: 0, b: 1, aFrac: 0.52, bFrac: 0.52, type: 'knot' },
              { a: 0, b: 1, aFrac: 0.68, bFrac: 0.68, type: 'knot' },
              { a: 0, b: 1, aFrac: 0.84, bFrac: 0.84, type: 'knot' }
            ],
            onUntangle: { action: 'revealBlock', target: 'libre-2' }
          },
          // ── B: three strips braided, four crossings ───────────────────────
          {
            id: 'braid-3',
            strands: [
              { id: 's0', block: 'tri-a', endpoint: 'end', color: '#5a3a7a', width: 2.5 },
              { id: 's1', block: 'tri-b', endpoint: 'end', color: '#3a5a6a', width: 2.5 },
              { id: 's2', block: 'tri-c', endpoint: 'end', color: '#7a3a4a', width: 2.5 }
            ],
            crossings: [
              { a: 0, b: 1, aFrac: 0.50, bFrac: 0.50, type: 'knot' },
              { a: 1, b: 2, aFrac: 0.62, bFrac: 0.62, type: 'knot' },
              { a: 0, b: 1, aFrac: 0.74, bFrac: 0.74, type: 'knot' },
              { a: 1, b: 2, aFrac: 0.86, bFrac: 0.86, type: 'knot' }
            ],
            onUntangle: [
              { action: 'particles', target: 'spark', color: '#d09060' },
              { action: 'revealBlock', target: 'libre-3' }
            ]
          }
        ],
        blocks: [
          {
            id: 'intro',
            text: 'Estas tiras nacieron ya enredadas entre sí. Agarra una punta y tira, o sepáralas: cada vuelta resbala hacia los cabos sueltos hasta soltarse, la más cercana a la punta primero.',
            transform: { x: 0, y: 0, scale: 1, width: 640 },
            peel: { fromBeginning: true, initialUnlockCount: 3 },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },

          // ── A: two columns side by side (groupNext), strips braided below ──
          {
            id: 'mad-a',
            text: 'La primera tira cae de esta columna y nace ya trenzada con su vecina de la derecha.',
            transform: { x: 20, y: 0, scale: 1, width: 250 },
            groupNext: 1,
            groupParallel: true,
            // High threshold + no strip assist: the strips resist unzipping so the
            // root stays anchored while the player works the tangle.
            peel: { fromBeginning: false, initialUnlockCount: 30, unlockThreshold: 60, longStripAssist: false },
            hint: { enabled: true, peelPointIndex: 0, text: 'separa las tiras' },
            style: { color: '#5a3a2a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'mad-b',
            text: 'La segunda tira cuelga de aquí, enroscada tres vueltas con la primera.',
            transform: { x: 370, y: 0, scale: 1, width: 250 },
            // High threshold + no strip assist: the strips resist unzipping so the
            // root stays anchored while the player works the tangle.
            peel: { fromBeginning: false, initialUnlockCount: 28, unlockThreshold: 60, longStripAssist: false },
            style: { color: '#2a4a3a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'libre-2', hidden: true,
            text: 'Dos tiras libres: el enredo era solo vueltas.',
            transform: { x: 0, y: 0, scale: 1, width: 500 },
            peel: { fromBeginning: true, initialUnlockCount: 3 },
            style: { color: '#2a6a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },

          // ── B: three columns, strips braided below ─────────────────────────
          {
            id: 'tri-a',
            text: 'La trenza de tres empieza en esta columna de la izquierda.',
            transform: { x: 0, y: 0, scale: 1, width: 190 },
            groupNext: 2,
            groupParallel: true,
            peel: { fromBeginning: false, initialUnlockCount: 28, unlockThreshold: 60, longStripAssist: false },
            style: { color: '#4a2a5a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'tri-b',
            text: 'El cabo del centro pasa por encima y por debajo de los otros dos.',
            transform: { x: 235, y: 0, scale: 1, width: 190 },
            peel: { fromBeginning: false, initialUnlockCount: 28, unlockThreshold: 60, longStripAssist: false },
            style: { color: '#2a4a5a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'tri-c',
            text: 'El tercero cierra la trenza; tira de él para empezar a deshacerla.',
            transform: { x: 470, y: 0, scale: 1, width: 190 },
            peel: { fromBeginning: false, initialUnlockCount: 28, unlockThreshold: 60, longStripAssist: false },
            style: { color: '#6a3a45', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'libre-3', hidden: true,
            text: 'La trenza se deshizo. Nada estaba anudado: todo era paciencia.',
            transform: { x: 0, y: 0, scale: 1, width: 600 },
            peel: { fromBeginning: true, initialUnlockCount: 5 },
            style: { color: '#2a6a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          }
        ]
      }
    },
    longScroll: {
      label: 'Long scroll',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-long-scroll',
        layout: { ...structuredClone(defaultPieceConfig.layout), topMargin: 96, bottomMargin: 160 },
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: false, visibleCount: 2, compactFlow: false }
        },
        blocks: Array.from({ length: 12 }, (_, idx) => ({
          id: `scroll-${idx + 1}`,
          text: `Párrafo ${idx + 1}. Este preset existe para comprobar que un texto largo puede ocupar más altura que la ventana y seguir funcionando con scroll normal sin despertar toda la física a la vez.`,
          transform: { x: 0, y: 0, scale: 1, width: 660 },
          peel: { fromBeginning: idx % 2 === 0, initialUnlockCount: 1 + (idx % 4) },
          style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
        }))
      }
    },

    layout: {
      label: 'Layout transforms',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-layout',
        blocks: [
          {
            id: 'wide',
            text: 'This paragraph has a wide text area.',
            transform: { x: -10, y: 0, scale: 1, width: 660 },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Manrope' }
          },
          {
            id: 'narrow',
            text: 'This one has a narrow text area, so it wraps sooner. Use the bottom-right handle to change width.',
            transform: { x: 60, y: 0, scale: 1, width: 260 },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Work Sans' }
          }
        ]
      }
    },

    events: {
      label: 'Events + BBCode',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-events',
        layout: { ...structuredClone(defaultPieceConfig.layout), blockGap: 34, topMargin: 64, bottomMargin: 140 },
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: true, visibleCount: 1, compactFlow: true }
        },
        blocks: [
          {
            id: 'visita-anular',
            text: 'Coges a [b]alguien[/b] y vais, casi movidos por el aire, a un lugar sigiloso. Os llama de lejos, y al recibir visita te invoca: miras su [i]anular[/i].',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 3 },
            attachment: { type: 'placeholder', label: 'Ilustración placeholder', width: 420, height: 210, gap: 18, opticalOffsetY: 26 },
            triggers: [
              { on: 'blockAppear', actions: [{ type: 'ambient', name: 'sigilo', mode: 'crossfade' }] }
            ],
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'plomo',
            text: 'No resulta difícil de escuchar, había salido fácilmente de su lengua - pero esa frase estaba pesando en el aire como si fuera [b]plomo[/b].',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 3 },
            triggers: [
              { on: 'wordComplete', word: 'plomo', actions: [{ type: 'particles', preset: 'smokePoof', count: 34 }, { type: 'sound', name: 'poof' }] }
            ],
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'chispa',
            text: 'Tu mirada empieza a tornarse diestra, la cabeza lanza [color=#b77713]chispa[/color] de [i]idea[/i] a [s]recuerdo[/s] y sin haber abierto la boca, tu garganta ya lo ha dicho.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 4 },
            triggers: [
              { on: 'wordComplete', words: ['chispa', 'idea', 'recuerdo'], actions: [{ type: 'particles', preset: 'spark', count: 18 }, { type: 'sound', name: 'spark' }] }
            ],
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'lagrima-letras',
            text: 'Te brota una lágrima, finges que no te importa y vomitas letras unidas hasta que tu cuerpo luce un nuevo hueco más limpio y liso que el mármol.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 5 },
            triggers: [
              { on: 'letterUnlock', actions: [{ type: 'particles', preset: 'redDrops', count: 2 }] },
              { on: 'blockAppear', actions: [{ type: 'ambient', name: 'latido-bajo', mode: 'layer', gain: 0.04 }] }
            ],
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'bilis-hidraulica',
            text: 'Abren una pregunta, y sin siquiera terminarla ya la has respondido por completo con una bilis de propulsión hidráulica que chafa la pared.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 5 },
            triggers: [
              { on: 'beforeLetterUnlock', target: 'readingLast', holdMs: 1900, actions: [{ type: 'particles', preset: 'violentGeyser', count: 180, duration: 1700 }, { type: 'sound', name: 'geyser' }] }
            ],
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'pulmon-ojo',
            text: 'Otra, y otra, y otra. Escupes un [b]pulmón[/b], se te sale un [i]ojo[/i], pierdes el equilibrio.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 4 },
            triggers: [
              { on: 'wordComplete', word: 'pulmón', actions: [{ type: 'physicsObject', label: 'pulmón', radius: 48 }] },
              { on: 'wordComplete', word: 'ojo',    actions: [{ type: 'physicsObject', label: 'ojo',    radius: 40 }] }
            ],
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          }
        ]
      }
    },

    lineartShowcase: {
      label: 'Peelable SVG, compound shapes',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-lineart-showcase',
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: true, visibleCount: 1, compactFlow: true }
        },
        blocks: [
          {
            id: 'tit-b01',
            text: 'The process of getting to know someone deeply - in the truest sense of the word - [b]I think is similar to pulling back the cuticle of a finger.[/b]',
            transform: { x: 0, y: 0, scale: 1, width: 620 },
            peel: { fromBeginning: true, initialUnlockCount: 1, mode: 'linear' },
            attachment: {
              type: 'lineart',
              src: 'illustrations/tirita/t_cuticula.svg',
              width: 300,
              height: 192,
              scale: 0.78,
              gap: 16,
              opticalOffsetY: 0,
              svgOpacity: 0.15,
              strokeResistance: 12,
              roughPreset: 'hand',
              lineQuantity: 30,
              linePrecision: 1,
              initialPeeled: 2,
              lineWidth: 3,
              strokes: []
            },
            style: { colorMode: 'solid', fontFamily: 'EB Garamond', color: '#4a4a4a' }
          },
          {
            id: 'anular-intro',
            text: 'Coges a alguien y vais, casi movidos por el aire, a un lugar sigiloso. Os llama de lejos, y al recibir visita te invoca: miras su anular.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 3 },
            attachment: {
              type: 'lineart',
              src: 'illustrations/anular-body.svg',
              width: 240,
              height: 180,
              gap: 20,
              opticalOffsetY: 0,
              loose: {
                src: 'illustrations/anular-loose.svg',
                width: 44,
                height: 92,
                pinFracX: 0.82,
                pinFracY: 0.44,
                restLength: 55
              },
              strokes: [
                {
                  startFrac: [0.87, 0.04],
                  endFrac:   [0.87, 0.96],
                  nodeCount: 26,
                  starterCount: 4,
                  endStarterCount: 0,
                  unlockThreshold: 16,
                  color: '#4a4a4a',
                  lineWidth: 2.5
                }
              ]
            },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'plant-intro',
            text: 'Hay cosas que crecen despacio y en silencio. Las arrancas y no sabes bien qué queda.',
            transform: { x: 0, y: 0, scale: 1, width: 560 },
            peel: { fromBeginning: true, initialUnlockCount: 3 },
            attachment: {
              type: 'lineart',
              src: 'illustrations/plant-body.svg',
              svgOpacity: 0.06,
              strokeResistance: 45,
              width: 200, height: 260, gap: 24, opticalOffsetY: 0,
              strokes: [
                {
                  pathPoints: [[0.275, 0.673], [0.225, 0.931], [0.5, 0.954], [0.775, 0.931], [0.725, 0.673]],
                  nodeCount: 18, starterCount: 2, endStarterCount: 2,
                  lineWidth: 2.4
                },
                {
                  pathPoints: [[0.5, 0.135], [0.47, 0.173], [0.5, 0.238], [0.49, 0.338], [0.51, 0.442], [0.5, 0.546], [0.5, 0.662]],
                  nodeCount: 14, starterCount: 2, endStarterCount: 0,
                  lineWidth: 2.0
                },
                {
                  pathPoints: [[0.44, 0.454], [0.34, 0.377], [0.29, 0.431], [0.36, 0.492], [0.49, 0.546]],
                  nodeCount: 10, starterCount: 2, endStarterCount: 0,
                  lineWidth: 1.8
                }
              ]
            },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'plant-primitives',
            text: 'Cada línea que arrancas cambia el dibujo. Lo que queda ya no es lo que era.',
            transform: { x: 0, y: 0, scale: 1, width: 560 },
            peel: { fromBeginning: false, initialUnlockCount: 3 },
            attachment: {
              type: 'lineart',
              src: null,
              strokeResistance: 45,
              width: 360, height: 320, gap: 20, opticalOffsetY: 0,
              strokes: [
                // Long diagonal — left strip, top-left to bottom-right, ~325 px → both ends loose
                {
                  pathPoints: [[0.04, 0.04], [0.42, 0.96]],
                  nodeCount: 20, starterCount: 2, endStarterCount: 2,
                  color: '#4a4a4a', lineWidth: 2.2
                },
                // Cross H — right-top area, ~158 px → both ends loose
                {
                  pathPoints: [[0.52, 0.32], [0.96, 0.32]],
                  nodeCount: 12, starterCount: 2, endStarterCount: 2,
                  color: '#4a4a4a', lineWidth: 2.2
                },
                // Cross V — right-top area, ~170 px → both ends loose
                {
                  pathPoints: [[0.74, 0.05], [0.74, 0.58]],
                  nodeCount: 12, starterCount: 2, endStarterCount: 2,
                  color: '#4a4a4a', lineWidth: 2.2
                },
                // Triangle left side (bottom-left → apex) — right-bottom area, ~124 px → one end
                {
                  pathPoints: [[0.52, 0.92], [0.74, 0.62]],
                  nodeCount: 10, starterCount: 2, endStarterCount: 0,
                  color: '#4a4a4a', lineWidth: 2.0
                },
                // Triangle right side (apex → bottom-right) — ~124 px → one end
                {
                  pathPoints: [[0.74, 0.62], [0.96, 0.92]],
                  nodeCount: 10, starterCount: 2, endStarterCount: 0,
                  color: '#4a4a4a', lineWidth: 2.0
                },
                // Triangle base (bottom-left → bottom-right) — ~158 px → both ends loose
                {
                  pathPoints: [[0.52, 0.92], [0.96, 0.92]],
                  nodeCount: 12, starterCount: 2, endStarterCount: 2,
                  color: '#4a4a4a', lineWidth: 2.0
                }
              ]
            },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          }
        ]
      }
    },

    // ── Narrative: unpeelable letters + timed continue button ─────────────────
    // "Aquel día todo terminó" is locked forever (noPeel).
    // "de la mejor manera posible." is peelable — strip it away and only the bad remains.
    // After 7 s a continue arrow appears inline to the right of the sentence.
    narrativeSelect: {
      label: 'Nopeel tag + timed button',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-narrative-select',
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: false, visibleCount: 1, compactFlow: false }
        },
        blocks: [
          {
            id: 'narrative-sentence',
            text: '[nopeel]Aquel día todo terminó[/nopeel] de la mejor manera posible.',
            transform: { x: 0, y: 0, scale: 1.15, width: 620 },
            peel: { fromBeginning: false, initialUnlockCount: 3 },
            timedButton: { delayMs: 7000, text: '→', action: 'addText', addText: 'fin.', spawnAt: 'afterNoPeel' },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          }
        ]
      }
    },

    orbitPeel: {
      label: 'Orbit peel',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-orbit-peel',
        layout: { ...structuredClone(defaultPieceConfig.layout), topMargin: 92, blockGap: 42, bottomMargin: 150 },
        peel: { ...structuredClone(defaultPieceConfig.peel), mode: 'linear', initialUnlockCount: 2 },
        physics: { ...structuredClone(defaultPieceConfig.physics), gravity: 0.05 },
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: false, visibleCount: 1, compactFlow: false }
        },
        forceFields: [
          { id: 'soft-center', type: 'magnetic', mode: 'attract', cx: 380, cy: 210, radius: 330, strength: 0.22, feather: 280 }
        ],
        blocks: [
          {
            id: 'orbit-one',
            text: 'Una frase puede tener gravedad propia: tiras de dos extremos y las letras empiezan a negociar una órbita alrededor del hueco.',
            transform: { x: 0, y: 0, scale: 1.1, width: 620 },
            peelPoints: [
              { fromRatio: 0, toRatio: 0.5, direction: 'right', starterCount: 1, mode: 'linear' },
              { fromRatio: 0.5, toRatio: 1, direction: 'left', starterCount: 1, mode: 'linear' }
            ],
            letterMotion: [
              { type: 'orbit', cx: 380, cy: 220, radius: 270, strength: 0.11, spin: 1.15, band: 0.72 },
              { type: 'buoyancy', strength: 0.018, lift: 1.2, wave: 2.8, drift: 1.6, frequency: 0.09 }
            ],
            triggers: [
              { on: 'wordComplete', word: 'órbita', actions: [{ type: 'particles', preset: 'spark', color: '#5a7db8', count: 28 }, { type: 'sound', name: 'spark' }] }
            ],
            style: {
              colorMode: 'sequential',
              fontFamily: 'Georgia',
              gradient: {
                type: 'linear',
                angle: 35,
                stops: [
                  { color: '#283b59', alpha: 1, position: 0 },
                  { color: '#7b595f', alpha: 1, position: 56 },
                  { color: '#c6a766', alpha: 1, position: 100 }
                ]
              }
            }
          }
        ]
      }
    },

    sedimentPeel: {
      label: 'Line-locked peel',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-line-locked-peel',
        layout: { ...structuredClone(defaultPieceConfig.layout), topMargin: 78, blockGap: 42, bottomMargin: 150 },
        peel: { ...structuredClone(defaultPieceConfig.peel), mode: 'linear', initialUnlockCount: 3 },
        physics: { ...structuredClone(defaultPieceConfig.physics), gravity: 0.15 },
        optimization: { ...structuredClone(defaultPieceConfig.optimization), dynamicLetterLimitDesktop: 430 },
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: false, visibleCount: 2, compactFlow: false }
        },
        blocks: [
          {
            id: 'line-lock-a',
            text: 'Las letras se sueltan, pero no caen: se quedan atrapadas en su propio renglón, estorbando la lectura como una persiana torcida.',
            transform: { x: 0, y: 0, scale: 1.04, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 3 },
            letterMotion: { type: 'line-lock', strength: 0.55, damping: 0.86 },
            style: { color: '#4d463d', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'line-lock-b',
            text: 'Otra línea hace lo mismo desde el final: puedes mover las letras a izquierda o derecha, pero la frase se niega a romper su renglón.',
            transform: { x: 0, y: 0, scale: 1.02, width: 660 },
            peel: { fromBeginning: false, initialUnlockCount: 3 },
            letterMotion: { type: 'line-lock', strength: 0.55, damping: 0.86 },
            style: { color: '#6a5142', colorMode: 'variation', variationStrength: 0.08, fontFamily: 'Georgia' }
          }
        ]
      }
    },

    palindromePeel: {
      label: 'Palindrome peel',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-palindrome-peel',
        layout: { ...structuredClone(defaultPieceConfig.layout), topMargin: 96, blockGap: 130, bottomMargin: 220 },
        peel: { ...structuredClone(defaultPieceConfig.peel), mode: 'linear', initialUnlockCount: 1 },
        physics: { ...structuredClone(defaultPieceConfig.physics), gravity: 0.1 },
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: false, visibleCount: 1, compactFlow: false }
        },
        blocks: [
          {
            id: 'palindrome-word',
            text: 'reconocer',
            transform: { x: 0, y: 0, scale: 2.1, width: 660 },
            peel: { fromBeginning: false, initialUnlockCount: 1, mode: 'linear' },
            letterMotion: { type: 'mirror-line', strength: 0.06, damping: 0.85, offsetLines: 1 },
            hint: { enabled: true, peelPointIndex: 0, text: 'tira de la última letra' },
            style: { color: '#3c4a5d', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'palindrome-phrase',
            text: 'anita lava la tina',
            transform: { x: 0, y: 0, scale: 1.45, width: 660 },
            peel: { fromBeginning: false, initialUnlockCount: 1, mode: 'linear' },
            letterMotion: { type: 'mirror-line', strength: 0.06, damping: 0.85, offsetLines: 1 },
            style: { color: '#6a4a52', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'mirror-control',
            text: 'las demás palabras no sobreviven al espejo',
            transform: { x: 0, y: 0, scale: 0.98, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 1, mode: 'linear' },
            letterMotion: { type: 'mirror-line', strength: 0.06, damping: 0.85, offsetLines: 1 },
            style: { color: '#7a7468', colorMode: 'solid', fontFamily: 'Georgia' }
          }
        ]
      }
    },

    selectivePeeling: {
      label: 'Selective peeling',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-selective-peeling',
        layout: { ...structuredClone(defaultPieceConfig.layout), topMargin: 78, blockGap: 32, bottomMargin: 160 },
        peel: { ...structuredClone(defaultPieceConfig.peel), mode: 'vowels-first', initialUnlockCount: 3 },
        physics: { ...structuredClone(defaultPieceConfig.physics), gravity: 0.12 },
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 30, fadeSteps: 10 },
          stepParagraphs: { enabled: true, visibleCount: 4, compactFlow: true }
        },
        blocks: [
          {
            id: 'vowels-rise',
            text: 'Primero se desprenden las vocales: la frase pierde aire antes de perder hueso, y durante un segundo casi sigue soñando.',
            transform: { x: 0, y: 0, scale: 1.04, width: 650 },
            peel: { fromBeginning: true, initialUnlockCount: 2, mode: 'vowels-first' },
            style: { color: '#31556a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'odd-even',
            text: 'Después prueba una cremallera alterna: primero una letra sí y una no, luego las que se habían quedado sujetando el ritmo.',
            transform: { x: 0, y: 0, scale: 1.02, width: 650 },
            peel: { fromBeginning: false, initialUnlockCount: 2, mode: 'odd-even' },
            style: { color: '#573d50', colorMode: 'variation', variationStrength: 0.12, fontFamily: 'Georgia' }
          },
          {
            id: 'nth-letter',
            text: 'Aquí se quita la primera letra de cada palabra, después la segunda, después la tercera; el texto se pela por columnas invisibles.',
            transform: { x: 0, y: 0, scale: 1, width: 650 },
            peel: { fromBeginning: true, initialUnlockCount: 2, mode: 'first-letters' },
            style: { color: '#3f6658', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'syllables-order',
            text: 'Separar sílabas cambia el tacto: memoria, cutícula, anillo, ñandú, corazón; cada golpe se despega como una unidad pequeña.',
            transform: { x: 0, y: 0, scale: 1, width: 650 },
            peel: { fromBeginning: false, initialUnlockCount: 2, mode: 'syllables-in-order', groupUnits: true },
            style: { color: '#6d5137', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'first-syllables',
            text: 'Ahora se va la primera sílaba de cada palabra, como si todas perdieran la frente al mismo tiempo y quedaran hablando de perfil.',
            transform: { x: 0, y: 0, scale: 1, width: 650 },
            peel: { fromBeginning: true, initialUnlockCount: 2, mode: 'first-syllables', groupUnits: true },
            style: { color: '#68465d', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'last-syllables',
            text: 'Y al final se puede hacer lo contrario: quitar las últimas sílabas primero, dejando cada palabra sin cola.',
            transform: { x: 0, y: 0, scale: 1, width: 650 },
            peel: { fromBeginning: false, initialUnlockCount: 2, mode: 'last-syllables', groupUnits: true },
            style: { color: '#514f38', colorMode: 'variation', variationStrength: 0.1, fontFamily: 'Georgia' }
          },
          {
            id: 'punctuation-last',
            text: 'La puntuación queda para el final: comas, puntos, dos puntos; pequeños clavos que aguantan más que las letras.',
            transform: { x: 0, y: 0, scale: 1, width: 650 },
            peel: { fromBeginning: true, initialUnlockCount: 2, mode: 'punctuation-last' },
            style: { color: '#6a5142', colorMode: 'solid', fontFamily: 'Georgia' }
          }
        ]
      }
    },

    // ── Layers / matrioska despellejada ──────────────────────────────────────────────
    //
    // Group "anillo": 4 concentric RING PATH layers, each using ringPath layout so text
    //   follows the circular path tangentially (exactly like the reference image).
    //   All rings: centerX=null (auto = content center), centerY=220 (= outer radius).
    //   This makes all rings concentric at the same center regardless of viewport width.
    //   previewOpacity=0.22 → next ring is a ghost before you peel.
    //
    // Group "verso": 3 normal paragraph blocks stacked at the same position.
    //   Demonstrates the layer system for plain text, no ring/shape needed.
    //
    // Group "forma": 2 blocks using shape constraint (no ring path) to show layers
    //   work with regular clipShape blocks too.
    matrioskaPeel: {
      label: 'Layers (matrioska)',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-matrioska',
        layout: { ...structuredClone(defaultPieceConfig.layout), topMargin: 80, blockGap: 72, bottomMargin: 160 },
        physics: { ...structuredClone(defaultPieceConfig.physics), gravity: 0.05 },
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: false, visibleCount: 2, compactFlow: false }
        },
        blocks: [
          // ── anillo: 4 concentric ring-path blocks stacked via groupNext ─────────────
          // groupNext: 3 on the first block → all 4 share the same Y position.
          // Each ring is a different radius; all centered at the same point (centerY=220).
          // Select individual rings in the editor with the numbered handles above the box.
          {
            id: 'anillo-piel',
            text: 'La piel es lo primero y lo más generoso: cubre todo, se estira, aguanta el roce y vive los años. Es lo que enseñas sin haberlo decidido del todo.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            ringPath: { enabled: true, radius: 220, centerY: 220, startAngle: -90, angleMix: 1, spacing: 1 },
            groupNext: 3,
            groupOpacity: 0.22,
            groupPeelReveal: true,
            peel: { fromBeginning: true, initialUnlockCount: 2, mode: 'spiral' },
            hint: { enabled: true, peelPointIndex: 0, appearMs: 2400, textMs: 8000, text: 'pela el anillo' },
            style: { color: '#c49060', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'anillo-carne',
            text: 'Debajo está la carne: lo que se mueve y calienta y sangra. Todo lo que dijiste con cortesía llegó primero aquí.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            ringPath: { enabled: true, radius: 170, centerY: 220, startAngle: -90, angleMix: 1, spacing: 1 },
            peel: { fromBeginning: false, initialUnlockCount: 2, mode: 'outward' },
            style: {
              colorMode: 'sequential', fontFamily: 'Georgia',
              gradient: { type: 'linear', angle: 0, stops: [{ color: '#a84040', alpha: 1, position: 0 }, { color: '#6a2525', alpha: 1, position: 100 }] }
            }
          },
          {
            id: 'anillo-memoria',
            text: 'Aquí [nopeel]la memoria:[/nopeel] una imagen que aguanta todo. [nopeel]Algunas quedan,[/nopeel] degradadas.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            ringPath: { enabled: true, radius: 120, centerY: 220, startAngle: -90, angleMix: 1, spacing: 1 },
            peelPoints: [
              { fromRatio: 0, toRatio: 0.5, direction: 'right', starterCount: 2, mode: 'linear' },
              { fromRatio: 0.5, toRatio: 1, direction: 'left', starterCount: 2, mode: 'linear' }
            ],
            style: { color: '#4a3a7a', colorMode: 'variation', variationStrength: 0.14, fontFamily: 'Georgia' }
          },
          {
            id: 'anillo-explicacion',
            text: 'La razón simple. La que estaba primero.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            ringPath: { enabled: true, radius: 70, centerY: 220, startAngle: -90, angleMix: 1, spacing: 2 },
            peel: { fromBeginning: true, initialUnlockCount: 3, mode: 'inward' },
            style: { color: '#1e3a52', colorMode: 'solid', fontFamily: 'Georgia' }
          },

          // ── verso: 3 plain paragraphs stacked at the same position via groupNext ──
          {
            id: 'verso-piel',
            text: 'Lo que se puede decir: que fue un encuentro tranquilo, que intercambiamos las palabras correctas, que todo ocurrió dentro de lo esperado.',
            transform: { x: 0, y: 0, scale: 1, width: 620 },
            groupNext: 2,
            groupOpacity: 0.18,
            groupPeelReveal: true,
            peel: { fromBeginning: true, initialUnlockCount: 3, mode: 'linear' },
            style: { color: '#8a7055', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'verso-carne',
            text: 'Lo que pasó de verdad: que había algo en tu forma de no mirarme que lo decía todo, y yo tampoco te miré, y en ese hueco sin miradas ocurrió todo lo importante.',
            transform: { x: 0, y: 0, scale: 1, width: 620 },
            peel: { fromBeginning: false, initialUnlockCount: 3, mode: 'outward' },
            style: {
              colorMode: 'sequential', fontFamily: 'Georgia',
              gradient: { type: 'linear', angle: 30, stops: [{ color: '#3d6b7a', alpha: 1, position: 0 }, { color: '#2e4f5c', alpha: 1, position: 100 }] }
            }
          },
          {
            id: 'verso-core',
            text: 'Lo que no cabe en palabras.',
            transform: { x: 0, y: 0, scale: 1, width: 620 },
            peel: { fromBeginning: true, initialUnlockCount: 2, mode: 'inward' },
            style: { color: '#2a3d40', colorMode: 'solid', fontFamily: 'Georgia' }
          },

          // ── forma: 2 ellipse-constrained blocks stacked via groupNext ──────────────
          {
            id: 'forma-piel',
            text: 'Las palabras que elegiste para describirlo después. Las que sonaban bien. Las que dejaban fuera lo que dolía. Las que organizaban la experiencia en algo que podías contar.',
            transform: { x: 80, y: 0, scale: 1, width: 480, height: 200 },
            clipShape: { type: 'ellipse', svgOpacity: 0 },
            groupNext: 1,
            groupOpacity: 0.2,
            groupPeelReveal: true,
            peel: { fromBeginning: true, initialUnlockCount: 4, mode: 'zigzag' },
            style: { color: '#7a6248', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'forma-carne',
            text: 'El temblor que no mencionaste. Lo que tu cuerpo recordaba mientras hablabas. Lo que se quedó sin decir porque no había forma de decirlo sin romperse.',
            transform: { x: 80, y: 0, scale: 1, width: 480, height: 200 },
            clipShape: { type: 'ellipse', svgOpacity: 0 },
            peel: { fromBeginning: false, initialUnlockCount: 3, mode: 'outward' },
            style: {
              colorMode: 'sequential', fontFamily: 'Georgia',
              gradient: { type: 'linear', angle: 45, stops: [{ color: '#3a5a7a', alpha: 1, position: 0 }, { color: '#2e3d50', alpha: 1, position: 100 }] }
            }
          }
        ]
      }
    },

    // ── Conditional narrative: branching story based on which block you peel first ─────
    // Two choice blocks (A and B) sit side by side. Hidden ending blocks (C and D)
    // are revealed by blockComplete triggers that check whether the rival block
    // has NOT yet been completed — so peeling A first reveals ending C, and vice versa.
    conditionalNarrative: {
      label: 'Simple conditional narrative',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-conditional-narrative',
        layout: { ...structuredClone(defaultPieceConfig.layout), blockGap: 48, topMargin: 72, bottomMargin: 160 },
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: false, visibleCount: 2, compactFlow: false }
        },
        blocks: [
          {
            id: 'cn-intro',
            text: 'Two roads diverge. You can only take one first. Strip away the words of the path you choose — and only then will the next sentence appear.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'cn-choice-a',
            text: 'The road to the left: overgrown, quiet, smelling faintly of rain on old stone.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 4 },
            hint: { enabled: true, peelPointIndex: 0, text: 'peel this path' },
            triggers: [
              {
                on: 'blockComplete',
                conditions: [{ completedBlock: 'cn-choice-b', completed: false }],
                actions: [{ type: 'revealBlock', blockId: 'cn-ending-left' }]
              },
              {
                on: 'blockComplete',
                conditions: [{ completedBlock: 'cn-choice-b', completed: false }],
                actions: [{ type: 'hideBlock', blockId: 'cn-choice-b' }]
              }
            ],
            style: { color: '#325f51', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'cn-choice-b',
            text: 'The road to the right: worn flat by carts, loud with sparrows, still catching afternoon light.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: false, initialUnlockCount: 4 },
            hint: { enabled: true, peelPointIndex: 0, text: 'or peel this one' },
            triggers: [
              {
                on: 'blockComplete',
                conditions: [{ completedBlock: 'cn-choice-a', completed: false }],
                actions: [{ type: 'revealBlock', blockId: 'cn-ending-right' }]
              },
              {
                on: 'blockComplete',
                conditions: [{ completedBlock: 'cn-choice-a', completed: false }],
                actions: [{ type: 'hideBlock', blockId: 'cn-choice-a' }]
              }
            ],
            style: { color: '#7a4b30', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'cn-ending-left',
            hidden: true,
            text: 'You chose the left path. The silence pressed close. Somewhere ahead, water moved over stones, and you followed the sound until the trees opened and you understood — this was the one you would always have chosen.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: true, initialUnlockCount: 3 },
            style: { color: '#325f51', colorMode: 'variation', variationStrength: 0.08, fontFamily: 'Georgia' }
          },
          {
            id: 'cn-ending-right',
            hidden: true,
            text: 'You chose the right path. The sparrows lifted ahead of you, one after another, like a sentence being read aloud. The carts had worn the stone into a gentle slope and you walked it easily, the light warm on your back the whole way.',
            transform: { x: 0, y: 0, scale: 1, width: 660 },
            peel: { fromBeginning: false, initialUnlockCount: 3 },
            style: { color: '#7a4b30', colorMode: 'variation', variationStrength: 0.08, fontFamily: 'Georgia' }
          }
        ]
      }
    },

    // ── Visual-novel branching story: fit-visible + flags + skipBlock ────────
    // Each trigger here uses a SINGLE action so the visual editor can handle them.
    // Multiple triggers on the same block fire independently (different ti indices).
    // The flow: intro → two choices (visible together) → two hidden paths →
    // shared junction → flag-gated epilogue.
    // New mechanics demonstrated:
    //   setFlag   — remember a decision for a later branch
    //   skipBlock — mark an unchosen block as done so stepParagraphs skips over it
    //   flag / flagNot conditions — route based on earlier flag
    branchingStory: {
      label: 'Visual novel',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-branching-story',
        layout: { ...structuredClone(defaultPieceConfig.layout), blockGap: 60, topMargin: 80, bottomMargin: 160 },
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: true, visibleCount: 1, compactFlow: true, perBlockVisibleCount: { 'cn2-choice-a': 2 } }
        },
        blocks: [
          // ── Act 1: setup — alone until peeled ───────────────────────────
          {
            id: 'cn2-start',
            text: 'You find a letter on the floor. Two words face up.',
            transform: { x: 0, y: 0, scale: 1.05, width: 560 },
            peel: { fromBeginning: true, initialUnlockCount: 3 },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },

          // ── Act 2: binary choice — both visible together via perBlockVisibleCount ─
          {
            id: 'cn2-choice-a',
            text: 'Open it.',
            transform: { x: -80, y: 0, scale: 1.4, width: 300 },
            peel: { fromBeginning: true, initialUnlockCount: 4 },
            // When peeled first: set flag, skip the other path, reveal this path
            triggers: [
              { on: 'blockComplete', conditions: [{ completedBlock: 'cn2-choice-b', completed: false }], actions: [{ type: 'setFlag', name: 'opened' }] },
              { on: 'blockComplete', conditions: [{ completedBlock: 'cn2-choice-b', completed: false }], actions: [{ type: 'skipBlock', blockId: 'cn2-path-b' }] },
              { on: 'blockComplete', conditions: [{ completedBlock: 'cn2-choice-b', completed: false }], actions: [{ type: 'revealBlock', blockId: 'cn2-path-a' }] },
              { on: 'blockComplete', conditions: [{ completedBlock: 'cn2-choice-b', completed: false }], actions: [{ type: 'skipBlock', blockId: 'cn2-choice-b' }] }
            ],
            style: { color: '#325f51', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'cn2-choice-b',
            text: 'Leave it.',
            transform: { x: 80, y: 0, scale: 1.4, width: 300 },
            peel: { fromBeginning: false, initialUnlockCount: 4 },
            // When peeled first: skip the other path, reveal this path (no flag)
            triggers: [
              { on: 'blockComplete', conditions: [{ completedBlock: 'cn2-choice-a', completed: false }], actions: [{ type: 'skipBlock', blockId: 'cn2-path-a' }] },
              { on: 'blockComplete', conditions: [{ completedBlock: 'cn2-choice-a', completed: false }], actions: [{ type: 'revealBlock', blockId: 'cn2-path-b' }] },
              { on: 'blockComplete', conditions: [{ completedBlock: 'cn2-choice-a', completed: false }], actions: [{ type: 'skipBlock', blockId: 'cn2-choice-a' }] }
            ],
            style: { color: '#7a4b30', colorMode: 'solid', fontFamily: 'Georgia' }
          },

          // ── Act 3: one path revealed, the other skipped ──────────────────
          {
            id: 'cn2-path-a',
            hidden: true,
            text: 'It is addressed to someone else. You have already read the first line.',
            transform: { x: 0, y: 0, scale: 1, width: 560 },
            peel: { fromBeginning: true, initialUnlockCount: 4 },
            triggers: [
              { on: 'blockComplete', actions: [{ type: 'revealBlock', blockId: 'cn2-junction' }] }
            ],
            style: { color: '#325f51', colorMode: 'variation', variationStrength: 0.07, fontFamily: 'Georgia' }
          },
          {
            id: 'cn2-path-b',
            hidden: true,
            text: 'You step over it. By evening it is gone.',
            transform: { x: 0, y: 0, scale: 1, width: 560 },
            peel: { fromBeginning: false, initialUnlockCount: 4 },
            triggers: [
              { on: 'blockComplete', actions: [{ type: 'revealBlock', blockId: 'cn2-junction' }] }
            ],
            style: { color: '#7a4b30', colorMode: 'variation', variationStrength: 0.07, fontFamily: 'Georgia' }
          },

          // ── Act 4: merge point — both paths arrive here ──────────────────
          {
            id: 'cn2-junction',
            hidden: true,
            text: 'The hallway is quiet. You walk away.',
            transform: { x: 0, y: 0, scale: 1, width: 560 },
            peel: { fromBeginning: true, initialUnlockCount: 3 },
            // Route epilogue using the flag from Act 2
            triggers: [
              { on: 'blockComplete', conditions: [{ flag: 'opened' }],    actions: [{ type: 'revealBlock', blockId: 'cn2-coda-a' }] },
              { on: 'blockComplete', conditions: [{ flag: 'opened' }],    actions: [{ type: 'skipBlock',   blockId: 'cn2-coda-b' }] },
              { on: 'blockComplete', conditions: [{ flagNot: 'opened' }], actions: [{ type: 'revealBlock', blockId: 'cn2-coda-b' }] },
              { on: 'blockComplete', conditions: [{ flagNot: 'opened' }], actions: [{ type: 'skipBlock',   blockId: 'cn2-coda-a' }] }
            ],
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },

          // ── Act 5: flag-gated epilogue — routes back to the first choice ─
          {
            id: 'cn2-coda-a',
            hidden: true,
            text: 'The habit of opening things follows you for weeks.',
            transform: { x: 0, y: 0, scale: 1, width: 560 },
            peel: { fromBeginning: true, initialUnlockCount: 3 },
            style: { color: '#325f51', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'cn2-coda-b',
            hidden: true,
            text: 'The habit of leaving things follows you for weeks.',
            transform: { x: 0, y: 0, scale: 1, width: 560 },
            peel: { fromBeginning: false, initialUnlockCount: 3 },
            style: { color: '#7a4b30', colorMode: 'solid', fontFamily: 'Georgia' }
          }
        ]
      }
    },

    // ── Cuadrícula / grid-snap: cada grafema está anclado a su celda ────────────
    // peel.popGrid desbloquea todos los grafemas al inicio; grid-snap letterMotion
    // los mantiene en posición mediante un muelle. Arrastra una letra fuera de su
    // celda (>escapeThreshold) y la suelta: la columna de encima cae en cascada.
    grid: {
      label: 'Grid: cascading letters',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-grid',
        layout: { ...structuredClone(defaultPieceConfig.layout), topMargin: 80, blockGap: 40, bottomMargin: 160 },
        physics: { ...structuredClone(defaultPieceConfig.physics), gravity: 0.22, damping: 0.97 },
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: false, visibleCount: 1, compactFlow: false }
        },
        blocks: [
          {
            id: 'grid-poem',
            text: 'todo lo que era tuyo\nse fue quedando aquí\nno sé si lo recuerdas\npero yo sí lo sentí',
            transform: { x: 0, y: 0, scale: 0.96, width: 460 },
            peel: { popGrid: true, cascade: true },
            letterMotion: { type: 'grid-snap', strength: 0.42, damping: 0.76, escapeThreshold: 34 },
            hint: { enabled: true, peelPointIndex: 0, text: 'arrastra una letra' },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Courier New' }
          }
        ]
      }
    },

    // ── Costura: breakPoints que bloquean propagación hasta un tirón fuerte ───
    // breakPoints[].grapheme marca el grafema donde el hilo se resiste.
    // La propagación se detiene ahí; un tirón de dist > rest + threshold rompe
    // la costura permanentemente, dividiendo la cadena en dos mitades libres.
    costura: {
      label: 'Rupture point',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-costura',
        layout: { ...structuredClone(defaultPieceConfig.layout), topMargin: 82, blockGap: 44, bottomMargin: 150 },
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: false, visibleCount: 1, compactFlow: false }
        },
        blocks: [
          {
            id: 'seam-a',
            // ✦ en grapheme 33 (0-indexed); peel desde la derecha hacia la izquierda
            text: 'Una frase con costuras internas. [color=#b74040]✦[/color] Si tiras fuerte, rompes el hilo.',
            transform: { x: 0, y: 0, scale: 1.05, width: 640 },
            peel: { fromBeginning: false, initialUnlockCount: 2 },
            breakPoints: [{ grapheme: 33, threshold: 50 }],
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'seam-b',
            // ✦ en grapheme 35
            text: 'Una segunda frase, también cosida. [color=#b74040]✦[/color] Si tiras flojo no la arrancas.',
            transform: { x: 0, y: 0, scale: 1.05, width: 640 },
            peel: { fromBeginning: true, initialUnlockCount: 2 },
            breakPoints: [{ grapheme: 35, threshold: 45 }],
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          }
        ]
      }
    },

    // ── All shapes showcase ───────────────────────────────────────────────────
    shapesShowcase: {
      label: 'Shape-constrained text',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-shapes-showcase',
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: false, visibleCount: 1, compactFlow: false }
        },
        blocks: [
          { id: 'sc-circle',  text: 'Todo lo que cabe en un círculo: la distancia exacta entre empezar y volver al mismo punto sin haber perdido nada. Es un abrazo cerrado sobre sí mismo que no deja salir el aire ni entrar el ruido. Giramos y giramos, convencidos de que avanzamos, cuando solo estamos puliendo el borde de nuestra propia insistencia. Hay quien dice que los círculos son polígonos con infinitos lados, pero es el mismo tipo de dice que "teóricamente ya no eres la misma persona que hace 3 semanas, has mudado células, así que no te quejes.', transform: { x: 0, y: 0, scale: 1, width: 440, height: 440 }, peel: { fromBeginning: true, initialUnlockCount: 3 }, clipShape: { type: 'circle' },   style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' } },
          { id: 'sc-tshirt', text: 'Todo lo que cabe en una camiseta: una talla, un año, un nombre que ya no significa nada. Lo dobles o lo tires, siempre ocupa el mismo sitio en el cajón. Con un tomate, o con una mancha de aceite, puede dar igual o ser lo que la lance al armario de limpieza como otro tejido más para limpiar el baño. No sabes ni lo que pone, aunque está en inglés y sabes inglés perfectamente. Ese grupo no lo has escuchado nunca, ni lo vas a escuchar, hasta odiarías a quien lo nombre olvidando que llevas una camiseta con su logo, so tonto.', transform: { x: 0, y: 0, scale: 1, width: 440, height: 440 }, peel: { fromBeginning: false, initialUnlockCount: 2 }, clipShape: { type: 'tshirt' },  style: { color: '#2e7d32', colorMode: 'variation', variationStrength: 0.12, fontFamily: 'Georgia' } },
          { id: 'sc-star5',  text: 'Cinco puntas y ninguna mira hacia el centro que las sostiene. Estrella es deseo proyectado, brújula. Brillamos para que alguien nos vea sin darnos cuenta de que la luz más brillante es la que quema por dentro.', transform: { x: 0, y: 0, scale: 1, width: 440, height: 440 }, peel: { fromBeginning: true, initialUnlockCount: 1 }, clipShape: { type: 'star5' },   style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' } },
          { id: 'sc-diamond', text: 'A veces lo que vale no brilla en absoluto. Lo guardas igual. El diamante se forma bajo una presión insoportable que dura millones de años en la oscuridad más profunda. Tú llevas solo un suspiro y te quejas del peso. La transparencia es regalo de la paciencia y el tiempo, dureza que solo se consigue cuando ya no queda nada que ocultar.', transform: { x: 0, y: 0, scale: 1, width: 440, height: 440 }, peel: { fromBeginning: false, initialUnlockCount: 3 }, clipShape: { type: 'diamond' },  style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' } },
          { id: 'sc-triangle', text: 'El triángulo es la figura más estable que existe. Tres puntos, tres tensiones, ninguna cede aunque todo tiemble. Es la base de las pirámides y la forma de las advertencias. Tres vértices que se vigilan entre sí, un equilibrio precario que se vuelve irrompible ante el viento. Si uno se suelta, el mundo se rompe; mientras resistan, el cielo puede apoyarse sobre ellos que no pasará nada.', transform: { x: 0, y: 0, scale: 1, width: 440, height: 440 }, peel: { fromBeginning: true, initialUnlockCount: 3 }, clipShape: { type: 'triangle' }, style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' } },
          { id: 'sc-heart',  text: 'El corazón no tiene la forma que le damos. Pero le damos esta igualmente porque es más fácil de entender: dos curvas y un punto. Así de simple y así de complicado. La forma del amor es ridícula y precisa, silueta que recortamos en el aire para intentar atrapar un latido que no sabe de curvas ni rectas ni de ángulos perfectos.', transform: { x: 0, y: 0, scale: 1, width: 440, height: 440 }, peel: { fromBeginning: false, initialUnlockCount: 3 }, clipShape: { type: 'heart' },    style: { color: '#b74040', colorMode: 'solid', fontFamily: 'Georgia' } },
          { id: 'sc-hex',    text: 'Las abejas eligieron el hexágono porque es la forma más eficiente. No por gusto. Por supervivencia. Seis lados iguales, seis ángulos iguales, cero espacio desperdiciado. Qué bonito no poder permitirse el lujo de lo inútil, construir una casa donde cada rincón tiene un propósito y cada pared sostiene el peso de todo el panal sin dudar ni un milímetro.', transform: { x: 0, y: 0, scale: 1, width: 400, height: 400 }, peel: { fromBeginning: true, initialUnlockCount: 3 }, clipShape: { type: 'hexagon' },  style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' } },
          { id: 'sc-leaf',   text: 'La hoja cae cuando ya no tiene nada que dar. No cae por accidente. Cae porque es lo que toca. Cada hoja es un poco distinta, llevan la misma forma pero no hay dos iguales. Como las huellas o las conversaciones, se marchitan siguiendo un mapa de nervios que solo ellas conocen, entregándose al suelo con la elegancia de quien sabe que su ciclo ha terminado.', transform: { x: 0, y: 0, scale: 1, width: 400, height: 440 }, peel: { fromBeginning: false, initialUnlockCount: 2 }, clipShape: { type: 'leaf' },     style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' } },
          { id: 'sc-cross',  text: 'Dos líneas que se cruzan. Un punto en común. Todo lo demás es periferia. No todo lo que se cruza se encuentra, a veces solo se dividen los caminos. Una cruz es una suma de direcciones opuestas que se detienen un instante para reconocerse, antes de seguir su ruta hacia los cuatro vientos, dejando atrás el centro donde una vez fueron una sola cosa.', transform: { x: 0, y: 0, scale: 1, width: 395, height: 395 }, peel: { fromBeginning: true, initialUnlockCount: 2 }, clipShape: { type: 'cross' }, style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' } },
          { id: 'sc-star6',  text: 'Seis puntas, doce vértices, dos triángulos superpuestos. Una estrella que contiene otra estrella dentro, un equilibrio de fuerzas que se entrelazan para formar una luz más compleja. Es el dibujo de la armonía y de la paradoja, donde lo que sube y lo que baja se encuentran en el medio para sostener un brillo que no depende de una sola punta.', transform: { x: 0, y: 0, scale: 1, width: 520, height: 520 }, peel: { fromBeginning: true, initialUnlockCount: 1 }, clipShape: { type: 'star6' }, style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' } },
          { id: 'sc-drop',   text: 'Una lágrima tiene esa forma porque la gravedad también tiene criterio. Cae con geometría. Toca fondo con gracia. Es la forma del agua cuando se rinde, de la lluvia cuando busca el suelo, de la tristeza cuando pesa demasiado para quedarse en los ojos. Una gota es un mundo entero que se precipita, arrastrando consigo toda la sal que no supimos digerir.', transform: { x: 0, y: 0, scale: 1, width: 440, height: 550 }, peel: { fromBeginning: true, initialUnlockCount: 1 }, clipShape: { type: 'drop' }, style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' } },
          { id: 'sc-bubble', text: 'Lo que se dice en voz alta ocupa espacio. Lo que no se dice también. El silencio tiene forma de burbuja rota. El globo de diálogo está vacío hasta que alguien lo llena, y a veces quien lo llena no tiene nada que decir, solo aire caliente que flota un momento antes de explotar contra la realidad de lo que realmente estamos pensando.', transform: { x: 0, y: 0, scale: 1, width: 340, height: 340 }, peel: { fromBeginning: false, initialUnlockCount: 3 }, clipShape: { type: 'bubble' }, style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' } },
          { id: 'sc-arrow',  text: 'La flecha siempre apunta hacia algún sitio. Pero nadie te dice si lo que hay allí merece la pena. La dirección no es destino. Puedes ir hacia delante y llegar exactamente al mismo punto de siempre, solo que más cansado. Es la forma de la intención y del proyectil, una línea recta que ignora el paisaje con tal de alcanzar lo que siempre está un paso más allá.', transform: { x: 0, y: 0, scale: 1, width: 580, height: 440 }, peel: { fromBeginning: true, initialUnlockCount: 1 }, clipShape: { type: 'arrow' }, style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' } },
          { id: 'sc-penta',  text: 'Cinco lados, cinco ángulos obtusos, ninguna arista que corte de verdad. El pentágono es el polígono de los compromisos, una forma que busca la redondez sin querer renunciar del todo a sus esquinas. Es un refugio amurallado que intenta proteger lo que hay dentro, ignorando que los secretos más grandes siempre encuentran la forma de saltar por encima de cualquier muro.', transform: { x: 0, y: 0, scale: 1, width: 440, height: 440 }, peel: { fromBeginning: true, initialUnlockCount: 1 }, clipShape: { type: 'pentagon' }, style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' } },
          { id: 'sc-custom', text: 'Un camino hecho a medida. No encaja en ningún nombre. No es círculo ni triángulo ni nada conocido. Es solo esta forma, esta vez, para este texto que busca su propio contorno en la irregularidad de lo que sentimos. No necesitamos nombres para las formas que nos contienen, solo espacio suficiente para que las palabras respiren y se acomoden a su manera. Puedes elegir el contorno que quieras dibujando una forma SVG en programas como Vectorpea/Inkscape.', transform: { x: 0, y: 0, scale: 1, width: 440, height: 440 }, peel: { fromBeginning: true, initialUnlockCount: 1 }, clipShape: { type: 'custom', pathD: 'M 220,10 C 350,10 430,90 430,220 C 430,330 350,380 265,410 L 220,430 L 175,410 C 90,380 10,330 10,220 C 10,90 90,10 220,10 Z' }, style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' } }
        ]
      }
    },

    drainPull: {
      label: 'Drain: pulling hair',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-drain-pull',
        style: { ...structuredClone(defaultPieceConfig.style), backgroundColor: '#e6e1d6' },
        layout: { ...structuredClone(defaultPieceConfig.layout), topMargin: 60, blockGap: 40, bottomMargin: 520 },
        peel: { ...structuredClone(defaultPieceConfig.peel), mode: 'linear', initialUnlockCount: 2, unlockThreshold: 1 },
        physics: { ...structuredClone(defaultPieceConfig.physics), gravity: 0.16, damping: 0.97 },
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: false, visibleCount: 1, compactFlow: false }
        },
        blocks: [
          {
            id: 'drain-strand',
            text: 'tira de lo que se acumuló en la cañería: cada pelo es un recuerdo que creías ido, una culpa enredada con otra, y cuanto más tiras más sale, larguísima, viscosa, imposible de soltar una vez la tienes entre los dedos.',
            transform: { x: 0, y: 0, scale: 1.05, width: 620 },
            peel: { fromBeginning: true, initialUnlockCount: 2, mode: 'linear' },
            drain: {
              enabled: true,
              x: 330, y: 180,
              dropsEnabled: true, dropRate: 0.8, dropColor: '#2a2521',
              bugsEnabled: true, bugRate: 0.18, bugColor: '#1c1814'
            },
            hint: { enabled: true, peelPointIndex: 0 },
            style: { color: '#23201c', colorMode: 'variation', variationStrength: 0.1, fontFamily: 'Georgia' }
          }
        ]
      }
    }
  };
}

export function buildCableScenes(defaultPieceConfig) {
  // Three-cable scene: right → right → LEFT.
  //
  // drawPath anchors: BLOCK-LOCAL. container_x = transform.x + anchor.x.
  //
  // Layout (topMargin=80, blockGap=0). Each cable block ≈ 240px layout height.
  // Cables b & c use transform.y to shift up to the same visual y as cable-a.
  //
  //   cable-a: startY=80   h≈163  (rightward, x=80→2600)
  //   cable-b: startY=243  h≈163  transform.y=-163  (rightward, x=2600→4800)
  //   cable-c: startY=406  h≈163  transform.y=-326  (LEFTWARD,  x=4800→1000)
  //
  // Decorative startY (empirically derived; h_cable≈163):
  //   nota-a=569  illus-a=646  nota-b=788  illus-b=839
  //   nota-c=981  el-mar=1058  costa=1130
  // transform.y = desired_container_y − startY.
  // Cable visual center ≈ container y 235 (startY=80 + anchor y≈155).
  // el-mar & costa at x≈1100–1500 appear on the wide initial viewport;
  // they drift leftward off-screen as the camera pans right, then reappear
  // as cable-c pulls the camera back left.
  return {
    cableToSea: {
      label: 'Camera panning',
      config: {
        ...structuredClone(defaultPieceConfig),
        id: 'tirita-cable-sea',
        layout: { type: 'paragraph', blockGap: 0, margin: 0, topMargin: 80, bottomMargin: 0 },
        behaviors: {
          fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
          stepParagraphs: { enabled: false, visibleCount: 1, compactFlow: false, advanceDelayMs: 0, perBlockAdvanceDelayMs: {}, perBlockVisibleCount: {} },
          cablePull: {
            enabled: true,
            mode: 'frontier',
            followBlockIds: ['cable-a', 'cable-b', 'cable-c'],
            ease: 0.1,
            leadMargin: 280,
            maxPan: 0,
            lockVerticalScroll: true,
            lockOnComplete: true
          }
        },
        blocks: [
          // ── Cable A — rightward, x=80→2600 ─────────────────────────────────
          {
            id: 'cable-a',
            cable: true,
            text: 'Un cable textual o una frase-cable atraviesa la pantalla. Al tirar, la cámara se mueve hacia la derecha, revelando más texto, pasando',
            transform: { x: 0, y: 0, scale: 1, width: 3000 },
            peel: { fromBeginning: true, initialUnlockCount: 4, mode: 'linear' },
            peelPoints: [{ direction: 'right', starterCount: 4 }],
            drawPath: {
              enabled: true, spacing: 2.5, angleMix: 0.85,
              anchors: [
                { x: 80,   y: 155, in: { x: 0,    y: 0   }, out: { x: 280,  y: -65 } },
                { x: 660,  y: 105, in: { x: -250, y: 65  }, out: { x: 250,  y: 75  } },
                { x: 1200, y: 185, in: { x: -230, y: -75 }, out: { x: 240,  y: -60 } },
                { x: 1780, y: 110, in: { x: -230, y: 60  }, out: { x: 240,  y: 75  } },
                { x: 2300, y: 190, in: { x: -220, y: -75 }, out: { x: 200,  y: -55 } },
                { x: 2600, y: 145, in: { x: -180, y: 55  }, out: { x: 0,    y: 0   } }
              ]
            },
            hint: { enabled: true, peelPointIndex: 0 },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },

          // ── Cable B — rightward, x=2600→4800 ───────────────────────────────
          // startY=320; transform.y=-240 aligns it to the same visual y as cable-a.
          // Handle appears at x=2600 (screen-right of viewport) when cable-a finishes.
          {
            id: 'cable-b',
            cable: true,
            text: ' por ilustraciones y otros bloques de texto repartidos a lo largo de esta gran cuerda que oscila y esquiva',
            transform: { x: 0, y: -163, scale: 1, width: 5000 },
            peel: { fromBeginning: true, initialUnlockCount: 0, mode: 'linear' },
            peelPoints: [{ direction: 'right', starterCount: 4 }],
            drawPath: {
              enabled: true, spacing: 2.5, angleMix: 0.85,
              anchors: [
                { x: 2600, y: 145, in: { x: 0,    y: 0   }, out: { x: 230,  y: -55 } },
                { x: 3100, y: 105, in: { x: -200, y: 55  }, out: { x: 220,  y: 70  } },
                { x: 3700, y: 185, in: { x: -210, y: -70 }, out: { x: 220,  y: -55 } },
                { x: 4300, y: 110, in: { x: -210, y: 55  }, out: { x: 200,  y: 70  } },
                { x: 4800, y: 180, in: { x: -190, y: -70 }, out: { x: 0,    y: 0   } }
              ]
            },
            hint: { enabled: true, peelPointIndex: 0, appearMs: 1200, textMs: 4000, text: 'sigue...' },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },

          // ── Cable C — LEFTWARD, x=4800→1000 ────────────────────────────────
          // startY=560; transform.y=-480 aligns to same visual y.
          // Path goes RIGHT TO LEFT: first anchor at x=4800, last at x=1000.
          // direction:'left' so the peel handle sits at x=4800 and user drags left.
          // As letters unlock (moving leftward), frontierX decreases and
          // cameraTargetX = max(0, frontierX - leadMargin_offset) shrinks → camera pans LEFT.
          {
            id: 'cable-c',
            cable: true,
            text: ', y al final: el mar. El cable sigue y sigue, oscilando, esquivando palabras que flotan a su paso, hasta que el hilo se cansa de ser hilo y quiere ser ola. Y el mar estaba ahí, siempre al lado.',
            transform: { x: 0, y: -326, scale: 1, width: 5000 },
            peel: { fromBeginning: true, initialUnlockCount: 0, mode: 'linear' },
            peelPoints: [{ direction: 'right', starterCount: 4 }],
            drawPath: {
              enabled: true, spacing: 2.5, angleMix: 0.85,
              anchors: [
                { x: 4800, y: 145, in: { x: 0,    y: 0   }, out: { x: -220, y: -60 } },
                { x: 4200, y: 100, in: { x: 210,  y: 60  }, out: { x: -210, y: 70  } },
                { x: 3600, y: 180, in: { x: 200,  y: -70 }, out: { x: -200, y: -55 } },
                { x: 3000, y: 110, in: { x: 195,  y: 55  }, out: { x: -195, y: 70  } },
                { x: 2400, y: 185, in: { x: 185,  y: -70 }, out: { x: -185, y: -55 } },
                { x: 1800, y: 120, in: { x: 180,  y: 55  }, out: { x: -180, y: 65  } },
                { x: 1000, y: 175, in: { x: 185,  y: -65 }, out: { x: 0,    y: 0   } }
              ]
            },
            hint: { enabled: true, peelPointIndex: 0, appearMs: 1200, textMs: 4000, text: 'ahora izquierda' },
            style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },

          // ── Decorative blocks ───────────────────────────────────────────────
          // Cable blocks are ≈200px tall (not 240). startY values adjusted accordingly.
          // transform.y = desired_container_y − startY.

          {
            id: 'nota-a',
            text: 'a medio camino,\nalgo se cuelga\ndel cable',
            // startY=569; want y=160 (above cable): 160−569=−409
            transform: { x: 700, y: -409, scale: 0.85, width: 180 },
            peel: { fromBeginning: true, initialUnlockCount: 1, mode: 'random' },
            style: { color: '#7a6a58', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'illus-a',
            text: ' ',
            // startY=646 (569+77); want attach at y=270: text top=240 → 240−646=−406
            transform: { x: 1100, y: -406, scale: 1, width: 100 },
            peel: { fromBeginning: true, initialUnlockCount: 1, mode: 'linear' },
            attachment: {
              type: 'lineart', src: null,
              width: 80, height: 112, gap: 0, opticalOffsetY: 8,
              strokeResistance: 28,
              strokes: [
                { pathPoints: [[0.5,0.04],[0.88,0.38],[0.78,0.72],[0.5,0.94],[0.22,0.72],[0.12,0.38],[0.5,0.04]],
                  nodeCount: 22, starterCount: 2, endStarterCount: 2, lineWidth: 2.2, color: '#6a5a4a' },
                { pathPoints: [[0.22,0.55],[0.78,0.55]],
                  nodeCount: 10, starterCount: 2, endStarterCount: 2, lineWidth: 1.6, color: '#6a5a4a' }
              ]
            },
            style: { color: '#6a5a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },

          {
            id: 'nota-b',
            text: 'palabras que flotan\ncolgadas del hilo',
            // startY=788 (646+142); want y=160: 160−788=−628
            transform: { x: 2200, y: -628, scale: 0.85, width: 360 },
            peel: { fromBeginning: true, initialUnlockCount: 1, mode: 'random' },
            style: { color: '#7a6a58', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'illus-b',
            text: ' ',
            // startY=839 (788+51); want attach at y=270: text top=240 → 240−839=−599
            transform: { x: 2600, y: -599, scale: 1, width: 100 },
            peel: { fromBeginning: true, initialUnlockCount: 1, mode: 'linear' },
            attachment: {
              type: 'lineart', src: null,
              width: 90, height: 110, gap: 0, opticalOffsetY: 8,
              strokeResistance: 28,
              strokes: [
                { pathPoints: [[0.5,0.04],[0.96,0.5],[0.5,0.96],[0.04,0.5],[0.5,0.04]],
                  nodeCount: 20, starterCount: 2, endStarterCount: 2, lineWidth: 2.2, color: '#6a5a4a' },
                { pathPoints: [[0.04,0.5],[0.96,0.5]], nodeCount: 8, starterCount: 2, endStarterCount: 2, lineWidth: 1.5, color: '#6a5a4a' },
                { pathPoints: [[0.5,0.04],[0.5,0.96]], nodeCount: 8, starterCount: 2, endStarterCount: 2, lineWidth: 1.5, color: '#6a5a4a' }
              ]
            },
            style: { color: '#6a5a4a', colorMode: 'solid', fontFamily: 'Georgia' }
          },

          {
            id: 'nota-c',
            text: 'el cable\nvuelve\nhacia atrás',
            // startY=981 (839+142); want y=160: 160−981=−821
            transform: { x: 4200, y: -821, scale: 0.85, width: 160 },
            peel: { fromBeginning: true, initialUnlockCount: 1, mode: 'random' },
            style: { color: '#7a6a58', colorMode: 'solid', fontFamily: 'Georgia' }
          },

          // ── Arrival — visible when camera returns left during cable-c ────────
          // el-mar at x=1500, costa at x=1100. During the rightward journey the
          // camera overshoots both (max camera≈3880). As cable-c pulls the camera
          // left past x≈1500 these elements re-enter the viewport from the left.
          {
            id: 'el-mar',
            text: 'el mar.',
            // startY=1058 (981+77); want y=130: 130−1058=−928
            transform: { x: 1500, y: -928, scale: 2.4, width: 320 },
            peel: { fromBeginning: true, initialUnlockCount: 1, mode: 'linear' },
            style: { color: '#2a5a8a', colorMode: 'solid', fontFamily: 'Georgia' }
          },
          {
            id: 'costa',
            text: ' ',
            // startY=1130 (1058+72); want attach at y=270: text top=240 → 240−1130=−890
            transform: { x: 1100, y: -890, scale: 1, width: 360 },
            peel: { fromBeginning: true, initialUnlockCount: 1, mode: 'linear' },
            attachment: {
              type: 'lineart', src: null,
              width: 360, height: 200, gap: 0, opticalOffsetY: 10,
              strokeResistance: 18,
              strokes: [
                { pathPoints: [[0.04,0.2],[0.2,0.12],[0.4,0.22],[0.6,0.12],[0.8,0.22],[0.96,0.16]],
                  nodeCount: 22, starterCount: 3, endStarterCount: 0, lineWidth: 2.4, color: '#2a5a8a' },
                { pathPoints: [[0.04,0.5],[0.2,0.42],[0.4,0.52],[0.6,0.42],[0.8,0.52],[0.96,0.46]],
                  nodeCount: 20, starterCount: 3, endStarterCount: 0, lineWidth: 2.0, color: '#3a6a9a' },
                { pathPoints: [[0.04,0.8],[0.2,0.72],[0.4,0.82],[0.6,0.72],[0.8,0.82],[0.96,0.76]],
                  nodeCount: 20, starterCount: 3, endStarterCount: 0, lineWidth: 1.6, color: '#4a7aaa' }
              ]
            },
            style: { color: '#2a5a8a', colorMode: 'solid', fontFamily: 'Georgia' }
          }
        ]
      }
    }
  };
}
