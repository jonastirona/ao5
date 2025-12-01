# ao5 - Speedcubing Timer

<div align="center">
  <img src="public/logo.png" alt="ao5 logo" width="120" />
  <h1>ao5</h1>
  <p><strong>A modern, feature-rich, and open-source speedcubing timer.</strong></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
  [![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/jonastirona/ao5)
  [![Website](https://img.shields.io/website?url=https%3A%2F%2Fao5.app)](https://ao5.app)
</div>

## Features

- **Cube Timer**: Accurate timing with inspection and keyboard shortcuts.
- **Cloud Sync**: Seamlessly sync your sessions and stats across devices (requires login).
- **Advanced Analytics**: Track your progress with detailed statistics (Ao5, Ao12, Ao100, Mean, Std Dev) and interactive graphs.
- **All WCA Puzzles**: Official scrambles for 3x3, 4x4, 5x5, 6x6, 7x7, Pyraminx, Megaminx, Skewb, Square-1, and Clock.
- **Session Management**: Organize your solves into sessions, rename them, and merge guest data.
- **Customization**: Choose from many themes to match your style.
- **Import/Export**: Easy migration from CSTimer and JSON data backup.

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- pnpm (v8 or later)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/jonastirona/ao5.git
    cd ao5
    ```

2.  **Install dependencies**:
    ```bash
    pnpm install
    ```

3.  **Start the development server**:
    ```bash
    pnpm dev
    ```

4.  Open [http://localhost:5173](http://localhost:5173) in your browser.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **State Management**: Zustand
- **Styling**: CSS Modules / Vanilla CSS
- **Backend/Auth**: Supabase
- **Charts**: Plotly.js / Recharts
- **PWA**: vite-plugin-pwa

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and suggest improvements.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you enjoy using ao5, please consider helping pay the bills!!

<a href='https://ko-fi.com/jonastirona' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi2.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
