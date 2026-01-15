import nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

interface ReportEmailData {
  recipientEmail: string;
  recipientName?: string;
  patientName: string;
  hospital: string;
  doctor: string;
  policyNumber: string;
  score: number;
  status: string;
  findings: Array<{
    type: string;
    rule: string;
    message: string;
  }>;
  comments?: string;
  pdfBase64?: string;
}

const SMTP_SERVERS = [
  { host: 'smtp.titan.email', port: 587 },
  { host: 'smtpout.secureserver.net', port: 587 }
];

async function createTransporter() {
  const emailUser = process.env.Email_User;
  const emailPass = process.env.Email_Pass;

  if (!emailUser || !emailPass) {
    throw new Error('Email credentials not configured (Email_User, Email_Pass)');
  }

  for (const server of SMTP_SERVERS) {
    try {
      const transporter = nodemailer.createTransport({
        host: server.host,
        port: server.port,
        secure: false,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      await transporter.verify();
      console.log(`Connected to SMTP server: ${server.host}`);
      return transporter;
    } catch (error) {
      console.warn(`Failed to connect to ${server.host}:`, error);
    }
  }

  throw new Error('Could not connect to any SMTP server');
}

function getStatusColor(score: number): { bg: string; text: string } {
  if (score >= 85) return { bg: '#ecfdf5', text: '#059669' };
  if (score < 50) return { bg: '#fef2f2', text: '#dc2626' };
  return { bg: '#fffbeb', text: '#d97706' };
}

function generateEmailHTML(data: ReportEmailData): string {
  const colors = getStatusColor(data.score);
  
  const findingsHTML = data.findings.length === 0 
    ? '<p style="color: #059669; font-weight: 500;">No se detectaron hallazgos negativos.</p>'
    : data.findings.map(finding => {
        let badgeColor = '#3b82f6';
        let badgeText = 'NOTA';
        
        if (finding.type === 'ERROR_CRÍTICO') {
          badgeColor = '#ef4444';
          badgeText = 'CRÍTICO';
        } else if (finding.type === 'ALERTA') {
          badgeColor = '#f59e0b';
          badgeText = 'ALERTA';
        } else if (finding.type === 'OBSERVACIÓN') {
          badgeColor = '#3b82f6';
          badgeText = 'OBSERVACIÓN';
        }

        return `
          <div style="margin-bottom: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; border-left: 4px solid ${badgeColor};">
            <span style="display: inline-block; background: ${badgeColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-bottom: 6px;">${badgeText}</span>
            <p style="margin: 4px 0 0 0; font-weight: 600; color: #334155;">${finding.rule}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">${finding.message}</p>
          </div>
        `;
      }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1A2B56 0%, #2d4a8a 100%); padding: 30px; text-align: center; border-radius: 16px 16px 0 0;">
      <img src="cid:veryka-logo" alt="Veryka.ai" style="max-width: 180px; height: auto; margin-bottom: 12px;" />
      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Reporte de Auditoría Médica</p>
    </div>
    
    <!-- Main Content -->
    <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
      
      <!-- Score Card -->
      <div style="background: ${colors.bg}; border: 1px solid ${colors.text}20; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0; font-size: 12px; font-weight: 700; color: ${colors.text}; text-transform: uppercase; letter-spacing: 1px;">Estado de Validación</p>
        <h2 style="margin: 8px 0; font-size: 28px; font-weight: 800; color: ${colors.text};">${data.status}</h2>
        <p style="margin: 0; font-size: 40px; font-weight: 800; color: ${colors.text};">${data.score}<span style="font-size: 16px; opacity: 0.7;"> / 100</span></p>
      </div>
      
      <!-- Case Info -->
      <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Información del Caso</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
              <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Paciente</span><br>
              <span style="font-weight: 600; color: #334155;">${data.patientName}</span>
            </td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
              <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Hospital</span><br>
              <span style="font-weight: 600; color: #334155;">${data.hospital}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Médico</span><br>
              <span style="font-weight: 600; color: #334155;">${data.doctor}</span>
            </td>
            <td style="padding: 8px 0;">
              <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Póliza</span><br>
              <span style="font-weight: 600; color: #334155;">${data.policyNumber}</span>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Findings -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Hallazgos Detectados (${data.findings.length})</h3>
        ${findingsHTML}
      </div>
      
      ${data.comments ? `
      <!-- Comments -->
      <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; font-size: 12px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 1px;">Comentarios del Revisor</h3>
        <p style="margin: 0; color: #334155; line-height: 1.6;">${data.comments}</p>
      </div>
      ` : ''}
      
    </div>
    
    <!-- Footer -->
    <div style="background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
      <p style="margin: 0; font-size: 12px; color: #64748b;">
        Este es un correo automático generado por el sistema de auditoría VERYKA.AI
      </p>
      <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">
        &copy; ${new Date().getFullYear()} VERYKA.AI - Documento Confidencial
      </p>
    </div>
    
  </div>
</body>
</html>
  `;
}

export async function sendReportEmail(data: ReportEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = await createTransporter();
    
    const logoPath = path.join(process.cwd(), '..', 'attached_assets', 'Veryka_Logo_1767919213039.png');
    let logoAttachment: nodemailer.SendMailOptions['attachments'] = [];
    
    try {
      if (fs.existsSync(logoPath)) {
        logoAttachment = [{
          filename: 'veryka-logo.png',
          path: logoPath,
          cid: 'veryka-logo'
        }];
      }
    } catch (e) {
      console.warn('Could not attach logo:', e);
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: '"Veryka AI" <agente@veryka.ai>',
      to: data.recipientEmail,
      subject: `Reporte de Auditoría - ${data.patientName} - Score: ${data.score}/100`,
      html: generateEmailHTML(data),
      attachments: [...logoAttachment],
    };

    if (data.pdfBase64) {
      mailOptions.attachments = [
        ...logoAttachment,
        {
          filename: `Reporte_Auditoria_${Date.now()}.pdf`,
          content: data.pdfBase64,
          encoding: 'base64',
          contentType: 'application/pdf'
        }
      ];
    }

    const result = await transporter.sendMail(mailOptions);
    console.log(`Report email sent to ${data.recipientEmail}:`, result.messageId);
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending report email:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
