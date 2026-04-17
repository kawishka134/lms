import React from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SenderIdLetters = () => {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  const Letter = ({ senderId }) => (
    <div className="print-page">
      <div className="header">
        <div className="logo-area">
          <div className="logo-circle">N</div>
          <div className="brand-name">
            <h1>NEXUS ONLINE</h1>
            <p>Higher Education Institute</p>
          </div>
        </div>
        <div className="contact-info">
          URL: nexus-online.lk<br />
          Sri Lanka
        </div>
      </div>

      <div className="date">Date: April 17, 2026</div>

      <div className="recipient">
        SMSLenz,<br />
        SOFTLENZ (PVT) LTD,<br />
        Sri Lanka.
      </div>

      <div className="subject">Requesting a Sender ID for our company's SMS</div>

      <div className="text-body">
        We kindly request you to register the following sender ID for our company's SMS requirements. Please find the details below:
      </div>

      <table>
        <tbody>
          <tr><th>Sender ID Mask : (11 characters max)</th><td>{senderId}</td></tr>
          <tr><th>SMS content nature:</th><td>Transactional</td></tr>
          <tr><th>Company (or business) name:</th><td>NEXUS ONLINE Higher Education Institute</td></tr>
          <tr><th>Company website/Facebook page URL:</th><td>nexus-online.lk</td></tr>
          <tr><th>Nature of business:</th><td>Online Educational Platform / Higher Education</td></tr>
        </tbody>
      </table>

      <div className="text-body">
        I hereby understand that I will be responsible for the content in the SMSs we send using the account/sender name we are requesting.
      </div>

      <div className="authorization">
        We, <strong>NEXUS ONLINE (Higher Education Institute)</strong> authorize SOFTLENZ (PVT) LTD to use our requesting sender ID, for sending SMS on our behalf. We have no objection to this usage, provided it complies with all telecom regulations and legal requirements.
        <br /><br />
        This authorization remains valid until further notice.
      </div>

      <div className="signature-section">
        <p>Thank you!<br />Yours faithfully,</p>
        <div style={{ height: '60px' }}></div>
        <div className="sig-line"></div>
        <p style={{ fontWeight: 700, margin: 0 }}>Authorized Signature & Seal</p>
      </div>

      <div className="footer-banner">"Nothing is impossible" · Empowering the scholars of Sri Lanka through Nexus Online</div>
    </div>
  );

  return (
    <div className="letters-viewer">
      <div className="viewer-header no-print">
        <button onClick={() => navigate('/admin')} className="back-btn">
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
        <div className="viewer-title">
           <h2>Sender ID Authorization Letters</h2>
           <p>Open this page and press Ctrl+P to save as PDF</p>
        </div>
        <button onClick={handlePrint} className="print-btn">
          <Printer size={20} /> Print / Save as PDF
        </button>
      </div>

      <div className="letters-container">
        <Letter senderId="NEXUS_EDU" />
        <Letter senderId="NEXUS_LK" />
        <Letter senderId="NX_ONLINE" />
      </div>

      <style>{`
        .letters-viewer { background: #f1f5f9; min-height: 100vh; padding: 20px; }
        .viewer-header { 
          max-width: 800px; margin: 0 auto 30px; background: white; 
          padding: 20px; border-radius: 12px; display: flex; 
          justify-content: space-between; align-items: center;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        .viewer-title h2 { margin: 0; font-size: 1.1rem; color: #0f172a; }
        .viewer-title p { margin: 4px 0 0; font-size: 0.8rem; color: #64748b; }
        .back-btn, .print-btn { 
          display: flex; align-items: center; gap: 8px; border: none; 
          padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer;
          transition: all 0.2s;
        }
        .back-btn { background: #f8fafc; color: #475569; }
        .print-btn { background: #0ea5e9; color: white; }
        .print-btn:hover { background: #0284c7; }

        .letters-container { display: flex; flexDirection: column; gap: 40px; }

        /* Print Page Styles */
        .print-page { 
          background: white; width: 210mm; min-height: 297mm; padding: 25mm; 
          margin: 0 auto; box-shadow: 0 0 20px rgba(0,0,0,0.05); box-sizing: border-box; 
          position: relative; color: #000;
        }
        .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 3px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 40px; }
        .logo-area { display: flex; align-items: center; gap: 15px; }
        .logo-circle { width: 50px; height: 50px; background: #0ea5e9; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 22px; }
        .brand-name h1 { margin: 0; font-size: 24px; color: #000; letter-spacing: -1px; }
        .brand-name p { margin: 0; font-size: 10px; color: #333; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
        .contact-info { text-align: right; font-size: 12px; color: #333; }
        .date { font-weight: 700; margin-bottom: 30px; }
        .recipient { margin-bottom: 40px; line-height: 1.6; }
        .subject { text-align: center; text-decoration: underline; font-weight: 900; font-size: 17px; margin-bottom: 30px; }
        .text-body { line-height: 1.6; font-size: 14px; margin-bottom: 25px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { border: 1px solid #000; padding: 12px; text-align: left; font-size: 13px; }
        th { background: #f9fafb; width: 40%; }
        .authorization { font-size: 13px; font-style: italic; margin-bottom: 50px; }
        .sig-line { width: 200px; border-bottom: 1px solid #000; margin-bottom: 10px; }
        .footer-banner { position: absolute; bottom: 20mm; left: 25.4mm; right: 25.4mm; border-top: 1px solid #eee; padding-top: 10px; text-align: center; font-size: 10px; color: #666; }

        @media print {
          .no-print { display: none !important; }
          .letters-viewer { padding: 0; background: none; }
          .print-page { margin: 0; box-shadow: none; page-break-after: always; }
          body { -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default SenderIdLetters;
