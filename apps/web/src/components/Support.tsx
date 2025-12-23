import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../authStore'

/**
 * Support page component.
 * Provides options for donations, viewing ad status, and sending feedback.
 */
export default function Support() {
    const [activeTab, setActiveTab] = useState<'donate' | 'sponsors' | 'feedback'>('donate')
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
                    className={`tab ${activeTab === 'sponsors' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sponsors')}
                >
                    <svg className="tab-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    sponsors
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

                {activeTab === 'sponsors' && (
                    <div className="support-section">
                        <h3>sponsors</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
                            <p>ao5 is a free, open-source speedcubing timer built for the community: fast, clean, and distraction-free.</p>
                            <p>there are currently no sponsors supporting ao5. to keep the experience minimal and enjoyable, ao5 will never display intrusive ads.</p>
                            <p>if you’re a cubing brand, creator, or organization interested in supporting ao5, sponsorships help cover hosting costs and fund future features, while keeping the app free for everyone.</p>
                        </div>

                        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(158, 197, 171, 0.05)', borderRadius: '8px', border: '1px solid rgba(158, 197, 171, 0.1)' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '16px' }}>interested in sponsoring ao5?</h4>
                            <ul style={{ margin: '0 0 1.5rem 0', paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <li>get a tasteful banner on this page</li>
                                <li>support an open-source cubing tool</li>
                                <li>reach dedicated speedcubers worldwide</li>
                            </ul>
                            <a
                                href="mailto:jonastirona@gmail.com?subject=Sponsorship%20Inquiry%20for%20ao5"
                                className="btn primary"
                                style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
                            >
                                contact us to sponsor
                            </a>
                        </div>
                    </div>
                )}

                {activeTab === 'feedback' && (
                    <div className="support-section">
                        <h3>send feedback</h3>
                        <p>found a bug, have a feature request, or want to contact us? let us know!</p>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            you can also email us directly at <a href="mailto:jonastirona@gmail.com" style={{ color: 'var(--accent)' }}>jonastirona@gmail.com</a>
                        </p>

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
                                                {['Feature Request', 'Bug Report', 'Contact', 'Other'].map((type) => (
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
