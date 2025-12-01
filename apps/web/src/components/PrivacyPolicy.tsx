import { Link } from 'react-router-dom'

/**
 * Privacy Policy page component.
 * Displays the application's privacy policy.
 */
export default function PrivacyPolicy() {
    return (
        <div className="settings-container">
            <div className="settings-header">
                <h2>privacy policy</h2>
                <Link to="/about" className="close-btn">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </Link>
            </div>

            <div className="settings-content text-content">
                <h3>1. introduction</h3>
                <p>
                    welcome to ao5. we respect your privacy and are committed to protecting your personal data.
                    this privacy policy will inform you as to how we look after your personal data when you visit our website
                    and tell you about your privacy rights and how the law protects you.
                </p>

                <h3>2. data we collect</h3>
                <p>
                    we may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:
                </p>
                <ul>
                    <li><strong>identity data:</strong> includes username or similar identifier.</li>
                    <li><strong>contact data:</strong> includes email address.</li>
                    <li><strong>technical data:</strong> includes internet protocol (ip) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform and other technology on the devices you use to access this website.</li>
                    <li><strong>usage data:</strong> includes information about how you use our website, products and services (e.g. solve times, puzzle types).</li>
                </ul>

                <h3>3. how we use your data</h3>
                <p>
                    we will only use your personal data when the law allows us to. most commonly, we will use your personal data in the following circumstances:
                </p>
                <ul>
                    <li>where we need to perform the contract we are about to enter into or have entered into with you.</li>
                    <li>where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                    <li>where we need to comply with a legal or regulatory obligation.</li>
                </ul>

                <h3>4. data security</h3>
                <p>
                    we have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. in addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
                </p>

                <h3>5. your legal rights</h3>
                <p>
                    under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, restriction, transfer, to object to processing, to portability of data and (where the lawful ground of processing is consent) to withdraw consent.
                </p>

                <h3>6. contact us</h3>
                <p>
                    if you have any questions about this privacy policy, please contact us via the support page.
                </p>
            </div>
        </div>
    )
}
