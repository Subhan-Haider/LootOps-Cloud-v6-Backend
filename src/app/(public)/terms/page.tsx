export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200 mb-5">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Terms &amp; Conditions</h1>
          <p className="mt-2 text-sm text-gray-500">Last updated: June 2025</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
          {[
            {
              title: "1. Acceptance of Terms",
              body: `By accessing or using this Storage Server ("the Service"), you agree to be bound by these Terms & Conditions. If you do not agree to these terms, you may not use the Service. Access to this Service is granted by invitation only.`
            },
            {
              title: "2. Authorized Use",
              body: `Access to this Service is restricted to authorized users only. Authorized users are those with a verified account granted by the system administrator. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.`
            },
            {
              title: "3. Acceptable Use Policy",
              body: `You agree not to upload, store, or share any content that is illegal, harmful, defamatory, or violates the intellectual property rights of any third party. You may not use the Service to distribute malware, spam, or any content that violates applicable laws. The administrator reserves the right to remove any content and revoke access at any time.`
            },
            {
              title: "4. File Storage & Responsibility",
              body: `You are solely responsible for the files you upload to the Service. The Service provides no guarantee of data availability or permanence. You should maintain backups of any important files. The administrator is not liable for any loss of data due to technical failures, accidental deletion, or any other cause.`
            },
            {
              title: "5. Sharing & Public Access",
              body: `When you generate a public share link for a file, you are making that file accessible to anyone with the link. You take full responsibility for any content you choose to share publicly. Do not share links to sensitive, confidential, or private information through public share links.`
            },
            {
              title: "6. Service Availability",
              body: `The Service is provided on an "as is" and "as available" basis. The administrator does not guarantee that the Service will be available at all times, error-free, or secure. The Service may be modified, suspended, or discontinued at any time without prior notice.`
            },
            {
              title: "7. Intellectual Property",
              body: `You retain ownership of all files and content you upload to the Service. By uploading content, you grant the administrator a limited right to store, display, and serve the content solely for the purpose of providing the Service to you.`
            },
            {
              title: "8. Termination",
              body: `The administrator reserves the right to terminate or suspend your access to the Service at any time, with or without notice, for any violation of these Terms or for any other reason at their sole discretion. Upon termination, your right to access the Service immediately ceases.`
            },
            {
              title: "9. Limitation of Liability",
              body: `To the maximum extent permitted by applicable law, the administrator shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of or inability to use the Service.`
            },
            {
              title: "10. Changes to Terms",
              body: `The administrator reserves the right to modify these Terms at any time. Continued use of the Service after any changes constitutes your acceptance of the new Terms. It is your responsibility to review these Terms periodically.`
            },
            {
              title: "11. Contact",
              body: `If you have any questions about these Terms & Conditions, please contact: support@subhan.tech`
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
