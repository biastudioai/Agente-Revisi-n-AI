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
      const privateDir = getPrivateObjectDir();
      let newPdfUrl: string | null = null;
      let newFilePath: string | null = null;
      let oldPdfUrl: string | null = null;

      const existingForm = await prisma.medicalForm.findUnique({
        where: {
          userId_insuranceCompany: {
            userId,
            insuranceCompany,
          },
        },
        include: {
          formPdfs: true,
        },
      });

      if (existingForm?.formPdfs[0]?.pdfUrl) {
        oldPdfUrl = existingForm.formPdfs[0].pdfUrl;
      }

      if (fileBase64 && fileMimeType) {
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
          
          newPdfUrl = `/objects/${entityPath}`;
          newFilePath = fullPath;
          console.log('File uploaded to Object Storage:', newPdfUrl);
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          res.status(500).json({ error: 'Error al subir el archivo' });
          return;
        }
      }

      let medicalForm;
      try {
        medicalForm = await prisma.$transaction(async (tx) => {
          const form = await tx.medicalForm.upsert({
            where: {
              userId_insuranceCompany: {
                userId,
                insuranceCompany,
              },
            },
            update: {
              formData,
              status: 'PENDING',
            },
            create: {
              userId,
              insuranceCompany,
              formData,
              status: 'PENDING',
            },
          });

          if (newPdfUrl) {
            await tx.formPdf.upsert({
              where: {
                formId: form.id,
              },
              update: {
                pdfUrl: newPdfUrl,
              },
              create: {
                formId: form.id,
                pdfUrl: newPdfUrl,
              },
            });
          }

          return form;
        });
      } catch (dbError) {
        console.error('Error in database transaction:', dbError);
        if (newFilePath) {
          try {
            const { bucketName, objectName } = parseObjectPath(newFilePath);
            const bucket = objectStorageClient.bucket(bucketName);
            const file = bucket.file(objectName);
            await file.delete();
            console.log('Cleaned up orphaned file after DB error:', newPdfUrl);
          } catch (cleanupError) {
            console.error('Error cleaning up orphaned file:', cleanupError);
          }
        }
        res.status(500).json({ error: 'Error al guardar el formulario' });
        return;
      }

      if (newPdfUrl && oldPdfUrl && oldPdfUrl.startsWith('/objects/') && oldPdfUrl !== newPdfUrl) {
        try {
          const oldEntityPath = oldPdfUrl.slice('/objects/'.length);
          const oldFullPath = `${privateDir}/${oldEntityPath}`;
          const { bucketName: oldBucketName, objectName: oldObjectName } = parseObjectPath(oldFullPath);
          const oldBucket = objectStorageClient.bucket(oldBucketName);
          const oldFile = oldBucket.file(oldObjectName);
          const [exists] = await oldFile.exists();
          if (exists) {
            await oldFile.delete();
            console.log('Deleted old file from Object Storage:', oldPdfUrl);
          }
        } catch (deleteError) {
          console.error('Error deleting old file from Object Storage (non-critical):', deleteError);
        }
      }

      res.status(201).json({
        success: true,
        formId: medicalForm.id,
        pdfUrl: newPdfUrl,
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
