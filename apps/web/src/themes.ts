/**
 * Defines the structure of a UI theme.
 */
export interface Theme {
  name: string
  colors: {
    bg: string
    card: string
    border: string
    textPrimary: string
    textSecondary: string
    accent: string
    error: string
    panel: string
  }
}

/**
 * Collection of available application themes.
 * Each theme defines a set of colors used throughout the UI.
 */
export const themes: Record<string, Theme> = {
  default: {
    name: 'Default',
    colors: {
      bg: '#011502',
      card: '#011502',
      border: '#104f55',
      textPrimary: '#9ec5ab',
      textSecondary: '#32746d',
      accent: '#9ec5ab',
      error: '#c62828',
      panel: 'rgba(158, 197, 171, 0.05)'
    }
  },
  serika: {
    name: 'Serika',
    colors: {
      bg: '#e1e1e3',
      card: '#e1e1e3',
      border: '#d1d1d6',
      textPrimary: '#323437',
      textSecondary: '#646669',
      accent: '#e2b714',
      error: '#ca4754',
      panel: 'rgba(50, 52, 55, 0.05)'
    }
  },
  botanical: {
    name: 'Botanical',
    colors: {
      bg: '#7b9c98',
      card: '#7b9c98',
      border: '#678c87',
      textPrimary: '#eaf1f3',
      textSecondary: '#495e57',
      accent: '#eaf1f3',
      error: '#e06c75',
      panel: 'rgba(234, 241, 243, 0.1)'
    }
  },
  miami: {
    name: 'Miami',
    colors: {
      bg: '#f35588',
      card: '#f35588',
      border: '#f03c7a',
      textPrimary: '#05dfd7',
      textSecondary: '#a3f7bf',
      accent: '#fff591',
      error: '#fff591',
      panel: 'rgba(5, 223, 215, 0.1)'
    }
  },
  dark: {
    name: 'Dark',
    colors: {
      bg: '#121212',
      card: '#1e1e1e',
      border: '#333333',
      textPrimary: '#e0e0e0',
      textSecondary: '#a0a0a0',
      accent: '#bb86fc',
      error: '#cf6679',
      panel: 'rgba(255, 255, 255, 0.05)'
    }
  },
  nord: {
    name: 'Nord',
    colors: {
      bg: '#2e3440',
      card: '#3b4252',
      border: '#4c566a',
      textPrimary: '#eceff4',
      textSecondary: '#d8dee9',
      accent: '#88c0d0',
      error: '#bf616a',
      panel: 'rgba(136, 192, 208, 0.1)'
    }
  },
  solarizedDark: {
    name: 'Solarized Dark',
    colors: {
      bg: '#002b36',
      card: '#073642',
      border: '#586e75',
      textPrimary: '#93a1a1',
      textSecondary: '#657b83',
      accent: '#2aa198',
      error: '#dc322f',
      panel: 'rgba(42, 161, 152, 0.1)'
    }
  },
  solarizedLight: {
    name: 'Solarized Light',
    colors: {
      bg: '#fdf6e3',
      card: '#eee8d5',
      border: '#93a1a1',
      textPrimary: '#586e75',
      textSecondary: '#657b83',
      accent: '#2aa198',
      error: '#dc322f',
      panel: 'rgba(42, 161, 152, 0.1)'
    }
  },
  dracula: {
    name: 'Dracula',
    colors: {
      bg: '#282a36',
      card: '#44475a',
      border: '#6272a4',
      textPrimary: '#f8f8f2',
      textSecondary: '#bd93f9',
      accent: '#ff79c6',
      error: '#ff5555',
      panel: 'rgba(255, 121, 198, 0.1)'
    }
  },
  gruvbox: {
    name: 'Gruvbox',
    colors: {
      bg: '#282828',
      card: '#3c3836',
      border: '#504945',
      textPrimary: '#ebdbb2',
      textSecondary: '#a89984',
      accent: '#fabd2f',
      error: '#fb4934',
      panel: 'rgba(250, 189, 47, 0.1)'
    }
  },
  monokai: {
    name: 'Monokai',
    colors: {
      bg: '#272822',
      card: '#3e3d32',
      border: '#75715e',
      textPrimary: '#f8f8f2',
      textSecondary: '#a6e22e',
      accent: '#fd971f',
      error: '#f92672',
      panel: 'rgba(253, 151, 31, 0.1)'
    }
  },
  oceanic: {
    name: 'Oceanic',
    colors: {
      bg: '#1b2b34',
      card: '#343d46',
      border: '#4f5b66',
      textPrimary: '#d8dee9',
      textSecondary: '#c0c5ce',
      accent: '#6699cc',
      error: '#ec5f67',
      panel: 'rgba(102, 153, 204, 0.1)'
    }
  },
  pastel: {
    name: 'Pastel',
    colors: {
      bg: '#fff0f5',
      card: '#ffe4e1',
      border: '#ffb6c1',
      textPrimary: '#708090',
      textSecondary: '#a9a9a9',
      accent: '#ff69b4',
      error: '#ff6347',
      panel: 'rgba(255, 105, 180, 0.1)'
    }
  },
  highContrast: {
    name: 'High Contrast',
    colors: {
      bg: '#000000',
      card: '#000000',
      border: '#ffffff',
      textPrimary: '#ffffff',
      textSecondary: '#ffff00',
      accent: '#00ff00',
      error: '#ff0000',
      panel: 'rgba(255, 255, 255, 0.2)'
    }
  },
  cyberpunk: {
    name: 'Cyberpunk',
    colors: {
      bg: '#0b0c15',
      card: '#1a1c29',
      border: '#2a2d3e',
      textPrimary: '#e0e0e0',
      textSecondary: '#00ff9f',
      accent: '#ff003c',
      error: '#ff003c',
      panel: 'rgba(255, 0, 60, 0.1)'
    }
  },
  midnight: {
    name: 'Midnight',
    colors: {
      bg: '#0f172a',
      card: '#1e293b',
      border: '#334155',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      accent: '#38bdf8',
      error: '#ef4444',
      panel: 'rgba(56, 189, 248, 0.1)'
    }
  },
  forest: {
    name: 'Forest',
    colors: {
      bg: '#1a2e1a',
      card: '#243b24',
      border: '#3a5a3a',
      textPrimary: '#e0f2e0',
      textSecondary: '#8fbc8f',
      accent: '#4caf50',
      error: '#ff5252',
      panel: 'rgba(76, 175, 80, 0.1)'
    }
  },
  sunset: {
    name: 'Sunset',
    colors: {
      bg: '#2d1b2e',
      card: '#452c45',
      border: '#6b4c6b',
      textPrimary: '#ffd1dc',
      textSecondary: '#ff9e9e',
      accent: '#ff6b6b',
      error: '#ff4757',
      panel: 'rgba(255, 107, 107, 0.1)'
    }
  },
  lavender: {
    name: 'Lavender',
    colors: {
      bg: '#e6e6fa',
      card: '#f3f3ff',
      border: '#dcdcdc',
      textPrimary: '#483d8b',
      textSecondary: '#7b68ee',
      accent: '#9370db',
      error: '#ff6347',
      panel: 'rgba(147, 112, 219, 0.1)'
    }
  },
  mint: {
    name: 'Mint',
    colors: {
      bg: '#f5fffa',
      card: '#e0fff0',
      border: '#b0e0e6',
      textPrimary: '#2f4f4f',
      textSecondary: '#66cdaa',
      accent: '#00fa9a',
      error: '#ff6347',
      panel: 'rgba(0, 250, 154, 0.1)'
    }
  },
  cherry: {
    name: 'Cherry',
    colors: {
      bg: '#2b0a10',
      card: '#4a121d',
      border: '#7a1f2e',
      textPrimary: '#ffc0cb',
      textSecondary: '#ff69b4',
      accent: '#ff1493',
      error: '#ff0000',
      panel: 'rgba(255, 20, 147, 0.1)'
    }
  },
  coffee: {
    name: 'Coffee',
    colors: {
      bg: '#3e2723',
      card: '#4e342e',
      border: '#6d4c41',
      textPrimary: '#d7ccc8',
      textSecondary: '#a1887f',
      accent: '#8d6e63',
      error: '#ff5722',
      panel: 'rgba(141, 110, 99, 0.1)'
    }
  },
  slate: {
    name: 'Slate',
    colors: {
      bg: '#1e293b',
      card: '#334155',
      border: '#475569',
      textPrimary: '#f1f5f9',
      textSecondary: '#94a3b8',
      accent: '#64748b',
      error: '#ef4444',
      panel: 'rgba(100, 116, 139, 0.1)'
    }
  },
  ocean: {
    name: 'Ocean',
    colors: {
      bg: '#001f3f',
      card: '#003366',
      border: '#004080',
      textPrimary: '#cceeff',
      textSecondary: '#66ccff',
      accent: '#0074d9',
      error: '#ff4136',
      panel: 'rgba(0, 116, 217, 0.1)'
    }
  },
  space: {
    name: 'Space',
    colors: {
      bg: '#0b0d17',
      card: '#15192b',
      border: '#2a2f45',
      textPrimary: '#d0d6f9',
      textSecondary: '#8d96c4',
      accent: '#6c63ff',
      error: '#ff4b4b',
      panel: 'rgba(108, 99, 255, 0.1)'
    }
  },
  retro: {
    name: 'Retro',
    colors: {
      bg: '#f4e4c1',
      card: '#e8d5b5',
      border: '#d4c5a5',
      textPrimary: '#5c4b37',
      textSecondary: '#8b7d6b',
      accent: '#d2691e',
      error: '#cd5c5c',
      panel: 'rgba(210, 105, 30, 0.1)'
    }
  },
  neon: {
    name: 'Neon',
    colors: {
      bg: '#000000',
      card: '#111111',
      border: '#333333',
      textPrimary: '#ffffff',
      textSecondary: '#00ff00',
      accent: '#ff00ff',
      error: '#ff0000',
      panel: 'rgba(255, 0, 255, 0.1)'
    }
  },
  gold: {
    name: 'Gold',
    colors: {
      bg: '#1a1a1a',
      card: '#262626',
      border: '#404040',
      textPrimary: '#ffd700',
      textSecondary: '#daa520',
      accent: '#ffd700',
      error: '#ff4500',
      panel: 'rgba(255, 215, 0, 0.1)'
    }
  },
  silver: {
    name: 'Silver',
    colors: {
      bg: '#f5f5f5',
      card: '#ffffff',
      border: '#e0e0e0',
      textPrimary: '#212121',
      textSecondary: '#757575',
      accent: '#9e9e9e',
      error: '#d32f2f',
      panel: 'rgba(158, 158, 158, 0.1)'
    }
  },
  bronze: {
    name: 'Bronze',
    colors: {
      bg: '#2e2724',
      card: '#3e3532',
      border: '#5d4e48',
      textPrimary: '#cd7f32',
      textSecondary: '#a0522d',
      accent: '#cd7f32',
      error: '#8b0000',
      panel: 'rgba(205, 127, 50, 0.1)'
    }
  },
  iceberg: {
    name: 'Iceberg',
    colors: {
      bg: '#161821',
      card: '#1e212b',
      border: '#2a2e3b',
      textPrimary: '#c6c8d1',
      textSecondary: '#84a0c6',
      accent: '#84a0c6',
      error: '#e27878',
      panel: 'rgba(132, 160, 198, 0.1)'
    }
  },
  earth: {
    name: 'Earth',
    colors: {
      bg: '#2e2b25',
      card: '#3d3931',
      border: '#524c42',
      textPrimary: '#d9d4c5',
      textSecondary: '#a69e8a',
      accent: '#8cba51',
      error: '#cc5e5e',
      panel: 'rgba(140, 186, 81, 0.1)'
    }
  },
  twilight: {
    name: 'Twilight',
    colors: {
      bg: '#141414',
      card: '#1f1f1f',
      border: '#333333',
      textPrimary: '#aebbc7',
      textSecondary: '#5f6b7a',
      accent: '#bb86fc',
      error: '#cf6679',
      panel: 'rgba(187, 134, 252, 0.1)'
    }
  },
  breeze: {
    name: 'Breeze',
    colors: {
      bg: '#f0f4f8',
      card: '#ffffff',
      border: '#d9e2ec',
      textPrimary: '#334e68',
      textSecondary: '#627d98',
      accent: '#3e82f7',
      error: '#e12d39',
      panel: 'rgba(62, 130, 247, 0.1)'
    }
  },
  magma: {
    name: 'Magma',
    colors: {
      bg: '#1a0f0f',
      card: '#2b1616',
      border: '#4a2222',
      textPrimary: '#ffdbdb',
      textSecondary: '#ff8585',
      accent: '#ff4d4d',
      error: '#ff3333',
      panel: 'rgba(255, 77, 77, 0.1)'
    }
  },
  royal: {
    name: 'Royal',
    colors: {
      bg: '#1a1a2e',
      card: '#16213e',
      border: '#0f3460',
      textPrimary: '#e94560',
      textSecondary: '#a2a8d3',
      accent: '#e94560',
      error: '#ff0000',
      panel: 'rgba(233, 69, 96, 0.1)'
    }
  }
}
