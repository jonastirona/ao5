import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../authStore'

export default function Support() {
    const [activeTab, setActiveTab] = useState<'donate' | 'ads' | 'feedback'>('donate')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [feedbackType, setFeedbackType] = useState('Feature Request')
    const [message, setMessage] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!message.trim()) return

        setIsSubmitting(true)
        try {
            const user = useAuth.getState().user
            const { error } = await supabase.from('feedback').insert({
                user_id: user?.id || null,
                type: feedbackType,
                message: message.trim()
            })

            if (error) throw error

            setIsSuccess(true)
            setMessage('')
            setFeedbackType('Feature Request')
        } catch (error) {
            console.error('Feedback error:', error)
            alert('Failed to send feedback. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="settings-container">
            <div className="settings-header">
                <h2>support ao5</h2>
                <Link to="/" className="close-btn">×</Link>
            </div>

            <div className="settings-tabs">
                <button
                    className={`tab ${activeTab === 'donate' ? 'active' : ''}`}
                    onClick={() => setActiveTab('donate')}
                >
                    <svg className="tab-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    donate
                </button>
                <button
                    className={`tab ${activeTab === 'ads' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ads')}
                >
                    <svg className="tab-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                    </svg>
                    ads
                </button>
                <button
                    className={`tab ${activeTab === 'feedback' ? 'active' : ''}`}
                    onClick={() => setActiveTab('feedback')}
                >
                    <svg className="tab-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z" />
                    </svg>
                    feedback
                </button>
            </div>

            <div className="settings-content">
                {activeTab === 'donate' && (
                    <div className="support-section">
                        <h3>support development</h3>
                        <p>
                            ao5 is free and open source. if you enjoy using it, consider buying me a coffee!
                            your support helps cover server costs and fuels further development.
                        </p>

                        <div className="kofi-container">
                            <a href='https://ko-fi.com/jonastirona' target='_blank' rel="noreferrer" className="kofi-button">
                                <img src='https://storage.ko-fi.com/cdn/cup-border.png' alt='Ko-fi cup' className="kofi-img" />
                                <span>buy me a coffee on ko-fi</span>
                            </a>
                        </div>
                    </div>
                )}

                {activeTab === 'ads' && (
                    <div className="support-section">
                        <h3>ads</h3>
                        <p className="subtitle">check out these offers to support us for free.</p>

                        <div className="ad-container">
                            {/* Google Ads Placeholder */}
                            <div className="ad-placeholder">
                                <span className="ad-label">advertisement</span>
                                <div className="ad-content">
                                    Support us by disabling your ad blocker for this site.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'feedback' && (
                    <div className="support-section">
                        <h3>send feedback</h3>
                        <p>found a bug or have a feature request? let us know!</p>

                        {isSuccess ? (
                            <div className="feedback-success">
                                <div className="success-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <h4>thanks for your feedback!</h4>
                                <p>we appreciate your help in making ao5 better.</p>
                                <button
                                    className="btn primary"
                                    onClick={() => setIsSuccess(false)}
                                >
                                    send another
                                </button>
                            </div>
                        ) : (
                            <form
                                className="feedback-form"
                                onSubmit={handleSubmit}
                            >
                                <div className="form-group">
                                    <label>type</label>
                                    <div className="custom-select-container">
                                        <div
                                            className={`custom-select-trigger ${isDropdownOpen ? 'open' : ''}`}
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        >
                                            <span>{feedbackType}</span>
                                            <div className="select-arrow">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        </div>

                                        {isDropdownOpen && (
                                            <div className="custom-select-options">
                                                {['Feature Request', 'Bug Report', 'Other'].map((type) => (
                                                    <div
                                                        key={type}
                                                        className={`custom-option ${feedbackType === type ? 'selected' : ''}`}
                                                        onClick={() => {
                                                            setFeedbackType(type)
                                                            setIsDropdownOpen(false)
                                                        }}
                                                    >
                                                        {type}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>message</label>
                                    <textarea
                                        className="settings-input"
                                        rows={5}
                                        placeholder="describe your idea or issue..."
                                        required
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn primary"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'sending...' : 'send feedback'}
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
