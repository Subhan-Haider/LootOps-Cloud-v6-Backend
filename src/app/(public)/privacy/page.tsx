export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200 mb-5">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-500">Last updated: June 2025</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
          {[
            {
              title: "1. Information We Collect",
              body: `This Storage Server is a private, invite-only personal cloud storage application. We collect only the information necessary to operate the service: your email address for authentication, files and metadata you upload, and basic server access logs (IP addresses, timestamps, and file access records) for security and auditing purposes.`
            },
            {
              title: "2. How We Use Your Information",
              body: `Your information is used solely to provide the storage service — to authenticate your identity, serve your files, and maintain system security. We do not sell, trade, or share your personal information or uploaded content with any third parties. We do not use your data for advertising.`
            },
            {
              title: "3. File Storage & Security",
              body: `Files you upload are stored on our private server infrastructure. Access is protected by Firebase Authentication and optional Two-Factor Authentication (2FA). Files marked as "Private" are not accessible without a valid authentication token. We use HTTPS/TLS encryption for all data in transit.`
            },
            {
              title: "4. Data Retention",
              body: `Your uploaded files are retained as long as your account is active or until you manually delete them. Activity logs are retained for up to 90 days for security purposes. You can request deletion of your account and all associated data by contacting the administrator.`
            },
            {
              title: "5. Sharing & Public Links",
              body: `When you create a share link for a file, that link becomes accessible to anyone who has it. You are responsible for managing the visibility of your files and the share links you generate. Time-limited or password-protected share links are available to reduce risk.`
            },
            {
              title: "6. Cookies",
              body: `We use a minimal number of cookies strictly necessary for operation — specifically a secure session cookie for 2FA authentication (mfa_token). No tracking or advertising cookies are used.`
            },
            {
              title: "7. Third-Party Services",
              body: `We use Firebase (by Google) for authentication. Google's privacy policy applies to their services. No other third-party analytics, tracking, or advertising services are used.`
            },
            {
              title: "8. Your Rights",
              body: `You have the right to access, correct, or delete your personal data at any time. To exercise these rights, contact the system administrator. You may also delete your uploaded files at any time directly through the dashboard.`
            },
            {
              title: "9. Contact",
              body: `If you have any questions or concerns about this privacy policy, please contact the administrator at: support@subhan.tech`
            },
          ].map((section) => (
            <div key={section.title} className="px-8 py-6">
              <h2 className="text-base font-semibold text-gray-900 mb-2">{section.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
