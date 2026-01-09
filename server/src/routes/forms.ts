import { Router, Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import prisma from '../config/database';
import { requireAuth } from '../middlewares/auth';
import { objectStorageClient } from '../../replit_integrations/object_storage';
import { randomUUID } from 'crypto';

const router = Router();

interface CreateFormRequest {
  insuranceCompany: string;
  formData: any;
  fileBase64?: string;
  fileMimeType?: string;
}

function getPrivateObjectDir(): string {
  let dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) {
    throw new Error("PRIVATE_OBJECT_DIR not set");
  }
  if (dir.endsWith('/')) {
    dir = dir.slice(0, -1);
  }
  return dir;
}

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return { bucketName, objectName };
}

router.post(
  '/',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { insuranceCompany, formData, fileBase64, fileMimeType } = req.body as CreateFormRequest;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    if (!insuranceCompany || !formData) {
      res.status(400).json({ error: 'Faltan campos requeridos: insuranceCompany y formData' });
      return;
    }

    try {
      const medicalForm = await prisma.medicalForm.create({
        data: {
          userId,
          insuranceCompany,
          formData,
          status: 'PENDING',
        },
      });

      let pdfUrl: string | null = null;

      if (fileBase64 && fileMimeType) {
        const privateDir = getPrivateObjectDir();
        const objectId = randomUUID();
        const extension = fileMimeType === 'application/pdf' ? '.pdf' : 
                         fileMimeType.startsWith('image/') ? `.${fileMimeType.split('/')[1]}` : '';
        const entityPath = `uploads/${objectId}${extension}`;
        const fullPath = `${privateDir}/${entityPath}`;
        
        try {
          const { bucketName, objectName } = parseObjectPath(fullPath);
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          
          const binaryData = Buffer.from(fileBase64, 'base64');
          
          await file.save(binaryData, {
            metadata: {
              contentType: fileMimeType,
            },
          });
          
          pdfUrl = `/objects/${entityPath}`;
          
          await prisma.formPdf.create({
            data: {
              formId: medicalForm.id,
              pdfUrl: pdfUrl,
            },
          });
          
          console.log('File uploaded successfully to Object Storage:', pdfUrl);
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          await prisma.medicalForm.delete({ where: { id: medicalForm.id } });
          res.status(500).json({ error: 'Error al subir el archivo' });
          return;
        }
      }

      res.status(201).json({
        success: true,
        formId: medicalForm.id,
        pdfUrl,
        message: 'Formulario guardado exitosamente',
      });
    } catch (error) {
      console.error('Error creating medical form:', error);
      res.status(500).json({ error: 'Error al guardar el formulario' });
    }
  })
);

router.get(
  '/',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    try {
      const forms = await prisma.medicalForm.findMany({
        where: { userId },
        include: {
          formPdfs: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(forms);
    } catch (error) {
      console.error('Error fetching forms:', error);
      res.status(500).json({ error: 'Error al obtener formularios' });
    }
  })
);

router.get(
  '/:id',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const formId = req.params.id;

    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    try {
      const form = await prisma.medicalForm.findFirst({
        where: { id: formId, userId },
        include: {
          formPdfs: true,
        },
      });

      if (!form) {
        res.status(404).json({ error: 'Formulario no encontrado' });
        return;
      }

      res.json(form);
    } catch (error) {
      console.error('Error fetching form:', error);
      res.status(500).json({ error: 'Error al obtener formulario' });
    }
  })
);

router.delete(
  '/:id',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const formId = req.params.id;

    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    try {
      const form = await prisma.medicalForm.findFirst({
        where: { id: formId, userId },
        include: { formPdfs: true },
      });

      if (!form) {
        res.status(404).json({ error: 'Formulario no encontrado' });
        return;
      }

      for (const pdf of form.formPdfs) {
        if (pdf.pdfUrl && pdf.pdfUrl.startsWith('/objects/')) {
          try {
            const privateDir = getPrivateObjectDir();
            const entityPath = pdf.pdfUrl.slice('/objects/'.length);
            const fullPath = `${privateDir}/${entityPath}`;
            const { bucketName, objectName } = parseObjectPath(fullPath);
            const bucket = objectStorageClient.bucket(bucketName);
            const file = bucket.file(objectName);
            const [exists] = await file.exists();
            if (exists) {
              await file.delete();
              console.log('Deleted file from Object Storage:', pdf.pdfUrl);
            }
          } catch (deleteError) {
            console.error('Error deleting file from Object Storage:', deleteError);
          }
        }
      }

      await prisma.medicalForm.delete({
        where: { id: formId },
      });

      res.json({ success: true, message: 'Formulario eliminado' });
    } catch (error) {
      console.error('Error deleting form:', error);
      res.status(500).json({ error: 'Error al eliminar formulario' });
    }
  })
);

export default router;
