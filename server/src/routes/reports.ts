import express from 'express';
import { sendReportEmail } from '../services/reportEmailService';

const router = express.Router();

router.post('/send-report', async (req, res) => {
  try {
    const {
      recipientEmail,
      recipientName,
      patientName,
      hospital,
      doctor,
      policyNumber,
      score,
      status,
      findings,
      comments,
      pdfBase64
    } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ error: 'El email del destinatario es requerido' });
    }

    if (!patientName || score === undefined) {
      return res.status(400).json({ error: 'Datos del reporte incompletos' });
    }

    const result = await sendReportEmail({
      recipientEmail,
      recipientName,
      patientName: patientName || 'No especificado',
      hospital: hospital || 'No especificado',
      doctor: doctor || 'No especificado',
      policyNumber: policyNumber || 'No especificado',
      score: score || 0,
      status: status || 'Sin estado',
      findings: findings || [],
      comments,
      pdfBase64
    });

    if (result.success) {
      res.json({ success: true, message: 'Reporte enviado exitosamente' });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error in send-report endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al enviar el reporte' 
    });
  }
});

export default router;
