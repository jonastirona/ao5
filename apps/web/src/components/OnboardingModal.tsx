import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface OnboardingModalProps {
    isOpen: boolean
    onClose: () => void
}

type Tab = 'welcome' | 'features' | 'shortcuts'

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('welcome')

    useEffect(() => {
        if (isOpen) {
            setActiveTab('welcome')
        }
    }, [isOpen])

    if (!isOpen) return null

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content onboarding-modal" onClick={e => e.stopPropagation()}>
                <div className="onboarding-sidebar">
                    <div className="onboarding-logo">ao5</div>
                    <nav className="onboarding-nav">
                        <button
                            className={`nav-item ${activeTab === 'welcome' ? 'active' : ''}`}
                            onClick={() => setActiveTab('welcome')}
                        >
                            welcome
                        </button>
                        <button
                            className={`nav-item ${activeTab === 'features' ? 'active' : ''}`}
                            onClick={() => setActiveTab('features')}
                        >
                            features
                        </button>
                        <button
                            className={`nav-item ${activeTab === 'shortcuts' ? 'active' : ''}`}
                            onClick={() => setActiveTab('shortcuts')}
                        >
                            shortcuts
                        </button>
                    </nav>
                </div>

                <div className="onboarding-content">
                    <button className="close-btn-absolute" onClick={onClose}>×</button>

                    {activeTab === 'welcome' && (
                        <div className="onboarding-section fade-in">
                            <h1>welcome to ao5</h1>
                            <p className="subtitle">a modern, feature-rich speedcubing timer designed for performance and aesthetics.</p>

                            <div className="feature-grid">
                                <div className="feature-item">
                                    <div className="icon">⚡️</div>
                                    <h3>fast & responsive</h3>
                                    <p>built for speed with instant feedback and zero lag.</p>
                                </div>
                                <div className="feature-item">
                                    <div className="icon">🎨</div>
                                    <h3>beautiful themes</h3>
                                    <p>customize the look to match your setup with curated themes.</p>
                                </div>
                                <div className="feature-item">
                                    <div className="icon">📊</div>
                                    <h3>deep analytics</h3>
                                    <p>visualize your progress with interactive charts and heatmaps.</p>
                                </div>
                            </div>

                            <button className="btn primary large" onClick={() => setActiveTab('features')}>
                                explore features →
                            </button>
                        </div>
                    )}

                    {activeTab === 'features' && (
                        <div className="onboarding-section fade-in">
                            <h2>key features</h2>

                            <div className="feature-list">
                                <div className="feature-row">
                                    <div className="feature-icon">⏱️</div>
                                    <div className="feature-text">
                                        <h3>smart timer</h3>
                                        <p>hold space to start. inspection time is supported. auto-saves every solve.</p>
                                    </div>
                                </div>
                                <div className="feature-row">
                                    <div className="feature-icon">☁️</div>
                                    <div className="feature-text">
                                        <h3>cloud sync</h3>
                                        <p>sign in to sync your sessions and stats across all your devices.</p>
                                    </div>
                                </div>
                                <div className="feature-row">
                                    <div className="feature-icon">📱</div>
                                    <div className="feature-text">
                                        <h3>pwa support</h3>
                                        <p>install ao5 on your phone or desktop for an app-like experience.</p>
                                    </div>
                                </div>
                            </div>

                            <button className="btn primary large" onClick={() => setActiveTab('shortcuts')}>
                                view shortcuts →
                            </button>
                        </div>
                    )}

                    {activeTab === 'shortcuts' && (
                        <div className="onboarding-section fade-in">
                            <h2>keyboard shortcuts</h2>

                            <div className="shortcuts-grid">
                                <div className="shortcut-item">
                                    <kbd>space</kbd>
                                    <span>start/stop timer</span>
                                </div>
                                <div className="shortcut-item">
                                    <kbd>esc</kbd>
                                    <span>reset timer</span>
                                </div>
                                <div className="shortcut-item">
                                    <kbd>alt</kbd> + <kbd>2</kbd>
                                    <span>+2 penalty</span>
                                </div>
                                <div className="shortcut-item">
                                    <kbd>alt</kbd> + <kbd>d</kbd>
                                    <span>dnf solve</span>
                                </div>
                                <div className="shortcut-item">
                                    <kbd>alt</kbd> + <kbd>z</kbd>
                                    <span>delete last solve</span>
                                </div>
                                <div className="shortcut-item">
                                    <kbd>?</kbd>
                                    <span>open help</span>
                                </div>
                            </div>

                            <button className="btn primary large" onClick={onClose}>
                                get started
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
