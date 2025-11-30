import { Link } from 'react-router-dom'

export default function TermsOfService() {
    return (
        <div className="settings-container">
            <div className="settings-header">
                <h2>terms of service</h2>
                <Link to="/about" className="close-btn">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </Link>
            </div>

            <div className="settings-content text-content">
                <h3>1. acceptance of terms</h3>
                <p>
                    by accessing and using ao5, you accept and agree to be bound by the terms and provision of this agreement.
                </p>

                <h3>2. use license</h3>
                <p>
                    permission is granted to temporarily download one copy of the materials (information or software) on ao5's website for personal, non-commercial transitory viewing only. this is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul>
                    <li>modify or copy the materials;</li>
                    <li>use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</li>
                    <li>attempt to decompile or reverse engineer any software contained on ao5's website;</li>
                    <li>remove any copyright or other proprietary notations from the materials; or</li>
                    <li>transfer the materials to another person or "mirror" the materials on any other server.</li>
                </ul>

                <h3>3. disclaimer</h3>
                <p>
                    the materials on ao5's website are provided on an 'as is' basis. ao5 makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                </p>

                <h3>4. limitations</h3>
                <p>
                    in no event shall ao5 or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on ao5's website, even if ao5 or a ao5 authorized representative has been notified orally or in writing of the possibility of such damage.
                </p>

                <h3>5. accuracy of materials</h3>
                <p>
                    the materials appearing on ao5's website could include technical, typographical, or photographic errors. ao5 does not warrant that any of the materials on its website are accurate, complete or current. ao5 may make changes to the materials contained on its website at any time without notice. however ao5 does not make any commitment to update the materials.
                </p>

                <h3>6. links</h3>
                <p>
                    ao5 has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. the inclusion of any link does not imply endorsement by ao5 of the site. use of any such linked website is at the user's own risk.
                </p>

                <h3>7. modifications</h3>
                <p>
                    ao5 may revise these terms of service for its website at any time without notice. by using this website you are agreeing to be bound by the then current version of these terms of service.
                </p>

                <h3>8. governing law</h3>
                <p>
                    these terms and conditions are governed by and construed in accordance with the laws and you irrevocably submit to the exclusive jurisdiction of the courts in that state or location.
                </p>
            </div>
        </div>
    )
}
